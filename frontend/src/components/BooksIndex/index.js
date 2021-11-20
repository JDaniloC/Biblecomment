import { ProfileContext } from "contexts/ProfileContext";
import { Loading } from "components/Partials";

import React, { Component } from "react";

import axios from "services/api";
import ChapterChooser from "./ChapterChooser";
import PropTypes from "prop-types";

import styles from "./BooksIndex.module.css";
import BookChooser from "./BookChooser";

export default class BooksIndex extends Component {
	static contextType = ProfileContext;
	static propTypes = {
		changeChapter: PropTypes.func,
		closeBookComponent: PropTypes.func,
	};
	static defaultProps = {
		changeChapter: (a, b) => a && b && false,
		closeBookComponent: () => false,
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
		this.showChapterChooser = this.showChapterChooser.bind(this);
	}

	componentDidMount() {
		axios
			.get("books")
			.then((response) => {
				if (typeof response.data === "object") {
					this.setState({ books: response.data });
				}
			})
			.catch((error) => {
				this.context.handleNotification(
					"error",
					`Problema no servidor: ${String(error)}`
				);
			});
	}

	showChapterChooser(abbrev, max) {
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

	render() {
		return (
			<div className={styles.booksContainer}>
				<h2> Escolha a meditação de hoje </h2>
				<ul className={styles.books}>
					{this.state.books.length > 0 ? (
						<BookChooser
							books={this.state.books}
							showChapterChooser={this.showChapterChooser}
						/>
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
				<div
					id={styles.chapterChooserContainer}
					className={this.state.chapterContainerClass}
				>
					<ChapterChooser
						handleChangePage={this.handleChangePage}
						closeChapters={this.closeChapters}
						abbrev={this.state.selectedAbbrev}
						chapterLength={this.state.selectedChapterLength}
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
