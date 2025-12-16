-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'PARTIALLY_CREATED', 'CREATED', 'FAILED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('PLAINTEXT', 'LATEX', 'CODE');

-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('PLAINTEXT', 'LATEX', 'CODE');

-- CreateTable
CREATE TABLE "Request" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "initQuestionsCount" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestSlug" TEXT NOT NULL,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "option1" TEXT NOT NULL,
    "option2" TEXT NOT NULL,
    "option3" TEXT NOT NULL,
    "option4" TEXT NOT NULL,
    "correctOption" SMALLINT NOT NULL,
    "explanation" TEXT,
    "hint" TEXT,
    "requestId" INTEGER NOT NULL,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,
    "userAnswer" SMALLINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "answeredAt" TIMESTAMP(3),
    "questionType" "QuestionType" NOT NULL,
    "answerType" "AnswerType" NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Request_requestSlug_key" ON "Request"("requestSlug");

-- CreateIndex
CREATE INDEX "Question_requestId_idx" ON "Question"("requestId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
