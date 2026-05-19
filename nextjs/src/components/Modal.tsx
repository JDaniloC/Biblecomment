"use client";

import React, { useEffect, useCallback, useRef, useId } from "react";
import Image from "next/image";

interface ModalProps {
	show: boolean;
	onClose: () => void;
	children: React.ReactNode;
	title?: string;
	size?: "sm" | "md" | "lg" | "xl" | "2xl";
	noPadding?: boolean;
	ariaLabel?: string;
}

const SIZE_CLASSES: Record<string, string> = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-lg",
	xl: "max-w-4xl",
	"2xl": "max-w-[960px]",
};

const FOCUSABLE = [
	"a[href]",
	"area[href]",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"button:not([disabled])",
	"iframe",
	"object",
	"embed",
	"[contenteditable]",
	'[tabindex]:not([tabindex="-1"])',
].join(",");

export default function Modal({
	show,
	onClose,
	children,
	title,
	size = "lg",
	noPadding = false,
	ariaLabel,
}: ModalProps) {
	const dialogRef = useRef<HTMLDivElement>(null);
	const previousActiveRef = useRef<HTMLElement | null>(null);
	const titleId = useId();

	const handleKey = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
				return;
			}
			if (e.key !== "Tab" || !dialogRef.current) return;
			const focusable =
				dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
			if (focusable.length === 0) {
				e.preventDefault();
				dialogRef.current.focus();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const active = document.activeElement as HTMLElement | null;
			if (e.shiftKey && active === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && active === last) {
				e.preventDefault();
				first.focus();
			}
		},
		[onClose],
	);

	useEffect(() => {
		if (!show) return;
		previousActiveRef.current = document.activeElement as HTMLElement | null;
		document.addEventListener("keydown", handleKey);
		document.body.style.overflow = "hidden";

		const focusable =
			dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
		if (focusable && focusable.length > 0) {
			focusable[0].focus();
		} else {
			dialogRef.current?.focus();
		}

		return () => {
			document.removeEventListener("keydown", handleKey);
			document.body.style.overflow = "";
			previousActiveRef.current?.focus?.();
		};
	}, [show, handleKey]);

	if (!show) return null;

	const labelledBy = title ? titleId : undefined;
	const labelProp = labelledBy
		? { "aria-labelledby": labelledBy }
		: { "aria-label": ariaLabel ?? "Diálogo" };

	return (
		<div className="fixed inset-0 z-50 flex items-start md:items-center justify-center pt-16 md:pt-0 px-4">
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
				aria-hidden="true"
			/>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				tabIndex={-1}
				{...labelProp}
				className={`relative z-10 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full ${SIZE_CLASSES[size] ?? SIZE_CLASSES.lg} max-h-[80vh] flex flex-col overflow-hidden focus:outline-none`}
			>
				{title && (
					<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
						<h2
							id={titleId}
							className="font-semibold text-gray-800 dark:text-slate-100"
						>
							{title}
						</h2>
						<button
							type="button"
							onClick={onClose}
							className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
							aria-label="Fechar"
						>
							<Image src="/assets/x.svg" alt="" width={14} height={14} />
						</button>
					</div>
				)}
				<div className={`overflow-y-auto flex-1${noPadding ? "" : " p-5"}`}>
					{children}
				</div>
			</div>
		</div>
	);
}
