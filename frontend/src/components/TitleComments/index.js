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
								<button onClick={() => this.props.likeFunction(comment.id)}>
									<img src={this.props.imageFunction("heart")} alt="like" />
								</button>
								<button onClick={() => this.props.goToDiscussion(comment)}>
									<img src={this.props.imageFunction("chat")} alt="chat" />
								</button>
								<button onClick={() => this.props.reportFunction(comment.id)}>
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
