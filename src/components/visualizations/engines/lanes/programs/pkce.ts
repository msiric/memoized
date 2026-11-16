import type { ProgramSource } from '../../../step-log/lesson-source'

/**
 * Frontend Security (js-track/frontend-development/security, PREMIUM): the
 * practice answer's Authorization Code + PKCE routes (its fourth JavaScript
 * block, the Google example), by locator and sha256, run against a local
 * stand-in for the authorization server. The harness (no answer code)
 * supplies what the answer leaves to its framework: an `app` that records
 * routes, sessions, `base64url`, `jwt.decode`, `upsertUser`, a `crypto` whose
 * random source is seeded (so the recording is the same on every run; the
 * hash is node:crypto's) and a `fetch` that is the token endpoint. Then it
 * plays the flow as a browser would, recording every hop: which channel it
 * travels (front: through the browser's address bar; back: server to
 * server), from whom to whom, and the parameter names it carries. The token
 * endpoint checks the code, client and S256(code_verifier) against the
 * stored challenge (RFC 7636 4.6); two attacks are replayed: a callback
 * with a forged state, and an intercepted code exchanged without the
 * verifier.
 */

const ANSWERS = 'content/js-track/frontend-development/_lessons.json'

const PRELUDE = String.raw`
const nodeCrypto = require('node:crypto')
let __seed = 7
const __bytes = (n) => Buffer.from(Array.from({ length: n }, () => (__seed = (__seed * 1103515245 + 12345) % 2147483648) & 255))
const crypto = {
  randomUUID: () => { const h = __bytes(16).toString('hex'); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-a' + h.slice(17, 20) + '-' + h.slice(20, 32) },
  randomBytes: (n) => __bytes(n),
  createHash: (alg) => nodeCrypto.createHash(alg),
}
const base64url = (buf) => Buffer.from(buf).toString('base64url')
const __routes = {}
const app = { get: (path, handler) => { __routes[path] = handler } }
process.env.GOOGLE_CLIENT_ID = 'client-123'
process.env.GOOGLE_CLIENT_SECRET = 'secret-456'
const jwt = { decode: (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()) }
const upsertUser = async (claims) => ({ id: 'user-' + claims.sub })
const __hops = []
const __codes = new Map()
const __names = (o) => Object.keys(o)
globalThis.fetch = async (url, init) => {
  const body = Object.fromEntries(init.body)
  __hops.push({ n: 4, channel: 'back', from: 'app', to: 'auth', what: init.method + ' ' + new URL(url).pathname, params: __names(body) })
  const grant = __codes.get(body.code)
  const S256 = (v) => nodeCrypto.createHash('sha256').update(v).digest('base64url')
  const ok = grant && body.client_id === grant.client_id && body.client_secret === 'secret-456' && body.redirect_uri === grant.redirect_uri && body.code_verifier !== undefined && S256(body.code_verifier) === grant.challenge
  const reply = ok ? { access_token: 'access-1', id_token: 'h.' + Buffer.from(JSON.stringify({ sub: '42', email: 'a@example.com' })).toString('base64url') + '.s' } : { error: 'invalid_grant' }
  __hops.push({ n: 5, channel: 'back', from: 'auth', to: 'app', what: ok ? '200 tokens' : '400', params: __names(reply) })
  return { json: async () => reply }
}
`

const FLOW = String.raw`
;(async () => {
  const res = (out) => ({ redirect: (u) => (out.redirect = u), sendStatus: (s) => (out.status = s) })
  const query = (u) => Object.fromEntries(new URL(u, 'https://app.example.com').searchParams)
  // 1. The browser asks the app to log in; the app answers with a redirect the browser follows.
  const session = {}
  const out1 = {}
  __routes['/auth/google']({ session }, res(out1))
  const authz = new URL(out1.redirect)
  const q1 = query(out1.redirect)
  __hops.push({ n: 1, channel: 'front', from: 'browser', to: 'auth', what: 'GET ' + authz.host + authz.pathname, params: Object.keys(q1) })
  // 2-3. The user signs in at the authorization server, which redirects the browser back with a code.
  const code = 'code-' + base64url(__bytes(6))
  __codes.set(code, { challenge: q1.code_challenge, client_id: q1.client_id, redirect_uri: q1.redirect_uri, method: q1.code_challenge_method })
  const back = q1.redirect_uri + '?' + new URLSearchParams({ code, state: q1.state })
  __hops.push({ n: 3, channel: 'front', from: 'auth', to: 'browser', what: 'redirect ' + new URL(q1.redirect_uri).pathname, params: Object.keys(query(back)) })
  const out2 = {}
  await __routes['/auth/callback']({ query: query(back), session }, res(out2))
  __hops.push({ n: 6, channel: 'front', from: 'app', to: 'browser', what: 'redirect ' + out2.redirect, params: [] })
  // The attacks: a forged state, and an intercepted code without its verifier.
  const forged = {}
  await __routes['/auth/callback']({ query: { code, state: 'forged' }, session }, res(forged))
  const form = new URLSearchParams()
  for (const [k, v] of Object.entries({ code, client_id: q1.client_id, client_secret: 'secret-456', redirect_uri: q1.redirect_uri, grant_type: 'authorization_code' })) form.append(k, v)
  const stolen = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: form })).json()
  __hops.splice(-2)
  const S256 = nodeCrypto.createHash('sha256').update(session.oauth.codeVerifier).digest('base64url')
  console.log(JSON.stringify({
    hops: __hops.sort((a, b) => a.n - b.n),
    holds: {
      session: Object.keys(session.oauth),
      userId: session.userId,
      challengeIsS256: q1.code_challenge === S256 && q1.code_challenge_method === 'S256',
      verifierInFront: __hops.some((h) => h.channel === 'front' && h.params.includes('code_verifier')),
      tokensInFront: __hops.some((h) => h.channel === 'front' && h.params.some((p) => /token/.test(p))),
    },
    attacks: { forgedState: forged.status ?? null, codeWithoutVerifier: stolen.error ?? null },
  }))
})()
`

export const pkceSource: ProgramSource = [
  { code: PRELUDE },
  {
    block: { path: ANSWERS, lesson: '/security', problem: 'authentication-and-session-patterns-jwt-oauth2-session-cookies', lang: 'javascript', nth: 4 },
    lessonSha256: 'a502f3f1ae99ec504a46937abfcc12c7b292f9ff63a0baf917cbcc7eb2f463ae',
  },
  { code: FLOW },
]

export type PkceHop = { n: number; channel: 'front' | 'back'; from: 'browser' | 'app' | 'auth'; to: 'browser' | 'app' | 'auth'; what: string; params: string[] }

export type PkceRecording = {
  generator: string
  sha256: string
  hops: PkceHop[]
  holds: { session: string[]; userId: string; challengeIsS256: boolean; verifierInFront: boolean; tokensInFront: boolean }
  attacks: { forgedState: number | null; codeWithoutVerifier: string | null }
}
