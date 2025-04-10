'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

type RoleGateProps = {
  children: ReactNode;
  allowedRoles?: string[];
  requireActive?: boolean;
  fallback?: ReactNode;
};

export function RoleGate({
  children,
  allowedRoles = ['admin', 'editor', 'author'],
  requireActive = true,
  fallback
}: RoleGateProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // If we have session data and can make a determination
    if (status === 'authenticated' && session?.user) {
      const userRole = session.user.role;
      const isActive = session.user.isActive;
      const hasPermission = allowedRoles.includes(userRole);
      
      // Handle inactive account
      if (requireActive && !isActive) {
        toast({
          title: 'Account Inactive',
          description: 'Your account is currently inactive',
          variant: 'destructive',
        });
        router.push('/account-inactive');
        return;
      }
      
      // Handle insufficient permissions
      if (!hasPermission) {
        toast({
          title: 'Access Denied',
          description: `You need ${allowedRoles.join(' or ')} permissions to access this`,
          variant: 'destructive',
        });
        setShowFallback(true);
        return;
      }
      
      // User has permission, don't show fallback
      setShowFallback(false);
    }
  }, [status, session, allowedRoles, requireActive, router, toast]);

  // While loading, show nothing
  if (status === 'loading') {
    return null;
  }

  // If unauthenticated, redirect to login
  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  // Show fallback content or restricted access message
  if (showFallback) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <Alert variant="destructive" className="mb-4">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access Restricted</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>You don't have the required permissions to access this section.</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/dashboard')}
            className="mt-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // User has permission, render children
  return <>{children}</>;
} 