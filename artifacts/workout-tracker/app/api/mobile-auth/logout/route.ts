import { NextResponse } from "next/server";
import { getSessionIdFromRequest, deleteSession } from "@/lib/auth";

export async function POST(request: Request) {
  const sid = getSessionIdFromRequest(request);
  if (sid) {
    await deleteSession(sid);
  }
  return NextResponse.json({ success: true });
}
