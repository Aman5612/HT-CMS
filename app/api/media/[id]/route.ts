import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Helper function to add CORS headers to responses
function corsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
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

// GET handler to fetch a media item by ID
export async function GET(request: NextRequest, { params }: any) {
  try {
    const { id } = params;
    const mediaItem = await prisma.postMedia.findUnique({
      where: { id },
    });
    
    if (!mediaItem) {
      return corsHeaders(
        NextResponse.json({ error: "Media item not found" }, { status: 404 })
      );
    }
    
    return corsHeaders(NextResponse.json(mediaItem));
  } catch (error) {
    console.error('Error fetching media item:', error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
}

// PATCH handler to update a media item
export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Only allow updating certain fields
    const updateData: any = {};
    if (data.alt !== undefined) updateData.alt = data.alt;
    
    const mediaItem = await prisma.postMedia.update({
      where: { id },
      data: updateData,
    });
    
    return corsHeaders(NextResponse.json(mediaItem));
  } catch (error) {
    console.error('Error updating media item:', error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
}

// DELETE handler to delete a media item
export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const { id } = params;
    
    await prisma.postMedia.delete({
      where: { id },
    });
    
    return corsHeaders(
      NextResponse.json({ message: "Media item deleted successfully" })
    );
  } catch (error) {
    console.error('Error deleting media item:', error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
} 