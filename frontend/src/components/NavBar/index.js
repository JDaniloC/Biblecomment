import React, { Component, createRef } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

import BooksIndex from "../BooksIndex";
import Login from "../Login";

import "./styles.css";

export default class NavBar extends Component {
	constructor(props) {
		super(props);

		this.state = {
			indexClass: "invisible",
			loginClass: "invisible",
		};

		this.loginComponent = createRef();
		this.toggleLoginComponent = this.toggleLoginComponent.bind(this);
		this.toggleBooksComponent = this.toggleBooksComponent.bind(this);
	}

	toggleBooksComponent() {
		if (this.state.indexClass === "invisible") {
			this.setState({
				indexClass: "visible",
				loginClass: "invisible",
			});
		} else {
			this.setState({
				indexClass: "invisible",
			});
		}
	}

	toggleLoginComponent() {
		if (this.state.loginClass === "invisible") {
			this.setState({
				loginClass: "visible",
				indexClass: "invisible",
			});
		} else {
			this.setState({
				loginClass: "invisible",
			});
		}
	}

	render() {
		return (
			<>
				<ul className="navbar">
					<Link to="/"> Início </Link>
					<li onClick={this.toggleLoginComponent}>Perfil</li>
					<li onClick={this.toggleBooksComponent}>Livros</li>
				</ul>
				<section
					className={this.state.loginClass}
					style={{ maxWidth: "min(62em, 100vw)" }}
				>
					<Login ref={this.loginComponent} />
				</section>
				<section className={this.state.indexClass}>
					<BooksIndex
						changeChapter={this.props.changeChapter}
						closeBookComponent={this.toggleBooksComponent}
					/>
				</section>
			</>
		);
	}
}

NavBar.propTypes = {
	changeChapter: PropTypes.func,
}
