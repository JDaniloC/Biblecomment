"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { notificationsService } from "@/services/notifications";
import { PushToggle } from "@/components/PushToggle";
import { syncAppBadge } from "@/lib/app-badge";
import type { Notification } from "@/domain/entities/Notification";

const POLL_INTERVAL_MS = 60_000;

function formatRelative(input?: Date | string): string {
	if (!input) return "";
	const d = typeof input === "string" ? new Date(input) : input;
	if (isNaN(d.getTime())) return "";
	const diff = Date.now() - d.getTime();
	const min = Math.floor(diff / 60_000);
	if (min < 1) return "agora";
	if (min < 60) return `${min} min`;
	const h = Math.floor(min / 60);
	if (h < 24) return `${h}h`;
	const day = Math.floor(h / 24);
	if (day < 7) return `${day}d`;
	return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Notification state + polling, shared by the desktop bell and the mobile
 * tab-bar sheet. Each consumer that calls this runs its own 60s poll;
 * acceptable at this cadence and avoids cross-component coupling.
 */
export function useNotifications() {
	const [items, setItems] = useState<Notification[]>([]);
	const [unread, setUnread] = useState(0);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const { items, unread } = await notificationsService.list(1);
			setItems(items);
			setUnread(unread);
		} catch {
			// 401 is expected for unauthenticated visitors — silently ignore
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
		const id = window.setInterval(load, POLL_INTERVAL_MS);
		return () => window.clearInterval(id);
	}, [load]);

	// Paint the launcher app icon badge so users see the unread count
	// without having to open the app first. No-op on browsers without the
	// Badging API; idempotent if the bell and the mobile tab-bar mount the
	// hook simultaneously.
	useEffect(() => {
		syncAppBadge(unread);
	}, [unread]);

	const handleItemClick = useCallback(async (n: Notification) => {
		if (!n.read && n._id) {
			try {
				await notificationsService.markRead(n._id);
				setItems((prev) =>
					prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)),
				);
				setUnread((u) => Math.max(0, u - 1));
			} catch {
				// ignore
			}
		}
	}, []);

	const handleMarkAllRead = useCallback(async () => {
		try {
			await notificationsService.markAllRead();
			setItems((prev) => prev.map((x) => ({ ...x, read: true })));
			setUnread(0);
		} catch {
			// ignore
		}
	}, []);

	return {
		items,
		unread,
		loading,
		handleItemClick,
		handleMarkAllRead,
		reload: load,
	};
}

/**
 * The notifications list UI (header + scrollable items). Positioning and
 * the trigger live in the consumer (NotificationsBell on desktop, the
 * mobile tab-bar sheet on phones). `onNavigate` fires when an item link is
 * tapped so the consumer can close its container.
 */
export function NotificationsPanel({
	onNavigate,
}: {
	onNavigate?: () => void;
}) {
	const { items, unread, loading, handleItemClick, handleMarkAllRead } =
		useNotifications();

	return (
		<>
			<div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
				<span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
					Notificações
				</span>
				{unread > 0 && (
					<button
						type="button"
						onClick={handleMarkAllRead}
						className="text-[11px] text-brand hover:underline"
					>
						Marcar todas como lidas
					</button>
				)}
			</div>
			<PushToggle />
			<div className="flex-1 overflow-y-auto">
				{loading && items.length === 0 ? (
					<div className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
						Carregando…
					</div>
				) : items.length === 0 ? (
					<div className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
						Nenhuma notificação ainda.
					</div>
				) : (
					items.map((n) => (
						<Link
							key={n._id}
							href={n.url}
							onClick={() => {
								handleItemClick(n);
								onNavigate?.();
							}}
							className={`block px-4 py-3 border-b border-slate-50 dark:border-slate-800 transition-colors ${
								n.read
									? "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"
									: "bg-brand-wash hover:bg-brand-tint dark:bg-slate-800/40 dark:hover:bg-slate-800"
							}`}
						>
							<div className="flex items-start gap-2">
								{!n.read && (
									<span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
								)}
								<div className="flex-1 min-w-0">
									<p
										className={`text-[13px] leading-snug ${n.read ? "text-slate-600 dark:text-slate-300" : "text-slate-800 dark:text-slate-100 font-medium"}`}
									>
										{n.message}
									</p>
									<p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
										{formatRelative(n.createdAt)}
									</p>
								</div>
							</div>
						</Link>
					))
				)}
			</div>
		</>
	);
}
