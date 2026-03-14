import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import { db } from "./db";
import { authSecret } from "./auth-config";

// Extend JWT & Session types locally (without modifying global types) for username
interface ExtendedJWT extends JWT {
    id?: string | number;
    username?: string | null;
}

interface ExtendedUser {
    id: string | number;
    email?: string | null;
    name?: string | null;
    username?: string | null;
}

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(db),

    secret: authSecret,
    debug: process.env.NODE_ENV === 'development',
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: '/auth/avacxAuth',
    },
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_ID || "",
            clientSecret: process.env.GITHUB_SECRET || "",
            authorization: {
                params: {
                    scope: "read:user user:email repo read:org",
                },
            },
            profile(profile) {
                return {
                    id: profile.id?.toString(),
                    name: (profile as { name?: string; login?: string }).name || (profile as { login?: string }).login,
                    email: (profile as { email?: string }).email,
                    image: (profile as { avatar_url?: string }).avatar_url,
                    username: (profile as { login?: string }).login,
                };
            }
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            const t = token as ExtendedJWT;
            if (user) {
                console.log('[next-auth][jwt] user present, attaching id/email/name/username');
                const u = user as unknown as ExtendedUser;
                t.id = u.id;
                if (u.email) token.email = u.email;
                if (u.name) token.name = u.name;
                t.username = u.username ?? null;
            } else {
                // Subsequent calls - preserve existing values from token
                // t.id should already be set from previous call, but ensure it persists
                console.log('[next-auth][jwt] no user (subsequent call), token id:', t.id ?? token.sub);
                // If id is not set but sub is available, use sub as fallback
                if (t.id === undefined && token.sub) {
                    t.id = token.sub;
                }
            }
            return t;
        },
        async session({ session, token }) {
            const t = token as ExtendedJWT;
            const s = session as Session & { id?: string | number; user: { id?: string | number; username?: string | null } };
            console.log('[next-auth][session] building session from token id:', t.id, 'username:', t.username);
            if (t.id) {
                s.id = t.id;
                if (s.user) s.user.id = t.id;
            }
            if (t.username !== undefined && s.user) {
                (s.user as { username?: string | null }).username = t.username;
            }
            return s;
        },
async signIn({ user, account, profile }) {
    if (account?.provider === 'github' || account?.provider === 'google') {
        try {
            const u = user as ExtendedUser;
            console.log(`[next-auth][signIn][${account.provider}] incoming user id:`, u.id, 'username:', u.username, 'email:', u.email);
            
            if (!u.username) {
                let baseRaw: string;
                
                if (account.provider === 'github') {
                    baseRaw = (profile && (profile as { login?: string }).login) || 
                             (u.email ? u.email.split('@')[0] : undefined) || 
                             'user';
                } else if (account.provider === 'google') {
                    baseRaw = u.email ? u.email.split('@')[0] : 'user';
                } else {
                    baseRaw = 'user';
                }
                
                const base = baseRaw.toLowerCase();
                let candidate = base;
                let i = 0;
                
                while (await db.user.findFirst({ where: { username: candidate } })) {
                    i += 1;
                    candidate = `${base}${i}`;
                }
                
                await db.user.update({
                    where: { id: Number(u.id) },
                    data: { username: candidate }
                });
                
                console.log(`[next-auth][signIn][${account.provider}] assigned username:`, candidate);
            }
        } catch (e) {
            console.error(`${account.provider} signIn username ensure error:`, e);
        }
    }
    return true;
},
    },
}

export default NextAuth(authOptions);