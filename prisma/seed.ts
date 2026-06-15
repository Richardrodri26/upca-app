import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.$connect();
  console.log("🧹 Cleaning up existing seed data...");

  // Delete in reverse dependency order to avoid FK violations
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

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@upca.com",
      emailVerified: true,
      role: "ADMIN",
    },
  });
  await prisma.account.create({
    data: {
      accountId: admin.id,
      providerId: "credential",
      userId: admin.id,
      password: defaultPassword,
    },
  });

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

  console.log("🏢 Seeding positions...");

  const positions = await Promise.all([
    prisma.position.create({
      data: {
        name: "Desarrollador Senior",
        description:
          "Responsable del diseño, desarrollo y mantenimiento de aplicaciones web escalables. Mentor del equipo de desarrollo.",
        department: "Tecnologia",
      },
    }),
    prisma.position.create({
      data: {
        name: "Analista de QA",
        description:
          "Responsable de garantizar la calidad del software mediante pruebas automatizadas y manuales, reporte y seguimiento de bugs.",
        department: "Tecnologia",
      },
    }),
    prisma.position.create({
      data: {
        name: "Gerente de Proyectos",
        description:
          "Planifica, ejecuta y supervisa proyectos de desarrollo, gestionando recursos, plazos y comunicacion con stakeholders.",
        department: "Operaciones",
      },
    }),
  ]);

  console.log(`  ✅ ${positions.length} positions created`);

  console.log("📄 Seeding manuals...");

  const manuals = await Promise.all([
    prisma.manual.create({
      data: {
        fileName: "manual-desarrollador-senior-v2.pdf",
        status: "PROCESSED",
        externalRef: "rag-ref-dev-senior-001",
        positionId: positions[0].id,
        uploadedById: hr1.id,
      },
    }),
    prisma.manual.create({
      data: {
        fileName: "manual-analista-qa-v1.pdf",
        status: "PROCESSED",
        externalRef: "rag-ref-qa-001",
        positionId: positions[1].id,
        uploadedById: hr2.id,
      },
    }),
  ]);

  console.log(`  ✅ ${manuals.length} manuals created`);

  console.log("📊 Seeding evaluations...");

  const evaluation = await prisma.evaluation.create({
    data: {
      title: "Evaluacion Tecnica - Desarrollador Senior Q1 2026",
      status: "REVIEW",
      positionId: positions[0].id,
      manualId: manuals[0].id,
      createdById: hr1.id,
    },
  });

  console.log("  ✅ 1 evaluation created");

  console.log("❓ Seeding questions (10 for the evaluation)...");

  const questionData = [
    {
      text: "Demuestra conocimiento solido de patrones de diseno y arquitectura de software.",
      order: 1,
      status: "APPROVED" as const,
      relevanceRating: 5,
      coherenceRating: 4,
      adequacyRating: 5,
    },
    {
      text: "Capacidad para escribir codigo limpio, mantenible y bien documentado.",
      order: 2,
      status: "APPROVED" as const,
      relevanceRating: 5,
      coherenceRating: 5,
      adequacyRating: 4,
    },
    {
      text: "Habilidad para realizar code reviews efectivas y proporcionar feedback constructivo.",
      order: 3,
      status: "APPROVED" as const,
      relevanceRating: 4,
      coherenceRating: 5,
      adequacyRating: 4,
    },
    {
      text: "Experiencia en la implementacion de pruebas unitarias y de integracion.",
      order: 4,
      status: "APPROVED" as const,
      relevanceRating: 4,
      coherenceRating: 4,
      adequacyRating: 5,
    },
    {
      text: "Capacidad para estimar esfuerzos y cumplir con los plazos establecidos.",
      order: 5,
      status: "APPROVED" as const,
      relevanceRating: 5,
      coherenceRating: 4,
      adequacyRating: 4,
    },
    {
      text: "Mentorea activamente a desarrolladores junior y comparte conocimiento con el equipo.",
      order: 6,
      status: "APPROVED" as const,
      relevanceRating: 4,
      coherenceRating: 5,
      adequacyRating: 5,
    },
    {
      text: "Participa en la definicion de la arquitectura y toma de decisiones tecnicas del proyecto.",
      order: 7,
      status: "PENDING" as const,
    },
    {
      text: "Manejo de herramientas de CI/CD y despliegue continuo es satisfactorio.",
      order: 8,
      status: "PENDING" as const,
    },
    {
      text: "Demuestra liderazgo tecnico y capacidad para resolver problemas complejos de manera autonoma.",
      order: 9,
      status: "EDITED" as const,
      originalText:
        "Es un buen lider y resuelve problemas.",
    },
    {
      text: "Comunicacion efectiva con stakeholders no tecnicos.",
      order: 10,
      status: "REJECTED" as const,
    },
  ];

  const questions = await Promise.all(
    questionData.map((q) =>
      prisma.question.create({
        data: {
          ...q,
          evaluationId: evaluation.id,
        },
      }),
    ),
  );

  console.log(`  ✅ ${questions.length} questions created (6 approved, 2 pending, 1 edited, 1 rejected)`);

  console.log("📋 Seeding assignments...");

  const completedAssignment = await prisma.evaluationAssignment.create({
    data: {
      status: "COMPLETED",
      score: 78.5,
      completedAt: new Date("2026-03-15"),
      evaluationId: evaluation.id,
      employeeId: employees[0].id,
    },
  });

  const pendingAssignment = await prisma.evaluationAssignment.create({
    data: {
      status: "PENDING",
      evaluationId: evaluation.id,
      employeeId: employees[1].id,
    },
  });

  console.log("  ✅ 2 assignments created (1 completed, 1 pending)");

  console.log("📝 Seeding responses (for the completed assignment)...");

  // Create responses for the completed assignment (one per question, varied Likert values)
  const responseValues = [5, 4, 4, 5, 3, 4, 4, 5, 3, 4];

  const responses = await Promise.all(
    questions.map((q, i) =>
      prisma.response.create({
        data: {
          value: responseValues[i],
          questionId: q.id,
          assignmentId: completedAssignment.id,
        },
      }),
    ),
  );

  console.log(`  ✅ ${responses.length} responses created`);
  console.log("");
  console.log("🎉 Seed completed successfully!");
  console.log("");
  console.log("📧 Test accounts (password: password123):");
  console.log("   admin@upca.com     (ADMIN)");
  console.log("   hr1@upca.com       (HR)");
  console.log("   hr2@upca.com       (HR)");
  console.log("   juan@upca.com      (EMPLOYEE)");
  console.log("   ana@upca.com       (EMPLOYEE)");
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
