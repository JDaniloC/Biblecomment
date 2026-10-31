"use client";

import { PageTutorial } from "@/components/Tutorial/PageTutorial";
import { LANDING_TUTORIAL, LANDING_TUTORIAL_NAME } from "@/lib/tutorial-config";

export function LandingTutorial() {
	return (
		<PageTutorial
			name={LANDING_TUTORIAL_NAME}
			steps={LANDING_TUTORIAL}
			enabled={true}
			alreadyCompleted={true}
			autoStart={false}
		/>
	);
}
