// THROWAWAY audit script — NOT to be committed. Run with: pnpm exec tsx scripts/audit-duplicate-positions.ts
//
// Lists Position rows whose `name` collides with another Position case-insensitively.
// Per plan 008: duplicate Positions are operator territory — this script REPORTS only,
// never merges or repairs. If duplicates exist with dependent Evaluations, that is a
// STOP condition for the plan.

import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const duplicates = await prisma.$queryRawUnsafe<
    Array<{ name_key: string; count: bigint }>
  >(
    `SELECT LOWER(name) AS name_key, COUNT(*)::bigint AS count
     FROM "Position"
     GROUP BY LOWER(name)
     HAVING COUNT(*) > 1`,
  );

  if (duplicates.length === 0) {
    console.log("✓ 0 duplicate Position collisions (case-insensitive).");
    return;
  }

  console.log(
    `⚠ Found ${duplicates.length} case-insensitive Position collision group(s):\n`,
  );
  for (const d of duplicates) {
    console.log(`  • "${d.name_key}" → ${d.count} rows`);
    const rows = await prisma.position.findMany({
      where: { name: { mode: "insensitive", equals: d.name_key } },
      select: {
        id: true,
        name: true,
        department: true,
        createdAt: true,
        manual: { select: { id: true } },
        evaluations: { select: { id: true, title: true, status: true } },
      },
    });
    for (const r of rows) {
      const evalCount = r.evaluations.length;
      console.log(
        `      id=${r.id} name="${r.name}" department=${r.department ?? "∅"} createdAt=${r.createdAt.toISOString()} manual=${r.manual ? "yes" : "NONE"} evaluations=${evalCount}`,
      );
      if (evalCount > 0) {
        console.log(
          "        ⚠ STOP CONDITION: duplicate Position has dependent Evaluations — data repair is operator territory.",
        );
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
