import React from "react";

import deleteIcon from "assets/delete.svg";
import editIcon from "assets/edit.svg";
import heartIcon from "assets/heart.svg";

import Comment from "models/Comment";
import PropTypes from "prop-types";

export default function CommentRow({
	comment,
	editCommentFunction,
	deleteCommentFunction,
}) {
	function handleEditComment() {
		editCommentFunction(comment.id);
	}
	function handleDeleteComment() {
		deleteCommentFunction(comment.id);
	}

	return (
		<li key={comment.id} className="comment-row">
			<label htmlFor={`comment${comment.id}`}>
				<p>
					{comment.book_reference} {comment.text}
				</p>
			</label>
			<input type="checkbox" id={`comment${comment.id}`} />
			<div className="user-comment">
				{comment.text}
				<p>
					<button type="button" onClick={handleEditComment}>
						<img src={editIcon} alt="Edit comment" />
					</button>
					<b>
						{JSON.parse(comment.likes).length}
						<img src={heartIcon} alt="Favorite comment" />
					</b>
					<button type="button" onClick={handleDeleteComment}>
						<img src={deleteIcon} alt="Delete comment" />
					</button>
				</p>
			</div>
		</li>
	);
}
CommentRow.propTypes = {
	comment: Comment.isRequired,
	editCommentFunction: PropTypes.func.isRequired,
	deleteCommentFunction: PropTypes.func.isRequired,
};
