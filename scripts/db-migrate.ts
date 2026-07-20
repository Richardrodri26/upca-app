import { Pool } from "pg";
import { execSync } from "node:child_process";

const PRISMA_ADVISORY_LOCK_ID = 72707369;

async function warmup(url: string) {
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 30000 });
  try {
    await pool.query("SELECT 1");
    console.log("DB warm");
    // Release any stale advisory lock from a crashed previous migration
    await pool.query("SELECT pg_advisory_unlock($1)", [PRISMA_ADVISORY_LOCK_ID]);
    console.log("Advisory lock released — proceeding with migration");
  } catch {
    console.log("Warmup/unlock failed, proceeding anyway");
  } finally {
    await pool.end();
  }
}

async function main() {
  const migrateUrl =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";

  await warmup(migrateUrl);

  execSync("prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: migrateUrl },
    stdio: "inherit",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
