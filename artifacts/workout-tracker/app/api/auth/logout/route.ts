import { NextResponse } from "next/server";
import { getSessionIdFromRequest, deleteSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const sid = getSessionIdFromRequest(request);
  if (sid) {
    await deleteSession(sid);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
