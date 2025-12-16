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
				<div className="p-4 sm:p-6">{children}</div>
			</div>
		</>
	);
}
