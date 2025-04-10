import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt";

// POST handler to create super admin if it doesn't exist
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { email, password } = data;

    // Validate that this is the superadmin email
    if (email !== 'amankumartiwari392@gmail.com') {
      return NextResponse.json(
        { error: "Only the super admin email is allowed" },
        { status: 403 }
      );
    }

    // Check if the account already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If user exists but is not admin, update to admin
      if (existingUser.role !== 'admin') {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'admin', isActive: true },
        });
        
        return NextResponse.json({
          message: "Super admin role enforced successfully",
        });
      }
      
      // If user already exists as admin, nothing to do
      return NextResponse.json({
        message: "Super admin already exists",
      });
    }

    // Create new super admin account
    const hashedPassword = await hash(password, 10);
    
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: "Super Admin",
        role: "admin",
        isActive: true,
      },
    });

    // Remove sensitive information
    const { password: _, ...result } = newUser;

    return NextResponse.json({
      message: "Super admin created successfully",
      user: result,
    });
  } catch (error) {
    console.error('Error ensuring super admin exists:', error);
    return NextResponse.json(
      { error: "Failed to create super admin" },
      { status: 500 }
    );
  }
} 