
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.destroy();

  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.set(sessionOptions.cookieName, '', { maxAge: -1 });

  return response;
}
