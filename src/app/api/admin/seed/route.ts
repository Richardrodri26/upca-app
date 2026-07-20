import { NextRequest, NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const RESET_SECRET = "f90a21ff04ed552361db54692277c381";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-reset-secret");
  if (auth !== RESET_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: "SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set" }, { status: 500 });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const defaultPassword = await hashPassword("password123");
    const adminHashed = await hashPassword(adminPassword);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { name: "Admin User", emailVerified: true, role: "ADMIN" },
      create: { name: "Admin User", email: adminEmail, emailVerified: true, role: "ADMIN" },
    });
    const existingAdminAccount = await prisma.account.findFirst({
      where: { userId: admin.id, providerId: "credential" },
    });
    if (existingAdminAccount) {
      await prisma.account.update({ where: { id: existingAdminAccount.id }, data: { password: adminHashed } });
    } else {
      await prisma.account.create({ data: { accountId: admin.id, providerId: "credential", userId: admin.id, password: adminHashed } });
    }

    const users = [
      { name: "Maria Garcia", email: "hr1@upca.com", role: "HR" as const },
      { name: "Carlos Lopez", email: "hr2@upca.com", role: "HR" as const },
      { name: "Sofia Ramirez", email: "arealead@upca.com", role: "AREA_LEAD" as const },
      { name: "Juan Perez", email: "juan@upca.com", role: "EMPLOYEE" as const },
      { name: "Ana Martinez", email: "ana@upca.com", role: "EMPLOYEE" as const },
      { name: "Pedro Rodriguez", email: "pedro@upca.com", role: "EMPLOYEE" as const },
      { name: "Laura Fernandez", email: "laura@upca.com", role: "EMPLOYEE" as const },
      { name: "Diego Gonzalez", email: "diego@upca.com", role: "EMPLOYEE" as const },
    ];

    for (const u of users) {
      const created = await prisma.user.create({ data: { name: u.name, email: u.email, emailVerified: true, role: u.role } });
      await prisma.account.create({ data: { accountId: created.id, providerId: "credential", userId: created.id, password: defaultPassword } });
    }

    return NextResponse.json({ ok: true, message: "Seed complete", admin: adminEmail });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
