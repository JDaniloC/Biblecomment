import "./styles.css";

import { Link } from "react-router-dom";
import React from "react";
import ReactLoading from "react-loading";

export function Loading() {
	return (
		<div className="loading">
			<ReactLoading type="spokes" color="black" />
		</div>
	);
}

export function HelpButton() {
	return (
		<Link to="/help">
			<span className="help-popup">Precisa de ajuda?</span>
		</Link>
	);
}
