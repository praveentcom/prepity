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
        <div className="p-6">{children}</div>
      </div>
    </>
  );
}
