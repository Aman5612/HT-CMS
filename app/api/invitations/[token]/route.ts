import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

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

// GET handler to verify an invitation token
export async function GET(request: NextRequest, { params }: any) {
  try {
    const { token } = params;
    
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });
    
    if (!invitation) {
      return corsHeaders(
        NextResponse.json({ valid: false, message: "Invalid invitation token" }, { status: 404 })
      );
    }
    
    if (invitation.used) {
      return corsHeaders(
        NextResponse.json({ valid: false, message: "This invitation has already been used" }, { status: 400 })
      );
    }
    
    if (new Date(invitation.expiresAt) < new Date()) {
      return corsHeaders(
        NextResponse.json({ valid: false, message: "This invitation has expired" }, { status: 400 })
      );
    }
    
    return corsHeaders(
      NextResponse.json({
        valid: true,
        email: invitation.email,
        role: invitation.role,
      })
    );
  } catch (error) {
    console.error('Error validating invitation:', error);
    return corsHeaders(
      NextResponse.json({ valid: false, error: (error as Error).message }, { status: 500 })
    );
  }
}

// POST handler to register a user from an invitation
export async function POST(request: NextRequest, { params }: any) {
  try {
    const { token } = params;
    const { name, password } = await request.json();
    
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });
    
    if (!invitation) {
      return corsHeaders(
        NextResponse.json({ error: "Invalid invitation token" }, { status: 404 })
      );
    }
    
    if (invitation.used) {
      return corsHeaders(
        NextResponse.json({ error: "This invitation has already been used" }, { status: 400 })
      );
    }
    
    if (new Date(invitation.expiresAt) < new Date()) {
      return corsHeaders(
        NextResponse.json({ error: "This invitation has expired" }, { status: 400 })
      );
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the user
    const user = await prisma.user.create({
      data: {
        email: invitation.email,
        name,
        password: hashedPassword,
      },
    });
    
    // Mark the invitation as used
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { used: true },
    });
    
    // Return the user (without the password)
    const { password: _, ...userWithoutPassword } = user;
    return corsHeaders(NextResponse.json(userWithoutPassword));
  } catch (error) {
    console.error('Error registering user from invitation:', error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
} 