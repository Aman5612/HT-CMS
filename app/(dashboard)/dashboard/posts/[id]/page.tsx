import PostRenderer from "@/components/PostRenderer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function PostPage({ params }: any) {
  const { id } = params;

  console.log("Fetching post with id:", id); // Debug log

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      media: true,
      cardBlocks: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!post) {
    return <div>Post not found</div>;
  }

  return <PostRenderer post={post} />;
}

export async function generateStaticParams() {
  const posts = await prisma.post.findMany({
    select: { id: true },
  });
  return posts.map((post) => ({ id: post.id }));
}
