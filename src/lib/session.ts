/**
 * Session helpers — JWT stored in HttpOnly cookie "ast_session"
 */
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { Manager } from "@/types"

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "astro-translator-secret-change-in-prod"
)
const COOKIE_NAME = "ast_session"
const EXPIRY = "7d"

export interface SessionPayload {
  id: string
  name: string
  role: string
  telegram_id: string
  avatar_url?: string
}

export async function createSession(manager: SessionPayload): Promise<string> {
  return new SignJWT({ ...manager })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET)
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  }
}

export function clearSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  }
}
