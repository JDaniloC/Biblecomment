import Favorite from "models/Favorite";
import PropTypes from "prop-types";
import React from "react";

export default function FavoriteRow({ comment, index }) {
	return (
		<li key={`-${index}`} className="favorite-row">
			<h5>
				{comment.username} em {comment.book_reference}
			</h5>
			<label htmlFor={`-${index}`}>
				<p>{comment.text}</p>
			</label>
			<input type="checkbox" id={`-${index}`} />
			<div className="user-comment">{comment.text}</div>
		</li>
	);
}
FavoriteRow.propTypes = {
	comment: Favorite.isRequired,
	index: PropTypes.number.isRequired,
};
