import React, { createContext, useState } from "react";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "@material-ui/lab";

export const NotificationContext = createContext({});

export function NotificationProvider({ children }) {
	const [message, setMessage] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [severity, setSeverity] = useState("");

	function closeFunction() {
		setIsOpen(false);
	}

	function handleNotification(severity, message, data = null) {
		setSeverity(severity);
		setMessage(message);
		setIsOpen(true);
	}

	return (
		<NotificationContext.Provider
			value={{
				handleNotification,
			}}
		>
			{children}
			<Snackbar open={isOpen} autoHideDuration={2000} onClose={closeFunction}>
				<Alert onClose={closeFunction} severity={severity}>
					{message}
				</Alert>
			</Snackbar>
		</NotificationContext.Provider>
	);
}
