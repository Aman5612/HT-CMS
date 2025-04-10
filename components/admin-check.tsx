'use client';

import { useSession } from 'next-auth/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, ShieldAlert, User } from 'lucide-react';

export function AdminCheck() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <Alert className="mb-4">
        <User className="h-4 w-4" />
        <AlertTitle>Loading session...</AlertTitle>
        <AlertDescription>
          Checking user permissions...
        </AlertDescription>
      </Alert>
    );
  }

  if (!session?.user) {
    return (
      <Alert variant="destructive" className="mb-4">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>
          You are not signed in. Please log in to access this area.
        </AlertDescription>
      </Alert>
    );
  }

  const isAdmin = session.user.role === 'admin';

  return (
    <Alert variant={isAdmin ? 'default' : 'destructive'} className="mb-4">
      <Shield className="h-4 w-4" />
      <AlertTitle>{isAdmin ? 'Admin Access' : 'Access Denied'}</AlertTitle>
      <AlertDescription>
        {isAdmin 
          ? 'You have admin privileges.' 
          : 'This area requires admin privileges.'}
      </AlertDescription>
    </Alert>
  );
} 