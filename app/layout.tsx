import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { DM_Sans } from 'next/font/google';
import { Suspense } from 'react';
import Providers from './providers';
import Loading from './loading';

const nunito = DM_Sans({
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Blog CMS | HolidayTribe',
	description: 'A tool to help you manage the data of investors and VC firms',
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<body className={`antialiased ${nunito.className}`}>
				<Suspense fallback={<Loading />}>
					<Providers>
						<Toaster duration={2500} richColors closeButton position='top-right' />
						{children}
					</Providers>
				</Suspense>
			</body>
		</html>
	);
}
