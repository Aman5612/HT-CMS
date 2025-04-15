import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession, getSession } from "@/lib/auth";

const prisma = new PrismaClient();

// Helper function to add CORS headers to responses
function corsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

// Helper function to validate user session and role
async function validateUserRole(allowedRoles: string[] = ["admin", "editor"]) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return {
      isAuthorized: false,
      error: "Unauthorized: You must be logged in",
      status: 401,
    };
  }

  if (!session.user.isActive) {
    return {
      isAuthorized: false,
      error: "Unauthorized: Your account is inactive",
      status: 403,
    };
  }

  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    return {
      isAuthorized: false,
      error: `Unauthorized: You need one of these roles: ${allowedRoles.join(
        ", "
      )}`,
      status: 403,
    };
  }

  return { isAuthorized: true, userId: session.user.id };
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return corsHeaders(new NextResponse(null, { status: 200 }));
}

// GET handler to fetch all posts
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const title = url.searchParams.get('title') || '';
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Build where condition
    const where: any = {};
    
    // Add title search if provided
    if (title) {
      where.title = {
        contains: title,
        mode: 'insensitive' // Case insensitive search
      };
    }
    
    // Get total count for pagination
    const totalCount = await prisma.post.count({ where });
    
    // Fetch posts with pagination and filters
    const posts = await prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        media: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Create pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    // Return results with pagination metadata
    return corsHeaders(
      NextResponse.json({
        data: posts,
        pagination: {
          total: totalCount,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage,
          hasPreviousPage
        }
      })
    );
  } catch (error) {
    console.error("Error fetching posts:", error);
    return corsHeaders(
      NextResponse.json(
        { error: "Internal Server Error", data: [], pagination: {} },
        { status: 500 }
      )
    );
  }
}

