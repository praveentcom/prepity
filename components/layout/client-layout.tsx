'use client';

import { Sidebar } from './sidebar';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <>
      <Sidebar />
      <div className="lg:pl-72">
        <div className="px-6 py-4">{children}</div>
      </div>
    </>
  );
}
