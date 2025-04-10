-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "packageIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
