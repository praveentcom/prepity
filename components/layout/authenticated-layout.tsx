'use client';

import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/router';
import { Sidebar } from './sidebar';
import { Loader2 } from 'lucide-react';

interface AuthenticatedLayoutProps {
	children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
	return (
		<AuthProvider>
            <AuthenticatedLayoutContent>{children}</AuthenticatedLayoutContent>
        </AuthProvider>
	);
}

function AuthenticatedLayoutContent({ children }: AuthenticatedLayoutProps) {
    const { user, isLoading } = useAuth();

	useEffect(() => {
		if (!isLoading && !user) {
			window.location.href = '/auth/login'
		}
	}, [user, isLoading]);

    return isLoading ? (
        <>
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="size-5 text-muted-foreground" />
            </div>
        </>
    ) : (
        <>
            <Sidebar />

            <div className="lg:pl-72">
                <div className="px-4 py-5 sm:px-6 lg:px-8">{children}</div>
            </div>
        </>
    )
}