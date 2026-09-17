import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import type { UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      accountType: string;
    };
  }
  interface User {
    role?: UserRole;
    accountType?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/en/auth/sign-in',
  },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET
      ? [
          Apple({
            clientId: process.env.AUTH_APPLE_ID,
            clientSecret: process.env.AUTH_APPLE_SECRET,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    Credentials({
      id: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase();
        const rate = await checkRateLimit('auth:login', email);
        if (!rate.allowed) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.deletedAt) return null;
        const valid = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountType: user.accountType,
        };
      },
    }),
    Credentials({
      id: 'phone-otp',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        loginToken: { label: 'Login Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.loginToken) return null;
        const phone = String(credentials.phone);
        const token = String(credentials.loginToken);
        const identifier = `phone-login:${phone}`;

        const record = await prisma.verificationToken.findFirst({
          where: { identifier, token, expires: { gt: new Date() } },
        });
        if (!record) return null;

        await prisma.verificationToken.delete({ where: { identifier_token: { identifier, token } } });

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user || user.deletedAt) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountType: user.accountType,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as typeof token & { id?: string; role?: UserRole; accountType?: string; lastRefresh?: number };
      if (user) {
        t.id = user.id;
        t.role = user.role ?? 'CUSTOMER';
        t.accountType = user.accountType ?? 'GUEST';
        t.lastRefresh = Date.now();
      }

      const shouldRefresh = !t.lastRefresh || Date.now() - t.lastRefresh > 60_000;
      if (t.id && shouldRefresh) {
        const dbUser = await prisma.user.findUnique({
          where: { id: t.id },
          select: { role: true, accountType: true, deletedAt: true },
        });
        if (!dbUser || dbUser.deletedAt) return { ...t, id: undefined };
        t.role = dbUser.role;
        t.accountType = dbUser.accountType;
        t.lastRefresh = Date.now();
      }

      return t;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) ?? 'CUSTOMER';
        session.user.accountType = (token.accountType as string) ?? 'GUEST';
      }
      return session;
    },
  },
});

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'ADMIN') throw new Error('Forbidden');
  return session;
}

export async function requireStaff() {
  const session = await requireAuth();
  if (session.user.role !== 'ADMIN' && session.user.role !== 'WORKER') throw new Error('Forbidden');
  return session;
}
