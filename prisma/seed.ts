import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.$connect();
  console.log("🧹 Cleaning up existing data...");

  await prisma.response.deleteMany();
  await prisma.evaluationAssignment.deleteMany();
  await prisma.question.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.manual.deleteMany();
  await prisma.position.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log("👤 Seeding users...");

  // Create users with hashed passwords
  const defaultPassword = await hashPassword("password123");

  // First-admin bootstrap: env-driven + idempotent (upsert by email).
  // Demo users below keep their demo password; the admin credentials come
  // from the environment so no real value is hardcoded in source.
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set to bootstrap the first admin. Add them to your .env.",
    );
  }
  const adminHashed = await hashPassword(adminPassword);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: "Admin User", emailVerified: true, role: "ADMIN" },
    create: {
      name: "Admin User",
      email: adminEmail,
      emailVerified: true,
      role: "ADMIN",
    },
  });
  const existingAdminAccount = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: "credential" },
  });
  if (existingAdminAccount) {
    await prisma.account.update({
      where: { id: existingAdminAccount.id },
      data: { password: adminHashed },
    });
  } else {
    await prisma.account.create({
      data: {
        accountId: admin.id,
        providerId: "credential",
        userId: admin.id,
        password: adminHashed,
      },
    });
  }

  const hr1 = await prisma.user.create({
    data: {
      name: "Maria Garcia",
      email: "hr1@upca.com",
      emailVerified: true,
      role: "HR",
    },
  });
  await prisma.account.create({
    data: {
      accountId: hr1.id,
      providerId: "credential",
      userId: hr1.id,
      password: defaultPassword,
    },
  });

  const hr2 = await prisma.user.create({
    data: {
      name: "Carlos Lopez",
      email: "hr2@upca.com",
      emailVerified: true,
      role: "HR",
    },
  });
  await prisma.account.create({
    data: {
      accountId: hr2.id,
      providerId: "credential",
      userId: hr2.id,
      password: defaultPassword,
    },
  });

  // 5 employees
  const employeeData = [
    { name: "Juan Perez", email: "juan@upca.com" },
    { name: "Ana Martinez", email: "ana@upca.com" },
    { name: "Pedro Rodriguez", email: "pedro@upca.com" },
    { name: "Laura Fernandez", email: "laura@upca.com" },
    { name: "Diego Gonzalez", email: "diego@upca.com" },
  ];

  const employees = await Promise.all(
    employeeData.map(async (emp) => {
      const user = await prisma.user.create({
        data: {
          name: emp.name,
          email: emp.email,
          emailVerified: true,
          role: "EMPLOYEE",
        },
      });
      await prisma.account.create({
        data: {
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: defaultPassword,
        },
      });
      return user;
    }),
  );

  console.log(`  ✅ ${3 + employees.length} users created`);
  console.log("");
  console.log("🎉 Seed completado!");
  console.log("");
  console.log("📧 Cuentas de prueba (contraseña: password123):");
  console.log(
    `   ${adminEmail}  (ADMIN, contraseña desde SEED_ADMIN_PASSWORD)`,
  );
  console.log("   hr1@upca.com       (HR)");
  console.log("   hr2@upca.com       (HR)");
  console.log("   juan@upca.com      (EMPLOYEE)");
  console.log("   ana@upca.com       (EMPLOYEE)");
  console.log("");
  console.log(
    "ℹ️  Cargos, manuales y evaluaciones se crean desde la app conectada al RAG.",
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
