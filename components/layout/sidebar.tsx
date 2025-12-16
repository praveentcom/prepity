'use client';

import { useState, useEffect, useMemo } from 'react';
import {
	Dialog,
	DialogBackdrop,
	DialogPanel,
	TransitionChild,
} from '@headlessui/react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/atoms/logo';
import packageInfo from '@/package.json';
import { fetchRequests } from '@/lib/client/requests';
import { Request } from '@prisma/client';
import moment from 'moment';
import { CATEGORY_LIST, MENU_ITEMS } from '@/lib/client/constants';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { StarToggle } from '../ui/star-toggle';

export function Sidebar() {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [requests, setRequests] = useState<Request[]>([]);
	const router = useRouter();
	const { id: activeRequestId } = router.query;

	useEffect(() => {
		const storedRequests = localStorage.getItem('requests');
		if (storedRequests) {
			setRequests(JSON.parse(storedRequests));
		}

		const loadRequests = async () => {
			const data = await fetchRequests(100);
			setRequests(data);

			localStorage.setItem('requests', JSON.stringify(data));
		};
		loadRequests();

		const handleRequestsUpdated = () => {
			const updatedRequests = localStorage.getItem('requests');
			if (updatedRequests) {
				setRequests(JSON.parse(updatedRequests));
			}
		};
		window.addEventListener('requests-updated', handleRequestsUpdated);

		return () => {
			window.removeEventListener('requests-updated', handleRequestsUpdated);
		};
	}, []);

    const VersionInfo = () => (
		<div className="flex w-full cursor-pointer items-center gap-x-3 px-4 py-2.5 hover:bg-muted border-t">
            <div className="flex flex-col text-left">
                <span
                    className="text-xs text-muted-foreground truncate"
                    aria-hidden="true">
                    v{packageInfo.version} / {process.env.NEXT_PUBLIC_ENVIRONMENT}
                </span>
            </div>
        </div>
	);

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

	const RequestCard = ({ request }: { request: Request }) => {
		const isActive = activeRequestId === request.requestSlug;

		return (
			<Link href={`/requests/${request.requestSlug}`} onClick={() => setSidebarOpen(false)}>
				<div 
					className={`cursor-pointer hover:bg-card-foreground/5 border rounded-lg px-3 py-2 transition-colors
						${isActive 
							? 'bg-card-foreground/5' 
							: 'border-transparent bg-card-foreground/5'
						}`}
				>
					<div className="text-sm truncate">{request.query}</div>
					<div className='flex items-center gap-x-1.5'>
						{
                            request.isStarred ? (
                                <StarToggle
                                    isStarred={request.isStarred}
                                    onToggle={async () => { return; }}
                                    size='small'
                                />
                            ) : (
                                <div className='size-2 rounded-full bg-card-foreground/5'></div>
                            )
                        }
						<div className='text-xs text-muted-foreground truncate'>
							{CATEGORY_LIST.find(category => category.category === request.category)?.categoryName}
						</div>
					</div>
				</div>
			</Link>
		);
	};

	const getSidebar = () => {
		return (
			<div className="flex h-full w-full flex-col border-r bg-card px-6">
				{/* Fixed Header */}
				<div className="flex h-12 my-2 shrink-0 items-center">
					<Logo className="self-center" />
				</div>
				
				{/* Main Navigation Area */}
				<nav className="flex h-[calc(100vh-3rem)] flex-col">
					<ul role="list" className="flex h-full flex-col">
						{/* Scrollable Requests Section */}
						<div className="flex-1 -mx-6 min-h-0">
							<div className="h-full overflow-y-auto">
								{Object.entries(groupedRequests).length === 0 ? (
									<div className="text-xs text-muted-foreground px-4 py-2">
										Generated question sets will be listed here once ready
									</div>
								) : (
									Object.entries(groupedRequests).map(([date, _requests]) => (
										<div key={date} className="date-group grid grid-cols-1 gap-y-2">
											<h3 className="text-[0.7rem] font-semibold uppercase text-muted-foreground sticky top-0 bg-card py-1.5 px-6 border-y">{date}</h3>
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
				className="relative z-50 lg:hidden">
				<DialogBackdrop
					transition
					className="fixed inset-0 bg-muted-foreground/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
				/>

				<div className="fixed inset-0 flex">
					<DialogPanel
						transition
						className="relative mr-16 flex w-full max-w-sm flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full">
						{/* Mobile sidebar content */}
						<TransitionChild>
							<div className="absolute left-full top-0 flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
								<button
									type="button"
									onClick={() => setSidebarOpen(false)}
									className="-m-2.5 p-2.5">
									<span className="sr-only">
										Close sidebar
									</span>
									<X
										className="size-6 text-background"
										aria-hidden="true"
									/>
								</button>
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
			<div className="sticky top-0 z-40 flex items-center gap-x-4 p-4 sm:px-6 lg:hidden bg-card">
				<button
					type="button"
					onClick={() => setSidebarOpen(true)}
					className="-m-2.5 p-2.5 text-gray-700 lg:hidden">
					<span className="sr-only">Open sidebar</span>
					<Menu className="size-5" aria-hidden="true" />
				</button>
				<Logo className="self-center" />
			</div>
		</>
	);
}
