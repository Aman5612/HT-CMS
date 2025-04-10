import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

// GET handler to fetch all users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return corsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }
    
    // For debugging - log user session data
    console.log("Session user data:", JSON.stringify(session.user, null, 2));
    
    // Get current user from database with specific fields
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
    
    console.log("Database user data:", JSON.stringify(currentUser, null, 2));
    
    // Define fields to select for all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        role: true,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return corsHeaders(NextResponse.json(users));
  } catch (error) {
    console.error('Error fetching users:', error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
} 