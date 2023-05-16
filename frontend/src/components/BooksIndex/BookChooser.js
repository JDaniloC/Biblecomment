import React, { useContext, useCallback, memo } from "react";
import { ProfileContext } from "contexts/ProfileContext";

import PropTypes from "prop-types";
import Book from "models/Book";

function BookChooser({ books, showChapterChooser }) {
	const { commented } = useContext(ProfileContext);

	const showChapterComponents = useCallback(
		(event) => {
			const abbrev = event.target.getAttribute("data-abbrev");
			const max = event.target.getAttribute("data-length");
			showChapterChooser(abbrev, Number(max));
		},
		[showChapterChooser]
	);

	function bookCommented(book, length) {
		if (book in commented) {
			return (commented[book].length * 100) / length;
		}
		return 0;
	}

	return (
		<>
			{books.map((book) => (
				<button
					style={{
						background: `linear-gradient(to right, 
                        lightgreen ${bookCommented(
													book.abbrev,
													book.length
												)}%,  #DADCE2 0%)`,
					}}
					type="button"
					key={book.abbrev}
					data-length={book.length}
					data-abbrev={book.abbrev}
					onClick={showChapterComponents}
				>
					{book.title}
				</button>
			))}
		</>
	);
}
BookChooser.propTypes = {
	showChapterChooser: PropTypes.func.isRequired,
	books: PropTypes.arrayOf(Book).isRequired,
};
export default memo(BookChooser);
