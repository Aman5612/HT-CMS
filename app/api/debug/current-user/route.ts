import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Define our own User type that matches the Prisma schema
interface PrismaUser {
  id: string;
  email: string;
  password: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ 
        authenticated: false,
        message: "No active session found"
      }, { status: 401 });
    }
    
    // Get user from database with all fields
    const dbUser = await prisma.user.findUnique({
      where: { 
        email: session.user.email 
      },
    });
    
    // Cast to our custom type
    const typedUser = dbUser as unknown as PrismaUser | null;
    
    return NextResponse.json({
      authenticated: true,
      sessionData: {
        expires: session.expires,
        user: session.user
      },
      databaseUser: typedUser
        ? {
            id: typedUser.id,
            email: typedUser.email,
            name: typedUser.name,
            role: typedUser.role,
            isActive: typedUser.isActive,
            createdAt: typedUser.createdAt,
          }
        : null,
      isAdmin: session.user.role === "admin" || typedUser?.role === "admin",
      roleComparison: {
        sessionUserRole: session.user.role,
        dbUserRole: typedUser?.role,
        match: session.user.role === typedUser?.role
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      authenticated: false
    }, { status: 500 });
  }
} 