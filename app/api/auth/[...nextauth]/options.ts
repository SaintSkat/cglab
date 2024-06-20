import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials"

export const options: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text", placeholder: "jsmith" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
            const res = await fetch(`${process.env.SITE_URL}/api/ubuntu/checkubuntu`, {
                method: 'POST',
                body: JSON.stringify(credentials),
                headers: { "Content-Type": "application/json" }
            })
            const user = await res.json()
        
            // If no error and we have user data, return it
            if (res.ok && user) {
                return user
            }
            // Return null if user data could not be retrieved
            return null
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            // Initial sign in
            if (user) {
                token.username = user.username;
                token.password = user.password;
            }
            return token;
        },
        async session({ session, token }) {
            // Add custom properties to session
            if (token) {
                session.user.username = token.username as string;
                session.user.password = token.password as string;
            }
            return session;
        },   
    },
    session: {
        strategy: 'jwt', // Use JWT for session
    },
    jwt: {
        secret: process.env.NEXTAUTH_SECRET,
    }
}