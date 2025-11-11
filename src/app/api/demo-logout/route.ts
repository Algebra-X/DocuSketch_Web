import { NextResponse } from 'next/server'

export async function POST() {
  // Clear the demo cookie by expiring it.
  const res = NextResponse.json({ ok: true })
  // Set Max-Age=0 to delete, keep SameSite/Path similar to login route
  res.headers.append('Set-Cookie', 'demo_auth=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax')
  return res
}

export const GET = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
