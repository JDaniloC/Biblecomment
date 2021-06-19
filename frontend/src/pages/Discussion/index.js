import React, { Component } from "react";
import NavBar from "../../components/NavBar";
import axios from "../../services/api";
import { TOKEN_KEY, isAuthenticated } from "../../services/auth";

import { Pagination } from "@material-ui/lab";
import Snackbar from "@material-ui/core/Snackbar";
import Alert from "@material-ui/lab/Alert";
import MDEditor, { commands } from "@uiw/react-md-editor";

import "./styles.css";

const close = require("../../assets/x.svg");

export default class Discussion extends Component {
	constructor(props) {
		super(props);

		this.state = {
			newPostClass: "pop-up",
			newAnswerClass: "invisible",
			answersClass: "centro",
			blur: "block",

			title: "",
			abbrev: "",
			discussions: [],
			answers: [],

			selected: -1,
			text: "",

			totalPages: 2,
			currentPage: 1,
			loadedPages: [1],

			aviso: false,
			severidade: "success",
			mensagem: "",
		};
	}

	loadDiscussions(page, abbrev = undefined) {
		if (abbrev === undefined) {
			abbrev = this.state.abbrev;
		}

		try {
			axios
				.get(`/discussion/${abbrev}/?pages=${page}`)
				.then((response) => {
					if (typeof response.data === "object") {
						if (response.data.length > 0) {
							for (let i = 0; i < response.data.length; i++) {
								response.data[i].answers = JSON.parse(
									response.data[i].answers
								);
							}
							this.setState((prev) => ({
								discussions: [
									...prev.discussions,
									...response.data,
								],
							}));
						}

						if (response.data.length < 5) {
							this.setState((prev) => ({
								totalPages: prev.totalPages - 1,
							}));
						}
					} else {
						this.handleNotification("Algo deu errado", "warning");
					}
				});
		} catch (err) {
			this.handleNotification(err, "error");
		}
	}

	componentDidMount() {
		const abbrev = this.props.match.params.abbrev;
		let search_by = -1;
		let title = "";
		if (this.props.location.state !== undefined) {
			search_by = this.props.location.state.comment.id;
			title = this.props.location.state.title;
		} else {
			axios.get(`/books/${abbrev}/chapters/1`).then((response) => {
				if (response.data.title !== undefined) {
					this.setState({
						title: response.data.title,
					});
				}
			});
		}
		this.setState({
			selected: search_by,
			title,
			abbrev,
		});
		this.loadDiscussions(1, abbrev);

		if (this.props.location.state !== undefined) {
			try {
				axios
					.get(`/discussion/${abbrev}/${search_by}`)
					.then((response) => {
						if (response.data.length > 0) {
							this.closeNewPost();
							if (!this.searchDiscussionId(search_by)) {
								const discussion = response.data[0];
								discussion.id = -discussion.id;
								discussion.answers = JSON.parse(
									discussion.answers
								);

								this.setState((prev) => ({
									discussions: [
										discussion,
										...prev.discussions,
									],
								}));
							}
						}
					});
			} catch (err) {
				this.handleNotification(err, "error");
			}
		}
	}

