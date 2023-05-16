import "./styles.css";

import Comment from "models/Comment";
import PropTypes from "prop-types";
import React, { useCallback } from "react";
import { ReactComponent as CloseIcon } from "assets/x.svg";

function getLikeCount(comment) {
	return comment.likes.length;
}

function dateFormat(string) {
	const DATE_LENGTH = 10;
	const [year, month, day] = string.slice(0, DATE_LENGTH).split("-");
	return `${day}/${month}/${year}`;
}

export default function Comments({
	comments,
	likeFunction,
	imageFunction,
	closeFunction,
	reportFunction,
	handleNewComment,
	discussionFunction,
}) {
	const handleLike = useCallback((evt) => {
		const id = evt.target.getAttribute("data-id");
		likeFunction(parseInt(id, 10));
	}, [likeFunction]);

	const handleReport = useCallback((evt) => {
		const id = evt.target.getAttribute("data-id");
		reportFunction(parseInt(id, 10));
	}, [reportFunction]);

	const handleChat = useCallback((evt) => {
		const comment_reference = evt.target.getAttribute("data-reference");
		const comment_id = parseInt(evt.target.getAttribute("data-id"), 10);
		const username = evt.target.getAttribute("data-username");
		const comment_text = evt.target.getAttribute("data-text");
		const reference = `${username} ${comment_reference}`;
		discussionFunction(comment_id, comment_text, reference);
	}, [discussionFunction]);

	return (
		<div className="sideComments">
			<div className="top">
				<h2> Comentários </h2>
				<button type="button" onClick={closeFunction}>
					<CloseIcon />
				</button>
			</div>

			<ul className="commentaries">
				{comments.length !== 0 ? (
					comments.map((commentary) => (
						<li key={commentary.id}>
							<h3>
								{commentary.username}
								{commentary.tags.map((tag) => (
									<img key={tag} alt={tag} src={imageFunction(tag)} />
								))}
								<sub>{dateFormat(commentary.created_at)}</sub>
							</h3>
							<label htmlFor={`c${commentary.id}`}>
								<p className="label-title">{commentary.text}</p>
							</label>
							<input type="checkbox" id={`c${commentary.id}`} />
							<div className="user-comment">
								<p>{commentary.text}</p>
								<span className="comment-buttons">
									<p>
										Favoritado por
										<b> {getLikeCount(commentary)} </b>
										pessoas
									</p>
									<button type="button" onClick={handleLike}>
										<img
											alt="Like comment"
											data-id={commentary.id}
											src={imageFunction("heart")}
										/>
									</button>
									<button type="button" onClick={handleChat}>
										<img
											alt="Go to chat"
											data-id={commentary.id}
											src={imageFunction("chat")}
											data-text={commentary.text}
											data-username={commentary.username}
											data-reference={commentary.book_reference}
										/>
									</button>
									<button type="button" onClick={handleReport}>
										<img
											alt="Report comment"
											data-id={commentary.id}
											src={imageFunction("warning")}
										/>
									</button>
								</span>
							</div>
						</li>
					))
				) : (
					<li>
						<h3> Nenhum comentário </h3>
						<p> Seja o primeiro a comentar </p>
					</li>
				)}
			</ul>
			<div className="buttonContainer">
				<button type="button" className="entry" onClick={handleNewComment}>
					Comentar
				</button>
			</div>
		</div>
	);
}
Comments.propTypes = {
	likeFunction: PropTypes.func.isRequired,
	closeFunction: PropTypes.func.isRequired,
	imageFunction: PropTypes.func.isRequired,
	reportFunction: PropTypes.func.isRequired,
	handleNewComment: PropTypes.func.isRequired,
	discussionFunction: PropTypes.func.isRequired,
	comments: PropTypes.arrayOf(Comment).isRequired,
};
