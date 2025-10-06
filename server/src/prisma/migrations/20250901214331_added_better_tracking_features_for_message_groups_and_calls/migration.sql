/*
  Warnings:

  - You are about to drop the column `callType` on the `Call` table. All the data in the column will be lost.
  - You are about to drop the column `groupId` on the `Call` table. All the data in the column will be lost.
  - You are about to drop the column `recipientId` on the `Call` table. All the data in the column will be lost.
  - The `status` column on the `Call` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `GroupMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `groupId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `messageType` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `mongoId` on the `Message` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - A unique constraint covering the columns `[conversationId]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `conversationId` to the `Call` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Call` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conversationId` to the `Group` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conversationId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Made the column `lastSeen` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."ConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "public"."GroupRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'FILE', 'AUDIO');

-- CreateEnum
CREATE TYPE "public"."CallType" AS ENUM ('VOICE', 'VIDEO');

-- CreateEnum
CREATE TYPE "public"."CallStatus" AS ENUM ('INITIATED', 'RINGING', 'ACTIVE', 'ENDED', 'MISSED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "public"."Call" DROP CONSTRAINT "Call_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_groupId_fkey";

-- DropIndex
DROP INDEX "public"."Message_groupId_idx";

-- DropIndex
DROP INDEX "public"."Message_mongoId_key";

-- AlterTable
ALTER TABLE "public"."Call" DROP COLUMN "callType",
DROP COLUMN "groupId",
DROP COLUMN "recipientId",
ADD COLUMN     "conversationId" TEXT NOT NULL,
ADD COLUMN     "type" "public"."CallType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."CallStatus" NOT NULL DEFAULT 'INITIATED';

-- AlterTable
ALTER TABLE "public"."Group" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "conversationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."GroupMember" DROP COLUMN "role",
ADD COLUMN     "role" "public"."GroupRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "groupId",
DROP COLUMN "isRead",
DROP COLUMN "messageType",
DROP COLUMN "mongoId",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "conversationId" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "type" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "lastSeen" SET NOT NULL,
ALTER COLUMN "lastSeen" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DATA TYPE VARCHAR(100);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "type" "public"."ConversationType" NOT NULL DEFAULT 'DIRECT',
    "lastMessageId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TypingStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TypingStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "public"."Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_type_idx" ON "public"."Conversation"("type");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_lastReadAt_idx" ON "public"."ConversationParticipant"("userId", "lastReadAt");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "public"."ConversationParticipant"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "public"."ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "TypingStatus_conversationId_idx" ON "public"."TypingStatus"("conversationId");

-- CreateIndex
CREATE INDEX "TypingStatus_expiresAt_idx" ON "public"."TypingStatus"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TypingStatus_userId_conversationId_key" ON "public"."TypingStatus"("userId", "conversationId");

-- CreateIndex
CREATE INDEX "Call_status_idx" ON "public"."Call"("status");

-- CreateIndex
CREATE INDEX "Call_conversationId_idx" ON "public"."Call"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_conversationId_key" ON "public"."Group"("conversationId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "public"."Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "User_isOnline_idx" ON "public"."User"("isOnline");

-- AddForeignKey
ALTER TABLE "public"."ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TypingStatus" ADD CONSTRAINT "TypingStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
