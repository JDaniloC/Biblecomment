import "./styles.css";

import { HelpButton } from "components/Partials";

import BooksIndex from "components/BooksIndex";
import logoImg from "assets/logo.png";
import Login from "components/Login";
import React from "react";

export default function Main() {
	return (
		<div className="container">
			<div className="panel">
				<HelpButton />
				<div className="logo-container">
					<img src={logoImg} alt="logo" />
					<p>
						Compartilhe a mensagem de Deus <br /> com seus irmãos
					</p>
					<Login />
				</div>
				<BooksIndex />
			</div>
		</div>
	);
}
