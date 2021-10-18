import React, { Component } from "react";
import { Pagination } from "@material-ui/lab";
import { NotificationContext } from "contexts/NotificationContext";

import axios from "services/api";
import NavBar from "components/NavBar";
import PropTypes from "prop-types";

import MDEditor from "@uiw/react-md-editor";
import AnswerForm from "components/AnswerForm";

import "./styles.css";

export default class Discussion extends Component {
	static contextType = NotificationContext;

	constructor(props) {
		super(props);

		const location = this.props.location;
		let title = "Não encontrado...",
			comment_id = -1,
			comment_text = "",
			comment_reference = "";

		if (location !== undefined) {
			let {
				title: newTitle,
				comment_id: newComment_id,
				comment_text: newComment_text,
				comment_reference: newComment_reference,
			} = location.state;

			title = newTitle;
			comment_id = newComment_id;
			comment_text = newComment_text;
			comment_reference = newComment_reference;
		}

		const { abbrev } = this.props.match.params;

		this.state = {
			blurDisplay: "block",

			title,
			abbrev,
			discussions: [],
			answers: [],

			selected: comment_id,
			comment_reference,
			comment_text,

			totalPages: 2,
			currentPage: 1,
			loadedPages: [1],
		};

		this.setBlurDisplay = this.setBlurDisplay.bind(this);
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
				axios.get(`/discussion/${abbrev}/${selected}`).then((response) => {
					if (response.data.length > 0) {
						if (!this.alreadyInDiscussions(selected)) {
							const [discussion] = response.data;
							discussion.id = -discussion.id;
							discussion.answers = JSON.parse(discussion.answers);

							this.setState((prev) => ({
								discussions: [discussion, ...prev.discussions],
							}));
						}
					}
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
			axios.get(`/discussion/${abbrev}/?pages=${page}`).then((response) => {
				if (typeof response.data === "object") {
					if (response.data.length > 0) {
						for (let i = 0; i < response.data.length; i++) {
							response.data[i].answers = JSON.parse(response.data[i].answers);
						}
						this.setState((prev) => ({
							discussions: [...prev.discussions, ...response.data],
						}));
					}

					if (response.data.length < 5) {
						this.setState((prev) => ({
							totalPages: prev.totalPages - 1,
						}));
					}
				} else {
					this.handleNotification("warning", "Algo deu errado");
				}
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
			answersClass: "centro",
			answers: answers,
		});
		this.setBlurDisplay("block");
	}
	
	setBlurDisplay(display) {
		this.setState({
			blurDisplay: display,
		});
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
				<main>
					<div className="visible">
						<NavBar />
					</div>
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
												<div className="reference">
													{chat.verse_reference}
												</div>
												<p className="question-verse">
													{chat.verse_text}
												</p>
											</div>

											<details className="comment">
												<summary>Comentário mencionado</summary>
												<p> {chat.comment_text} </p>
											</details>

											<hr />
											<h4 style={{ fontSize: "large" }}>
												{chat.username}
											</h4>
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
				</main>

				<AnswerForm
					answers={this.state.answers}
					selected={this.state.selected}
					closeAnswers={this.closeAnswers}
					setBlurDisplay={this.setBlurDisplay}
					comment_text={this.state.comment_text}
					postNewQuestion={this.postNewQuestion}
					appendNewDiscussion={this.appendNewDiscussion}
					comment_reference={this.state.comment_reference}
					setAnswersToDiscussions={this.setAnswersToDiscussions}
				/>
				<div className="overlay" style={{ 
					display: this.state.blurDisplay 
				}} />
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
