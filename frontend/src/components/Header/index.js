import "./styles.css";

import React, { useState, useCallback } from "react";
import { useHistory, Link } from "react-router-dom";
import PropTypes from "prop-types";

import axios from "services/api";

import SearchInput from "components/SearchInput";
import BooksIndex from "components/BooksIndex/BooksIndex";
import Login from "components/Login";

import { ReactComponent as LogoIcon } from "assets/logo.svg";
import BooksIcon from "assets/books.svg";
import ArrowIcon from "assets/arrow.svg";
import PersonIcon from "assets/person.svg";

export default function Header({ changeChapter }) {
	const [booksIndexClass, setBooksIndexClass] = useState("invisible");
	const [loginClass, setLoginClass] = useState("invisible");
	const [comments, setComments] = useState([]);

	const history = useHistory();

	const toggleBooksComponent = useCallback(() => {
		if (booksIndexClass === "invisible") {
			setBooksIndexClass("visible");
			setLoginClass("invisible");
		} else {
			setBooksIndexClass("invisible");
		}
	}, [booksIndexClass]);

	const toggleLoginComponent = useCallback(() => {
		if (loginClass === "invisible") {
			setLoginClass("visible");
			setBooksIndexClass("invisible");
		} else {
			setLoginClass("invisible");
		}
	}, [loginClass]);

	const searchCommentText = useCallback((text) => {
		axios.get("/search/", { params: { text } }).then(({ data }) => {
			setComments(data);
		});
	}, []);

	const selectComment = useCallback((comment) => {
		let [book, reference] = comment.book_reference.split(" ");
		const [chapter, verse] = reference.split(":");
		book = book.toLowerCase();
		if (book === "jó") {
			book = "job";
		}
		history.push(`/verses/${book}/${chapter}#${verse}`);
		window.location.reload();
	}, [history]);

	return (
		<>
			<header className="navbar">
				<div className="leftSide" style={{ minWidth: "40em" }}>
					<Link to="/">
						<LogoIcon className="logo" />
					</Link>
					<span className="title">
						<h1> Bible Comment </h1>
						<sub> A Program for His Glory</sub>
					</span>
					<SearchInput
						searchResult={comments}
						handleSelect={selectComment}
						handleText={searchCommentText}
					/>
				</div>
				<div className="rightSide">
					<button type="button" onClick={toggleBooksComponent}>
						<p> Livros </p>
						<img src={BooksIcon} alt="Books" />
						<img src={ArrowIcon} alt="Show more" />
					</button>
					<button type="button" onClick={toggleLoginComponent}>
						<p> Perfil </p>
						<img src={PersonIcon} alt="Perfil" style={{ margin: "0 -10px" }} />
						<img src={ArrowIcon} alt="Show more" />
					</button>
				</div>
			</header>
			<section className={loginClass} style={{ maxWidth: "min(62em, 100vw)" }}>
				<Login />
			</section>
			<section className={booksIndexClass}>
				<BooksIndex
					changeChapter={changeChapter}
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
