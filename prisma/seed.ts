import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const existing = await prisma.trainer.count();
  if (existing > 0) {
    console.log("⏭️  Database already seeded, skipping.");
    return;
  }

  // Clean existing data (order matters for foreign keys)
  await prisma.source.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.webinarRegistration.deleteMany();
  await prisma.webinar.deleteMany();
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

  // DEMO ACCOUNTS (for guest access)
  const demoTrainer = await prisma.trainer.create({
    data: {
      email: "demo@skillbridge.com",
      name: "Demo Trainer",
      password: await bcrypt.hash("demo123", 10),
    },
  });

  const demoTrainee = await prisma.trainee.create({
    data: { phone: "0000000000", name: "Demo Trainee" },
  });

  console.log("✅ Demo accounts created");

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

  // DEMO PROJECT (visible to guest accounts)
  const demoProject = await prisma.project.create({
    data: {
      name: "Demo Project — SkillBridge Tour",
      description:
        "Explore SkillBridge as a guest! This project gives you a feel for how courses, webinars, resources, and quizzes work in a real training program.",
      adminId: demoTrainer.id,
      trainers: {
        connect: [
          { id: demoTrainer.id },
          { id: trainer1.id },
          { id: trainer2.id },
        ],
      },
      trainees: {
        connect: [
          { id: demoTrainee.id },
          { id: trainee1.id },
          { id: trainee2.id },
        ],
      },
    },
  });

  console.log("✅ Projects created");

  // ─── DEMO PROJECT: Course ─────────────────────────────────────────────────

  const demoCourse = await prisma.course.create({
    data: {
      name: "Getting Started with SkillBridge",
      description: "A quick tour of the platform — learn how courses, quizzes, and webinars work.",
      projectId: demoProject.id,
      published: true,
      creators: { connect: [{ id: demoTrainer.id }] },
    },
  });

  // Section 0 — Welcome
  const demoCourseSection0 = await prisma.courseSection.create({
    data: {
      courseId: demoCourse.id,
      title: "Welcome to SkillBridge",
      description: "An overview of what this platform does.",
      order: 0,
    },
  });

  await prisma.courseQuestion.createMany({
    data: [
      {
        sectionId: demoCourseSection0.id,
        type: "content_block",
        question: "Introduction",
        points: 0,
        order: 0,
        data: {
          content: "<h2>Welcome to SkillBridge!</h2><p>SkillBridge is a Learning Management System (LMS) built for organisations to train their employees. Here's what you can do:</p><ul><li><strong>Courses</strong> — step-by-step learning modules with interactive questions</li><li><strong>Quizzes</strong> — graded assessments to test your knowledge</li><li><strong>Webinars</strong> — live Zoom sessions hosted by trainers</li><li><strong>AI Playground</strong> — ask questions against the project's knowledge base</li></ul><p>Let's go through a quick tour. Answer the questions in each section to advance.</p>",
        },
      },
      {
        sectionId: demoCourseSection0.id,
        type: "mcq",
        question: "What is the primary purpose of SkillBridge?",
        points: 5,
        order: 1,
        data: {
          options: [
            { id: "a", text: "Social media for learners", isCorrect: false },
            { id: "b", text: "Employee training and learning management", isCorrect: true },
            { id: "c", text: "Project management software", isCorrect: false },
            { id: "d", text: "Video conferencing", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
      {
        sectionId: demoCourseSection0.id,
        type: "true_false",
        question: "SkillBridge allows trainees to take quizzes and track their own progress.",
        points: 5,
        order: 2,
        data: { correctAnswer: true },
      },
    ],
  });

  // Section 1 — Courses & Quizzes
  const demoCourseSection1 = await prisma.courseSection.create({
    data: {
      courseId: demoCourse.id,
      title: "Courses and Quizzes",
      description: "Understanding how learning content is structured.",
      order: 1,
    },
  });

  await prisma.courseQuestion.createMany({
    data: [
      {
        sectionId: demoCourseSection1.id,
        type: "content_block",
        question: "How Content Works",
        points: 0,
        order: 0,
        data: {
          content: "<h2>Courses vs Quizzes</h2><p><strong>Courses</strong> walk you through material section by section. Each section can have content blocks (like this one), MCQ questions, true/false questions, and fill-in-the-blank exercises. You advance by answering questions correctly.</p><p><strong>Quizzes</strong> are standalone assessments. They are graded — your trainer sets a passing percentage. Some answers are auto-graded; long-answer questions can be graded by AI.</p><p>Both courses and quizzes are part of a project's <em>Learning Path</em>, which defines the order you complete them in.</p>",
        },
      },
      {
        sectionId: demoCourseSection1.id,
        type: "fill_ups",
        question: "Fill in the blank",
        points: 5,
        order: 1,
        data: {
          template: "A *quiz* is a graded assessment, while a *course* is a step-by-step learning module.",
          blanks: [
            { index: 0, answer: "quiz" },
            { index: 1, answer: "course" },
          ],
        },
      },
      {
        sectionId: demoCourseSection1.id,
        type: "mcq",
        question: "Which question type requires a trainer or AI to grade the response?",
        points: 5,
        order: 2,
        data: {
          options: [
            { id: "a", text: "Multiple Choice (MCQ)", isCorrect: false },
            { id: "b", text: "True / False", isCorrect: false },
            { id: "c", text: "Fill in the Blanks", isCorrect: false },
            { id: "d", text: "Long Answer", isCorrect: true },
          ],
          shuffleOptions: true,
        },
      },
    ],
  });

  // Section 2 — Webinars & AI
  const demoCourseSection2 = await prisma.courseSection.create({
    data: {
      courseId: demoCourse.id,
      title: "Webinars and AI Playground",
      description: "Live sessions and intelligent Q&A.",
      order: 2,
    },
  });

  await prisma.courseQuestion.createMany({
    data: [
      {
        sectionId: demoCourseSection2.id,
        type: "content_block",
        question: "Live Features",
        points: 0,
        order: 0,
        data: {
          content: "<h2>Webinars</h2><p>Trainers can schedule live Zoom sessions directly from SkillBridge. Once a webinar is created, trainees can register and receive a join link by email. Upcoming webinars appear on your dashboard.</p><h2>AI Playground</h2><p>Each project has an AI Playground where you can ask questions about the training material. The AI searches through uploaded knowledge base documents (PDFs) and answers using relevant context — like a smart assistant that has read all your course materials.</p>",
        },
      },
      {
        sectionId: demoCourseSection2.id,
        type: "true_false",
        question: "Trainees receive a Zoom join link by email when they register for a webinar.",
        points: 5,
        order: 1,
        data: { correctAnswer: true },
      },
      {
        sectionId: demoCourseSection2.id,
        type: "mcq",
        question: "What does the AI Playground use to answer trainee questions?",
        points: 5,
        order: 2,
        data: {
          options: [
            { id: "a", text: "General internet search results", isCorrect: false },
            { id: "b", text: "The project's uploaded knowledge base documents", isCorrect: true },
            { id: "c", text: "Previous trainee chat logs", isCorrect: false },
            { id: "d", text: "The trainer's personal notes", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
    ],
  });

  console.log("✅ Demo course created");

  // ─── DEMO PROJECT: Quiz ───────────────────────────────────────────────────

  const demoQuiz = await prisma.quiz.create({
    data: {
      name: "SkillBridge Platform Knowledge Check",
      description: "Test your understanding of the SkillBridge platform after completing the tour course.",
      projectId: demoProject.id,
      published: true,
      passingPercent: 60,
      creators: { connect: [{ id: demoTrainer.id }] },
    },
  });

  const demoQuizSection0 = await prisma.quizSection.create({
    data: {
      quizId: demoQuiz.id,
      title: "Platform Overview",
      description: "Questions about the core features of SkillBridge.",
      order: 0,
    },
  });

  await prisma.question.createMany({
    data: [
      {
        sectionId: demoQuizSection0.id,
        type: "mcq",
        question: "Which role has permission to create webinars in a project?",
        points: 10,
        order: 0,
        data: {
          options: [
            { id: "a", text: "Any trainer in the project", isCorrect: false },
            { id: "b", text: "Only the project admin", isCorrect: true },
            { id: "c", text: "Any registered trainee", isCorrect: false },
            { id: "d", text: "Any user with an account", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
      {
        sectionId: demoQuizSection0.id,
        type: "true_false",
        question: "A trainee can register for the same webinar more than once.",
        points: 10,
        order: 1,
        data: { correctAnswer: false },
      },
      {
        sectionId: demoQuizSection0.id,
        type: "mcq",
        question: "What happens when a trainee completes all content in a project's learning path?",
        points: 10,
        order: 2,
        data: {
          options: [
            { id: "a", text: "Nothing — there's no tracking", isCorrect: false },
            { id: "b", text: "Their progress is marked complete in the project", isCorrect: true },
            { id: "c", text: "They are removed from the project", isCorrect: false },
            { id: "d", text: "A new project is automatically assigned", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
      {
        sectionId: demoQuizSection0.id,
        type: "fill_ups",
        question: "Fill in the blank",
        points: 10,
        order: 3,
        data: {
          template: "The minimum score required to pass a quiz is defined by the *passingPercent* field set by the trainer.",
          blanks: [{ index: 0, answer: "passingPercent" }],
        },
      },
    ],
  });

  const demoQuizSection1 = await prisma.quizSection.create({
    data: {
      quizId: demoQuiz.id,
      title: "Deep Dive",
      description: "A longer answer question to demonstrate AI grading.",
      order: 1,
    },
  });

  await prisma.question.create({
    data: {
      sectionId: demoQuizSection1.id,
      type: "long_answer",
      question: "In your own words, describe the difference between a Course and a Quiz in SkillBridge, and explain when you would use each one.",
      points: 20,
      order: 0,
      data: {
        rubric: [
          { id: "r1", title: "Defines Course correctly", description: "Explains that a course is a step-by-step learning module with sections and interactive questions.", weight: 40 },
          { id: "r2", title: "Defines Quiz correctly", description: "Explains that a quiz is a graded standalone assessment with a passing score.", weight: 40 },
          { id: "r3", title: "Use-case distinction", description: "Gives a clear, logical reason for when to use each.", weight: 20 },
        ],
        goldenSolution: "A Course is a structured learning module broken into sections. It walks the trainee through content step by step, with interactive questions (MCQ, fill-ups, etc.) to check understanding as they go. A Quiz is a standalone graded assessment — the trainee completes all questions and receives a score against a passing threshold. You'd use a Course to teach new material and a Quiz to formally assess how well the trainee has learned it.",
      },
    },
  });

  console.log("✅ Demo quiz created");

  // ─── DEMO PROJECT: ProjectContent (learning path order) ───────────────────

  await prisma.projectContent.createMany({
    data: [
      { projectId: demoProject.id, type: "COURSE", courseId: demoCourse.id, position: 0 },
      { projectId: demoProject.id, type: "QUIZ",   quizId: demoQuiz.id,   position: 1 },
    ],
  });

  console.log("✅ Demo project learning path created");

  // ─── DEMO PROJECT (JAPANESE): Project ────────────────────────────────────

  const demoProjectJa = await prisma.project.create({
    data: {
      name: "デモプロジェクト — SkillBridgeツアー",
      description:
        "ゲストとしてSkillBridgeを体験しましょう！このプロジェクトでは、実際のトレーニングプログラムにおけるコース、ウェビナー、リソース、クイズの使い方をご紹介します。",
      adminId: demoTrainer.id,
      trainers: {
        connect: [
          { id: demoTrainer.id },
          { id: trainer1.id },
          { id: trainer2.id },
        ],
      },
      trainees: {
        connect: [
          { id: demoTrainee.id },
          { id: trainee1.id },
          { id: trainee2.id },
        ],
      },
    },
  });

  // ─── DEMO PROJECT (JAPANESE): Course ─────────────────────────────────────

  const demoCourseJa = await prisma.course.create({
    data: {
      name: "SkillBridgeをはじめよう",
      description:
        "プラットフォームのクイックツアー — コース、クイズ、ウェビナーの仕組みを学びます。",
      projectId: demoProjectJa.id,
      published: true,
      creators: { connect: [{ id: demoTrainer.id }] },
    },
  });

  // Section 0 — ようこそ
  const demoCourseSection0Ja = await prisma.courseSection.create({
    data: {
      courseId: demoCourseJa.id,
      title: "SkillBridgeへようこそ",
      description: "このプラットフォームの概要です。",
      order: 0,
    },
  });

  await prisma.courseQuestion.createMany({
    data: [
      {
        sectionId: demoCourseSection0Ja.id,
        type: "content_block",
        question: "はじめに",
        points: 0,
        order: 0,
        data: {
          content:
            "<h2>SkillBridgeへようこそ！</h2><p>SkillBridgeは、企業が従業員を育成するために構築されたLMS（学習管理システム）です。主な機能は以下の通りです：</p><ul><li><strong>コース</strong> — インタラクティブな問題を含むステップバイステップの学習モジュール</li><li><strong>クイズ</strong> — 知識を測る採点付きアセスメント</li><li><strong>ウェビナー</strong> — トレーナーが主催するライブZoomセッション</li><li><strong>AIプレイグラウンド</strong> — プロジェクトのナレッジベースに対して質問できるAIアシスタント</li></ul><p>さっそくクイックツアーを始めましょう。各セクションの問題に答えながら先へ進みます。</p>",
        },
      },
      {
        sectionId: demoCourseSection0Ja.id,
        type: "mcq",
        question: "SkillBridgeの主な目的は何ですか？",
        points: 5,
        order: 1,
        data: {
          options: [
            { id: "a", text: "学習者向けのSNS", isCorrect: false },
            { id: "b", text: "従業員研修と学習管理", isCorrect: true },
            { id: "c", text: "プロジェクト管理ソフトウェア", isCorrect: false },
            { id: "d", text: "ビデオ会議ツール", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
      {
        sectionId: demoCourseSection0Ja.id,
        type: "true_false",
        question:
          "SkillBridgeでは、受講者がクイズを受けたり自分の進捗を確認したりすることができます。",
        points: 5,
        order: 2,
        data: { correctAnswer: true },
      },
    ],
  });

  // Section 1 — コースとクイズ
  const demoCourseSection1Ja = await prisma.courseSection.create({
    data: {
      courseId: demoCourseJa.id,
      title: "コースとクイズ",
      description: "学習コンテンツの構成について理解します。",
      order: 1,
    },
  });

  await prisma.courseQuestion.createMany({
    data: [
      {
        sectionId: demoCourseSection1Ja.id,
        type: "content_block",
        question: "コンテンツの仕組み",
        points: 0,
        order: 0,
        data: {
          content:
            "<h2>コースとクイズの違い</h2><p><strong>コース</strong>は、セクションごとに内容を学んでいく形式です。各セクションにはコンテンツブロック、MCQ問題、○×問題、穴埋め問題などを含めることができます。問題に正解することで次のセクションに進めます。</p><p><strong>クイズ</strong>は単独の採点付きアセスメントです。トレーナーが合格ラインを設定し、MCQ・○×は自動採点、記述式問題はAIが採点します。</p><p>コースとクイズはどちらもプロジェクトの<em>学習パス</em>に含まれ、決められた順番で取り組みます。</p>",
        },
      },
      {
        sectionId: demoCourseSection1Ja.id,
        type: "fill_ups",
        question: "空欄を埋めてください",
        points: 5,
        order: 1,
        data: {
          template:
            "*クイズ*は採点付きのアセスメントで、*コース*はステップバイステップの学習モジュールです。",
          blanks: [
            { index: 0, answer: "クイズ" },
            { index: 1, answer: "コース" },
          ],
        },
      },
      {
        sectionId: demoCourseSection1Ja.id,
        type: "mcq",
        question: "トレーナーまたはAIによる採点が必要な問題形式はどれですか？",
        points: 5,
        order: 2,
        data: {
          options: [
            { id: "a", text: "多肢選択問題（MCQ）", isCorrect: false },
            { id: "b", text: "○×問題", isCorrect: false },
            { id: "c", text: "穴埋め問題", isCorrect: false },
            { id: "d", text: "記述式問題", isCorrect: true },
          ],
          shuffleOptions: true,
        },
      },
    ],
  });

  // Section 2 — ウェビナーとAI
  const demoCourseSection2Ja = await prisma.courseSection.create({
    data: {
      courseId: demoCourseJa.id,
      title: "ウェビナーとAIプレイグラウンド",
      description: "ライブセッションとインテリジェントなQ&A。",
      order: 2,
    },
  });

  await prisma.courseQuestion.createMany({
    data: [
      {
        sectionId: demoCourseSection2Ja.id,
        type: "content_block",
        question: "ライブ機能",
        points: 0,
        order: 0,
        data: {
          content:
            "<h2>ウェビナー</h2><p>トレーナーはSkillBridgeから直接ライブZoomセッションをスケジュールできます。ウェビナーが作成されると、受講者は登録してメールで参加リンクを受け取ることができます。今後のウェビナーはダッシュボードに表示されます。</p><h2>AIプレイグラウンド</h2><p>各プロジェクトにはAIプレイグラウンドがあり、研修資料について質問することができます。AIはアップロードされたナレッジベースのPDFを検索し、関連する情報をもとに回答します。まるで資料を全部読んだスマートアシスタントのようです。</p>",
        },
      },
      {
        sectionId: demoCourseSection2Ja.id,
        type: "true_false",
        question:
          "受講者はウェビナーに登録すると、メールでZoom参加リンクを受け取ります。",
        points: 5,
        order: 1,
        data: { correctAnswer: true },
      },
      {
        sectionId: demoCourseSection2Ja.id,
        type: "mcq",
        question: "AIプレイグラウンドは何を使って受講者の質問に答えますか？",
        points: 5,
        order: 2,
        data: {
          options: [
            { id: "a", text: "一般的なインターネット検索結果", isCorrect: false },
            { id: "b", text: "プロジェクトにアップロードされたナレッジベースの文書", isCorrect: true },
            { id: "c", text: "過去の受講者のチャットログ", isCorrect: false },
            { id: "d", text: "トレーナーの個人メモ", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
    ],
  });

  console.log("✅ Demo course (Japanese) created");

  // ─── DEMO PROJECT (JAPANESE): Quiz ───────────────────────────────────────

  const demoQuizJa = await prisma.quiz.create({
    data: {
      name: "SkillBridgeプラットフォーム確認テスト",
      description:
        "ツアーコース修了後に、SkillBridgeプラットフォームの理解度をテストします。",
      projectId: demoProjectJa.id,
      published: true,
      passingPercent: 60,
      creators: { connect: [{ id: demoTrainer.id }] },
    },
  });

  const demoQuizSection0Ja = await prisma.quizSection.create({
    data: {
      quizId: demoQuizJa.id,
      title: "プラットフォーム概要",
      description: "SkillBridgeの主要機能に関する問題です。",
      order: 0,
    },
  });

  await prisma.question.createMany({
    data: [
      {
        sectionId: demoQuizSection0Ja.id,
        type: "mcq",
        question: "プロジェクト内でウェビナーを作成できるのは誰ですか？",
        points: 10,
        order: 0,
        data: {
          options: [
            { id: "a", text: "プロジェクト内のすべてのトレーナー", isCorrect: false },
            { id: "b", text: "プロジェクト管理者のみ", isCorrect: true },
            { id: "c", text: "登録済みの受講者", isCorrect: false },
            { id: "d", text: "アカウントを持つすべてのユーザー", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
      {
        sectionId: demoQuizSection0Ja.id,
        type: "true_false",
        question: "受講者は同じウェビナーに複数回登録することができます。",
        points: 10,
        order: 1,
        data: { correctAnswer: false },
      },
      {
        sectionId: demoQuizSection0Ja.id,
        type: "mcq",
        question:
          "受講者がプロジェクトの学習パスのすべてのコンテンツを修了するとどうなりますか？",
        points: 10,
        order: 2,
        data: {
          options: [
            { id: "a", text: "何も起こらない — 進捗の追跡はない", isCorrect: false },
            { id: "b", text: "プロジェクト内で進捗が完了とマークされる", isCorrect: true },
            { id: "c", text: "プロジェクトから削除される", isCorrect: false },
            { id: "d", text: "新しいプロジェクトが自動的に割り当てられる", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
      {
        sectionId: demoQuizSection0Ja.id,
        type: "fill_ups",
        question: "空欄を埋めてください",
        points: 10,
        order: 3,
        data: {
          template:
            "クイズの合格に必要な最低スコアは、トレーナーが設定する *passingPercent* フィールドで定義されます。",
          blanks: [{ index: 0, answer: "passingPercent" }],
        },
      },
    ],
  });

  const demoQuizSection1Ja = await prisma.quizSection.create({
    data: {
      quizId: demoQuizJa.id,
      title: "詳細問題",
      description: "AI採点のデモとなる記述式問題です。",
      order: 1,
    },
  });

  await prisma.question.create({
    data: {
      sectionId: demoQuizSection1Ja.id,
      type: "long_answer",
      question:
        "SkillBridgeにおける「コース」と「クイズ」の違いを自分の言葉で説明し、それぞれをどのような場面で使うかを述べてください。",
      points: 20,
      order: 0,
      data: {
        rubric: [
          {
            id: "r1",
            title: "コースの正確な定義",
            description:
              "コースがセクションとインタラクティブな問題で構成されたステップバイステップの学習モジュールであることを説明している。",
            weight: 40,
          },
          {
            id: "r2",
            title: "クイズの正確な定義",
            description:
              "クイズが合格スコアを持つ単独の採点付きアセスメントであることを説明している。",
            weight: 40,
          },
          {
            id: "r3",
            title: "使い分けの説明",
            description: "それぞれをどのような場面で使うかを明確かつ論理的に述べている。",
            weight: 20,
          },
        ],
        goldenSolution:
          "コースはセクションに分かれた構造化された学習モジュールです。受講者はコンテンツをステップバイステップで学び、MCQや穴埋めなどのインタラクティブな問題で理解度を確認しながら進みます。クイズは単独の採点付きアセスメントで、受講者はすべての問題を解いて合格ラインに対するスコアを受け取ります。新しい内容を教えるにはコースを、受講者がどれだけ学習内容を身につけたかを正式に評価するにはクイズを使います。",
      },
    },
  });

  console.log("✅ Demo quiz (Japanese) created");

  // ─── DEMO PROJECT (JAPANESE): ProjectContent (learning path) ─────────────

  await prisma.projectContent.createMany({
    data: [
      { projectId: demoProjectJa.id, type: "COURSE", courseId: demoCourseJa.id, position: 0 },
      { projectId: demoProjectJa.id, type: "QUIZ", quizId: demoQuizJa.id, position: 1 },
    ],
  });

  console.log("✅ Demo project (Japanese) learning path created");

  // ─── REACT JS PROJECT: Course ─────────────────────────────────────────────

  const reactCourse = await prisma.course.create({
    data: {
      name: "React Fundamentals",
      description: "Core concepts of React — components, state, props, and hooks.",
      projectId: project1.id,
      published: true,
      creators: { connect: [{ id: trainer1.id }] },
    },
  });

  const reactSection0 = await prisma.courseSection.create({
    data: {
      courseId: reactCourse.id,
      title: "Components and JSX",
      description: "The building blocks of every React application.",
      order: 0,
    },
  });

  await prisma.courseQuestion.createMany({
    data: [
      {
        sectionId: reactSection0.id,
        type: "content_block",
        question: "What is a Component?",
        points: 0,
        order: 0,
        data: {
          content: "<h2>React Components</h2><p>A React <strong>component</strong> is a reusable piece of UI. Components can be written as functions that return JSX — a syntax extension that looks like HTML but is transpiled to JavaScript.</p><pre><code>function Greeting({ name }) {\n  return &lt;h1&gt;Hello, {name}!&lt;/h1&gt;;\n}</code></pre><p>Components can be composed together to build complex UIs. Each component manages its own logic and rendering.</p>",
        },
      },
      {
        sectionId: reactSection0.id,
        type: "mcq",
        question: "What does JSX stand for?",
        points: 5,
        order: 1,
        data: {
          options: [
            { id: "a", text: "JavaScript XML", isCorrect: true },
            { id: "b", text: "Java Syntax Extension", isCorrect: false },
            { id: "c", text: "JSON with XML", isCorrect: false },
            { id: "d", text: "JavaScript eXtended", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
      {
        sectionId: reactSection0.id,
        type: "true_false",
        question: "React components must always return a single root element (or a Fragment).",
        points: 5,
        order: 2,
        data: { correctAnswer: true },
      },
    ],
  });

  const reactSection1 = await prisma.courseSection.create({
    data: {
      courseId: reactCourse.id,
      title: "State and Hooks",
      description: "Managing dynamic data with useState and useEffect.",
      order: 1,
    },
  });

  await prisma.courseQuestion.createMany({
    data: [
      {
        sectionId: reactSection1.id,
        type: "content_block",
        question: "React Hooks",
        points: 0,
        order: 0,
        data: {
          content: "<h2>Hooks</h2><p>Hooks let functional components use state and other React features. The two most common hooks are:</p><ul><li><strong>useState</strong> — adds local state to a component. Returns a value and a setter function.</li><li><strong>useEffect</strong> — runs side effects (data fetching, subscriptions) after renders.</li></ul><pre><code>const [count, setCount] = useState(0);\n\nuseEffect(() => {\n  document.title = `Count: ${count}`;\n}, [count]);</code></pre>",
        },
      },
      {
        sectionId: reactSection1.id,
        type: "mcq",
        question: "Which hook would you use to fetch data from an API when a component mounts?",
        points: 5,
        order: 1,
        data: {
          options: [
            { id: "a", text: "useState", isCorrect: false },
            { id: "b", text: "useContext", isCorrect: false },
            { id: "c", text: "useEffect", isCorrect: true },
            { id: "d", text: "useRef", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
      {
        sectionId: reactSection1.id,
        type: "fill_ups",
        question: "Fill in the blank",
        points: 5,
        order: 2,
        data: {
          template: "The *useState* hook returns an array with the current value and a *setter* function.",
          blanks: [
            { index: 0, answer: "useState" },
            { index: 1, answer: "setter" },
          ],
        },
      },
    ],
  });

  console.log("✅ React JS course created");

  // ─── REACT JS PROJECT: Quiz ───────────────────────────────────────────────

  const reactQuiz = await prisma.quiz.create({
    data: {
      name: "React Knowledge Check",
      description: "Assess your understanding of React fundamentals — components, hooks, and state management.",
      projectId: project1.id,
      published: true,
      passingPercent: 70,
      creators: { connect: [{ id: trainer1.id }] },
    },
  });

  const reactQuizSection0 = await prisma.quizSection.create({
    data: {
      quizId: reactQuiz.id,
      title: "Core Concepts",
      order: 0,
    },
  });

  await prisma.question.createMany({
    data: [
      {
        sectionId: reactQuizSection0.id,
        type: "mcq",
        question: "What is the correct way to update state in a React functional component?",
        points: 10,
        order: 0,
        data: {
          options: [
            { id: "a", text: "Directly assign: state = newValue", isCorrect: false },
            { id: "b", text: "Call the setter from useState: setState(newValue)", isCorrect: true },
            { id: "c", text: "Use this.setState()", isCorrect: false },
            { id: "d", text: "Modify the component's props", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
      {
        sectionId: reactQuizSection0.id,
        type: "true_false",
        question: "Props in React are mutable — a child component can modify the props it receives.",
        points: 10,
        order: 1,
        data: { correctAnswer: false },
      },
      {
        sectionId: reactQuizSection0.id,
        type: "mcq",
        question: "Which of the following best describes React's virtual DOM?",
        points: 10,
        order: 2,
        data: {
          options: [
            { id: "a", text: "A browser API for manipulating real DOM nodes", isCorrect: false },
            { id: "b", text: "An in-memory representation of the UI used to efficiently update the real DOM", isCorrect: true },
            { id: "c", text: "A server-side rendering technique", isCorrect: false },
            { id: "d", text: "A testing utility for React components", isCorrect: false },
          ],
          shuffleOptions: true,
        },
      },
      {
        sectionId: reactQuizSection0.id,
        type: "fill_ups",
        question: "Fill in the blank",
        points: 10,
        order: 3,
        data: {
          template: "React's *useEffect* hook runs after every *render* by default, unless you provide a dependency array.",
          blanks: [
            { index: 0, answer: "useEffect" },
            { index: 1, answer: "render" },
          ],
        },
      },
    ],
  });

  const reactQuizSection1 = await prisma.quizSection.create({
    data: {
      quizId: reactQuiz.id,
      title: "Applied Knowledge",
      order: 1,
    },
  });

  await prisma.question.create({
    data: {
      sectionId: reactQuizSection1.id,
      type: "long_answer",
      question: "Explain the concept of 'lifting state up' in React. When would you use it, and what problem does it solve?",
      points: 20,
      order: 0,
      data: {
        rubric: [
          { id: "r1", title: "Correct definition", description: "Accurately describes moving state to a common ancestor component.", weight: 40 },
          { id: "r2", title: "Problem it solves", description: "Explains that sibling components can share state by lifting it to their parent.", weight: 35 },
          { id: "r3", title: "Practical example or use-case", description: "Gives a concrete example of when this pattern would be applied.", weight: 25 },
        ],
        goldenSolution: "Lifting state up means moving state from child components to their closest common ancestor so that multiple child components can share and update the same piece of data. It solves the problem of sibling components needing access to the same state — since props flow downward, the parent holds the state and passes it down along with setter callbacks. For example, if a search input and a results list are sibling components that both depend on the same query string, you'd lift the query state up to their parent.",
      },
    },
  });

  console.log("✅ React JS quiz created");

  // ─── REACT JS PROJECT: ProjectContent (learning path) ────────────────────

  await prisma.projectContent.createMany({
    data: [
      { projectId: project1.id, type: "COURSE", courseId: reactCourse.id, position: 0 },
      { projectId: project1.id, type: "QUIZ",   quizId: reactQuiz.id,   position: 1 },
    ],
  });

  console.log("✅ React JS project learning path created");

  console.log("\n📋 Seed Summary:");
  console.log("─────────────────────────────────────────");

  console.log("DEMO (guest access — no password needed):");
  console.log(`  Trainer → demo@skillbridge.com  (POST /api/guest/login { role: "trainer" })`);
  console.log(`  Trainee → phone 0000000000      (POST /api/guest/login { role: "trainee" })`);

  console.log("\nTRAINERS (password: password123):");
  console.log(`${trainer1.name} → ${trainer1.email}`);
  console.log(`${trainer2.name} → ${trainer2.email}`);
  console.log(`${trainer3.name} → ${trainer3.email}`);
  console.log(`${trainer4.name} → ${trainer4.email}`);

  console.log("\nTRAINEES:");
  console.log(`${trainee1.name} → ${trainee1.phone}`);
  console.log(`${trainee2.name} → ${trainee2.phone}`);
  console.log(`${trainee3.name} → ${trainee3.phone}`);
  console.log(`${trainee4.name} → ${trainee4.phone}`);

  console.log("\nPROJECTS + CONTENT:");
  console.log(`${project1.name} (Admin: ${trainer1.name}) — 1 course, 1 quiz`);
  console.log(`${project2.name} (Admin: ${trainer2.name})`);
  console.log(`${project3.name} (Admin: ${trainer3.name})`);
  console.log(`${project4.name} (Admin: ${trainer4.name})`);
  console.log(`${demoProject.name} (Admin: ${demoTrainer.name}) — 1 course, 1 quiz`);
  console.log(`${demoProjectJa.name} (Admin: ${demoTrainer.name}) — 1 course, 1 quiz`);

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