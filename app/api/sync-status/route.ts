import { NextResponse } from "next/server";
import { getSyncValue } from "@/lib/settings";

export async function GET() {
  let lastSyncAt: string | null = null;
  try {
    lastSyncAt = getSyncValue("lastSyncAt");
  } catch {
    lastSyncAt = null;
  }
  return NextResponse.json({ lastSyncAt });
}
