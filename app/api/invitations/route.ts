import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';
import { add } from 'date-fns';
import { sendEmail } from "@/lib/email";
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

// Helper function to check if user is admin
async function isUserAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    console.log("No session found for admin check");
    return false;
  }
  
  // Log session data for debugging
  console.log("Session data for admin check:", JSON.stringify(session.user, null, 2));
  
  // First check if role is in the session
  if (session.user.role === "admin") {
    console.log("User is admin based on session data");
    return true;
  }
  
  // If not in session, check database
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
  
  console.log("Database user data for admin check:", JSON.stringify(currentUser, null, 2));
  
  return currentUser?.role === "admin";
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return corsHeaders(new NextResponse(null, { status: 200 }));
}

// GET handler to fetch all invitations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return corsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }
    
    // Log session data for debugging
    console.log("GET invitations - Session data:", JSON.stringify(session.user, null, 2));
    
    // First check if role is in the session
    if (session.user.role === "admin") {
      const invitations = await prisma.invitation.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return corsHeaders(NextResponse.json(invitations));
    }
    
    // If not in session, check database
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
    
    // Only admins can see invitations
    if (currentUser?.role !== "admin") {
      return corsHeaders(
        NextResponse.json({ error: "Forbidden: Requires admin role" }, { status: 403 })
      );
    }
    
    const invitations = await prisma.invitation.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return corsHeaders(NextResponse.json(invitations));
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
}

// Generate a beautiful HTML email template
function generateInvitationEmail(inviteUrl: string, role: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>You've Been Invited!</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          background-color: #f8f9fa;
          border-radius: 4px;
        }
        .content {
          padding: 20px 0;
        }
        .button {
          display: inline-block;
          background-color: #007bff;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #6c757d;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
        }
        .info {
          background-color: #e9f7fe;
          border-left: 4px solid #007bff;
          padding: 12px;
          margin: 20px 0;
          border-radius: 0 4px 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You've Been Invited!</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have been invited to join our CMS platform as a <strong>${role}</strong>.</p>
          
          <p>To accept this invitation and create your account, please click the button below:</p>
          
          <div style="text-align: center;">
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
          </div>
          
          <div class="info">
            <p><strong>Note:</strong> This invitation link is valid for 24 hours only.</p>
          </div>
          
          <p>If you did not expect this invitation, you can safely ignore this email.</p>
          
          <p>Best regards,<br>The Admin Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>If you're having trouble with the button above, copy and paste the URL below into your web browser:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// POST handler to create a new invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return corsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }
    
    // Get current user to check if they're an admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true },
    });
    
    // Only admins can send invitations
    if (currentUser?.role !== "admin") {
      return corsHeaders(
        NextResponse.json({ error: "Forbidden: Requires admin role" }, { status: 403 })
      );
    }
    
    const { email, role = 'author' } = await request.json();
    
    // Check if email is already in use by an existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return corsHeaders(
        NextResponse.json(
          { error: "This email address is already associated with an account" },
          { status: 400 }
        )
      );
    }
    
    // Check if there's an existing invitation
    const existingInvitation = await prisma.invitation.findUnique({
      where: { email },
    });
    
    // If there's an existing invitation, delete it
    if (existingInvitation) {
      await prisma.invitation.delete({
        where: { id: existingInvitation.id },
      });
    }
    
    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Create invitation with 24 hour expiry
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        token,
        expiresAt: add(new Date(), { hours: 24 }),
      },
    });
    
    // Create the invitation URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${token}`;
    
    // Generate and send the email
    const htmlEmail = generateInvitationEmail(inviteUrl, role);
    await sendEmail({
      to: email,
      subject: 'You have been invited to join the CMS',
      html: htmlEmail,
    });
    
    return corsHeaders(NextResponse.json(invitation));
  } catch (error) {
    console.error('Error creating invitation:', error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
}

// DELETE handler to revoke an invitation
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return corsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }
    
    // Get current user to check if they're an admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true },
    });
    
    // Only admins can revoke invitations
    if (currentUser?.role !== "admin") {
      return corsHeaders(
        NextResponse.json({ error: "Forbidden: Requires admin role" }, { status: 403 })
      );
    }
    
    const { id } = await request.json();
    
    await prisma.invitation.delete({
      where: { id },
    });
    
    return corsHeaders(
      NextResponse.json({ message: "Invitation revoked successfully" })
    );
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return corsHeaders(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
} 