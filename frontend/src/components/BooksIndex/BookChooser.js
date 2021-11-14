import React, { useContext, memo } from "react";
import { ProfileContext } from "contexts/ProfileContext";

import PropTypes from "prop-types";
import Book from "models/Book";

function BookChooser({ books, showChapterChooser }) {
	const { commented } = useContext(ProfileContext);

	function showChapterComponents(event) {
		const abbrev = event.target.getAttribute("data-abbrev");
		const max = event.target.getAttribute("data-length");
		showChapterChooser(abbrev, Number(max));
	}

    function bookCommented(book, length) {
		console.log("Buscando o livro", book);
		if (book in commented) {
			return (commented[book].length * 100) / length;
		}
		return 0;
	}

	return (
		<div>
			{books.map((book) => (
                <li
                    style={{
                        background: `linear-gradient(to right, 
                        lightgreen ${bookCommented(
                            book.abbrev, 
                            book.length
                        )}%,  #DADCE2 0%)`,
                    }}
                    key={book.abbrev}
                    data-length={book.length}
                    data-abbrev={book.abbrev}
                    onClick={showChapterComponents}
                >
                    {book.title}
                </li>
            ))}
		</div>
	);
}
BookChooser.propTypes = {
	showChapterChooser: PropTypes.func.isRequired,
	books: Book.isRequired,
};
export default memo(BookChooser);