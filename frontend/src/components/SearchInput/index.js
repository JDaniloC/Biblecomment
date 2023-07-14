import "./styles.css";

import React, { useState, useCallback } from "react";
import debounce from "lodash.debounce";
import PropTypes from "prop-types";

import { ReactComponent as CloseIcon } from "assets/x.svg";
import SearchIcon from "assets/search.svg";
import { SearchComment } from "models/Comment";

export default function SearchInput({
	handleText,
	handleSelect,
	searchResult,
}) {
	const [searchText, setSearchText] = useState("");
	const [isTexting, setIsTexting] = useState(false);

	const onTextDebounce = debounce(handleText, 1000);

	const handleSearchChange = useCallback(
		(e) => {
			const text = e.target.value;
			if (text.length > 0) {
				setIsTexting(true);
				onTextDebounce(text);
			} else {
				setIsTexting(false);
			}
			setSearchText(text);
		},
		[onTextDebounce],
	);

	const handleCleanSearch = useCallback(() => {
		setIsTexting(false);
		setSearchText("");
	}, []);

	return (
		<div className="search-input">
			<div className={isTexting ? "on-search" : ""}>
				<img src={SearchIcon} alt="Pesquisar" />
				<input
					type="text"
					value={searchText}
					placeholder="Buscar comentário..."
					onChange={handleSearchChange}
				/>
				<CloseIcon
					className="close-icon"
					onKeyUp={handleCleanSearch}
					onClick={handleCleanSearch}
				/>
			</div>
			<ul>
				{searchResult.map((comment) => (
					<li
						role="button"
						key={comment.id}
						onKeyUp={() => handleSelect(comment)}
						onClick={() => handleSelect(comment)}
					>
						<b> {comment.book_reference} </b>
						&nbsp;{comment.text}
					</li>
				))}
			</ul>
		</div>
	);
}
SearchInput.propTypes = {
	handleText: PropTypes.func.isRequired,
	handleSelect: PropTypes.func.isRequired,
	searchResult: PropTypes.arrayOf(SearchComment),
};
SearchInput.defaultProps = {
	searchResult: [],
};
