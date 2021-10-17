import "./styles.css";

import closeImg from "assets/x.svg";
import PropTypes from "prop-types";
import React, { Component } from "react";

export default class Comments extends Component {
	static propTypes = {
		handleNewComment: PropTypes.func.isRequired,
		closeFunction: PropTypes.func.isRequired,
		commentaries: PropTypes.array.isRequired,
		imageFunction: PropTypes.func.isRequired,
		likeFunction: PropTypes.func.isRequired,
		goToDiscussion: PropTypes.func.isRequired,
		reportFunction: PropTypes.func.isRequired,
	};

	constructor(props) {
		super(props);

		const { handleNewComment, likeFunction, reportFunction, goToDiscussion } =
			this.props;

		this.likeFunction = likeFunction;
		this.reportFunction = reportFunction;
		this.goToDiscussion = goToDiscussion;
		this.handleNewComment = handleNewComment;

		this.selected = false;
		this.showNewComment = this.showNewComment.bind(this);
	}

	showNewComment(evt) {
		this.selected = true;
		this.handleNewComment(evt);
	}

	dateFormat(string) {
		const DATE_LENGTH = 10;
		const [year, month, day] = string.slice(0, DATE_LENGTH).split("-");
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
		const { commentaries, closeFunction, imageFunction } = this.props;

		return (
			<div className="side">
				<div className="top">
					<h2 style={{ alignSelf: "center" }}> Comentários </h2>
					<button type="button" onClick={closeFunction}>
						<img src={closeImg} alt="Fechar" />
					</button>
				</div>

				<ul className="commentaries">
					{commentaries.length !== 0 ? (
						commentaries.map((commentary) => (
							<li key={commentary.id}>
								<h3 style={{ display: "flex" }}>
									{commentary.username}
									{commentary.tags.map((tag) => (
										<img
											key={tag}
											alt={tag}
											src={imageFunction(tag)}
											style={{ height: "1rem", margin: "0 4px" }}
										/>
									))}
									<sub>{this.dateFormat(commentary.created_at)}</sub>
								</h3>
								<label style={{ display: "flex" }} htmlFor={commentary.id}>
									<p className="label-title">{commentary.text}</p>
								</label>
								<input type="checkbox" id={commentary.id} />
								<div className="user-comment">
									<p>{commentary.text}</p>
									<span className="comment-buttons">
										<p>
											{" "}
											Favoritado por{" "}
											<b>{JSON.parse(commentary.likes).length}</b> pessoas{" "}
										</p>
										<button
											type="button"
											onClick={this.handleLike}
											data-id={commentary.id}
										>
											<img src={imageFunction("heart")} alt="like" />
										</button>
										<button
											type="button"
											data-id={commentary.id}
											onClick={this.handleChat}
											data-text={commentary.verse}
											data-reference={commentary.book_reference}
										>
											<img src={imageFunction("chat")} alt="chat" />
										</button>
										<button
											type="button"
											data-id={commentary.id}
											onClick={this.handleReport}
										>
											<img src={imageFunction("warning")} alt="report" />
										</button>
									</span>
								</div>
							</li>
						)) // Ternary operator
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
					<button type="button" className="entry" onClick={this.showNewComment}>
						Comentar
					</button>
				</div>
			</div>
		);
	}
}
