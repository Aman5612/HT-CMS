'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LayoutDashboard,
  FileText,
  Image,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';

const getNavigation = (isAdmin = false) => [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Posts', href: '/dashboard/posts', icon: FileText },
  { name: 'Media', href: '/dashboard/media', icon: Image },
  ...(isAdmin ? [{ name: 'Users', href: '/dashboard/users', icon: Users }] : []),
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const isAdmin = session?.user?.role === 'admin';
  console.log('DashboardNav - Session:', {
    hasUserData: !!session?.user,
    email: session?.user?.email,
    id: session?.user?.id,
    role: session?.user?.role,
    isActive: session?.user?.isActive
  });
  
  const navigation = getNavigation(isAdmin);
  
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.'
      });
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold">
              {/* <img src="/images/logo.png" alt="Blog" width={120} height={30} /> */}
              Blog CMS
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-center space-x-4">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {session?.user && (
              <div className="text-sm text-muted-foreground">
                {session.user.email}
                {isAdmin && (
                  <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    Admin
                  </span>
                )}
                {!isAdmin && session?.user?.role && (
                  <span className="ml-2 text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full">
                    {session.user.role}
                  </span>
                )}
              </div>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}