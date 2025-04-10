'use client';

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "next-auth/react";
import { AlertCircle } from "lucide-react";

export default function AccountInactivePage() {
  const router = useRouter();
  
  // Ensure user is signed out after a short delay when landing on this page
  useEffect(() => {
    const timer = setTimeout(() => {
      signOut({ redirect: false });
    }, 15000); // 15 seconds
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-[450px] shadow-lg border-red-200">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-red-100 w-16 h-16 flex items-center justify-center rounded-full mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Account Inactive</CardTitle>
          <CardDescription className="text-red-500">
            Your account has been deactivated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p>
            Your account is currently inactive. You do not have permission to access the dashboard or perform any actions.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact your administrator for assistance or to reactivate your account.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSignOut}
            className="w-full"
          >
            Return to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 