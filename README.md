## Folder structure

- **src/**
  - `index.ts`
  - `.DS_Store`
  - **controllers/**
    - `content.controller.ts`
    - `course.controller.ts`
    - `courseQuestion.controller.ts`
    - `courseSection.controller.ts`
    - `playground.controller.ts`
    - `project.controller.ts`
    - `question.controller.ts`
    - `quiz.controller.ts`
    - `resource.controller.ts`
    - `section.controller.ts`
    - `trainee.auth.controller.ts`
    - `trainer.auth.controller.ts`
  - **routes/**
    - `content.routes.ts`
    - `course.routes.ts`
    - `courseQuestion.routes.ts`
    - `courseSection.routes.ts`
    - `playground.routes.ts`
    - `project.routes.ts`
    - `question.routes.ts`
    - `quiz.routes.ts`
    - `resource.routes.ts`
    - `section.routes.ts`
    - `trainee.auth.routes.ts`
    - `trainer.auth.routes.ts`
  - **middlewares/**
    - `auth.ts`
    - `errorHandler.ts`
    - `isAdmin.ts`
    - `isCourseCreator.ts`
    - `isQuizCreator.ts`
  - **services/**
    - `otp.service.ts`
    - `sms.service.ts`
  - **lib/**
    - `embeddings.ts`
    - `gcs.ts`
    - `multer.ts`
    - `prisma.ts`
    - `qdrant.ts`
    - `queue.ts`
  - **worker/**
    - `resourceWorker.ts`
  - **types/**
    - `express.d.ts`
  - **utils/**
    - `generateToken.ts`

## API endpoints (method + path)

- **Health**
  - `GET /health`

- **Trainer auth (`/api/trainer`)**
  - `POST /api/trainer/login`
  - `GET /api/trainer/me`

- **Trainee auth (`/api/trainee`)**
  - `POST /api/trainee/send-otp`
  - `POST /api/trainee/verify-otp`
  - `GET /api/trainee/me`
  - `PATCH /api/trainee/me`

- **Projects (`/api/projects`)**
  - `GET /api/projects`
  - `GET /api/projects/:projectId`
  - `POST /api/projects`
  - `POST /api/projects/:projectId/trainers`
  - `POST /api/projects/:projectId/trainees`
  - `DELETE /api/projects/:projectId/trainers/:trainerId`
  - `DELETE /api/projects/:projectId/trainees/:traineeId`

- **Quizzes (`/api/projects/:projectId/quizzes`)**
  - `GET /api/projects/:projectId/quizzes`
  - `GET /api/projects/:projectId/quizzes/:quizId`
  - `POST /api/projects/:projectId/quizzes`
  - `POST /api/projects/:projectId/quizzes/:quizId/creators`
  - `DELETE /api/projects/:projectId/quizzes/:quizId/creators/:trainerId`
  - `PATCH /api/projects/:projectId/quizzes/:quizId/publish`

- **Courses (`/api/projects/:projectId/courses`)**
  - `GET /api/projects/:projectId/courses`
  - `GET /api/projects/:projectId/courses/:courseId`
  - `POST /api/projects/:projectId/courses`
  - `POST /api/projects/:projectId/courses/:courseId/creators`
  - `DELETE /api/projects/:projectId/courses/:courseId/creators/:trainerId`
  - `PATCH /api/projects/:projectId/courses/:courseId/publish`

- **Project contents (`/api/projects/:projectId/contents`)**
  - `GET /api/projects/:projectId/contents`
  - `PUT /api/projects/:projectId/contents/reorder`

- **Resources (`/api/projects/:projectId/resources`)**
  - `GET /api/projects/:projectId/resources`
  - `GET /api/projects/:projectId/resources/:resourceId`
  - `POST /api/projects/:projectId/resources`
  - `DELETE /api/projects/:projectId/resources/:resourceId`

- **Playground (`/api/projects/:projectId/playground`)**
  - `POST /api/projects/:projectId/playground/chats`
  - `GET /api/projects/:projectId/playground/chats`
  - `GET /api/projects/:projectId/playground/chats/:chatId`
  - `DELETE /api/projects/:projectId/playground/chats/:chatId`
  - `POST /api/projects/:projectId/playground/chats/:chatId/messages`

- **Quiz sections (`/api/projects/:projectId/quizzes/:quizId/sections`)**
  - `GET /api/projects/:projectId/quizzes/:quizId/sections`
  - `GET /api/projects/:projectId/quizzes/:quizId/sections/:sectionId`
  - `POST /api/projects/:projectId/quizzes/:quizId/sections`
  - `PATCH /api/projects/:projectId/quizzes/:quizId/sections/:sectionId`
  - `DELETE /api/projects/:projectId/quizzes/:quizId/sections/:sectionId`
  - `PUT /api/projects/:projectId/quizzes/:quizId/sections/reorder`

- **Quiz questions (`/api/projects/:projectId/quizzes/:quizId/sections/:sectionId/questions`)**
  - `GET /api/projects/:projectId/quizzes/:quizId/sections/:sectionId/questions`
  - `GET /api/projects/:projectId/quizzes/:quizId/sections/:sectionId/questions/:questionId`
  - `POST /api/projects/:projectId/quizzes/:quizId/sections/:sectionId/questions`
  - `PATCH /api/projects/:projectId/quizzes/:quizId/sections/:sectionId/questions/:questionId`
  - `DELETE /api/projects/:projectId/quizzes/:quizId/sections/:sectionId/questions/:questionId`
  - `PUT /api/projects/:projectId/quizzes/:quizId/sections/:sectionId/questions/reorder`

- **Course sections (`/api/projects/:projectId/courses/:courseId/sections`)**
  - `GET /api/projects/:projectId/courses/:courseId/sections`
  - `GET /api/projects/:projectId/courses/:courseId/sections/:sectionId`
  - `POST /api/projects/:projectId/courses/:courseId/sections`
  - `PATCH /api/projects/:projectId/courses/:courseId/sections/:sectionId`
  - `DELETE /api/projects/:projectId/courses/:courseId/sections/:sectionId`
  - `PUT /api/projects/:projectId/courses/:courseId/sections/reorder`

- **Course questions (`/api/projects/:projectId/courses/:courseId/sections/:sectionId/questions`)**
  - `GET /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions`
  - `GET /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions/:questionId`
  - `POST /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions`
  - `PATCH /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions/:questionId`
  - `DELETE /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions/:questionId`
  - `PUT /api/projects/:projectId/courses/:courseId/sections/:sectionId/questions/reorder`

