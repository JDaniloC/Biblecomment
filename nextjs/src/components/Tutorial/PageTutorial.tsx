"use client";

import { useEffect, useState } from "react";
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
	/**
	 * Whether the tour should auto-start on the user's first visit.
	 * Default: true. Set to false for tours only triggered on demand via the help button or ?tour=1.
	 */
	autoStart?: boolean;
}

/**
 * Drop-in guided tour for a page. Shows the tour when the user hasn't
 * finished it yet (if autoStart is true), or whenever the URL carries `?tour=1`
 * (the "Refazer" buttons in /profile use that), or when the user clicks
 * "Tutorial desta página" in DesktopHelpFab (which emits `bc:start-tour`).
 */
export function PageTutorial({
	name,
	steps,
	enabled,
	alreadyCompleted,
	autoStart = true,
}: PageTutorialProps) {
	const tutorial = useTutorial(name, {
		syncServer: enabled,
		initialFromServer: alreadyCompleted,
	});
	const searchParams = useSearchParams();
	const forceTour = searchParams?.get("tour") === "1";
	const [manualStart, setManualStart] = useState(false);

	useEffect(() => {
		const handleStartTour = () => {
			setManualStart(true);
		};
		window.addEventListener("bc:start-tour", handleStartTour);
		return () => window.removeEventListener("bc:start-tour", handleStartTour);
	}, []);

	const show = manualStart || (enabled && (forceTour || (autoStart && tutorial.isCompleted === false)));

	if (!show) return null;

	return (
		<Tutorial
			steps={steps}
			onFinished={() => {
				setManualStart(false);
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
