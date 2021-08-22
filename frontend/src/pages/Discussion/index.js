import { NotificationContext } from "../../contexts/NotificationContext";
import { TOKEN_KEY, isAuthenticated } from "../../services/auth";
import NavBar from "../../components/NavBar";
import axios from "../../services/api";

import MDEditor, { commands } from "@uiw/react-md-editor";
import React, { Component, createRef } from "react";
import { Pagination } from "@material-ui/lab";

import "./styles.css";

const close = require("../../assets/x.svg");

export default class Discussion extends Component {
	static contextType = NotificationContext;
	
	constructor(props) {
		super(props);

		let object = { title: ""}, selected = -1;
		if (typeof this.props.location.state !== "undefined") {
			selected = this.props.location.state.comment.id;
			object = this.props.location.state;
		}
		let { title } = object;

		this.state = {
			newPostClass: "pop-up",
			newAnswerClass: "invisible",
			answersClass: "centro",
			blur: "block",

			title,
			abbrev: this.props.match.params.abbrev,
			discussions: [],
			answers: [],

			selected,
			text: "",

			totalPages: 2,
			currentPage: 1,
			loadedPages: [1]
		};

		this.textArea = createRef();

		this.closeNewPost = this.closeNewPost.bind(this);
		this.closeAnswers = this.closeAnswers.bind(this);
		this.changeText = this.changeText.bind(this);
		this.postNewAnswer = this.postNewAnswer.bind(this);
		this.postNewQuestion = this.postNewQuestion.bind(this);
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
						this.closeNewPost();
						if (!this.alreadyInDiscussions(selected)) {
							const [ discussion ] = response.data;
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
			answers: answers,
			answersClass: "centro",
			blur: "block",
		});
	}

	closeAnswers() {
		this.setState({
			answersClass: "invisible",
			blur: "none",
		});
	}

	closeNewPost() {
		this.setState({
			newPostClass: "invisible",
			newAnswerClass: "pop-up",
		});
		this.closeAnswers();
	}

	changeText(value) {
		this.setState({ text: value });
	}

	postNewQuestion() {
		this.closeNewPost();
		if (this.state.text !== "" && isAuthenticated()) {
			try {
				const references =
					this.props.location.state.comment.book_reference.split(" ");
				const abbrev = references[0];
				const verse_reference = references[1];
				const verse = this.props.location.state.verse;

				axios
					.post(`/discussion/${abbrev}/`, {
						comment_id: this.state.selected,
						verse_reference,
						verse_text: verse,
						question: this.state.text,
						token: localStorage.getItem(TOKEN_KEY),
					})
					.then((response) => {
						if (typeof response.data === "object" && response.data.question) {
							response.data.answers = [];

							this.setState((prev) => ({
								discussions: [response.data, ...prev.discussions],
								text: "",
							}));
							this.handleNotification("Postado!", "success");
						} else {
							this.handleNotification("Algo deu errado", "warning");
						}
					});
			} catch (err) {
				this.handleNotification(err.message, "error");
			}
		} else if (!isAuthenticated()) {
			this.handleNotification("Você precisa estar logado", "info");
		}
	}

	postNewAnswer() {
		this.closeAnswers();
		if (this.state.text !== "" && isAuthenticated()) {
			try {
				axios
					.patch(`/discussion/${this.state.selected}/`, {
						text: this.state.text,
						token: localStorage.getItem(TOKEN_KEY),
					})
					.then((response) => {
						if (typeof response.data === "object" && response.data.answers) {
							const answers = JSON.parse(response.data.answers);
							let chats = this.state.discussions;

							for (let i = 0; i < chats.length; i++) {
								if (chats[i].id === this.state.selected) {
									chats[i].answers = answers;
								}
							}

							this.setState({
								discussions: chats,
								text: "",
							});

							this.handleNotification("success", "Resposta enviada");
						} else {
							this.handleNotification("warning", "Algo deu errado");
						}
					});
			} catch (error) {
				this.handleNotification("error", error.toString());
			}
		} else if (!isAuthenticated()) {
			this.handleNotification("info", "Você precisa estar logado");
		}
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
												<div className="reference">{chat.verse_reference}</div>
												<p className="question-verse">{chat.verse_text}</p>
											</div>

											<details className="comment">
												<summary>Comentário mencionado</summary>
												<p>{chat.comment_text}</p>
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
							showFirstButton
							showLastButton
							size="small"
							shape="rounded"
							count={this.state.totalPages}
							page={this.state.currentPage}
							onChange={this.handlePaginate}
						/>
					</div>
				</main>

				<div className={this.state.answersClass}>
					<div
						className={this.state.newAnswerClass}
						style={{
							width: "min(700px, 100vw)",
							maxWidth: "100vw",
						}}
					>
						<div className="top">
							<h1 style={{ marginLeft: "1em" }}> Respostas </h1>
							<button onClick={this.closeAnswers}>
								<img src={close} alt="Fechar" />
							</button>
						</div>

						<ul className="answer-list">
							{this.state.answers.length > 0 ? (
								this.state.answers.map((answer) => (
									<li key={answer}>
										<h3 style={{ color: "#111" }}>{answer.name}</h3>
										<MDEditor.Markdown source={answer.text} />
									</li>
								))
							) : (
								<h2 style={{ margin: "1em 1.3em" }}>
									Seja o primeiro a responder
								</h2>
							)}
						</ul>

						<div className="reply-area">
							<div
								style={{
									border: "1px solid #dcdce6",
									width: "100%",
								}}
							>
								<MDEditor
									value={this.state.text}
									onChange={this.changeText}
									commands={[
										commands.bold,
										commands.italic,
										commands.strikethrough,
										commands.link,
										commands.checkedListCommand,
										commands.unorderedListCommand,
										commands.orderedListCommand,
										commands.codeEdit,
										commands.codeLive,
										commands.codePreview,
										commands.fullscreen,
									]}
								/>
								<MDEditor.Markdown value={this.state.text} />
							</div>
							<button className="answer-btn" onClick={this.postNewAnswer}>
								Responder
							</button>
						</div>
					</div>

					{typeof this.props.location.state !== "undefined" ? (
						<div className={this.state.newPostClass}>
							<div className="top">
								<h1 style={{ marginLeft: "1em" }}>Postar novo ponto</h1>
								<button onClick={this.closeNewPost}>
									<img src={close} alt="Fechar" />
								</button>
							</div>

							<p className="verse-text">
								{this.props.location.state.comment.text}
							</p>

							<div className="reply-area">
								<div
									ref={this.textArea}
									style={{
										border: "1px solid #dcdce6",
										width: "100%",
									}}
								>
									<MDEditor
										value={this.state.text}
										onChange={this.changeText}
									/>
									<MDEditor.Markdown value={this.state.text} />
								</div>
								<button className="answer-btn" onClick={this.postNewQuestion}>
									Postar
								</button>
							</div>
						</div>
					) : (
						<div
							onClick={this.closeNewPost}
							style={{
								width: "100%",
								height: "100%",
							}}
						/>
					)}
				</div>

				<div className="overlay" style={{ display: this.state.blur }} />
			</>
		);
	}
}
