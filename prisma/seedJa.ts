import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Japanese demo project...");

  // Check if it already exists
  const existing = await prisma.project.findFirst({
    where: { name: "デモプロジェクト — SkillBridgeツアー" },
  });
  if (existing) {
    console.log("⏭️  Japanese demo project already exists, skipping.");
    return;
  }

  // Look up the demo trainer and trainees that were created in the main seed
  const demoTrainer = await prisma.trainer.findUniqueOrThrow({
    where: { email: "demo@skillbridge.com" },
  });
  const demoTrainee = await prisma.trainee.findUniqueOrThrow({
    where: { phone: "0000000000" },
  });
  const trainer1 = await prisma.trainer.findUniqueOrThrow({
    where: { email: "harshit.kumar.singh@nanoheal.com" },
  });
  const trainer2 = await prisma.trainer.findUniqueOrThrow({
    where: { email: "himanshu.narware@nanoheal.com" },
  });
  const trainee1 = await prisma.trainee.findUniqueOrThrow({
    where: { phone: "9119109287" },
  });
  const trainee2 = await prisma.trainee.findUniqueOrThrow({
    where: { phone: "7772873295" },
  });

  // ─── Project ──────────────────────────────────────────────────────────────

  const demoProjectJa = await prisma.project.create({
    data: {
      name: "デモプロジェクト — SkillBridgeツアー",
      description:
        "ゲストとしてSkillBridgeを体験しましょう！このプロジェクトでは、実際のトレーニングプログラムにおけるコース、ウェビナー、リソース、クイズの使い方をご紹介します。",
      adminId: demoTrainer.id,
      trainers: {
        connect: [{ id: demoTrainer.id }, { id: trainer1.id }, { id: trainer2.id }],
      },
      trainees: {
        connect: [{ id: demoTrainee.id }, { id: trainee1.id }, { id: trainee2.id }],
      },
    },
  });

  // ─── Course ───────────────────────────────────────────────────────────────

  const demoCourseJa = await prisma.course.create({
    data: {
      name: "SkillBridgeをはじめよう",
      description: "プラットフォームのクイックツアー — コース、クイズ、ウェビナーの仕組みを学びます。",
      projectId: demoProjectJa.id,
      published: true,
      creators: { connect: [{ id: demoTrainer.id }] },
    },
  });

  // Section 0 — ようこそ
  const section0 = await prisma.courseSection.create({
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
        sectionId: section0.id,
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
        sectionId: section0.id,
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
        sectionId: section0.id,
        type: "true_false",
        question: "SkillBridgeでは、受講者がクイズを受けたり自分の進捗を確認したりすることができます。",
        points: 5,
        order: 2,
        data: { correctAnswer: true },
      },
    ],
  });

  // Section 1 — コースとクイズ
  const section1 = await prisma.courseSection.create({
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
        sectionId: section1.id,
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
        sectionId: section1.id,
        type: "fill_ups",
        question: "空欄を埋めてください",
        points: 5,
        order: 1,
        data: {
          template: "*クイズ*は採点付きのアセスメントで、*コース*はステップバイステップの学習モジュールです。",
          blanks: [
            { index: 0, answer: "クイズ" },
            { index: 1, answer: "コース" },
          ],
        },
      },
      {
        sectionId: section1.id,
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
  const section2 = await prisma.courseSection.create({
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
        sectionId: section2.id,
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
        sectionId: section2.id,
        type: "true_false",
        question: "受講者はウェビナーに登録すると、メールでZoom参加リンクを受け取ります。",
        points: 5,
        order: 1,
        data: { correctAnswer: true },
      },
      {
        sectionId: section2.id,
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

  console.log("✅ Japanese demo course created");

  // ─── Quiz ─────────────────────────────────────────────────────────────────

  const demoQuizJa = await prisma.quiz.create({
    data: {
      name: "SkillBridgeプラットフォーム確認テスト",
      description: "ツアーコース修了後に、SkillBridgeプラットフォームの理解度をテストします。",
      projectId: demoProjectJa.id,
      published: true,
      passingPercent: 60,
      creators: { connect: [{ id: demoTrainer.id }] },
    },
  });

  const quizSection0 = await prisma.quizSection.create({
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
        sectionId: quizSection0.id,
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
        sectionId: quizSection0.id,
        type: "true_false",
        question: "受講者は同じウェビナーに複数回登録することができます。",
        points: 10,
        order: 1,
        data: { correctAnswer: false },
      },
      {
        sectionId: quizSection0.id,
        type: "mcq",
        question: "受講者がプロジェクトの学習パスのすべてのコンテンツを修了するとどうなりますか？",
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
        sectionId: quizSection0.id,
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

  const quizSection1 = await prisma.quizSection.create({
    data: {
      quizId: demoQuizJa.id,
      title: "詳細問題",
      description: "AI採点のデモとなる記述式問題です。",
      order: 1,
    },
  });

  await prisma.question.create({
    data: {
      sectionId: quizSection1.id,
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

  console.log("✅ Japanese demo quiz created");

  // ─── Learning path ────────────────────────────────────────────────────────

  await prisma.projectContent.createMany({
    data: [
      { projectId: demoProjectJa.id, type: "COURSE", courseId: demoCourseJa.id, position: 0 },
      { projectId: demoProjectJa.id, type: "QUIZ", quizId: demoQuizJa.id, position: 1 },
    ],
  });

  console.log("✅ Japanese demo project learning path created");
  console.log("🌱 Done!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
