import React, { Component } from "react";
import PropTypes from "prop-types";

import "./styles.css";

function getLikeCount(comment) {
	return JSON.parse(comment.likes).length;
}
export default class TitleComment extends Component {
	constructor(props) {
		super(props);

		this.showNewComment = this.showNewComment.bind(this);
		this.selected = false;
	}
	showNewComment(evt) {
		this.selected = true;
		this.props.handleNewComment(evt);
	}

	dateFormat(string) {
		const [year, month, day] = string.slice(0, 10).split("-");
		return `${day}/${month}/${year}`;
	}

	handleLike(evt) {
		const id = evt.target.getAttribute("data-id");
		this.props.likeFunction(parseInt(id));
	}

	handleReport(evt) {
		const id = evt.target.getAttribute("data-id");
		this.props.reportFunction(parseInt(id));
	}

	handleChat(evt) {
		const comment_reference = evt.target.getAttribute("data-reference");
		const comment_id = parseInt(evt.target.getAttribute("data-id"));
		const comment_text = evt.target.getAttribute("data-text");

		this.props.goToDiscussion(comment_id, comment_text, comment_reference);
	}

	render() {
		return (
			<div className="title-comments">
				<ul>
					{this.props.comments.map((comment) => (
						<li key={comment.id}>
							<h3>
								{comment.username}
								{comment.tags.map((tag) => (
									<img
										key={tag}
										style={{ marginTop: 0 }}
										src={this.props.imageFunction(tag)}
										className="tag"
										alt={tag}
									/>
								))}

								<sub>{this.dateFormat(comment.created_at)}</sub>
							</h3>
							<p style={{ whiteSpace: "break-spaces" }}>{comment.text}</p>
							<span className="comment-buttons">
								<p>
									Favoritado por <b>{getLikeCount(comment)}</b> pessoas
								</p>
								<button onClick={this.handleLike} data-id={comment.id}>
									<img src={this.props.imageFunction("heart")} alt="like" />
								</button>
								<button
									onClick={this.handleChat}
									data-id={comment.id}
									data-text={comment.verse}
									data-reference={comment.book_reference}
								>
									<img src={this.props.imageFunction("chat")} alt="chat" />
								</button>
								<button data-id={comment.id} onClick={this.handleReport}>
									<img src={this.props.imageFunction("warning")} alt="report" />
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
					<button className="entry" onClick={this.showNewComment}>
						Comentar
					</button>
				</div>
			</div>
		);
	}
}
TitleComment.propTypes = {
	comments: PropTypes.array.isRequired,
	imageFunction: PropTypes.func.isRequired,
	likeFunction: PropTypes.func.isRequired,
	goToDiscussion: PropTypes.func.isRequired,
	reportFunction: PropTypes.func.isRequired,
	handleNewComment: PropTypes.func.isRequired,
};
