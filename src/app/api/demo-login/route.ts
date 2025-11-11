import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const provided = String(body?.password || "");
    const expected = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "DS-AX25";

    if (provided !== expected) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Set a simple demo cookie. Use NextResponse.cookies.set for reliability.
    const res = NextResponse.json({ ok: true });
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    // Note: proxy expects demo_auth === "1"
    res.cookies.set({ name: 'demo_auth', value: '1', httpOnly: true, path: '/в', maxAge, sameSite: 'lax' });
    return res;
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export const GET = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405 });
