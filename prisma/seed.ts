import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data (order matters for foreign keys)
  await prisma.projectContent.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.course.deleteMany();
  await prisma.project.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.trainee.deleteMany();
  await prisma.otp.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  const trainer1 = await prisma.trainer.create({
    data: { email: "john@example.com", name: "John Doe", password },
  });

  const trainer2 = await prisma.trainer.create({
    data: { email: "jane@example.com", name: "Jane Smith", password },
  });

  const trainer3 = await prisma.trainer.create({
    data: { email: "bob@example.com", name: "Bob Wilson", password },
  });

  console.log("✅ Trainers created");

  const trainee1 = await prisma.trainee.create({
    data: { phone: "9876543210", name: "Alice Brown" },
  });

  const trainee2 = await prisma.trainee.create({
    data: { phone: "9876543211", name: "Charlie Davis" },
  });

  const trainee3 = await prisma.trainee.create({
    data: { phone: "9876543212", name: "Eve Miller" },
  });

  console.log("✅ Trainees created");

  const project1 = await prisma.project.create({
    data: {
      name: "Full Stack Development",
      description: "Learn full stack web development",
      adminId: trainer1.id,
      trainers: {
        connect: [{ id: trainer1.id }, { id: trainer2.id }],
      },
      trainees: {
        connect: [{ id: trainee1.id }, { id: trainee2.id }],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Data Science Bootcamp",
      description: "Master data science fundamentals",
      adminId: trainer2.id,
      trainers: {
        connect: [{ id: trainer2.id }, { id: trainer3.id }],
      },
      trainees: {
        connect: [{ id: trainee2.id }, { id: trainee3.id }],
      },
    },
  });

  console.log("✅ Projects created");

  // Project 1 content: Course1 -> Quiz1 -> Course2 -> Quiz2
  const course1 = await prisma.course.create({
    data: {
      name: "Node.js Fundamentals",
      description: "Learn Node.js from scratch",
      projectId: project1.id,
      published: true,
      creators: { connect: [{ id: trainer1.id }] },
    },
  });

  const quiz1 = await prisma.quiz.create({
    data: {
      name: "JavaScript Basics Quiz",
      description: "Test your JS knowledge",
      projectId: project1.id,
      published: true,
      creators: { connect: [{ id: trainer1.id }, { id: trainer2.id }] },
    },
  });

  const course2 = await prisma.course.create({
    data: {
      name: "Express.js Deep Dive",
      description: "Master Express.js",
      projectId: project1.id,
      published: false,
      creators: { connect: [{ id: trainer2.id }] },
    },
  });

  const quiz2 = await prisma.quiz.create({
    data: {
      name: "React Quiz",
      description: "Test your React knowledge",
      projectId: project1.id,
      published: false,
      creators: { connect: [{ id: trainer2.id }] },
    },
  });

  // Create ordered content for project 1
  await prisma.projectContent.createMany({
    data: [
      { projectId: project1.id, type: "COURSE", courseId: course1.id, position: 1 },
      { projectId: project1.id, type: "QUIZ", quizId: quiz1.id, position: 2 },
      { projectId: project1.id, type: "COURSE", courseId: course2.id, position: 3 },
      { projectId: project1.id, type: "QUIZ", quizId: quiz2.id, position: 4 },
    ],
  });

  // Project 2 content
  const course3 = await prisma.course.create({
    data: {
      name: "Python for Data Science",
      description: "Python basics for data analysis",
      projectId: project2.id,
      published: true,
      creators: { connect: [{ id: trainer3.id }] },
    },
  });

  const quiz3 = await prisma.quiz.create({
    data: {
      name: "Python Basics Quiz",
      description: "Test your Python knowledge",
      projectId: project2.id,
      published: true,
      creators: { connect: [{ id: trainer2.id }] },
    },
  });

  await prisma.projectContent.createMany({
    data: [
      { projectId: project2.id, type: "COURSE", courseId: course3.id, position: 1 },
      { projectId: project2.id, type: "QUIZ", quizId: quiz3.id, position: 2 },
    ],
  });

  console.log("✅ Courses, Quizzes & Content Order created");

  console.log("\n📋 Seed Summary:");
  console.log("─────────────────────────────────────────");
  console.log("TRAINERS (password: password123):");
  console.log(`  ${trainer1.name} → ${trainer1.email}`);
  console.log(`  ${trainer2.name} → ${trainer2.email}`);
  console.log(`  ${trainer3.name} → ${trainer3.email}`);
  console.log("\nTRAINEES (use OTP flow):");
  console.log(`  ${trainee1.name} → ${trainee1.phone}`);
  console.log(`  ${trainee2.name} → ${trainee2.phone}`);
  console.log(`  ${trainee3.name} → ${trainee3.phone}`);
  console.log("\nPROJECTS:");
  console.log(`  ${project1.name} (Admin: ${trainer1.name})`);
  console.log(`    Order: ${course1.name} → ${quiz1.name} → ${course2.name} → ${quiz2.name}`);
  console.log(`  ${project2.name} (Admin: ${trainer2.name})`);
  console.log(`    Order: ${course3.name} → ${quiz3.name}`);
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