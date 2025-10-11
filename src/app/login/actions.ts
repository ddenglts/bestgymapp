
'use server';

import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';

export async function login(prevState: { error: string } | undefined, formData: FormData) {
  const password = formData.get('password') as string;
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!hash) {
    return { error: 'Server is not configured for authentication.' };
  }

  const match = await bcrypt.compare(password, hash);

  if (match) {
    const session = await getSession();
    session.isLoggedIn = true;
    await session.save();
    redirect('/');
  } else {
    return { error: 'Invalid password' };
  }
}
