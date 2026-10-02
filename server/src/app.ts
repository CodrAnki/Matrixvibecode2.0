import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";

import authRoutes from "./routes/authRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import problemRoutes from "./routes/problemRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import { notFound, errorHandler, ApiError } from "./middleware/errorHandler.js";
import { isDbReady } from "./config/db.js";
import { parseClientOrigins, parseTrustProxy } from "./config/env.js";

const WINDOW = 15 * 60 * 1000;

/** Every limiter answers with the same clean JSON 429 the frontend already understands. */
function limiter(opts: {
  max: number;
  message: string;
  key?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skip?: (req: Request) => boolean;
}) {
  return rateLimit({
    windowMs: WINDOW,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: opts.skipSuccessfulRequests ?? false,
    ...(opts.key ? { keyGenerator: (req: Request) => opts.key!(req) } : {}),
    ...(opts.skip ? { skip: (req: Request) => opts.skip!(req) } : {}),
    handler: (_req: Request, res: Response) => {
      res
        .status(429)
        .json({ success: false, message: opts.message, code: "RATE_LIMITED" });
    },
  });
}

const ip = (req: Request) => req.ip ?? "unknown";
const bodyString = (req: Request, field: string, max = 254): string => {
  const v = (req.body as Record<string, unknown> | undefined)?.[field];
  return typeof v === "string" ? v.trim().toLowerCase().slice(0, max) : "";
};

// Limits are per IP, and a college campus often puts MANY legitimate participants behind ONE IP,
// so the broad limits are generous and the strict ones are keyed per account/session instead.
// Global safety net (runaway clients / floods). Public announcement polling and health checks are exempt from it.
const apiLimiter = limiter({
  max: 3000,
  message: "Too many requests. Please slow down and try again shortly.",
  skip: (req) =>
    req.path === "/health" || req.path.startsWith("/announcements"),
});
const announcementsLimiter = limiter({
  max: 10000,
  message: "Too many requests. Please try again shortly.",
});

// Registration: per-IP cap + a tighter cap per email address (stops repeat/OTP-bombing attempts).
const registerIpLimiter = limiter({
  max: 60,
  message:
    "Too many registration attempts from this network. Please try again later.",
});
const registerEmailLimiter = limiter({
  max: 8,
  message:
    "Too many registration attempts for this email. Please try again later.",
  key: (req) => `reg:${bodyString(req, "email") || ip(req)}`,
});

// Login: wrong-password guessing is limited per (IP + email); successful logins don't consume the budget.
const loginIpLimiter = limiter({
  max: 150,
  message: "Too many login attempts. Please try again later.",
});
const loginAccountLimiter = limiter({
  max: 10,
  message: "Too many login attempts. Please try again later.",
  key: (req) => `login:${ip(req)}:${bodyString(req, "email")}`,
  skipSuccessfulRequests: true,
});

// OTP: the OTP record's own 5-attempt cap is the primary guard; these are backstops keyed per verification session and per IP.
const otpIpLimiter = limiter({
  max: 300,
  message: "Too many requests. Please try again later.",
});
const otpVerifyLimiter = limiter({
  max: 15,
  message: "Too many verification attempts. Please request a new code.",
  key: (req) => `otp:${bodyString(req, "verificationId", 100) || ip(req)}`,
  skipSuccessfulRequests: true,
});
const otpResendLimiter = limiter({
  max: 6,
  message: "Too many resend requests. Please try again later.",
  key: (req) => `resend:${bodyString(req, "verificationId", 100) || ip(req)}`,
});

// Forgot password: tight per-email / per-session caps (each accepted request sends an email or guesses a code), plus a generous per-IP backstop.
const resetIpLimiter = limiter({
  max: 300,
  message: "Too many requests. Please try again later.",
});
const forgotEmailLimiter = limiter({
  max: 5,
  message:
    "Too many password reset requests for this email. Please try again later.",
  key: (req) => `forgot:${bodyString(req, "email") || ip(req)}`,
});
const forgotVerifyLimiter = limiter({
  max: 15,
  message: "Too many verification attempts. Please request a new code.",
  key: (req) =>
    `forgot-otp:${bodyString(req, "verificationId", 100) || ip(req)}`,
  skipSuccessfulRequests: true,
});
const forgotResendLimiter = limiter({
  max: 6,
  message: "Too many resend requests. Please try again later.",
  key: (req) =>
    `forgot-resend:${bodyString(req, "verificationId", 100) || ip(req)}`,
});
const resetPasswordLimiter = limiter({
  max: 20,
  message: "Too many attempts. Please start the password reset again later.",
  key: (req) => `reset-pw:${ip(req)}`,
  skipSuccessfulRequests: true,
});

// Contact form: each accepted submission triggers a WhatsApp message, so keep this tight.
const contactLimiter = limiter({
  max: 5,
  message: "Too many messages sent. Please try again later.",
});

/** While MongoDB is unreachable, fail fast with 503 instead of hanging on buffered queries or pretending writes worked. */
function requireDb(_req: Request, _res: Response, next: NextFunction) {
  if (isDbReady()) return next();
  next(
    new ApiError(
      503,
      "The service is temporarily unavailable. Please try again in a moment.",
      "DB_UNAVAILABLE",
    ),
  );
}

export function createApp() {
  const app = express();

  // Behind a reverse proxy req.ip is the proxy unless this is set (TRUST_PROXY=1 for one hop) — otherwise ALL users share one rate-limit bucket.
  app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

  app.use(helmet());
  app.use(
    cors({
      origin: "https://matrixvibecode2-0.vercel.app",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(mongoSanitize());
  if (process.env.NODE_ENV !== "test")
    app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  app.get("/api/health", (_req, res) => {
    const db = isDbReady();
    res.status(db ? 200 : 503).json({
      success: db,
      service: "matrix-vibe-coding-2-api",
      db: db ? "up" : "down",
      time: new Date().toISOString(),
    });
  });

  app.use("/api", apiLimiter);
  app.use("/api/announcements", announcementsLimiter);
  app.use("/api/auth/register", registerIpLimiter, registerEmailLimiter);
  app.use("/api/auth/login", loginIpLimiter, loginAccountLimiter);
  app.use("/api/admin/login", loginIpLimiter, loginAccountLimiter);
  app.use("/api/auth/verify-otp", otpIpLimiter, otpVerifyLimiter);
  app.use("/api/auth/resend-otp", otpIpLimiter, otpResendLimiter);
  // Exact-path mounts (app.post), so the per-email key is never applied to the verify/resend sub-routes.
  app.post("/api/auth/forgot-password", resetIpLimiter, forgotEmailLimiter);
  app.post(
    "/api/auth/forgot-password/verify-otp",
    resetIpLimiter,
    forgotVerifyLimiter,
  );
  app.post(
    "/api/auth/forgot-password/resend-otp",
    resetIpLimiter,
    forgotResendLimiter,
  );
  app.post("/api/auth/reset-password", resetIpLimiter, resetPasswordLimiter);
  app.use("/api/contact", contactLimiter);

  app.use("/api", requireDb);

  app.use("/api/auth", authRoutes);
  app.use("/api/teams", teamRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/problems", problemRoutes);
  app.use("/api/announcements", announcementRoutes);
  app.use("/api/contact", contactRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
