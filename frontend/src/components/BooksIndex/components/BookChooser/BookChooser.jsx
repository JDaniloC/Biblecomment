import React, { useContext, useCallback } from "react";
import { ProfileContext } from "contexts/ProfileContext";
import { Loading } from "components/Partials";

import styles from "./BookChooser.module.scss";
import PropTypes from "prop-types";
import Book from "models/Book";

function BookChooser({ books, onSelectBook }) {
	const { commented } = useContext(ProfileContext);

	const onBookClick = useCallback((event) => {
		const abbrev = event.target.getAttribute("data-abbrev");
		const max = event.target.getAttribute("data-length");
		onSelectBook(abbrev, parseInt(max, 10));
	}, [onSelectBook]);

	const bookBackgroundStyle = useCallback(({ abbrev, length }) => {
		let percentage = 0;
		if (abbrev in commented) {
			percentage = commented[abbrev].length * 100 / length;
		}
		return `linear-gradient(to right,
								lightgreen ${percentage}%,
								#DADCE2 0%)`
	}, [commented]);

	return (
		<div className={styles.bookList}>
			{books.length > 0 ? books.map((book) => (
				<button
					style={{
						background: bookBackgroundStyle(book),
					}}
					type="button"
					key={book.abbrev}
					onClick={onBookClick}
					data-length={book.length}
					data-abbrev={book.abbrev}
				>
					{book.title}
				</button>
			)) : (
				<div>
					<Loading />
					<p> Este carregamento pode demorar 1-2min. </p>
					<p> Este site só permite visualização. </p>
					<p> Toda interação não ficará salva, pois </p>
					<p> o servidor está congelado. </p>
				</div>
			)}
		</div>
	);
}
BookChooser.propTypes = {
	onSelectBook: PropTypes.func.isRequired,
	books: PropTypes.arrayOf(Book).isRequired,
};
export default React.memo(BookChooser);
