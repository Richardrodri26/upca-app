import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const RESET_SECRET = "f90a21ff04ed552361db54692277c381";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-reset-secret");
  if (auth !== RESET_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(`
      TRUNCATE TABLE
        "Response",
        "EvaluationAssignment",
        "Question",
        "Evaluation",
        "Manual",
        "Position",
        "verification",
        "account",
        "session",
        "user"
      RESTART IDENTITY CASCADE;
    `);
    return NextResponse.json({ ok: true, message: "All tables truncated" });
  } finally {
    client.release();
    await pool.end();
  }
}
