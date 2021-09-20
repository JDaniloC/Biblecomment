import "./styles.css";

import { Link } from "react-router-dom";
import React from "react";
import AboutActions from "./AboutActions";
import AboutComment from "./AboutComment";
import HelpAccount from "./HelpAccount";
import Introduction from "./Introduction";

import backArrow from "../../assets/backArrow.svg";

export default function Help() {
	return (
		<div className="help-component">
			<section>
				<Link to="/">
					<img style={{ height: "30px" }} src={backArrow} alt="back arrow" />
				</Link>
				<h1 style={{ marginLeft: "1em" }}>Sobre o Bible Comment</h1>
			</section>
			<Introduction />
			<HelpAccount />
			<AboutComment />
			<AboutActions />
		</div>
	);
}