// POST handler to create a new post
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Check if user has appropriate role to create posts
    const allowedRoles = ["admin", "editor", "author"];
    if (!allowedRoles.includes(session.user.role)) {
      return new Response(
        JSON.stringify({
          error: "You don't have permission to create posts",
        }),
        { status: 403 }
      );
    }

    const data = await request.json();

    // Set initial status based on user role
    // Admins and editors can create posts with any status
    // Authors can only create drafts
    let status = data.status || "DRAFT";

    if (session.user.role === "author" && status !== "DRAFT") {
      // Force author-created posts to be drafts
      status = "DRAFT";
    }

    // Check if manualId is provided
    if (!data.manualId) {
      return new Response(
        JSON.stringify({
          error: "Custom ID is required",
        }),
        { status: 400 }
      );
    }

    // Generate a slug from the title if not provided
    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "-");

    // Note: This code sets the provided manual ID as the primary key

    // Prepare post data
    const postData: any = {
      id: data.manualId, // Use manual ID as the primary key
      title: data.title,
      content: data.content,
      slug: slug,
      status: status,
      excerpt: data.excerpt || data.content.substring(0, 157) + "...",
      authorId: session.user.id, // Always use the current user's ID
      metaTitle: data.metaTitle || data.title,
      metaDescription: data.metaDescription || data.excerpt,
      featureImage: data.featureImage || null,
      featureImageAlt: data.featureImageAlt || "",
      packageIds: data.packageIds || [],
      customTitle: data.customTitle || null,
      keywords: data.keywords || null,
      tableOfContents: data.tableOfContents || { sections: [] },
    };

    // Create the post
    const post = await prisma.post.create({
      data: postData,
    });

    // If relatedBlogIds is provided, update it using a raw query
    if (
      data.relatedBlogIds &&
      Array.isArray(data.relatedBlogIds) &&
      data.relatedBlogIds.length > 0
    ) {
      // Build a safe SQL query using separate parameters for each value
      const query = `UPDATE "Post" SET "relatedBlogIds" = $1 WHERE id = $2`;
      await prisma.$queryRawUnsafe(query, data.relatedBlogIds, data.manualId);
    }

    // Handle media associations if provided
    if (data.media && Array.isArray(data.media)) {
      for (const item of data.media) {
        await prisma.postMedia.create({
          data: {
            postId: post.id,
            url: item.url,
            type: item.type,
            alt: item.alt || "",
          },
        });
      }
    }

    // Handle card blocks if provided
    if (data.cardBlocks && Array.isArray(data.cardBlocks)) {
      for (const block of data.cardBlocks) {
        await prisma.postCardBlock.create({
          data: {
            postId: post.id,
            cardId: block.cardId,
            position: block.position,
          },
        });
      }
    }

    return new Response(JSON.stringify(post), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error creating post:", error);

    // Format the error for better client-side handling
    let errorMessage = "Failed to create post";
    let errorDetail = null;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for Prisma specific errors
      if (errorMessage.includes("Unique constraint failed")) {
        // Extract which field had the constraint error
        const match = errorMessage.match(
          /Unique constraint failed on the fields: \(\`([^`]+)`\)/
        );
        if (match && match[1]) {
          errorDetail = {
            type: "unique_constraint",
            field: match[1],
            message: `A post with this ${match[1]} already exists`,
          };
        }
        console.log("Prisma constraint error detected:", errorDetail);
      } else if (errorMessage.includes("Foreign key constraint failed")) {
        errorDetail = {
          type: "foreign_key_constraint",
          message: "Referenced record does not exist",
        };
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        errorDetail: errorDetail,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

// PUT handler to update an existing post
export async function PUT(request: NextRequest) {
  try {
    // Validate user role
    const validation = await validateUserRole(["admin", "editor"]);
    if (!validation.isAuthorized) {
      return corsHeaders(
        NextResponse.json(
          { error: validation.error },
          { status: validation.status }
        )
      );
    }

    const {
      id,
      title,
      content,
      slug,
      excerpt,
      authorId,
      media,
      cardBlocks,
      packageIds,
      manualId,
      customTitle,
      keywords,
      metaTitle,
      metaDescription,
      featureImage,
      featureImageAlt,
      status,
      relatedBlogIds,
    } = await request.json();

    if (!manualId) {
      return corsHeaders(
        NextResponse.json({ error: "Custom ID is required" }, { status: 400 })
      );
    }

    // Delete existing media and card blocks
    await prisma.postMedia.deleteMany({ where: { postId: manualId } });
    await prisma.postCardBlock.deleteMany({ where: { postId: manualId } });

    // Prepare update data
    const updateData: any = {
      title,
      content,
      slug,
      excerpt,
      authorId: authorId || validation.userId, // Use validated user ID if not provided
      packageIds: packageIds || [],
      relatedBlogIds: relatedBlogIds || [],
      status: status || "DRAFT",
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      featureImage: featureImage || null,
      featureImageAlt: featureImageAlt || null,
      customTitle: customTitle || null,
      keywords: keywords || null,
      media: {
        create: media.map((item: any) => ({
          url: item.url,
          type: item.type,
          alt: item.alt || "",
        })),
      },
      cardBlocks: {
        create: cardBlocks.map((item: any) => ({
          cardId: item.cardId,
          position: item.position,
        })),
      },
    };

    // The id parameter is actually the manualId since we're using the manualId as the primary key
    const post = await prisma.post.update({
      where: { id }, // Use the provided id parameter directly
      data: updateData,
    });
    return corsHeaders(NextResponse.json(post));
  } catch (error) {
    console.error("Error updating post in main route:", error);

    // Format the error for better client-side handling
    let errorMessage = "Failed to update post";
    let errorDetail = null;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for Prisma specific errors
      if (errorMessage.includes("Unique constraint failed")) {
        // Extract which field had the constraint error
        const match = errorMessage.match(
          /Unique constraint failed on the fields: \(\`([^`]+)`\)/
        );
        if (match && match[1]) {
          errorDetail = {
            type: "unique_constraint",
            field: match[1],
            message: `A post with this ${match[1]} already exists`,
          };
        }
        console.log("Prisma constraint error detected:", errorDetail);
      } else if (errorMessage.includes("Foreign key constraint failed")) {
        errorDetail = {
          type: "foreign_key_constraint",
          message: "Referenced record does not exist",
        };
      }
    }

    return corsHeaders(
      NextResponse.json(
        {
          error: errorMessage,
          errorDetail: errorDetail,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    );
  }
}

// DELETE handler to remove a post
export async function DELETE(request: NextRequest) {
  try {
    // Validate user role
    const validation = await validateUserRole(["admin"]);
    if (!validation.isAuthorized) {
      return corsHeaders(
        NextResponse.json(
          { error: validation.error },
          { status: validation.status }
        )
      );
    }

    const { manualId } = await request.json();

    if (!manualId) {
      return corsHeaders(
        NextResponse.json({ error: "Custom ID is required" }, { status: 400 })
      );
    }

    // Use the provided ID directly as our primary key
    const post = await prisma.post.delete({
      where: { id: manualId },
    });
    return corsHeaders(NextResponse.json(post));
  } catch (error) {
    console.error("Error deleting post:", error);

    // Format the error for better client-side handling
    let errorMessage = "Failed to delete post";
    let errorDetail = null;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for Prisma specific errors
      if (errorMessage.includes("Record to delete does not exist")) {
        errorDetail = {
          type: "not_found",
          message: "The post you're trying to delete doesn't exist",
        };
      } else if (errorMessage.includes("Foreign key constraint failed")) {
        errorDetail = {
          type: "foreign_key_constraint",
          message:
            "This post cannot be deleted because other records depend on it",
        };
      }
    }

    return corsHeaders(
      NextResponse.json(
        {
          error: errorMessage,
          errorDetail: errorDetail,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    );
  }
}
