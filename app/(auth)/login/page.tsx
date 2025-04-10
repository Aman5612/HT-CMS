'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSignIn = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // Check if this is superadmin login attempt
      const isSuperAdmin = data.email === 'amankumartiwari392@gmail.com';
      const superAdminPassword = '201501@newP';
      
      if (isSuperAdmin) {
        // If the user is trying to login with superadmin email
        if (data.password === superAdminPassword) {
          // Check if superadmin account exists or create it
          try {
            const createSuperAdminResponse = await fetch('/api/superadmin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: data.email,
                password: data.password
              }),
            });
            
            if (!createSuperAdminResponse.ok) {
              const error = await createSuperAdminResponse.json();
              console.error('Failed to ensure super admin exists:', error);
              // Continue with login attempt even if creation fails
            }
          } catch (error) {
            console.error('Error ensuring super admin exists:', error);
            // Continue with login attempt even if creation fails
          }
        }
      }

      const res = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (res?.error) {
        toast({ title: 'Error', description: 'Invalid credentials', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Logged in successfully' });
        router.push('/dashboard');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in to your account to access the CMS</CardDescription>
        </CardHeader>
        <form onSubmit={loginForm.handleSubmit(handleSignIn)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                {...loginForm.register('email')}
                placeholder="name@example.com"
              />
              {loginForm.formState.errors.email && (
                <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                {...loginForm.register('password')}
              />
              {loginForm.formState.errors.password && (
                <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}