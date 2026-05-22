"use client";

import { useSearchParams } from "next/navigation";
import type { DriveStep } from "driver.js";
import Tutorial from "./Tutorial";
import { useTutorial } from "@/lib/use-tutorial";

interface PageTutorialProps {
	/** Versioned tutorial id — see `tutorial-config.ts`. */
	name: string;
	/** driver.js steps to run. */
	steps: DriveStep[];
	/**
	 * Tours are gated to logged-in users — the actions they teach all
	 * require an account. Pass `!!user`.
	 */
	enabled: boolean;
	/**
	 * From `session.user.tutorialsCompleted.includes(name)`. Lets a fresh
	 * browser of an already-onboarded user skip the tour without waiting
	 * on localStorage.
	 */
	alreadyCompleted: boolean;
}

/**
 * Drop-in auto-starting guided tour for a page. Shows the tour when the
 * user hasn't finished it yet, or whenever the URL carries `?tour=1`
 * (the "Refazer" buttons in /profile use that). Renders nothing once the
 * tour is done.
 *
 * This is the standard wiring for new pages; `ChapterClient` keeps its
 * own inline equivalent for historical reasons.
 */
export function PageTutorial({
	name,
	steps,
	enabled,
	alreadyCompleted,
}: PageTutorialProps) {
	const tutorial = useTutorial(name, {
		syncServer: enabled,
		initialFromServer: alreadyCompleted,
	});
	const searchParams = useSearchParams();
	const forceTour = searchParams?.get("tour") === "1";
	const show = enabled && (forceTour || tutorial.isCompleted === false);

	if (!show) return null;

	return (
		<Tutorial
			steps={steps}
			onFinished={() => {
				tutorial.markCompleted();
				// Strip ?tour=1 so a refresh after dismiss doesn't reopen it.
				if (forceTour && typeof window !== "undefined") {
					const url = new URL(window.location.href);
					url.searchParams.delete("tour");
					window.history.replaceState(null, "", url.toString());
				}
			}}
		/>
	);
}
