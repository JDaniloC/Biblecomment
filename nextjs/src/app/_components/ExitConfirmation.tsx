"use client";

import { useExitConfirmation } from "@/lib/hooks/useExitConfirmation";

/**
 * Mount-only client component that wires the back-button exit-confirm
 * hook into the public landing page (the TWA's start_url). Server
 * components can't call hooks, so we drop this empty client island
 * inside the server-rendered page.
 */
export function ExitConfirmation(): null {
	useExitConfirmation();
	return null;
}
