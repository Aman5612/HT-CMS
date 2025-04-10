import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import type { User } from "next-auth";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define PrismaUser interface
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

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials): Promise<User | null> {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) {
                    return null;
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name ?? null,
                    role: user.role,
                    isActive: user.isActive,
                    image: null,
                };
            },
        }),
    ],
    pages: {
        signIn: "/login",
        signOut: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 60, // 30 minutes
    },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email ?? token.email ?? '';
                token.name = user.name ?? null;
                token.role = user.role;
                token.isActive = user.isActive;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string | null;
                session.user.role = token.role as string;
                session.user.isActive = token.isActive as boolean;
            }
            return session;
        },
    },
}; 