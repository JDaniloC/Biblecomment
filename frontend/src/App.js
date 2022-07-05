import "./App.css";
import "./Responsive.css";

import { NotificationProvider } from "./contexts/NotificationContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import React, { useEffect } from "react";

import Routes from "./routes";

export default function App() {
	useEffect(() => {
		const usesDarkMode =
			window.matchMedia("(prefers-color-scheme: dark)").matches || false;
		const lightSchemeIcon = document.querySelector("link#light-icon");
		const darkSchemeIcon = document.querySelector("link#dark-icon");

		if (usesDarkMode && lightSchemeIcon) {
			lightSchemeIcon.remove();
			document.head.append(darkSchemeIcon);
		} else if (darkSchemeIcon) {
			document.head.append(lightSchemeIcon);
			if (darkSchemeIcon !== null) darkSchemeIcon.remove();
		}
	}, []);

	return (
		<NotificationProvider>
			<ProfileProvider>
				<Routes />
			</ProfileProvider>
		</NotificationProvider>
	);
}
