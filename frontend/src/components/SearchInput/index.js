import "./styles.css";

import React, { useState, useCallback } from "react";
import debounce from "lodash.debounce";
import PropTypes from "prop-types";

import SearchIcon from "assets/search.svg";
import CloseIcon from "assets/x.svg";
import Comment from "models/Comment";

export default function SearchInput({
	handleText,
	handleSelect,
	searchResult,
}) {
	const [searchText, setSearchText] = useState("");
	const [isTexting, setIsTexting] = useState(false);

	const onTextDebounce = debounce(handleText, 1000);

	const handleSearchChange = useCallback((e) => {
		const text = e.target.value;
		if (text.length > 0) {
			setIsTexting(true);
			onTextDebounce(text);
		} else {
			setIsTexting(false);
		}
		setSearchText(text);
	}, []);

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
					placeholder="Buscar..."
					onChange={handleSearchChange}
				/>
				<img
					src={CloseIcon}
					alt="Limpar pesquisa"
					onKeyUp={handleCleanSearch}
					onClick={handleCleanSearch}
				/>
			</div>
			<ul>
				{searchResult.map((comment) => (
					<li
						key={comment.id}
						onKeyUp={() => handleSelect(comment)}
						onClick={() => handleSelect(comment)}
					>
						{comment.book_reference} - {comment.text}
					</li>
				))}
			</ul>
		</div>
	);
}
SearchInput.propTypes = {
	handleText: PropTypes.func.isRequired,
	handleSelect: PropTypes.func.isRequired,
	searchResult: PropTypes.arrayOf(Comment),
};
SearchInput.defaultProps = {
	searchResult: [],
};
