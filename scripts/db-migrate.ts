import { Pool, PoolClient } from "pg";
import { execSync } from "node:child_process";

const PRISMA_ADVISORY_LOCK_ID = 72707369;

async function main() {
  const migrateUrl =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";

  const pool = new Pool({
    connectionString: migrateUrl,
    connectionTimeoutMillis: 30000,
  });

  let client: PoolClient | null = null;
  try {
    // Keep connection alive during migration so Neon doesn't re-suspend
    client = await pool.connect();
    await client.query("SELECT 1");
    console.log("DB warm — connection held open");

    // Release any stale advisory lock from a previous crashed migration
    await client.query("SELECT pg_advisory_unlock($1)", [
      PRISMA_ADVISORY_LOCK_ID,
    ]);
    console.log("Advisory lock released — running migration");

    execSync("prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: migrateUrl },
      stdio: "inherit",
    });
  } finally {
    client?.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
