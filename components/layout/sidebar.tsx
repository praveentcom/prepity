'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from '@headlessui/react';
import { Menu, X, Loader2, Search, Plus } from 'lucide-react';
import { Logo } from '@/components/atoms/logo';
import { ThemeSwitcher } from '@/components/atoms/theme-switcher';
import packageInfo from '@/package.json';
import { Request } from '@prisma/client';
import moment from 'moment';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { IconToggle } from '../ui/icon-toggle';
import { useRequests } from '@/lib/client/contexts/requests-context';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * Sidebar component for the Prepity application. It is used to display
 * the sidebar menu and the requests cards in desktop and mobile views.
 */
export function Sidebar() {
  const router = useRouter();
  const { requests, isLoading, refreshRequests } = useRequests();

  const { id: activeRequestId } = router.query;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const [renderKey, setRenderKey] = useState(0);

  /**
   * useEffect to save the requests to localStorage.
   * This is used to ensure the requests are persisted across sessions.
   */
  useEffect(() => {
    if (requests.length > 0) {
      localStorage.setItem('requests', JSON.stringify(requests));
    }
  }, [requests]);

  /**
   * useEffect to handle the requests updated event.
   * This is used to refresh the requests when the requests are updated.
   */
  useEffect(() => {
    const handleRequestsUpdated = () => {
      refreshRequests();
    };
    window.addEventListener('requests-updated', handleRequestsUpdated);

    return () => {
      window.removeEventListener('requests-updated', handleRequestsUpdated);
    };
  }, [refreshRequests]);

  /**
   * useEffect to prefetch the top 5 requests.
   * This is used to ensure the requests are loaded quickly when the sidebar is opened.
   */
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
    <div className="flex w-full items-center justify-between gap-x-3 px-4 py-2.5 border-t">
      <span
        className="text-xs text-muted-foreground truncate"
        aria-hidden="true"
      >
        v{packageInfo.version}
      </span>
      <Link
        href="mailto:mail@praveent.com"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Provide Feedback
      </Link>
    </div>
  );

  /**
   * filteredRequests filters based on search query
   * @returns The filtered requests
   */
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const query = searchQuery.toLowerCase();
    return requests.filter(
      (request) =>
        request.title?.toLowerCase().includes(query) ||
        request.query?.toLowerCase().includes(query)
    );
  }, [requests, searchQuery]);

  /**
   * groupedRequests is a memoized function that groups the filtered requests by date.
   * @returns The grouped requests
   */
  const groupedRequests = useMemo(() => {
    return filteredRequests.reduce<Record<string, Request[]>>(
      (acc, request) => {
        const date = moment(request.createdAt).format('DD MMM YYYY');
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(request);
        return acc;
      },
      {}
    );
  }, [filteredRequests]);

  type VirtualItem =
    | { type: 'header'; date: string }
    | { type: 'request'; request: Request };

  /**
   * flattenedItems is a memoized function that flattens the grouped requests.
   * @returns The flattened items
   */
  const flattenedItems = useMemo<VirtualItem[]>(() => {
    const items: VirtualItem[] = [];
    Object.entries(groupedRequests).forEach(([date, _requests]) => {
      items.push({ type: 'header', date });
      _requests.forEach((request) => {
        items.push({ type: 'request', request });
      });
    });
    return items;
  }, [groupedRequests]);

  /**
   * useVirtualizer is a hook that is used to virtualize the sidebar.
   * @returns The virtualizer instance
   */
  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flattenedItems[index];
      return item.type === 'header' ? 32 : 42;
    },
    overscan: 10,
    enabled: true,
  });

  /**
   * useEffect to measure the virtualizer when the sidebar is open
   * in mobile view. This is used to ensure the sidebar is scrollable
   * and the items are visible.
   */
  useEffect(() => {
    if (sidebarOpen) {
      setRenderKey((prev) => prev + 1);
      const timer = setTimeout(() => {
        virtualizer.measure();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [sidebarOpen, virtualizer]);

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
        className="min-w-0"
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
          <div className="truncate">{request.title || request.query}</div>
        </Button>
      </Link>
    );
  };

  /**
   * getSidebar is a function that returns the sidebar component.
   * @returns The sidebar component for all screens
   */
  const getSidebar = () => {
    return (
      <div className="flex h-full flex-col border-r bg-sidebar">
        {/* Fixed Header */}
        <div className="flex shrink-0 items-center justify-between px-4 py-4 -mr-1">
          <Logo />
          <ThemeSwitcher />
        </div>

        {/* Search Input */}
        <div className="-mt-1 p-4 border-y flex items-center justify-between gap-4">
        <Input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
            >
              <Button
                size="icon"
                title="New Request"
              >
                <Plus />
              </Button>
            </Link>
        </div>
        
        {/* Virtualized Scrollable Requests */}
        <nav ref={parentRef} className="flex-1 overflow-y-auto min-h-0">
          {isLoading && requests.length === 0 ? (
            <div className="flex items-center justify-center py-8 px-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : flattenedItems.length === 0 ? (
            <div className="text-xs text-muted-foreground px-4 py-2">
              {searchQuery
                ? 'No requests match your search'
                : 'Generated question sets will be listed here once ready'}
            </div>
          ) : (
            <div
              key={renderKey}
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const item = flattenedItems[virtualItem.index];
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    {item.type === 'header' ? (
                      <h3 className="text-[0.7rem] font-medium uppercase text-muted-foreground bg-muted py-1.5 px-4 h-full flex items-center">
                        {item.date}
                      </h3>
                    ) : (
                      <div className="px-2 py-1">
                        <RequestCard request={item.request} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        {/* Sticky Footer */}
        <div className="shrink-0 mt-auto">
          <VersionInfo />
        </div>
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
            className="relative mr-16 w-full transform transition duration-300 ease-in-out data-closed:-translate-x-full h-full"
          >
            {/* Mobile sidebar content */}
            <TransitionChild>
              <div className="absolute left-full top-0 flex w-16 justify-center py-4 duration-300 ease-in-out data-closed:opacity-0">
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
      <div className="sticky top-0 z-40 flex items-center justify-between p-3 sm:px-6 lg:hidden bg-card border-b">
        <div className="flex items-center gap-x-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <Logo />
        </div>
        <ThemeSwitcher />
      </div>
    </>
  );
}
