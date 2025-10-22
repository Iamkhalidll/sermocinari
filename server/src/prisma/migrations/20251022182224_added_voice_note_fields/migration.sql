-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "mimeType" TEXT,
ALTER COLUMN "content" DROP NOT NULL;
