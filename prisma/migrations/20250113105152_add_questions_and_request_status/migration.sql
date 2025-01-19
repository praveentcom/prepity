-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'CREATED');

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "status" "RequestStatus" NOT NULL DEFAULT 'PENDING';

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
    "userId" INTEGER NOT NULL,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,
    "userAnswer" SMALLINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_userId_idx" ON "Question"("userId");

-- CreateIndex
CREATE INDEX "Question_requestId_idx" ON "Question"("requestId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
