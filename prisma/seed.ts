import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.quiz.deleteMany();
  await prisma.course.deleteMany();
  await prisma.project.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.trainee.deleteMany();

  // Create Trainers
  const password = await bcrypt.hash("password123", 10);

  const trainer1 = await prisma.trainer.create({
    data: {
      email: "john@example.com",
      name: "John Doe",
      password,
    },
  });

  const trainer2 = await prisma.trainer.create({
    data: {
      email: "jane@example.com",
      name: "Jane Smith",
      password,
    },
  });

  const trainer3 = await prisma.trainer.create({
    data: {
      email: "bob@example.com",
      name: "Bob Wilson",
      password,
    },
  });

  console.log("✅ Trainers created");

  // Create Trainees
  const trainee1 = await prisma.trainee.create({
    data: {
      phone: "9876543210",
      name: "Alice Brown",
    },
  });

  const trainee2 = await prisma.trainee.create({
    data: {
      phone: "9876543211",
      name: "Charlie Davis",
    },
  });

  const trainee3 = await prisma.trainee.create({
    data: {
      phone: "9876543212",
      name: "Eve Miller",
    },
  });

  console.log("✅ Trainees created");

  // Create a Project (trainer1 is admin)
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

  // Create another Project (trainer2 is admin)
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

  // Create Quizzes
  const quiz1 = await prisma.quiz.create({
    data: {
      name: "JavaScript Basics Quiz",
      description: "Test your JS knowledge",
      projectId: project1.id,
      published: true,
      creators: {
        connect: [{ id: trainer1.id }, { id: trainer2.id }],
      },
    },
  });

  const quiz2 = await prisma.quiz.create({
    data: {
      name: "React Quiz",
      description: "Test your React knowledge",
      projectId: project1.id,
      published: false,
      creators: {
        connect: [{ id: trainer2.id }],
      },
    },
  });

  console.log("✅ Quizzes created");

  // Create Courses
  const course1 = await prisma.course.create({
    data: {
      name: "Node.js Fundamentals",
      description: "Learn Node.js from scratch",
      projectId: project1.id,
      published: true,
      creators: {
        connect: [{ id: trainer1.id }],
      },
    },
  });

  const course2 = await prisma.course.create({
    data: {
      name: "Python for Data Science",
      description: "Python basics for data analysis",
      projectId: project2.id,
      published: false,
      creators: {
        connect: [{ id: trainer3.id }],
      },
    },
  });

  console.log("✅ Courses created");

  // Summary
  console.log("\n📋 Seed Summary:");
  console.log("─────────────────────────────────────────");
  console.log("TRAINERS (password: password123):");
  console.log(`  ${trainer1.name} → ${trainer1.email}`);
  console.log(`  ${trainer2.name} → ${trainer2.email}`);
  console.log(`  ${trainer3.name} → ${trainer3.email}`);
  console.log("\nTRAINEES:");
  console.log(`  ${trainee1.name} → ${trainee1.phone}`);
  console.log(`  ${trainee2.name} → ${trainee2.phone}`);
  console.log(`  ${trainee3.name} → ${trainee3.phone}`);
  console.log("\nPROJECTS:");
  console.log(`  ${project1.name} (Admin: ${trainer1.name})`);
  console.log(`  ${project2.name} (Admin: ${trainer2.name})`);
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
