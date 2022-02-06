import "./styles.css";

import React, { useState } from "react";
import { Link } from "react-router-dom";

import BooksIndex from "../BooksIndex";
import Login from "../Login";
import PropTypes from "prop-types";

import LogoIcon from "assets/logo.svg";
import BooksIcon from "assets/books.svg";
import ArrowIcon from "assets/arrow.svg";
import PersonIcon from "assets/person.svg";

export default function Header (props) {
    const [ booksIndexClass, setBooksIndexClass ] = useState("invisible");
    const [ loginClass, setLoginClass ] = useState("invisible");

	function toggleBooksComponent() {
		if (booksIndexClass === "invisible") {
			setBooksIndexClass("visible");
			setLoginClass("invisible");
		} else {
			setBooksIndexClass("invisible");
		}
	}

	function toggleLoginComponent() {
		if (loginClass === "invisible") {
			setLoginClass("visible");
            setBooksIndexClass("invisible");
		} else {
			setLoginClass("invisible");
		}
	}

    return (
        <>
            <header className="navbar">
                <div className="leftSide">
                    <Link to="/">
                        <img src = {LogoIcon} alt="Home" />
                    </Link>
                    <span className="title">
                        <h1> Bible Comment </h1>
                        <sub> A Program for His Glory</sub>
                    </span>
                    <input type="text" placeholder = "+ Buscar..." />
                </div>
                <div className="rightSide">
                    <div onClick={toggleBooksComponent}>
                        <p> Livros </p>
                        <img src = {BooksIcon} alt="Books" />
                        <img src = {ArrowIcon} alt="Show more" />
                    </div>
                    <div onClick={toggleLoginComponent}>
                        <p> Perfil </p>
                        <img src = {PersonIcon} alt="Perfil" 
                            style={{ margin: "0 -10px" }}/>
                        <img src = {ArrowIcon} alt="Show more" />
                    </div>
                </div>
            </header>
            <section
                className={loginClass}
                style={{ maxWidth: "min(62em, 100vw)" }}
            >
                <Login/>
            </section>
            <section className={booksIndexClass}>
                <BooksIndex
                    changeChapter={props.changeChapter}
                    closeBookComponent={toggleBooksComponent}
                />
            </section>
        </>
    );
}
Header.propTypes = {
    changeChapter: PropTypes.func,
};
Header.defaultProps = {
    // eslint-disable-next-line
    changeChapter: (...[]) => false,
};