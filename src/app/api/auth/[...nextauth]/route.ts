import NextAuth from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'

const GITHUB_ID = process.env.GITHUB_ID
const GITHUB_SECRET = process.env.GITHUB_SECRET

const GOOGLE_ID = process.env.GOOGLE_ID
const GOOGLE_SECRET = process.env.GOOGLE_SECRET

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: GITHUB_ID ?? 'Ov23liRdhFixfTbBNcdB',
      clientSecret: GITHUB_SECRET ?? 'aae4076d67dd68ecf7af29f8e4098a5678b0889a',
    }),
    GoogleProvider({
      clientId:
        GOOGLE_ID ??
        '458470353587-avnf4vl5q33i0fgoo5hvs1epe7d0feoq.apps.googleusercontent.com',
      clientSecret: GOOGLE_SECRET ?? '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',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET as string,
})

export { handler as GET, handler as POST }
