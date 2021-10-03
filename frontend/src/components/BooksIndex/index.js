import { ProfileContext } from "contexts/ProfileContext";
import { Loading } from "components/Partials";

import React, { Component } from "react";

import axios from "services/api";
import ChapterChooser from "./ChapterChooser";
import PropTypes from "prop-types";

import styles from "./BooksIndex.module.css";

export default class BooksIndex extends Component {
	static contextType = ProfileContext;
	static propTypes = {
		changeChapter: PropTypes.func,
		closeBookComponent: PropTypes.func
	};
	static defaultProps = {
		changeChapter: (a, b) => a && b && false,
		closeBookComponent: () => {}
	};
	
	constructor(props) {
		super(props);

		this.state = {
			books: [],
			selectedAbbrev: "",
			blurDisplay: "none",
			selectedChapterLength: 0,
			chapterContainerClass: "invisible",
		};

		this.closeChapters = this.closeChapters.bind(this);
		this.handleChangePage = this.handleChangePage.bind(this);
		this.showChapterNumbers = this.showChapterNumbers.bind(this);
	}

	componentDidMount() {
		axios.get("books").then((response) => {
			if (typeof response.data === "object") {
				this.setState({ books: response.data });
			}
		}).catch((error) => {
			this.context.handleNotification("error", 
				`Problema no servidor: ${String(error)}`)
		});
	}

	showChapterNumbers(event) {
		const abbrev = event.target.getAttribute("data-abbrev");
		const max = event.target.getAttribute("data-length");
		this.setState({
			blurDisplay: "block",
			selectedAbbrev: abbrev,
			selectedChapterLength: Number(max),
			chapterContainerClass: "visible centro",
		});
	}

	closeChapters() {
		this.setState({
			blurDisplay: "none",
			chapterContainerClass: "invisible",
		});
	}

	handleChangePage(chapter, number) {
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

	render() {
		return (
			<div className={styles.booksContainer}>
				<h2> Escolha a meditação de hoje </h2>
				<ul className={styles.books}>
					{this.state.books.length > 0 ? (
						this.state.books.map((book) => (
							<li
								style={{
									background: `linear-gradient(to right, 
									lightgreen ${this.bookCommented(
										book.abbrev,
										book.length
									)}%,  #DADCE2 0%)`,
								}}
								key={book.abbrev}
								data-length = {book.length}
								data-abbrev = {book.abbrev}
								onClick={this.showChapterNumbers}
							>
								{book.title}
							</li>
						))
					) : (
						<div>
							<Loading />
							<p> Este carregamento pode demorar 1-2min. </p>
							<p> Este site só permite visualização. </p>
							<p> Toda interação não ficará salva, pois </p>
							<p> o servidor está congelado. </p>
						</div>
					)}
				</ul>
				<div id = {styles.chapterChooserContainer}
					className={this.state.chapterContainerClass}>
					<ChapterChooser
						handleChangePage = {this.handleChangePage}
						closeChapters = {this.closeChapters}
						abbrev = {this.state.selectedAbbrev}
						chapterLength = {this.state.selectedChapterLength}
					/>
				</div>
				<div 
					className="overlay" 
					style={{ display: this.state.blurDisplay }}
				></div>
			</div>
		);
	}
}
