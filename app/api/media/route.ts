import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
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

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return corsHeaders(new NextResponse(null, { status: 200 }));
}

// GET handler to fetch all media items
export async function GET(request: NextRequest) {
  try {
    const mediaItems = await prisma.postMedia.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return corsHeaders(NextResponse.json(mediaItems));
  } catch (error) {
    console.error('Error fetching media:', error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
}

// POST handler to create a new media item (not attached to a specific post)
export async function POST(request: NextRequest) {
  try {
    const { url, type, alt } = await request.json();
    
    // Create a media item without a post ID
    const mediaItem = await prisma.postMedia.create({
      data: {
        url,
        type,
        alt: alt || '',
        // postId is now optional, so we don't need to provide a dummy value
      },
    });
    
    return corsHeaders(NextResponse.json(mediaItem));
  } catch (error) {
    console.error('Error creating media item:', error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
} 