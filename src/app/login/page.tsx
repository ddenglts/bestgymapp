
'use client';

import { login } from './actions';
import { useActionState } from 'react';

export default function LoginPage() {
  const [state, formAction] = useActionState(login, undefined);

  return (
    <main className="flex flex-col items-center justify-center">
      <div className="w-full max-w-xs">
        <form action={formAction} className="bg-white shadow-md rounded px-8 pt-6 pb-8 dark:bg-neutral-900">
          <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300" htmlFor="password">
              Password
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              id="password"
              name="password"
              type="password"
              placeholder="******************"
            />
          </div>
          {state?.error && (
            <p className="text-red-500 text-xs italic mb-4">{state.error}</p>
          )}
          <div className="flex items-center justify-between">
            <button
              className="bg-neutral-600 hover:bg-neutral-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              type="submit"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
