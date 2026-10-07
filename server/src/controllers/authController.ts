import asyncHandler from "express-async-handler";
import type { Request, Response } from "express";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { Types, type ClientSession, type HydratedDocument } from "mongoose";
import { User, type UserDoc } from "../models/User.js";
import { Team, TEAM_YEARS, type TeamDoc, type TeamYear } from "../models/Team.js";
import { ApiError } from "../middleware/errorHandler.js";
import { generateTeamId, generateMemberId } from "../utils/generateId.js";
import { signToken, authCookieOptions } from "../utils/generateToken.js";
import {
  serializeTeam,
  getMaxTeamSize,
  assertTeamNameFree,
  assertMembersAvailable,
} from "../services/teamService.js";
import {
  EMAIL_RE,
  PHONE_RE,
  parseMembersPayload,
  type CleanMember,
} from "../utils/memberValidation.js";
import { isDuplicateKeyError } from "../utils/dbErrors.js";
import { runInTransaction } from "../utils/transaction.js";

const SALT_ROUNDS = 12;

/** undefined / null / '' -> null (not specified); an allowed value -> itself; anything else -> 400. */
export function parseTeamYear(raw: unknown): TeamYear | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (
    typeof raw === "string" &&
    (TEAM_YEARS as readonly string[]).includes(raw)
  )
    return raw as TeamYear;
  throw new ApiError(
    400,
    `teamYear must be one of: ${TEAM_YEARS.join(", ")} (or omitted)`,
  );
}

const MAX_ID_ATTEMPTS = 5;

const cleanText = (v: unknown): string =>
  typeof v === "string" ? v.trim() : "";
const bad = (message: string) => new ApiError(400, message, "VALIDATION_ERROR");

// Used when the email doesn't exist, so "unknown email" costs the same bcrypt time as "wrong password".
const DUMMY_HASH: Promise<string> = bcrypt.hash(
  crypto.randomBytes(16).toString("hex"),
  SALT_ROUNDS,
);

async function passwordMatches(
  user: { passwordHash: string } | null,
  password: string,
): Promise<boolean> {
  const ok = await bcrypt.compare(
    password,
    user ? user.passwordHash : await DUMMY_HASH,
  );
  return !!user && ok;
}

function readCredentials(body: unknown): { email: string; password: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  if (
    typeof b.email !== "string" ||
    typeof b.password !== "string" ||
    !b.email.trim() ||
    !b.password
  ) {
    throw new ApiError(400, "Email and password are required");
  }
  if (b.email.length > 254 || b.password.length > 128)
    throw new ApiError(401, "Invalid email or password");
  return { email: b.email.trim().toLowerCase(), password: b.password };
}

interface RegistrationFields {
  teamName: string;
  leaderName: string;
  email: string;
  phone: string;
  college: string;
  branch?: string;
  teamYear: TeamYear | null;
  password: string;
  rawMembers: unknown;
}

/** Validates every scalar field of the registration body. Never trusts the frontend: wrong types / lengths are 400s. */
function parseRegistrationFields(body: unknown): RegistrationFields {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw bad("Request body must be a JSON object");
  const b = body as Record<string, unknown>;

  const teamName = cleanText(b.teamName);
  const leaderName = cleanText(b.leaderName);
  const email = cleanText(b.email).toLowerCase();
  const phone = cleanText(b.phone);
  const college = cleanText(b.college);
  const password = typeof b.password === "string" ? b.password : "";
  if (!teamName || !leaderName || !email || !phone || !college || !password) {
    throw new ApiError(
      400,
      "teamName, leaderName, email, phone, college and password are required",
    );
  }
  if (teamName.length < 3 || teamName.length > 100)
    throw bad("Team name must be 3–100 characters");
  if (leaderName.length < 2 || leaderName.length > 100)
    throw bad("Leader name must be 2–100 characters");
  if (!EMAIL_RE.test(email) || email.length > 254)
    throw bad("Enter a valid email address");
  if (!PHONE_RE.test(phone)) throw bad("Enter a valid phone number");
  if (college.length < 3 || college.length > 150)
    throw bad("College must be 3–150 characters");
  if (password.length < 8) throw bad("Password must be at least 8 characters");
  if (password.length > 128)
    throw bad("Password must be 128 characters or fewer");

  if (
    b.branch !== undefined &&
    b.branch !== null &&
    typeof b.branch !== "string"
  )
    throw bad("branch must be text");
  const branch = cleanText(b.branch) || undefined;
  if (branch && branch.length > 100)
    throw bad("branch must be 100 characters or fewer");

  // teamYear is OPTIONAL: missing / null / '' are all "not specified". Anything else must be an allowed value.
  const teamYear = parseTeamYear(b.teamYear);
  return {
    teamName,
    leaderName,
    email,
    phone,
    college,
    branch,
    teamYear,
    password,
    rawMembers: b.members,
  };
}

