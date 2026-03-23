import { NextResponse } from "next/server";
import { getSessionIdFromRequest, getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const sid = getSessionIdFromRequest(request);
  if (!sid) {
    return NextResponse.json({ user: null });
  }
  const session = await getSession(sid);
  return NextResponse.json({ user: session?.user ?? null });
}
