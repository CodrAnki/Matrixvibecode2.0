import mongoose from "mongoose";
import { Otp } from "../models/Otp.js";
import { QRToken } from "../models/QRToken.js";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
function envInt(
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const v = Number(process.env[name]);
  return Number.isInteger(v) && v >= min && v <= max ? v : fallback;
}

let handlersAttached = false;

/**
 * Connects once, with explicit pooling and timeouts. A failed INITIAL connection throws (server.ts
 * exits non-zero) — there is no retry loop here, so the process never limps along without a
 * database. After a successful connect the MongoDB driver handles transient drops itself; while
 * the link is down the API answers 503 (see the readiness guard in app.ts) instead of pretending
 * writes succeeded.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in environment variables");
  mongoose.set("strictQuery", true);

  // Attach listeners BEFORE connecting so an early error is never an unhandled 'error' event.
  if (!handlersAttached) {
    handlersAttached = true;
    mongoose.connection.on("error", (err) =>
      console.error(
        "[db] connection error:",
        err instanceof Error ? err.message : err,
      ),
    );
    mongoose.connection.on("disconnected", () =>
      console.warn("[db] disconnected"),
    );
    mongoose.connection.on("reconnected", () =>
      console.log("[db] reconnected"),
    );
  }

  await mongoose.connect(uri, {
    maxPoolSize: envInt("MONGO_MAX_POOL_SIZE", 50, 1, 500),
    minPoolSize: envInt("MONGO_MIN_POOL_SIZE", 2, 0, 50),
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
  });
  console.log(`[db] connected -> ${mongoose.connection.name}`);
}

/** True only while the driver has a live connection (readyState 1). */
export function isDbReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * Builds every declared index BEFORE the server starts taking traffic. Mongoose otherwise builds
 * them lazily in the background, which leaves a window where unique/TTL indexes don't exist yet.
 * Throws (naming the model) if any index cannot be built, e.g. existing duplicate data blocking a
 * unique index, so that never goes unnoticed.
 */
export async function ensureIndexes(): Promise<void> {
  const models = Object.values(mongoose.models);
  const failures: string[] = [];
  await Promise.all(
    models.map(async (m) => {
      try {
        await m.init();
      } catch (err) {
        failures.push(
          `${m.modelName}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }),
  );
  if (failures.length)
    throw new Error(`Index build failed — ${failures.join(" | ")}`);
  console.log(`[db] indexes ready for ${models.length} model(s)`);
}

/** Proves the TTL indexes really exist in MongoDB (not merely that the schema declares them). */
export async function verifyTtlIndexes(): Promise<void> {
  type IndexInfo = {
    key: Record<string, unknown>;
    expireAfterSeconds?: number;
  };
  const checks = [
    ["otps", Otp.collection],
    ["qrtokens", QRToken.collection],
  ] as const;
  const missing: string[] = [];
  for (const [label, coll] of checks) {
    const indexes = (await coll.indexes()) as unknown as IndexInfo[];
    const ttl = indexes.find(
      (i) => "expiresAt" in i.key && typeof i.expireAfterSeconds === "number",
    );
    if (!ttl) missing.push(`${label}.expiresAt`);
  }
  if (missing.length)
    throw new Error(`TTL index missing on: ${missing.join(", ")}`);
  console.log("[db] TTL indexes verified (otps, qrtokens)");
}
