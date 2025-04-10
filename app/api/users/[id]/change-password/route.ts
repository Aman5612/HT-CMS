import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash, compare } from "bcrypt";

const prisma = new PrismaClient();

// Helper function to add CORS headers to responses
function corsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
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

// POST handler to change user password
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return corsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Only allow users to change their own password
    if (session.user.id !== params.id) {
      return corsHeaders(
        NextResponse.json({ error: "Forbidden: You can only change your own password" }, { status: 403 })
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return corsHeaders(
        NextResponse.json({ error: "Current password and new password are required" }, { status: 400 })
      );
    }

    if (newPassword.length < 8) {
      return corsHeaders(
        NextResponse.json({ error: "New password must be at least 8 characters long" }, { status: 400 })
      );
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return corsHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    // Verify current password
    const isPasswordValid = user.password ? await compare(currentPassword, user.password) : false;
    
    if (!isPasswordValid) {
      return corsHeaders(
        NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      );
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 10);

    // Update the password
    await prisma.user.update({
      where: { id: params.id },
      data: {
        password: hashedPassword,
      },
    });

    return corsHeaders(
      NextResponse.json({ 
        message: "Password updated successfully",
        success: true 
      })
    );
  } catch (error) {
    console.error('Error changing password:', error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
} 