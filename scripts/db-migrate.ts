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

    // Terminate stale sessions from previous crashed migrations that may hold the advisory lock
    const terminated = await client.query<{ count: string }>(`
      SELECT count(*) FROM (
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
          AND state IN ('idle', 'idle in transaction')
      ) t
    `);
    console.log(`Terminated ${terminated.rows[0].count} stale sessions`);

    console.log("Running migration");

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
