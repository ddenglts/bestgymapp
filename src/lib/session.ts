
import { getIronSession, IronSession, IronSessionData } from 'iron-session';
import { cookies } from 'next/headers';

export const sessionOptions = {
  password: process.env.AUTH_SESSION_TOKEN as string,
  cookieName: 'bestgymapp-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export interface SessionData extends IronSessionData {
  isLoggedIn?: boolean;
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return session;
}
