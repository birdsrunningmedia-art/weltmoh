import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { syncToNeon } from "@/lib/sync";

export async function POST() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncToNeon();
  return NextResponse.json(result);
}
