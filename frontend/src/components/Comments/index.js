import "./styles.css";

import Comment from "models/Comment";
import closeImg from "assets/x.svg";
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

export default function Comments({
	comments,
	likeFunction,
	imageFunction,
	closeFunction,
	reportFunction,
	discussionFunction,
	handleNewComment,
}) {
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
		<div className="sideComments">
			<div className="top">
				<h2> Comentários </h2>
				<button type="button" onClick={closeFunction}>
					<img src={closeImg} alt="Close img" />
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
							<label htmlFor={commentary.id}>
								<p className="label-title">{commentary.text}</p>
							</label>
							<input type="checkbox" id={commentary.id} />
							<div className="user-comment">
								<p>{commentary.text}</p>
								<span className="comment-buttons">
									<p>
										Favoritado por
										<b> {getLikeCount(commentary)} </b>
										pessoas
									</p>
									<button
										type="button"
										onClick={handleLike}
										data-id={commentary.id}
									>
										<img alt="like" src={imageFunction("heart")} />
									</button>
									<button
										type="button"
										onClick={handleChat}
										data-id={commentary.id}
										data-text={commentary.verse}
										data-reference={commentary.book_reference}
									>
										<img alt="chat" src={imageFunction("chat")} />
									</button>
									<button
										type="button"
										data-id={commentary.id}
										onClick={handleReport}
									>
										<img alt="report" src={imageFunction("warning")} />
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
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					width: "100%",
				}}
			>
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
