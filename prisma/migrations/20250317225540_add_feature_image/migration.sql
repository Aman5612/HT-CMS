-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "featureImage" TEXT,
ADD COLUMN     "featureImageAlt" TEXT,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT;

-- AlterTable
ALTER TABLE "PostMedia" ADD COLUMN     "alt" TEXT;
