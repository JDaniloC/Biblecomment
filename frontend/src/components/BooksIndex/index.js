import { ProfileContext } from "../../contexts/ProfileContext";
import { Loading } from "../Partials";

import closeImg from "../../assets/x.svg";
import React, { Component } from "react";
import { Link } from "react-router-dom";
import axios from "../../services/api";
import PropTypes from "prop-types";

import "./styles.css";

export default class BooksIndex extends Component {
	static contextType = ProfileContext;

	constructor(props) {
		super(props);

		this.state = {
			books: [],
			numbers: [],
			selected: { abbrev: "", max: 0 },
			blur: "none",
			chapters: "invisible",
		};
	}

	componentDidMount() {
		try {
			axios.get("books").then((response) => {
				if (typeof response.data === "object") {
					this.setState({ books: response.data });
				}
			});
		} catch (err) {
			console.log("Problema no servidor: ", String(err));
		}

		let number_list = [];
		for (let i = 1; i <= 150; i++) {
			number_list.push(i);
		}
		this.setState({ numbers: number_list });
	}

	showChapterNumbers(abbrev, max) {
		this.setState({
			selected: {
				abbrev: abbrev,
				max: max,
			},
			chapters: "visible centro",
			blur: "block",
		});
	}

	closeChapters() {
		this.setState({
			chapters: "invisible",
			blur: "none",
		});
	}

	changePage(evt, chapter, number) {
		evt.preventDefault();

		const changed = this.props.changeChapter(chapter, number);
		if (changed) {
			this.closeChapters();
			this.props.closeBookComponent();
			window.history.replaceState(
				null,
				`Bible Comment: ${chapter} ${number}`,
				`/verses/${chapter}/${number}`
			);
		}
	}

	bookCommented(book, length) {
		const commented = this.context.commented;

		if (book in commented) {
			return (commented[book].length * 100) / length;
		}
		return 0;
	}

	chapterCommented(book, chapter) {
		const commented = this.context.commented;
		if (book in commented && commented[book].indexOf(String(chapter)) !== -1) {
			return true;
		}
		return false;
	}

	render() {
		return (
			<div className="books-container">
				<h2> Escolha a meditação de hoje </h2>
				<ul className="books">
					{this.state.books.length > 0 ? (
						this.state.books.map((book) => (
							<li
								style={{
									background: `linear-gradient(to right, lightgreen ${this.bookCommented(
										book.abbrev,
										book.length
									)}%,  #DADCE2 0%)`,
								}}
								key={book.abbrev}
								onClick={() =>
									this.showChapterNumbers(book.abbrev, book.length)
								}
							>
								{book.title}
							</li>
						))
					) : (
						<div style={{ textAlign: "center" }}>
							<Loading />
							<p style={{ marginTop: "1em" }}>
								Este carregamento pode demorar 1-2min.
							</p>
							<p> Este site só permite visualização. </p>
							<p> Toda interação não ficará salva, pois </p>
							<p> o servidor está congelado. </p>
						</div>
					)}
				</ul>
				<div
					className={this.state.chapters}
					style={{
						alignItems: "baseline",
					}}
				>
					<div className="chapters-container">
						<div className="top" style={{ justifyContent: "space-between" }}>
							<h2 style={{ alignSelf: "center" }}>Escolha o capítulo</h2>
							<button onClick={() => this.closeChapters()}>
								<img src={closeImg} alt="Fechar" />
							</button>
						</div>

						<ul>
							{this.state.numbers
								.slice(0, this.state.selected.max)
								.map((chapter) => (
									<Link
										style={{
											backgroundColor: this.chapterCommented(
												this.state.selected.abbrev,
												chapter
											)
												? "lightgreen"
												: "white",
										}}
										key={chapter}
										to={`/verses/${this.state.selected.abbrev}/${chapter}`}
										onMouseDown={(evt) => {
											this.changePage(evt, this.state.selected.abbrev, chapter);
										}}
									>
										{chapter}
									</Link>
								))}
						</ul>
					</div>
				</div>
				<div className="overlay" style={{ display: this.state.blur }}></div>
			</div>
		);
	}
}
BooksIndex.propTypes = {
	changeChapter: PropTypes.func.isRequired,
};
BooksIndex.defaultProps = {
	changeChapter: (a, b) => false,
};
