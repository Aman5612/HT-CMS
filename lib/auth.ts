import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { getServerSession as nextAuthGetServerSession } from 'next-auth';

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

// Add custom types to augment the default NextAuth types
declare module "next-auth" {
	interface User {
		id: string;
		email?: string;  // Make email optional with the same modifier as in DefaultUser
		name?: string | null;
		role: string;
		isActive: boolean;
	}

	interface Session {
		user: User;
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		id: string;
		role: string;
		isActive: boolean;
		email?: string;  // Make email optional to match User interface
	}
}

// Export getServerSession function with authOptions for server-side authentication
export const getServerSession = async () => {
	return await nextAuthGetServerSession(authOptions);
};

// Export getSession function for API route usage
export const getSession = async () => {
	return await getServerSession();
};

export const authOptions: NextAuthOptions = {
	secret: process.env.NEXTAUTH_SECRET,
	session: {
		strategy: 'jwt',
		maxAge: 30 * 60, // 30 minutes - shorter session to force token refresh
	},
	pages: {
		signIn: '/login',
	},
	debug: process.env.NODE_ENV === 'development',
	providers: [
		CredentialsProvider({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					return null;
				}

				const user = await prisma.user.findUnique({
					where: {
						email: credentials.email,
					},
				});

				if (!user) {
					return null;
				}

				const isPasswordValid = await compare(credentials.password, user.password);

				if (!isPasswordValid) {
					return null;
				}

				// Cast user to our PrismaUser interface to ensure TypeScript recognizes the role property
				const typedUser = user as unknown as PrismaUser;
				console.log("Auth - user found with role:", typedUser.role);

				// Return required user properties - IMPORTANT: this shape must match our User interface
				return {
					id: typedUser.id,
					email: typedUser.email,
					name: typedUser.name,
					role: typedUser.role,
					isActive: typedUser.isActive,
				};
			},
		}),
	],
	callbacks: {
		async jwt({ token, user }) {
			console.log("JWT callback called:", { hasUser: !!user, tokenEmail: token.email });
			
			if (user) {
				// When user signs in, copy all properties to the token
				console.log("JWT - Setting from user object:", user);
				// Copy ALL user properties to the token
				return {
					...token,
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					isActive: user.isActive,
				};
			}

			// Return existing token if user is not present (token refresh)
			return token;
		},
		async session({ session, token }) {
			// Copy token properties to session
			console.log("Session callback with token:", token);
			
			// Ensure all user properties are copied to session.user
			session.user = {
				id: token.id,
				name: token.name,
				email: token.email,
				role: token.role,
				isActive: token.isActive,
			};
			
			console.log("Session being returned:", session);
			return session;
		},
	},
};
