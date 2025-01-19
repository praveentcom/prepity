'use client';

import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/router';
import { Sidebar } from './sidebar';

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

    return isLoading ? (<></>) : (
        <>
            <Sidebar />

            <main className="py-5 lg:pl-72">
                <div className="px-4 sm:px-6 lg:px-8">{children}</div>
            </main>
        </>
    )
}