/*
  Warnings:

  - The values [RINGING,MISSED,REJECTED] on the enum `CallStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [VIDEO,AUDIO] on the enum `MessageType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `roomId` on the `Call` table. All the data in the column will be lost.
  - You are about to drop the column `leftAt` on the `CallParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `lastMessageAt` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `lastMessageId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `isMuted` on the `ConversationParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `isPinned` on the `ConversationParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `joinedAt` on the `ConversationParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `lastReadAt` on the `ConversationParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `unreadCount` on the `ConversationParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `editedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `fileName` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `isEdited` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `mimeType` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `recipientId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GroupMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TypingStatus` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."CallStatus_new" AS ENUM ('INITIATED', 'ACTIVE', 'ENDED');
ALTER TABLE "public"."Call" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Call" ALTER COLUMN "status" TYPE "public"."CallStatus_new" USING ("status"::text::"public"."CallStatus_new");
ALTER TYPE "public"."CallStatus" RENAME TO "CallStatus_old";
ALTER TYPE "public"."CallStatus_new" RENAME TO "CallStatus";
DROP TYPE "public"."CallStatus_old";
ALTER TABLE "public"."Call" ALTER COLUMN "status" SET DEFAULT 'INITIATED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."MessageType_new" AS ENUM ('TEXT', 'IMAGE', 'FILE');
ALTER TABLE "public"."Message" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "public"."Message" ALTER COLUMN "type" TYPE "public"."MessageType_new" USING ("type"::text::"public"."MessageType_new");
ALTER TYPE "public"."MessageType" RENAME TO "MessageType_old";
ALTER TYPE "public"."MessageType_new" RENAME TO "MessageType";
DROP TYPE "public"."MessageType_old";
ALTER TABLE "public"."Message" ALTER COLUMN "type" SET DEFAULT 'TEXT';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Group" DROP CONSTRAINT "Group_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Group" DROP CONSTRAINT "Group_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupMember" DROP CONSTRAINT "GroupMember_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupMember" DROP CONSTRAINT "GroupMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TypingStatus" DROP CONSTRAINT "TypingStatus_userId_fkey";

-- DropIndex
DROP INDEX "public"."Call_conversationId_idx";

-- DropIndex
DROP INDEX "public"."Call_roomId_idx";

-- DropIndex
DROP INDEX "public"."Call_roomId_key";

-- DropIndex
DROP INDEX "public"."Call_status_idx";

-- DropIndex
DROP INDEX "public"."CallParticipant_callId_idx";

-- DropIndex
DROP INDEX "public"."CallParticipant_userId_idx";

-- DropIndex
DROP INDEX "public"."Conversation_lastMessageAt_idx";

-- DropIndex
DROP INDEX "public"."Conversation_type_idx";

-- DropIndex
DROP INDEX "public"."ConversationParticipant_conversationId_idx";

-- DropIndex
DROP INDEX "public"."ConversationParticipant_userId_lastReadAt_idx";

-- DropIndex
DROP INDEX "public"."Message_conversationId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Message_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Message_recipientId_idx";

-- DropIndex
DROP INDEX "public"."Message_senderId_idx";

-- DropIndex
DROP INDEX "public"."Session_socketId_idx";

-- DropIndex
DROP INDEX "public"."Session_userId_idx";

-- DropIndex
DROP INDEX "public"."User_email_idx";

-- DropIndex
DROP INDEX "public"."User_isOnline_idx";

-- DropIndex
DROP INDEX "public"."User_username_idx";

-- AlterTable
ALTER TABLE "public"."Call" DROP COLUMN "roomId";

-- AlterTable
ALTER TABLE "public"."CallParticipant" DROP COLUMN "leftAt";

-- AlterTable
ALTER TABLE "public"."Conversation" DROP COLUMN "lastMessageAt",
DROP COLUMN "lastMessageId",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."ConversationParticipant" DROP COLUMN "isMuted",
DROP COLUMN "isPinned",
DROP COLUMN "joinedAt",
DROP COLUMN "lastReadAt",
DROP COLUMN "unreadCount";

-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "deletedAt",
DROP COLUMN "editedAt",
DROP COLUMN "fileName",
DROP COLUMN "fileSize",
DROP COLUMN "fileUrl",
DROP COLUMN "isDeleted",
DROP COLUMN "isEdited",
DROP COLUMN "mimeType",
DROP COLUMN "recipientId",
DROP COLUMN "thumbnailUrl",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "status",
DROP COLUMN "updatedAt";

-- DropTable
DROP TABLE "public"."Group";

-- DropTable
DROP TABLE "public"."GroupMember";

-- DropTable
DROP TABLE "public"."TypingStatus";

-- DropEnum
DROP TYPE "public"."GroupRole";

-- AddForeignKey
ALTER TABLE "public"."Call" ADD CONSTRAINT "Call_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Call" ADD CONSTRAINT "Call_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
