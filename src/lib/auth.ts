import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/* Portal auth — no Clerk. A signed httpOnly cookie issued by /api/login
   against ADMIN_EMAILS + ADMIN_PASSWORD. AUTH_SECRET signs the token. */

const COOKIE = "mm_admin";

function secret() {
  return process.env.AUTH_SECRET ?? "";
}

function sign(email: string) {
  return createHmac("sha256", secret()).update(email).digest("hex");
}

export function makeToken(email: string) {
  return `${Buffer.from(email).toString("base64url")}.${sign(email)}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token || !secret()) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  let email: string;
  try {
    email = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = sign(email);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  // Must still be on the admin list.
  if (!adminList().includes(email.toLowerCase())) return null;
  return email;
}

function adminList() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function checkCredentials(email: string, password: string) {
  const pass = process.env.ADMIN_PASSWORD ?? "";
  if (!pass) return false;
  return adminList().includes(email.trim().toLowerCase()) && password === pass;
}

export async function currentAdminEmail(): Promise<string | null> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export const ADMIN_COOKIE = COOKIE;

/* ── Shims so the portal pages/APIs keep their existing imports ── */

export async function isAdmin() {
  return (await currentAdminEmail()) !== null;
}

export async function getSeeker() {
  const email = await currentAdminEmail();
  if (!email) return null;
  const name = email.split("@")[0].replace(/[._-]+/g, " ");
  return {
    userId: `admin:${email}`,
    fullName: name.charAt(0).toUpperCase() + name.slice(1),
    email,
  };
}

export async function getSeekerUserId() {
  const email = await currentAdminEmail();
  return email ? `admin:${email}` : null;
}

export async function canReadNewsletters() {
  return isAdmin();
}

/* The team's Clerk backend key is still used as a DATA SOURCE for the
   sadhak list — but no Clerk sign-in/middleware exists in this app. */
export function isClerkConfigured() {
  return !!process.env.CLERK_SECRET_KEY;
}
