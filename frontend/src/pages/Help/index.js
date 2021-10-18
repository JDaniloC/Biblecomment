import "./styles.css";

import { Link } from "react-router-dom";
import AboutActions from "./AboutActions";
import AboutComment from "./AboutComment";
import HelpAccount from "./HelpAccount";
import Introduction from "./Introduction";

import backArrow from "assets/backArrow.svg";

import React from "react";

export default function Help() {
	return (
		<div className="help-component">
			<section>
				<Link to="/">
					<img style={{ height: "30px" }} alt="back arrow" src={backArrow} />
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
