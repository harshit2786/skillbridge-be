import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data (order matters for foreign keys)
  await prisma.source.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.quizQuestionResponse.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.courseQuestionCompletion.deleteMany();
  await prisma.courseProgress.deleteMany();
  await prisma.traineeProgress.deleteMany();
  await prisma.projectContent.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.course.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.project.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.trainee.deleteMany();
  await prisma.otp.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  // TRAINERS
  const trainer1 = await prisma.trainer.create({
    data: {
      email: "harshit.kumar.singh@nanoheal.com",
      name: "Harshit Kumar Singh",
      password,
    },
  });

  const trainer2 = await prisma.trainer.create({
    data: {
      email: "himanshu.narware@nanoheal.com",
      name: "Himanshu Narware",
      password,
    },
  });

  const trainer3 = await prisma.trainer.create({
    data: {
      email: "manan.manchanda@nanoheal.com",
      name: "Manan Manchanda",
      password,
    },
  });

  const trainer4 = await prisma.trainer.create({
    data: {
      email: "sreevatsan.s@unifie.io",
      name: "Sreevatsan",
      password,
    },
  });

  console.log("✅ Trainers created");

  // TRAINEES
  const trainee1 = await prisma.trainee.create({
    data: { phone: "9119109287", name: "Harshit Kumar Singh" },
  });

  const trainee2 = await prisma.trainee.create({
    data: { phone: "7772873295", name: "Himanshu Narware" },
  });

  const trainee3 = await prisma.trainee.create({
    data: { phone: "7424960882", name: "Manan Manchanda" },
  });

  const trainee4 = await prisma.trainee.create({
    data: { phone: "9606571189", name: "Sreevatsan" },
  });

  console.log("✅ Trainees created");

  const allTrainers = [
    { id: trainer1.id },
    { id: trainer2.id },
    { id: trainer3.id },
    { id: trainer4.id },
  ];

  const allTrainees = [
    { id: trainee1.id },
    { id: trainee2.id },
    { id: trainee3.id },
    { id: trainee4.id },
  ];

  // PROJECTS
  const project1 = await prisma.project.create({
    data: {
      name: "React JS",
      description:
        "Learn modern frontend development using React, hooks, component architecture, and state management.",
      adminId: trainer1.id,
      trainers: { connect: allTrainers },
      trainees: { connect: allTrainees },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Node JS",
      description:
        "Build scalable backend services using Node.js, Express, REST APIs, and authentication systems.",
      adminId: trainer2.id,
      trainers: { connect: allTrainers },
      trainees: { connect: allTrainees },
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "Postgres",
      description:
        "Master relational databases with PostgreSQL including schema design, indexing, and query optimization.",
      adminId: trainer3.id,
      trainers: { connect: allTrainers },
      trainees: { connect: allTrainees },
    },
  });

  const project4 = await prisma.project.create({
    data: {
      name: "NextJs",
      description:
        "Learn full-stack React development using Next.js including SSR, routing, APIs, and performance optimization.",
      adminId: trainer4.id,
      trainers: { connect: allTrainers },
      trainees: { connect: allTrainees },
    },
  });

  console.log("✅ Projects created");

  console.log("\n📋 Seed Summary:");
  console.log("─────────────────────────────────────────");

  console.log("TRAINERS (password: password123):");
  console.log(`${trainer1.name} → ${trainer1.email}`);
  console.log(`${trainer2.name} → ${trainer2.email}`);
  console.log(`${trainer3.name} → ${trainer3.email}`);
  console.log(`${trainer4.name} → ${trainer4.email}`);

  console.log("\nTRAINEES:");
  console.log(`${trainee1.name} → ${trainee1.phone}`);
  console.log(`${trainee2.name} → ${trainee2.phone}`);
  console.log(`${trainee3.name} → ${trainee3.phone}`);
  console.log(`${trainee4.name} → ${trainee4.phone}`);

  console.log("\nPROJECTS:");
  console.log(`${project1.name} (Admin: ${trainer1.name})`);
  console.log(`${project2.name} (Admin: ${trainer2.name})`);
  console.log(`${project3.name} (Admin: ${trainer3.name})`);
  console.log(`${project4.name} (Admin: ${trainer4.name})`);

  console.log("─────────────────────────────────────────");
  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });