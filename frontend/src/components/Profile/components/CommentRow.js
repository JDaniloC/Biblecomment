import React, { useCallback } from "react";

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
	const handleEditComment = useCallback(() => {
		editCommentFunction(comment.id);
	}, [comment.id, editCommentFunction]);
	const handleDeleteComment = useCallback(() => {
		deleteCommentFunction(comment.id);
	}, [comment.id, deleteCommentFunction]);

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
						{comment.likes.length}
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