	searchDiscussionId(id) {
		this.state.discussions.forEach((element) => {
			if (element.id === id) {
				return true;
			}
		});
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

	handleChange(value) {
		if (value.length < 200 || value.length > 1000) {
			this.textArea.style.borderColor = "red";
		} else {
			this.textArea.style.borderColor = "aquamarine";
		}
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
						if (
							typeof response.data === "object" &&
							response.data.question
						) {
							response.data.answers = [];

							this.setState((prev) => ({
								discussions: [
									response.data,
									...prev.discussions,
								],
								text: "",
							}));
							this.handleNotification("Postado!", "success");
						} else {
							this.handleNotification(
								"Algo deu errado",
								"warning"
							);
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
						if (
							typeof response.data === "object" &&
							response.data.answers
						) {
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

							this.handleNotification(
								"Resposta enviada",
								"success"
							);
						} else {
							this.handleNotification(
								"Algo deu errado",
								"warning"
							);
						}
					});
			} catch (err) {
				this.handleNotification(err, "error");
			}
		} else if (!isAuthenticated()) {
			this.handleNotification("Você precisa estar logado", "info");
		}
	}

	handlePaginate(evt, page) {
		evt.preventDefault();

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

	handleNotification(mensagem, severidade) {
		this.setState({
			aviso: true,
			mensagem: mensagem,
			severidade: severidade,
		});
	}

	closeAviso(evt, reason) {
		if (evt !== null) {
			evt.preventDefault();
		}

		if (reason === "clickaway") {
			return;
		}

		this.setState({ aviso: false });
	}

	render() {
		return (
			<>
				<main>
					<div className="visible">
						<NavBar />
					</div>
					<div className="main">
						<h1 style={{ textAlign: "center" }}>
							{this.state.title}
						</h1>
						<ul className="discussion-list">
							{this.state.discussions.length > 0 ? (
								this.calculatePagination().map((chat) => (
									<li key={chat.id} className="question">
										<label
											style={{ display: "flex" }}
											htmlFor={chat.id}
										>
											<p className="label-title">
												{chat.verse_reference} -{" "}
												{chat.question}
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
												<summary>
													Comentário mencionado
												</summary>
												<p>{chat.comment_text}</p>
											</details>

											<hr />
											<h4 style={{ fontSize: "large" }}>
												{chat.username}
											</h4>
											<MDEditor.Markdown
												source={chat.question}
											/>
											<hr />

											<button
												onClick={() => {
													this.openAnswers(
														chat.id,
														chat.answers
													);
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
									Nada a ser examinado (João 5:39) neste
									capítulo. <br />
									"Vinde, pois, e arrazoemos, diz o Senhor."
									Is 1:18
								</p>
							)}
						</ul>
						<Pagination
							showFirstButton
							showLastButton
							count={this.state.totalPages}
							size="small"
							page={this.state.currentPage}
							shape="rounded"
							onChange={(evt, page) => {
								this.handlePaginate(evt, page);
							}}
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
							<h1 style={{ alignSelf: "center" }}> Respostas </h1>
							<button onClick={() => this.closeAnswers()}>
								<img src={close} alt="Fechar" />
							</button>
						</div>

						<ul className="answer-list">
							{this.state.answers.length > 0 ? (
								this.state.answers.map((answer, index) => (
									<li key={(index - 1) * -1}>
										<h3 style={{ color: "#111" }}>
											{answer.name}
										</h3>
										<MDEditor.Markdown
											source={answer.text}
										/>
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
									onChange={(evt) => {
										this.handleChange(evt);
									}}
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
							<button
								className="answer-btn"
								onClick={() => {
									this.postNewAnswer();
								}}
							>
								Responder
							</button>
						</div>
					</div>

					{this.props.location.state !== undefined ? (
						<div className={this.state.newPostClass}>
							<div className="top">
								<h1 style={{ marginLeft: "1em" }}>
									Postar novo ponto
								</h1>
								<button onClick={() => this.closeNewPost()}>
									<img src={close} alt="Fechar" />
								</button>
							</div>

							<p
								style={{
									padding: "5px 20px 0",
									whiteSpace: "break-spaces",
								}}
							>
								{this.props.location.state.comment.text}
							</p>

							<div className="reply-area">
								<div
									ref={(ref) => (this.textArea = ref)}
									style={{
										border: "1px solid #dcdce6",
										width: "100%",
									}}
								>
									<MDEditor
										value={this.state.text}
										onChange={(evt) => {
											this.handleChange(evt);
										}}
									/>
									<MDEditor.Markdown
										value={this.state.text}
									/>
								</div>
								<button
									className="answer-btn"
									onClick={() => {
										this.postNewQuestion();
									}}
								>
									Postar
								</button>
							</div>
						</div>
					) : (
						<div
							onClick={() => {
								this.closeNewPost();
							}}
							style={{
								width: "100%",
								height: "100%",
							}}
						/>
					)}
				</div>

				<div
					className="overlay"
					style={{ display: this.state.blur }}
				/>

				<Snackbar
					open={this.state.aviso}
					autoHideDuration={2000}
					onClose={(evt, reason) => {
						this.closeAviso(evt, reason);
					}}
				>
					<Alert
						onClose={(evt, reason) => {
							this.closeAviso(evt, reason);
						}}
						severity={this.state.severidade}
					>
						{this.state.mensagem}
					</Alert>
				</Snackbar>
			</>
		);
	}
}
