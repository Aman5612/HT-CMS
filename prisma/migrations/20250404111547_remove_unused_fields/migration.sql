/*
  Warnings:

  - You are about to drop the column `customTitle` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `keywords` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "customTitle",
DROP COLUMN "keywords";
