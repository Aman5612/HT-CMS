-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "relatedBlogIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
