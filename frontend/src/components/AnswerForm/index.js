import MDEditor, { commands } from "@uiw/react-md-editor";
import { NotificationContext } from "contexts/NotificationContext";
import { TOKEN_KEY, isAuthenticated } from "services/auth";
import React, { useState, useContext } from "react";

import axios from "services/api";
import PropTypes from "prop-types";

import Answer from "models/Answer";
import closeImg from "assets/x.svg";

import "./styles.css";

export default function AnswerForm({
	answers,
	selected,
	comment_text,
	setBlurDisplay,
	comment_reference,
	appendNewDiscussion,
	setAnswersToDiscussions,
}) {
	const [newAnswerClass, setNewAnswerClass] = useState("invisible");
	const [newPostClass, setNewPostClass] = useState("pop-up");
	const [answersClass, setAnswersClass] = useState("flex");
	const [replyText, setReplyText] = useState("");

	const { handleNotification } = useContext(NotificationContext);

	function handleCloseAnswers() {
		setAnswersClass("none");
		setBlurDisplay("none");
	}

	function handlePostNewAnswer() {
		handleCloseAnswers();
		const hasPermissionToPost = canPostSomething();
		if (hasPermissionToPost) {
			try {
				axios
					.patch(`/discussion/${selected}/`, {
						text: replyText,
						token: localStorage.getItem(TOKEN_KEY),
					})
					.then((response) => {
						if (typeof response.data === "object" && response.data.answers) {
							const answers = JSON.parse(response.data.answers);
							setReplyText("");
							setAnswersToDiscussions(answers);
							handleNotification("success", "Resposta enviada");
						} else {
							handleNotification("warning", "Algo deu errado");
						}
					});
			} catch (error) {
				handleNotification("error", error.toString());
			}
		}
	}

	function handlePostNewQuestion() {
		handleCloseNewPost();
		const hasPermissionToPost = canPostSomething();
		if (hasPermissionToPost) {
			try {
				const [abbrev, verse_reference] = comment_reference.split(" ");

				axios
					.post(`/discussion/${abbrev}/`, {
						verse_reference,
						question: replyText,
						comment_id: selected,
						verse_text: comment_text,
						token: localStorage.getItem(TOKEN_KEY),
					})
					.then((response) => {
						if (typeof response.data === "object" && response.data.question) {
							response.data.answers = [];
							setReplyText("");
							appendNewDiscussion(response.data);
							handleNotification("success", "Postado!");
						} else {
							handleNotification("warning", "Algo deu errado");
						}
					});
			} catch (error) {
				handleNotification("error", error.toString());
			}
		}
	}

	function handleCloseNewPost() {
		setNewPostClass("invisible");
		setNewAnswerClass("pop-up");
		handleCloseAnswers();
	}

	function handleChangeText(value) {
		setReplyText(value);
	}

	function canPostSomething() {
		if (!isAuthenticated()) {
			handleNotification("info", "Você precisa estar logado");
		}
		return replyText !== "" && isAuthenticated();
	}

	return (
		<div className="answersComponent" style={{ display: answersClass }}>
			<div className={newAnswerClass}>
				<div className="top">
					<h1> Respostas </h1>
					<button onClick={handleCloseAnswers} type="button">
						<img src={closeImg} alt="Fechar" />
					</button>
				</div>

				<ul className="answer-list">
					{answers.length > 0 ? (
						answers.map((answer) => (
							<li key={answer}>
								<h3> {answer.name} </h3>
								<MDEditor.Markdown source={answer.text} />
							</li>
						))
					) : (
						<h2> Seja o primeiro a responder </h2>
					)}
				</ul>

				<div className="reply-area">
					<div>
						<MDEditor
							value={replyText}
							onChange={handleChangeText}
							commands={[
								commands.bold,
								commands.link,
								commands.italic,
								commands.codeEdit,
								commands.codeLive,
								commands.fullscreen,
								commands.codePreview,
								commands.strikethrough,
								commands.checkedListCommand,
								commands.orderedListCommand,
								commands.unorderedListCommand,
							]}
						/>
						<MDEditor.Markdown value={replyText} />
					</div>
					<button
						type="button"
						className="answer-btn"
						onClick={handlePostNewAnswer}
					>
						Responder
					</button>
				</div>
			</div>

			{comment_text !== "" && (
				<>
					<div className={newPostClass}>
						<div className="top">
							<h1> Postar novo ponto </h1>
							<button type="button" onClick={handleCloseNewPost}>
								<img src={closeImg} alt="Fechar" />
							</button>
						</div>

						<h2> {comment_reference} </h2>
						<p className="verse-text">{comment_text}</p>

						<div className="reply-area">
							<div>
								<MDEditor value={replyText} onChange={handleChangeText} />
								<MDEditor.Markdown value={replyText} />
							</div>
							<button
								type="button"
								className="answer-btn"
								onClick={handlePostNewQuestion}
							>
								Postar
							</button>
						</div>
					</div>
					<div
						role="button"
						aria-hidden="true"
						className="answerBlur"
						onClick={handleCloseNewPost}
					/>
				</>
			)}
		</div>
	);
}
AnswerForm.propTypes = {
	answers: PropTypes.arrayOf(Answer),
	selected: PropTypes.number.isRequired,
	setBlurDisplay: PropTypes.func.isRequired,
	comment_text: PropTypes.string.isRequired,
	comment_reference: PropTypes.string.isRequired,
	appendNewDiscussion: PropTypes.func.isRequired,
	setAnswersToDiscussions: PropTypes.func.isRequired,
};
AnswerForm.defaultProps = {
	answers: [],
}