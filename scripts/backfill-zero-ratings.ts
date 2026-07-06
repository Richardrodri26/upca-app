import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const r = await prisma.question.updateMany({
    where: { relevanceRating: 0 },
    data: { relevanceRating: null },
  });
  const c = await prisma.question.updateMany({
    where: { coherenceRating: 0 },
    data: { coherenceRating: null },
  });
  const a = await prisma.question.updateMany({
    where: { adequacyRating: 0 },
    data: { adequacyRating: null },
  });
  console.log(`Repaired: relevance=${r.count} coherence=${c.count} adequacy=${a.count}`);
}

main().then(() => process.exit(0));