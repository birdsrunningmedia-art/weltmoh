import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/sqlite";
import { users, type UserRole } from "@/db/schema.sqlite";

export const SESSION_COOKIE = "wm_session";
const SESSION_DAYS = 7;

export type SessionUser = { id: string; name: string; email: string; role: UserRole };

function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is not set (min 16 chars). See .env.example.");
  }
  return s;
}

function b64url(data: string | Buffer): string {
  return Buffer.from(data).toString("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Signed session token: b64(userId).b64(expMs).b64(sig). No DB table (local single-device v1). */
export function signSession(userId: string): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${b64url(userId)}.${b64url(String(exp))}`;
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [a, b, sig] = parts;
  const expected = createHmac("sha256", sessionSecret()).update(`${a}.${b}`).digest("base64url");
  const x = Buffer.from(sig);
  const y = Buffer.from(expected);
  if (x.length !== y.length || !timingSafeEqual(x, y)) return null;
  const exp = Number(Buffer.from(b, "base64url").toString("utf8"));
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  return { userId: Buffer.from(a, "base64url").toString("utf8") };
}

export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let parsed: { userId: string } | null = null;
  try {
    parsed = verifySessionToken(token);
  } catch {
    return null;
  }
  if (!parsed) return null;
  const db = getDb();
  const row = db.select().from(users).where(eq(users.id, parsed.userId)).get();
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new Error("Not authenticated");
  return u;
}

/** Server-side role gate — never rely on hiding UI buttons alone. */
export function can(user: SessionUser, action: "manage-users" | "manage-settings" | "void"): boolean {
  if (user.role === "OWNER" || user.role === "ADMIN_DEV") return true;
  return false; // STAFF: create customers/invoices only (Buckets 2+)
}
