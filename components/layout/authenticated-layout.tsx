'use client';

import { Sidebar } from './sidebar';

interface LayoutProps {
	children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: LayoutProps) {
	return (
		<>
			<Sidebar />
			<div className="lg:pl-72">
				<div className="px-4 py-5 sm:px-6 lg:px-8">{children}</div>
			</div>
		</>
	);
}
