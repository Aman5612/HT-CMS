/*
  Warnings:

  - The primary key for the `Post` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Post` table. All the data in the column will be lost.
  - The required column `_id` was added to the `Post` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `manualId` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PostCardBlock" DROP CONSTRAINT "PostCardBlock_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostMedia" DROP CONSTRAINT "PostMedia_postId_fkey";

-- AlterTable
ALTER TABLE "Post" DROP CONSTRAINT "Post_pkey",
DROP COLUMN "id",
ADD COLUMN     "_id" TEXT NOT NULL,
ADD COLUMN     "customTitle" TEXT,
ADD COLUMN     "keywords" TEXT,
ADD COLUMN     "manualId" TEXT NOT NULL,
ADD CONSTRAINT "Post_pkey" PRIMARY KEY ("manualId");

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("manualId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCardBlock" ADD CONSTRAINT "PostCardBlock_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("manualId") ON DELETE CASCADE ON UPDATE CASCADE;