function memberDocs(
  members: CleanMember[],
  f: Pick<RegistrationFields, "college" | "branch" | "teamYear">,
) {
  return members.map((m) => ({
    memberId: generateMemberId(),
    name: m.name,
    email: m.email,
    phone: m.phone,
    college: m.college ?? f.college,
    branch: m.branch ?? f.branch,
    year: m.year ?? f.teamYear ?? undefined,
    status: "ACTIVE" as const,
  }));
}

/**
 * Creates the team AND its leader account as one unit. Team first (with the leader's _id chosen up
 * front), then the user: if the user write fails — duplicate email from a simultaneous request,
 * validation, anything — the team is rolled back, so no team is ever left without a leader and no
 * user without a team. Inside a transaction the database does the rollback; without one (standalone
 * MongoDB) we delete the team ourselves.
 */
async function createTeamWithLeader(
  f: RegistrationFields,
  members: CleanMember[],
  passwordHash: string,
  teamId: string,
  session: ClientSession | undefined,
) {
  const opts = session ? { session } : undefined;
  const leaderId = new Types.ObjectId();
  const [team] = await Team.create(
    [
      {
        teamId,
        teamName: f.teamName,
        leader: leaderId,
        college: f.college,
        teamYear: f.teamYear,
        phone: f.phone,
        members: memberDocs(members, f),
        verificationStatus: "PENDING", // admin's own review of the team — unrelated to the (removed) email step
        eventStatus: "TEAM_FORMED",
        verificationHistory: [
          { status: "PENDING", note: "Registration submitted", at: new Date() },
        ],
      },
    ],
    opts,
  );
  try {
    const [leader] = await User.create(
      [
        {
          _id: leaderId,
          name: f.leaderName,
          email: f.email,
          phone: f.phone,
          passwordHash,
          role: "TEAM_LEADER",
          team: team._id,
        },
      ],
      opts,
    );
    return { leader, team };
  } catch (err) {
    if (!session)
      await Team.deleteOne({ _id: team._id }).catch((e) =>
        console.error(
          "[register] rollback of team",
          team.teamId,
          "failed:",
          e instanceof Error ? e.message : e,
        ),
      );
    throw err;
  }
}

/** Gets a fresh team id from the atomic counter; on the (practically impossible) duplicate, takes the next one and retries. */
async function withFreshTeamId<T>(
  attempt: (teamId: string) => Promise<T>,
): Promise<T> {
  for (let n = 1; ; n++) {
    const teamId = await generateTeamId();
    try {
      return await attempt(teamId);
    } catch (err) {
      if (isDuplicateKeyError(err, "teamId") && n < MAX_ID_ATTEMPTS) continue;
      throw err;
    }
  }
}

/**
 * POST /api/auth/register — validates, creates the team + leader account, and signs the leader
 * in immediately. There is no email step: no app in this project can send email (no verified
 * sending domain), so a correct submission is trusted outright.
 */
