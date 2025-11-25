'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types/auth';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: Role[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }

    if (!loading && user && allowedRoles && allowedRoles.length > 0) {
      const hasRole = user.roles.some((role) => allowedRoles.includes(role));
      if (!hasRole) {
        router.push('/');
      }
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return null;
    }
  }

  return <>{children}</>;
}
