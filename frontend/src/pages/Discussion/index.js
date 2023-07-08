import React, { Component } from "react";
import { Pagination } from "@material-ui/lab";
import { NotificationContext } from "contexts/NotificationContext";

import axios from "services/api";
import PropTypes from "prop-types";

import MDEditor from "@uiw/react-md-editor";
import AnswerForm from "components/AnswerForm";

import "./styles.css";
import Header from "components/Header";
import Modal from "shared/components/Modal/Modal";

export default class Discussion extends Component {
	static contextType = NotificationContext;

	constructor(props) {
		super(props);

		const location = this.props.location;
		let title = "Não encontrado...",
			commentID = -1,
			commentText = "",
			commentReference = "";

		if (location !== undefined) {
			const {
				title: newTitle,
				commentID: newCommentID,
				commentText: newCommentText,
				commentReference: newCommentReference,
			} = location.state;

			title = newTitle;
			commentID = newCommentID;
			commentText = newCommentText;
			commentReference = newCommentReference;
		}

		const { abbrev } = this.props.match.params;

		this.state = {
			showAnswerForm: true,

			title,
			abbrev,
			discussions: [],
			answers: [],

			selected: commentID,
			comment_text: commentText,
			comment_reference: commentReference,

			totalPages: 2,
			currentPage: 1,
			loadedPages: [1],
		};

		this.closeAnswers = this.closeAnswers.bind(this);
		this.appendNewDiscussion = this.appendNewDiscussion.bind(this);
		this.setAnswersToDiscussions = this.setAnswersToDiscussions.bind(this);
	}

	componentDidMount() {
		const { handleNotification } = this.context;
		this.handleNotification = handleNotification;

		const { abbrev, selected } = this.state;
		this.loadDiscussions(1, abbrev);

		if (typeof this.props.location.state !== "undefined") {
			try {
				axios
					.get(`/discussion/${abbrev}/${selected}`)
					.then(({ data }) => {
						if (data.length > 0) {
							if (!this.alreadyInDiscussions(selected)) {
								const [discussion] = data;
								discussion.id = -discussion.id;
								discussion.answers = JSON.parse(discussion.answers);

								this.setState((prev) => ({
									discussions: [discussion, ...prev.discussions],
								}));
							}
						}
					})
					.catch(({ response }) => {
						this.handleNotification("error", response.data.error);
					});
			} catch (error) {
				this.handleNotification("error", error.toString());
			}
		}
	}

	loadDiscussions(page, abbrev = false) {
		if (!abbrev) {
			abbrev = this.state.abbrev;
		}

		try {
			axios
				.get(`/discussion/${abbrev}/?pages=${page}`)
				.then(({ data }) => {
					if (data.length > 0) {
						for (let i = 0; i < data.length; i++) {
							data[i].answers = JSON.parse(data[i].answers);
						}
						this.setState((prev) => ({
							discussions: [...prev.discussions, ...data],
						}));
					}

					if (data.length < 5) {
						this.setState((prev) => ({
							totalPages: prev.totalPages - 1,
						}));
					}
				})
				.catch(({ response }) => {
					this.handleNotification("error", response.data.error);
				});
		} catch (error) {
			this.handleNotification("error", error.toString());
		}
	}

	alreadyInDiscussions(id) {
		for (let index = 0; index < this.state.discussions.length; index++) {
			const discussion = this.state.discussions[index];
			if (discussion.id === id) return true;
		}
		return false;
	}

	openAnswers(identificador, answers) {
		this.setState({
			selected: Math.abs(identificador),
			showAnswerForm: true,
			answers: answers,
		});
	}

	closeAnswers() {
		this.setState({ showAnswerForm: false });
	}

	handlePaginate(_, page) {
		this.setState({
			currentPage: page,
		});
		if (!(page in this.state.loadedPages)) {
			this.loadDiscussions(page);
			this.setState((prev) => ({
				loadedPages: [...prev.loadedPages, page],
				totalPages: prev.totalPages + 1,
			}));
		}
	}

	calculatePagination() {
		let page = this.state.currentPage;

		var inicio = (page - 1) * 5;
		var final = inicio + 5;

		return this.state.discussions.slice(inicio, final);
	}

	setAnswersToDiscussions(answers) {
		this.setState((prevState) => ({
			discussions: prevState.map((chat) => {
				if (chat.id === this.state.selected) {
					chat.answers = answers;
				}
				return chat;
			}),
		}));
	}
	appendNewDiscussion(newDiscussions) {
		this.setState((prevState) => ({
			discussions: [newDiscussions, ...prevState.discussions],
		}));
	}

	render() {
		return (
			<>
				<Header />
				<div className="container">
					<div className="main">
						<h1 style={{ textAlign: "center" }}>{this.state.title}</h1>
						<ul className="discussion-list">
							{this.state.discussions.length > 0 ? (
								this.calculatePagination().map((chat) => (
									<li key={chat.id} className="question">
										<label style={{ display: "flex" }} htmlFor={chat.id}>
											<p className="label-title">
												{chat.verse_reference} - {chat.question}
											</p>
										</label>
										<input type="checkbox" id={chat.id} />
										<div>
											<div className="question-header">
												<div className="reference">{chat.verse_reference}</div>
												<p className="question-verse">{chat.verse_text}</p>
											</div>

											<details className="comment">
												<summary>Comentário mencionado</summary>
												<p> {chat.comment_text} </p>
											</details>

											<hr />
											<h4 style={{ fontSize: "large" }}>{chat.username}</h4>
											<MDEditor.Markdown source={chat.question} />
											<hr />

											<button
												onClick={() => {
													this.openAnswers(chat.id, chat.answers);
												}}
												className="answer-btn"
											>
												Responder
											</button>
										</div>
									</li>
								))
							) : (
								<p className="placeholder">
									Nada a ser examinado (João 5:39) neste capítulo. <br />
									&quot;Vinde, pois, e arrazoemos, diz o Senhor.&quot; Is 1:18
								</p>
							)}
						</ul>
						<Pagination
							size="small"
							shape="rounded"
							showLastButton
							showFirstButton
							count={this.state.totalPages}
							page={this.state.currentPage}
							onChange={this.handlePaginate}
						/>
					</div>
				</div>

				<Modal
					show={this.state.showAnswerForm}
					onHandleClose={this.closeAnswers}
				>
					<AnswerForm
						answers={this.state.answers}
						selected={this.state.selected}
						onCloseAnswers={this.closeAnswers}
						commentText={this.state.comment_text}
						postNewQuestion={this.postNewQuestion}
						appendNewDiscussion={this.appendNewDiscussion}
						commentReference={this.state.comment_reference}
						setAnswersToDiscussions={this.setAnswersToDiscussions}
					/>
				</Modal>
			</>
		);
	}
}
Discussion.propTypes = {
	location: PropTypes.shape({
		pathname: PropTypes.string.isRequired,
		state: PropTypes.shape({
			title: PropTypes.string,
			comment_id: PropTypes.number,
			comment_text: PropTypes.string,
			comment_reference: PropTypes.string,
		}),
	}).isRequired,
	match: PropTypes.shape({
		params: PropTypes.shape({
			abbrev: PropTypes.string.isRequired,
		}),
	}),
};
Discussion.defaultProps = {
	match: {
		params: {
			abbrev: "gn",
		},
	},
};
