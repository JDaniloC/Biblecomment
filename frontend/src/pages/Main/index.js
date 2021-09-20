import "./styles.css";

import { HelpButton } from "../../components/Partials";

import BooksIndex from "../../components/BooksIndex";
import logoImg from "../../assets/logo.png";
import Login from "../../components/Login";
import React, { Component } from "react";

export default class Main extends Component {
	shouldComponentUpdate() {
        return false;
    }

	render() {
		return (
			<div className="panel">
				<HelpButton />
				<div className="logo-container">
					<img src={logoImg} alt="logo" />
					<p>
						Compartilhe a mensagem de Deus <br /> com seus irmãos
					</p>
					<Login ref={this.loginComponent} />
				</div>
				<BooksIndex />
			</div>
		);
	}
}
