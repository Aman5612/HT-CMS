'use client';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SessionProvider } from 'next-auth/react';

const Providers = ({ children }: { children: React.ReactNode }) => {
	return (
		<SessionProvider>
			<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
				<TooltipProvider>{children}</TooltipProvider>
			</ThemeProvider>
		</SessionProvider>
	);
};

export default Providers;
