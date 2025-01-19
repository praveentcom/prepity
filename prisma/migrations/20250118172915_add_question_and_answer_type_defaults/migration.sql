/*
  Warnings:

  - Added the required column `answerType` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionType` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('PLAINTEXT', 'LATEX');

-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('PLAINTEXT', 'LATEX');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "answerType" "AnswerType" NOT NULL,
ADD COLUMN     "questionType" "QuestionType" NOT NULL;
