import { ProfileContext } from "contexts/ProfileContext";

import React, { useCallback, useEffect, useState } from "react";

import axios from "services/api";
import PropTypes from "prop-types";

import styles from "./BooksIndex.module.scss";
import BookChooser from "./components/BookChooser/BookChooser";
import ChapterChooser from "./components/ChapterChooser/ChapterChooser";
import Modal from "shared/components/Modal/Modal";

export default function BooksIndex({ changeChapter, closeBookComponent }) {
	const { handleNotification } = React.useContext(ProfileContext);

	const [books, setBooks] = useState([]);
	const [selectedBook, setSelectedBook] = useState({
		abbrev: "",
		chaptersAmount: 0,
	});
	const [isShowingChapters, setIsShowingChapters] = useState(false);

	useEffect(() => {
		axios
			.get("/books/")
			.then(({ data }) => {
				setBooks(data);
			})
			.catch((error) => {
				handleNotification(
					"error",
					`Problema no servidor: ${error.toString()}`
				);
			});
	}, [handleNotification]);

	const showChapterChooser = useCallback((abbrev, chaptersAmount) => {
		setSelectedBook({
			abbrev,
			chaptersAmount: parseInt(chaptersAmount, 10),
		});
		setIsShowingChapters(true);
	}, []);

	const closeChaptersChooser = useCallback(() => {
		setIsShowingChapters(false);
	}, []);

	const handleChangePage = useCallback(
		(chapter, number) => {
			const changed = changeChapter(chapter, number);
			if (changed) {
				closeChaptersChooser();
				closeBookComponent();
				window.history.replaceState(
					null,
					`Bible Comment: ${chapter} ${number}`,
					`/verses/${chapter}/${number}`
				);
			}
		},
		[changeChapter, closeBookComponent, closeChaptersChooser]
	);

	return (
		<div className={styles.booksIndexContainer}>
			<h2> Escolha a meditação de hoje </h2>
			<BookChooser
				books={books}
				onSelectBook={showChapterChooser}
			/>

			<Modal show={isShowingChapters}
					onHandleClose={closeChaptersChooser}>
				<ChapterChooser
					chaptersAmount={selectedBook.chaptersAmount}
					onCloseButtonClick={closeChaptersChooser}
					onSelectChapter={handleChangePage}
					abbrev={selectedBook.abbrev}
				/>
			</Modal>
		</div>
	);
}
BooksIndex.propTypes = {
	changeChapter: PropTypes.func,
	closeBookComponent: PropTypes.func,
};
BooksIndex.defaultProps = {
	changeChapter: (a, b) => a && b && false,
	closeBookComponent: () => false,
};
