-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "tableOfContents" JSONB DEFAULT '{"sections": []}';
