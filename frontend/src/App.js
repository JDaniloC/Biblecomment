import "./App.scss";
import "./Responsive.css";

import { makeStyles } from "@mui/styles"
import { ThemeProvider, createTheme } from '@mui/material/styles';
import NotificationProvider from "./contexts/NotificationContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import React, { useEffect } from "react";

import Routes from "./routes";

const theme = createTheme();

const useStyles = makeStyles();

export default function App() {
	useStyles();

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
		<ThemeProvider theme={theme}>
			<NotificationProvider>
				<ProfileProvider>
					<Routes />
				</ProfileProvider>
			</NotificationProvider>
		</ThemeProvider>
	);
}
