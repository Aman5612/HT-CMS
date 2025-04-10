import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subDays, format } from "date-fns";

const prisma = new PrismaClient();

// Helper function to add CORS headers to responses
function corsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return corsHeaders(new NextResponse(null, { status: 200 }));
}

// GET handler to fetch dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return corsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Define current date and previous dates for comparison
    const currentDate = new Date();
    const sevenDaysAgo = subDays(currentDate, 7);
    const fourteenDaysAgo = subDays(currentDate, 14);
    const thirtyDaysAgo = subDays(currentDate, 30);

    // Get post stats
    const totalPosts = await prisma.post.count();
    const newPostsLastWeek = await prisma.post.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });
    const newPostsPreviousWeek = await prisma.post.count({
      where: {
        createdAt: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    });

    // Get post stats by status
    const draftPosts = await prisma.post.count({
      where: { status: "DRAFT" },
    });
    const publishedPosts = await prisma.post.count({
      where: { status: "PUBLISHED" },
    });
    const archivedPosts = await prisma.post.count({
      where: { status: "ARCHIVED" },
    });

    // Get media stats
    const totalMedia = await prisma.postMedia.count();
    const newMediaLastWeek = await prisma.postMedia.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });
    const newMediaPreviousWeek = await prisma.postMedia.count({
      where: {
        createdAt: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    });

    // Get user stats
    const totalUsers = await prisma.user.count();
    const newUsersLastWeek = await prisma.user.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });
    const newUsersPreviousWeek = await prisma.user.count({
      where: {
        createdAt: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    });

    // Get user stats by role
    const adminUsers = await prisma.user.count({
      where: { role: "admin" },
    });
    const editorUsers = await prisma.user.count({
      where: { role: "editor" },
    });
    const authorUsers = await prisma.user.count({
      where: { role: "author" },
    });

    // Get recent posts
    const recentPosts = await prisma.post.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            name: true,
            email: true,
            id: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
    });

    // Map post status to lowercase for UI compatibility
    const mappedRecentPosts = recentPosts.map((post) => ({
      ...post,
      status: post.status.toLowerCase(),
      authorName: post.author?.name || post.author?.email || "Unknown",
      formattedDate: format(new Date(post.updatedAt), "MMM d, yyyy"),
    }));

    // Get recently created posts (last 30 days)
    const recentlyCreatedPosts = await prisma.post.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Get recently updated posts (modified after creation)
    const recentlyUpdatedPosts = await prisma.post.findMany({
      where: {
        updatedAt: {
          gte: thirtyDaysAgo,
        },
        // Ensure updatedAt is different from createdAt (it was actually updated)
        AND: {
          updatedAt: {
            not: {
              equals: prisma.post.fields.createdAt,
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
    });

    // Get recently uploaded media
    const recentlyUploadedMedia = await prisma.postMedia.findMany({
      select: {
        id: true,
        type: true,
        createdAt: true,
        post: {
          select: {
            id: true,
            title: true,
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    // Combine all activities into a unified timeline
    const allActivities = [
      // Created posts activities
      ...recentlyCreatedPosts.map((post) => ({
        id: `post-created-${post.id}`,
        type: "post-created",
        description: `${
          post.author?.name || post.author?.email || "Unknown"
        } created "${post.title}"`,
        timestamp: new Date(post.createdAt).getTime(),
        date: format(new Date(post.createdAt), "MMM d, yyyy"),
        postId: post.id,
      })),

      // Updated posts activities - filter out those that were just created
      ...recentlyUpdatedPosts
        .filter((post) => {
          // Only include updates that are significantly after creation (more than 1 minute)
          const createdAt = new Date(post.createdAt).getTime();
          const updatedAt = new Date(post.updatedAt).getTime();
          return updatedAt - createdAt > 60000; // 1 minute in milliseconds
        })
        .map((post) => ({
          id: `post-updated-${post.id}-${new Date(post.updatedAt).getTime()}`,
          type: "post-updated",
          description: `${
            post.author?.name || post.author?.email || "Unknown"
          } updated "${post.title}"`,
          timestamp: new Date(post.updatedAt).getTime(),
          date: format(new Date(post.updatedAt), "MMM d, yyyy"),
          postId: post.id,
        })),

      // Media upload activities
      ...recentlyUploadedMedia.map((media) => ({
        id: `media-${media.id}`,
        type: "media-uploaded",
        description: `${
          media.post?.author?.name || media.post?.author?.email || "Someone"
        } uploaded ${media.type.toLowerCase()} to "${
          media.post?.title || "a post"
        }"`,
        timestamp: new Date(media.createdAt).getTime(),
        date: format(new Date(media.createdAt), "MMM d, yyyy"),
        postId: media.post?.id,
      })),
    ]
      // Sort all activities by timestamp (newest first) and take the most recent 10
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    // Generate simulated page views (since we don't have actual analytics)
    const pageViews = {
      total: 1254 + Math.floor(Math.random() * 500),
      lastWeek: 573 + Math.floor(Math.random() * 100),
      previousWeek: 480 + Math.floor(Math.random() * 100),
    };

    // Return all analytics data
    return corsHeaders(
      NextResponse.json({
        posts: {
          total: totalPosts,
          newLastWeek: newPostsLastWeek,
          growthPercent:
            totalPosts > 0
              ? ((newPostsLastWeek - newPostsPreviousWeek) /
                  Math.max(1, newPostsPreviousWeek)) *
                100
              : 0,
          byStatus: {
            draft: draftPosts,
            published: publishedPosts,
            archived: archivedPosts,
          },
        },
        media: {
          total: totalMedia,
          newLastWeek: newMediaLastWeek,
          growthPercent:
            totalMedia > 0
              ? ((newMediaLastWeek - newMediaPreviousWeek) /
                  Math.max(1, newMediaPreviousWeek)) *
                100
              : 0,
        },
        users: {
          total: totalUsers,
          newLastWeek: newUsersLastWeek,
          growthPercent:
            totalUsers > 0
              ? ((newUsersLastWeek - newUsersPreviousWeek) /
                  Math.max(1, newUsersPreviousWeek)) *
                100
              : 0,
          byRole: {
            admin: adminUsers,
            editor: editorUsers,
            author: authorUsers,
          },
        },
        pageViews: {
          total: pageViews.total,
          lastWeek: pageViews.lastWeek,
          growthPercent:
            ((pageViews.lastWeek - pageViews.previousWeek) /
              Math.max(1, pageViews.previousWeek)) *
            100,
        },
        recentPosts: mappedRecentPosts,
        recentActivity: allActivities,
      })
    );
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
}
