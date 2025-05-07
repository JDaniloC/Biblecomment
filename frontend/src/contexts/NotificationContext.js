import React, { createContext, useCallback, useState } from "react";
import Alert from '@mui/material/Alert';

import PropTypes from "prop-types";
import Snackbar from "@mui/material/Snackbar";

export const NotificationContext = createContext({});

export function NotificationProvider({ children }) {
	const [message, setMessage] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [severity, setSeverity] = useState("");

	const _closeFunction = useCallback(() => {
		setIsOpen(false);
	}, []);

	const handleNotification = useCallback((newSeverity, newMessage) => {
		setSeverity(newSeverity);
		setMessage(newMessage);
		setIsOpen(true);
	}, []);

	return (
		<NotificationContext.Provider
			value={{
				handleNotification,
			}}
		>
			{children}
			<Snackbar open={isOpen} autoHideDuration={2000} onClose={_closeFunction}>
				<Alert onClose={_closeFunction} severity={severity}>
					{message}
				</Alert>
			</Snackbar>
		</NotificationContext.Provider>
	);
}

NotificationProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export default React.memo(NotificationProvider);
