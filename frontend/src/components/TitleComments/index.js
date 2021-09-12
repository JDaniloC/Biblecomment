import "./styles.css";

import PropTypes from "prop-types";
import React, { Component } from "react";

function getLikeCount(comment) {
	return JSON.parse(comment.likes).length;
}
export default class TitleComment extends Component {
	static propTypes = {
		comments: PropTypes.array.isRequired,
		imageFunction: PropTypes.func.isRequired,
		likeFunction: PropTypes.func.isRequired,
		goToDiscussion: PropTypes.func.isRequired,
		reportFunction: PropTypes.func.isRequired,
		handleNewComment: PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		const {
			handleNewComment,
			likeFunction,
			reportFunction,
			goToDiscussion
		} = this.props;

		this.likeFunction = likeFunction
		this.reportFunction = reportFunction
		this.goToDiscussion = goToDiscussion
		this.handleNewComment = handleNewComment

		this.showNewComment = this.showNewComment.bind(this);
		this.selected = false;
	}
	showNewComment(evt) {
		this.selected = true;
		this.handleNewComment(evt);
	}

	dateFormat(string) {
		const DATE_LENGTH = 10;
		const [year, month, day] = string.slice(
			0, DATE_LENGTH).split("-");
		return `${day}/${month}/${year}`;
	}

	handleLike(evt) {
		const id = evt.target.getAttribute("data-id");
		this.likeFunction(parseInt(id, 10));
	}

	handleReport(evt) {
		const id = evt.target.getAttribute("data-id");
		this.reportFunction(parseInt(id, 10));
	}

	handleChat(evt) {
		const comment_reference = evt.target.getAttribute("data-reference");
		const comment_id = parseInt(evt.target.getAttribute("data-id"), 10);
		const comment_text = evt.target.getAttribute("data-text");

		this.goToDiscussion(comment_id, comment_text, comment_reference);
	}

	render() {
		const { comments, imageFunction } = this.props;

		return (
			<div className="title-comments">
				<ul>
					{comments.map((comment) => (
						<li key={comment.id}>
							<h3>
								{comment.username}
								{comment.tags.map((tag) => (
									<img
										style={{ marginTop: 0 }}
										src={imageFunction(tag)}
										key={tag} alt={tag}
										className="tag"
									/>
								))}

								<sub>{this.dateFormat(comment.created_at)}</sub>
							</h3>
							<p style={{ whiteSpace: "break-spaces" }}>{comment.text}</p>
							<span className="comment-buttons">
								<p>
									Favoritado por <b>{getLikeCount(comment)}</b> pessoas
								</p>
								<button 
									type = "button"
									onClick={this.handleLike} 
									data-id={comment.id}
								>
									<img src={imageFunction("heart")} alt="like" />
								</button>
								<button
									type = "button"
									data-id={comment.id}
									data-text={comment.verse}
									onClick={this.handleChat}
									data-reference={comment.book_reference}
								>
									<img src={imageFunction("chat")} alt="chat" />
								</button>
								<button 
									type = "button"
									data-id={comment.id} 
									onClick={this.handleReport}
								>
									<img src={imageFunction("warning")} alt="report" />
								</button>
							</span>
						</li>
					))}
				</ul>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
					}}
				>
					<button 
						type = "button"
						className="entry" 
						onClick={this.showNewComment}
					>
						Comentar
					</button>
				</div>
			</div>
		);
	}
}
