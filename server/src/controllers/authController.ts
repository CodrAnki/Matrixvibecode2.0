import asyncHandler from "express-async-handler";
import type { Request, Response } from "express";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { Types, type ClientSession } from "mongoose";
import { User, type UserDoc } from "../models/User.js";
import { Team, TEAM_YEARS, type TeamYear } from "../models/Team.js";
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
  issueOtp,
  verifyOtp as verifyOtpService,
  resendOtp as resendOtpService,
} from "../services/otpService.js";
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
        verificationStatus: "PENDING",
        registrationStatus: "PENDING",
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
          emailVerified: false,
          team: team._id,
        },
      ],
      opts,
    );
    return leader;
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
 * POST /api/auth/register — step 1 of 2: validates and stages the team as a PENDING
 * registration (emailVerified:false, registrationStatus:'PENDING'), then dispatches a Gmail OTP.
 * The team/leader account exists in the database at this point, but is NOT considered a
 * completed registration and CANNOT be used to log in until the OTP is verified (see verifyOtp
 * below, which is the only place emailVerified/registrationStatus flip and a session is issued).
 */
export const registerTeam = asyncHandler(
  async (req: Request, res: Response) => {
    const f = parseRegistrationFields(req.body);
    // The backend is the authority on team size (leader + members <= EventSettings.maxTeamSize, default 4).
    const members = parseMembersPayload(f.rawMembers, {
      maxTeamSize: await getMaxTeamSize(),
      leaderEmail: f.email,
      leaderPhone: f.phone,
    });

    // Cheap checks first; only a request that passes all of them pays for a bcrypt hash.
    const existingUser = await User.findOne({ email: f.email });
    let leader: Pick<UserDoc, "email"> & { _id: unknown };

    if (existingUser) {
      if (existingUser.emailVerified)
        throw new ApiError(409, "This email is already registered.");
      // A pending, never-verified registration already exists for this email — per spec, continue
      // it (refreshed with whatever was just submitted) rather than creating a second team.
      const team = existingUser.team
        ? await Team.findById(existingUser.team)
        : null;
      await assertTeamNameFree(f.teamName, team?._id);
      await assertMembersAvailable(members, {
        teamId: team?._id,
        userId: existingUser._id,
      });
      const passwordHash = await bcrypt.hash(f.password, SALT_ROUNDS);

      existingUser.name = f.leaderName;
      existingUser.phone = f.phone;
      existingUser.passwordHash = passwordHash;

      if (team) {
        await existingUser.save();
        team.teamName = f.teamName;
        team.college = f.college;
        team.teamYear = f.teamYear;
        team.phone = f.phone;
        team.members = memberDocs(members, f) as never;
        await team.save();
      } else {
        // Repair: an earlier registration was interrupted and left a pending user with no team.
        await withFreshTeamId(async (teamId) => {
          const created = await Team.create({
            teamId,
            teamName: f.teamName,
            leader: existingUser._id,
            college: f.college,
            teamYear: f.teamYear,
            phone: f.phone,
            members: memberDocs(members, f),
            verificationStatus: "PENDING",
            registrationStatus: "PENDING",
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
        });
      }
      leader = existingUser;
    } else {
      await assertTeamNameFree(f.teamName);
      await assertMembersAvailable(members);
      const passwordHash = await bcrypt.hash(f.password, SALT_ROUNDS);
      // A duplicate email/team name from a simultaneous request surfaces as E11000 and is mapped to a
      // clean 409 by the error handler; either way no half-created registration is left behind.
      leader = await withFreshTeamId((teamId) =>
        runInTransaction((session) =>
          createTeamWithLeader(f, members, passwordHash, teamId, session),
        ),
      );
    }

    // Password/data staged — do NOT issue a JWT and do NOT consider registration complete yet.
    // If this throws (rate-limited or the email fails to send), the pending User/Team rows are
    // simply left as-is: nothing was marked verified, no session exists, and a retry re-enters the
    // "pending registration exists" branch above rather than creating a duplicate.
    const { verificationId, maskedEmail, expiresInSeconds } =
      await issueOtp(leader);
    res.json({
      success: true,
      requiresEmailVerification: true,
      message: "OTP sent to your email",
      verificationId,
      maskedEmail,
      expiresInSeconds,
    });
  },
);

/** POST /api/auth/login — team leader/member login, step 1: password check + OTP dispatch. */
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

  // Password verified — do NOT issue a JWT yet. An OTP must be verified first.
  const { verificationId, maskedEmail, expiresInSeconds } =
    await issueOtp(user);
  res.json({
    success: true,
    requiresOtp: true,
    message: "OTP sent to your registered email.",
    verificationId,
    maskedEmail,
    expiresInSeconds,
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

/** POST /api/admin/login — separate login surface for ADMIN / SUPER_ADMIN, step 1: password check + OTP dispatch. */
export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = readCredentials(req.body);

  const user = await User.findOne({
    email,
    role: { $in: ["ADMIN", "SUPER_ADMIN"] },
  }).select("+passwordHash");
  if (!(await passwordMatches(user, password)) || !user)
    throw new ApiError(401, "Invalid email or password");
  if (!user.active) throw new ApiError(403, "This account has been disabled");

  // Password verified — do NOT issue a JWT yet. An OTP must be verified first.
  const { verificationId, maskedEmail, expiresInSeconds } =
    await issueOtp(user);
  res.json({
    success: true,
    requiresOtp: true,
    message: "OTP sent to your registered email.",
    verificationId,
    maskedEmail,
    expiresInSeconds,
  });
});

/**
 * POST /api/auth/verify-otp — shared by BOTH login surfaces AND team registration (a
 * verificationId is self-contained and role-agnostic). Only here is the final JWT/session
 * actually created. For a team account whose registration OTP was never completed
 * (emailVerified:false), this is also the ONLY place that flips emailVerified/registrationStatus
 * to VERIFIED — never trust a frontend flag for this.
 */
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const b = (
    req.body && typeof req.body === "object" ? req.body : {}
  ) as Record<string, unknown>;
  const user = await verifyOtpService(
    typeof b.verificationId === "string" ? b.verificationId : "",
    typeof b.otp === "string" ? b.otp : "",
  );

  if (user.role === "TEAM_LEADER" || user.role === "TEAM_MEMBER") {
    const team = await Team.findById(user.team);
    if (!team) throw new ApiError(404, "No team linked to this account");

    if (!user.emailVerified) {
      // First successful OTP for this account — this is what completes registration.
      // Team first, then user: if the second write fails the account still reads as "unverified",
      // so the next OTP login simply repeats this step (self-healing, never half-verified).
      team.registrationStatus = "VERIFIED";
      await team.save();
      user.emailVerified = true;
      await user.save();
    }

    const token = signToken({
      id: String(user._id),
      role: user.role as "TEAM_LEADER" | "TEAM_MEMBER",
      teamId: team.teamId,
    });
    res.cookie("token", token, authCookieOptions);
    res.json({
      success: true,
      message: "OTP verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      team: serializeTeam(team),
    });
  }

  const token = signToken({
    id: String(user._id),
    role: user.role as "ADMIN" | "SUPER_ADMIN",
  });
  res.cookie("token", token, authCookieOptions);
  res.json({
    success: true,
    message: "OTP verified successfully",
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

/** POST /api/auth/resend-otp — shared by both login surfaces. */
export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const b = (
    req.body && typeof req.body === "object" ? req.body : {}
  ) as Record<string, unknown>;
  const result = await resendOtpService(
    typeof b.verificationId === "string" ? b.verificationId : "",
  );
  res.json({
    success: true,
    message: "A new OTP has been sent to your registered email.",
    verificationId: result.verificationId,
    maskedEmail: result.maskedEmail,
    expiresInSeconds: result.expiresInSeconds,
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