export const registerTeam = asyncHandler(
  async (req: Request, res: Response) => {
    const f = parseRegistrationFields(req.body);
    // The backend is the authority on team size (leader + members <= MAX_TEAM_SIZE, fixed at 2: solo or duo).
    const members = parseMembersPayload(f.rawMembers, {
      maxTeamSize: await getMaxTeamSize(),
      leaderEmail: f.email,
      leaderPhone: f.phone,
    });

    // Cheap checks first; only a request that passes all of them pays for a bcrypt hash.
    const existingUser = await User.findOne({ email: f.email });
    let leader: HydratedDocument<UserDoc> & { _id: unknown };
    let team: (HydratedDocument<TeamDoc> & { _id: unknown }) | null;

    if (existingUser) {
      if (existingUser.emailVerified)
        throw new ApiError(409, "This email is already registered.");
      // A leftover row from before email verification was removed from this app (or an
      // interrupted registration) — complete it now instead of creating a second team.
      team = existingUser.team ? await Team.findById(existingUser.team) : null;
      await assertTeamNameFree(f.teamName, team?._id);
      await assertMembersAvailable(members, {
        teamId: team?._id,
        userId: existingUser._id,
      });
      const passwordHash = await bcrypt.hash(f.password, SALT_ROUNDS);

      existingUser.name = f.leaderName;
      existingUser.phone = f.phone;
      existingUser.passwordHash = passwordHash;
      existingUser.emailVerified = true;

      if (team) {
        await existingUser.save();
        team.teamName = f.teamName;
        team.college = f.college;
        team.teamYear = f.teamYear;
        team.phone = f.phone;
        team.members = memberDocs(members, f) as never;
        team.registrationStatus = "VERIFIED";
        await team.save();
      } else {
        // Repair: an earlier registration was interrupted and left a pending user with no team.
        team = await withFreshTeamId(async (teamId) => {
          const created = await Team.create({
            teamId,
            teamName: f.teamName,
            leader: existingUser._id,
            college: f.college,
            teamYear: f.teamYear,
            phone: f.phone,
            members: memberDocs(members, f),
            verificationStatus: "PENDING",
            eventStatus: "TEAM_FORMED",
            verificationHistory: [
              {
                status: "PENDING",
                note: "Registration submitted",
                at: new Date(),
              },
            ],
          });
          try {
            existingUser.team = created._id;
            await existingUser.save();
          } catch (err) {
            await Team.deleteOne({ _id: created._id }).catch(() => undefined);
            throw err;
          }
          return created;
        });
      }
      leader = existingUser;
    } else {
      await assertTeamNameFree(f.teamName);
      await assertMembersAvailable(members);
      const passwordHash = await bcrypt.hash(f.password, SALT_ROUNDS);
      // A duplicate email/team name from a simultaneous request surfaces as E11000 and is mapped to a
      // clean 409 by the error handler; either way no half-created registration is left behind.
      ({ leader, team } = await withFreshTeamId((teamId) =>
        runInTransaction((session) =>
          createTeamWithLeader(f, members, passwordHash, teamId, session),
        ),
      ));
    }

    if (!team) throw new ApiError(404, "No team linked to this account");

    const token = signToken({
      id: String(leader._id),
      role: "TEAM_LEADER",
      teamId: team.teamId,
    });
    res.cookie("token", token, authCookieOptions);
    res.json({
      success: true,
      token,
      user: {
        id: leader._id,
        name: leader.name,
        email: leader.email,
        role: leader.role,
      },
      team: serializeTeam(team),
    });
  },
);

/** POST /api/auth/login — team leader/member login. No email step: a correct password issues a session immediately. */
export const loginTeam = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = readCredentials(req.body);

  const user = await User.findOne({
    email,
    role: { $in: ["TEAM_LEADER", "TEAM_MEMBER"] },
  }).select("+passwordHash");
  if (!(await passwordMatches(user, password)) || !user)
    throw new ApiError(401, "Invalid email or password");
  if (!user.active) throw new ApiError(403, "This account has been disabled");

  const team = await Team.findById(user.team);
  if (!team) throw new ApiError(404, "No team linked to this account");
  if (team.isDeleted)
    throw new ApiError(
      403,
      "This team has been removed. Please contact the organizers.",
      "TEAM_DELETED",
    );

  const token = signToken({
    id: String(user._id),
    role: user.role as "TEAM_LEADER" | "TEAM_MEMBER",
    teamId: team.teamId,
  });
  res.cookie("token", token, authCookieOptions);
  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    team: serializeTeam(team),
  });
});

/** GET /api/auth/me — current team session, resolved from the JWT (team or team-member role). */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.auth?.id);
  if (!user) throw new ApiError(404, "User not found");
  const team = await Team.findById(user.team);
  if (!team) throw new ApiError(404, "No team linked to this account");
  res.json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    team: serializeTeam(team),
  });
});

/** POST /api/admin/login — separate login surface for ADMIN / SUPER_ADMIN. No email OTP: a correct password issues a session immediately. */
export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = readCredentials(req.body);

  const user = await User.findOne({
    email,
    role: { $in: ["ADMIN", "SUPER_ADMIN"] },
  }).select("+passwordHash");
  if (!(await passwordMatches(user, password)) || !user)
    throw new ApiError(401, "Invalid email or password");
  if (!user.active) throw new ApiError(403, "This account has been disabled");

  const token = signToken({
    id: String(user._id),
    role: user.role as "ADMIN" | "SUPER_ADMIN",
  });
  res.cookie("token", token, authCookieOptions);
  res.json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("token", { path: "/" });
  res.json({ success: true });
});

/** GET /api/admin/me — restores an admin session after a page refresh. */
export const getAdminMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.auth?.id);
  if (!user) throw new ApiError(404, "User not found");
  res.json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});
