import "./styles.css";

import PropTypes from "prop-types";
import React from "react";

function getLikeCount(comment) {
	return JSON.parse(comment.likes).length;
}

function dateFormat(string) {
	const DATE_LENGTH = 10;
	const [year, month, day] = string.slice(0, DATE_LENGTH).split("-");
	return `${day}/${month}/${year}`;
}

export default function TitleComment({ 
	comments, 
	likeFunction, 
	imageFunction,
	reportFunction, 
	handleNewComment, 
	discussionFunction,
}) {
	function showNewComment(evt) {
		handleNewComment(evt, true);
	}

	function handleLike(evt) {
		const id = evt.target.getAttribute("data-id");
		likeFunction(parseInt(id, 10));
	}
	
	function handleReport(evt) {
		const id = evt.target.getAttribute("data-id");
		reportFunction(parseInt(id, 10));
	}

	function handleChat(evt) {
		const comment_reference = evt.target.getAttribute("data-reference");
		const comment_id = parseInt(evt.target.getAttribute("data-id"), 10);
		const comment_text = evt.target.getAttribute("data-text");
		discussionFunction(comment_id, comment_text, comment_reference);
	}

	return (
		<div className="title-comments">
			<ul>
				{comments.map((comment) => (
					<li key={comment.id}>
						<h3>
							{comment.username}
							{comment.tags.map((tag) => (
								<img
									key={tag}
									alt={tag}
									className="tag"
									src={imageFunction(tag)}
								/>
							))}

							<sub>{dateFormat(comment.created_at)}</sub>
						</h3>
						<p> {comment.text} </p>
						<span className="comment-buttons">
							<p>
								Favoritado por <b>{getLikeCount(comment)}</b> pessoas
							</p>
							<button type="button" onClick={handleLike}>
								<img 
									alt="like icon" 
									data-id={comment.id}
									src={imageFunction("heart")} 
								/>
							</button>
							<button type="button" onClick={handleChat}>
								<img 
									alt="chat icon" 
									data-id={comment.id}
									data-text={comment.text}
									data-reference={comment.book_reference}
									src={imageFunction("chat")}/>
							</button>
							<button type="button" onClick={handleReport}>
								<img 
									alt="report icon" 
									data-id={comment.id}
									src={imageFunction("warning")} 
								/>
							</button>
						</span>
					</li>
				))}
			</ul>
			<div>
				<button type="button" 
					className="entry" 
					onClick={showNewComment}>
					Comentar
				</button>
			</div>
		</div>
	);
}
TitleComment.propTypes = {
	comments: PropTypes.array.isRequired,
	likeFunction: PropTypes.func.isRequired,
	imageFunction: PropTypes.func.isRequired,
	reportFunction: PropTypes.func.isRequired,
	handleNewComment: PropTypes.func.isRequired,
	discussionFunction: PropTypes.func.isRequired,
};