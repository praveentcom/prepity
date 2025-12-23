'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from '@headlessui/react';
import { Menu, X, Loader2 } from 'lucide-react';
import { Logo } from '@/components/atoms/logo';
import { ThemeSwitcher } from '@/components/atoms/theme-switcher';
import packageInfo from '@/package.json';
import { fetchRequests } from '@/lib/client/requests';
import { Request } from '@prisma/client';
import moment from 'moment';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { IconToggle } from '../ui/icon-toggle';
import { useRequests } from '@/lib/client/contexts/requests-context';
import { Button } from '../ui/button';

/**
 * Sidebar component for the Prepity application.
 *
 * It is used to display the sidebar menu and the requests cards in desktop and mobile views.
 * It also fetches the requests from the database and stores them in the local storage.
 */
export function Sidebar() {
  const router = useRouter();
  const { requests, setRequests, isLoading, setIsLoading } = useRequests();

  const { id: activeRequestId } = router.query;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (requests.length > 0) {
      localStorage.setItem('requests', JSON.stringify(requests));
      return;
    }

    const storedRequests = localStorage.getItem('requests');
    if (storedRequests) {
      try {
        const parsed = JSON.parse(storedRequests);
        setRequests(parsed);
      } catch (error) {
        console.error('Error parsing stored requests:', error);
      }
    }

    const loadRequests = async () => {
      setIsLoading(true);
      try {
        const data = await fetchRequests(100);
        setRequests(data);
        localStorage.setItem('requests', JSON.stringify(data));
      } catch (error) {
        console.error('Error loading requests:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRequests();
  }, []);

  useEffect(() => {
    const handleRequestsUpdated = () => {
      const updatedRequests = localStorage.getItem('requests');
      if (updatedRequests) {
        try {
          const parsed = JSON.parse(updatedRequests);
          setRequests(parsed);
        } catch (error) {
          console.error('Error parsing updated requests:', error);
        }
      }
    };
    window.addEventListener('requests-updated', handleRequestsUpdated);

    return () => {
      window.removeEventListener('requests-updated', handleRequestsUpdated);
    };
  }, [setRequests]);

  useEffect(() => {
    if (requests.length > 0) {
      const topRequests = requests.slice(0, 5);
      topRequests.forEach((request) => {
        router.prefetch(`/requests/${request.requestSlug}`);
      });
    }
  }, [requests, router]);

  /**
   * VersionInfo component for the Prepity application.
   *
   * It is used to display the version information of the application.
   * @returns The VersionInfo component
   */
  const VersionInfo = () => (
    <div className="flex w-full cursor-pointer items-center gap-x-3 px-4 py-2.5 hover:bg-muted border-t">
      <div className="flex flex-col text-left">
        <span
          className="text-xs text-muted-foreground truncate"
          aria-hidden="true"
        >
          v{packageInfo.version}
        </span>
      </div>
    </div>
  );

  /**
   * groupedRequests is a memoized function that groups the requests by date.
   * @returns The grouped requests
   */
  const groupedRequests = useMemo(() => {
    return requests.reduce<Record<string, Request[]>>((acc, request) => {
      const date = moment(request.createdAt).format('DD MMM YYYY');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(request);
      return acc;
    }, {});
  }, [requests]);

  /**
   * RequestCard component for the Prepity application.
   *
   * It is used to display the request card in the sidebar.
   * @param request - The request to display
   * @returns The RequestCard component
   */
  const RequestCard = ({ request }: { request: Request }) => {
    const isActive = activeRequestId === request.requestSlug;

    return (
      <Link
        href={`/requests/${request.requestSlug}`}
        prefetch={true}
        onClick={() => setSidebarOpen(false)}
      >
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          className="w-full justify-start"
        >
          {request.isStarred && (
            <IconToggle
              isStarred={request.isStarred}
              onToggle={async () => {
                return;
              }}
              size="small"
            />
          )}
          <div className="truncate">{request.query}</div>
        </Button>
      </Link>
    );
  };

  /**
   * getSidebar is a function that returns the sidebar component.
   * @returns The sidebar component
   */
  const getSidebar = () => {
    return (
      <div className="flex size-full flex-col border-r bg-sidebar px-6">
        {/* Fixed Header */}
        <div className="flex items-center justify-between my-3">
          <Logo />
          <ThemeSwitcher />
        </div>

        {/* Scrollable Requests */}
        <nav className="h-[calc(100vh-3rem)]">
          <ul className="flex h-full flex-col">
            <div className="flex-1 -mx-6">
              <div className="h-full overflow-y-auto">
                {isLoading && requests.length === 0 ? (
                  <div className="flex items-center justify-center py-8 px-4">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : Object.entries(groupedRequests).length === 0 ? (
                  <div className="text-xs text-muted-foreground px-4 py-2">
                    Generated question sets will be listed here once ready
                  </div>
                ) : (
                  Object.entries(groupedRequests).map(([date, _requests]) => (
                    <div
                      key={date}
                      className="date-group grid grid-cols-1 gap-y-2"
                    >
                      <h3 className="text-[0.7rem] font-medium uppercase text-muted-foreground sticky top-0 bg-muted py-1.5 px-4 border-y">
                        {date}
                      </h3>
                      <div className="requests-cards grid grid-cols-1 gap-y-2 px-3 pb-3 pt-1">
                        {_requests.map((request) => (
                          <RequestCard key={request.id} request={request} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <li className="-mx-6 mt-auto">
              <VersionInfo />
            </li>
          </ul>
        </nav>
      </div>
    );
  };

  return (
    <>
      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className="relative z-50 lg:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-muted/90 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-sm flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            {/* Mobile sidebar content */}
            <TransitionChild>
              <div className="absolute left-full top-0 flex w-16 justify-center py-3 duration-300 ease-in-out data-closed:opacity-0">
                <Button
                  onClick={() => setSidebarOpen(false)}
                  variant="ghost"
                  size="icon"
                  aria-label="Close sidebar"
                >
                  <X />
                </Button>
              </div>
            </TransitionChild>
            {getSidebar()}
          </DialogPanel>
        </div>
      </Dialog>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        {getSidebar()}
      </div>

      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center justify-between p-3 sm:px-6 lg:hidden bg-card">
        <div className="flex items-center gap-x-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <Logo className="self-center" />
        </div>
        <ThemeSwitcher />
      </div>
    </>
  );
}
