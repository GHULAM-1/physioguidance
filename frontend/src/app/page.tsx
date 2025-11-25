'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Role } from '@/types/auth';

export default function Home() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h1 className="text-xl font-bold text-gray-900">PhysioGuidance</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-700">
                    Welcome, {user?.name}
                  </span>
                  {user?.roles.includes(Role.ADMIN) && (
                    <Link
                      href="/admin"
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    className="rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-300"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Welcome to PhysioGuidance
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            A comprehensive physiotherapy management system for healthcare professionals.
          </p>

          {isAuthenticated ? (
            <div className="mt-10">
              <div className="rounded-lg bg-white p-8 shadow">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Your Account
                </h2>
                <div className="mt-4 space-y-2 text-left">
                  <p className="text-gray-700">
                    <span className="font-medium">Name:</span> {user?.name}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Email:</span> {user?.email}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Roles:</span> {user?.roles.join(', ')}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">User ID:</span> {user?.userId}
                  </p>
                </div>

                {user?.roles.includes(Role.ADMIN) && (
                  <div className="mt-6">
                    <Link
                      href="/admin"
                      className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Go to Admin Dashboard
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/auth/register"
                className="rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get Started
              </Link>
              <Link
                href="/auth/login"
                className="text-base font-semibold leading-7 text-gray-900"
              >
                Sign in <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
