import MDEditor, { commands } from "@uiw/react-md-editor";
import { NotificationContext } from "contexts/NotificationContext";
import { TOKEN_KEY, isAuthenticated } from "services/auth";
import React, { useState, useContext } from "react";

import axios from "services/api";
import PropTypes from "prop-types";

import closeImg from "assets/x.svg";

export default function AnswerForm({
	answers,
	text,
	selected,
	comment_text,
	closeAnswers,
	postNewQuestion,
	setAnswersToDiscussions,
	location,
}) {
	const [newAnswerClass, setNewAnswerClass] = useState("invisible");
	const [newPostClass, setNewPostClass] = useState("pop-up");
	const [answersClass, setAnswersClass] = useState("centro"); // eslint-disable-line
	const [replyText, setReplyText] = useState("");

	const { handleNotification } = useContext(NotificationContext);

	function handlePostNewAnswer() {
		closeAnswers();
		if (replyText !== "" && isAuthenticated()) {
			try {
				axios
					.patch(`/discussion/${selected}/`, {
						text: replyText,
						token: localStorage.getItem(TOKEN_KEY),
					})
					.then((response) => {
						if (typeof response.data === "object" && response.data.answers) {
							const answers = JSON.parse(response.data.answers);
							setAnswersToDiscussions(answers);
							setReplyText("");

							handleNotification("success", "Resposta enviada");
						} else {
							handleNotification("warning", "Algo deu errado");
						}
					});
			} catch (error) {
				handleNotification("error", error.toString());
			}
		} else if (!isAuthenticated()) {
			handleNotification("info", "Você precisa estar logado");
		}
	}

	function handleCloseNewPost() {
		setNewPostClass("invisible");
		setNewAnswerClass("pop-up");
		closeAnswers();
	}

	function handleChangeText(value) {
		setReplyText(value);
	}

	return (
		<div className={answersClass}>
			<div
				className={newAnswerClass}
				style={{
					width: "min(700px, 100vw)",
					maxWidth: "100vw",
				}}
			>
				<div className="top">
					<h1 style={{ marginLeft: "1em" }}> Respostas </h1>
					<button onClick={closeAnswers}>
						<img src={closeImg} alt="Fechar" />
					</button>
				</div>

				<ul className="answer-list">
					{answers.length > 0 ? (
						answers.map((answer) => (
							<li key={answer}>
								<h3 style={{ color: "#111" }}>{answer.name}</h3>
								<MDEditor.Markdown source={answer.text} />
							</li>
						))
					) : (
						<h2 style={{ margin: "1em 1.3em" }}>Seja o primeiro a responder</h2>
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
							value={replyText}
							onChange={handleChangeText}
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
						<MDEditor.Markdown value={replyText} />
					</div>
					<button className="answer-btn" onClick={handlePostNewAnswer}>
						Responder
					</button>
				</div>
			</div>

			{typeof location.state !== "undefined" ? (
				<div className={newPostClass}>
					<div className="top">
						<h1 style={{ marginLeft: "1em" }}>Postar novo ponto</h1>
						<button onClick={handleCloseNewPost}>
							<img src={closeImg} alt="Fechar" />
						</button>
					</div>

					<p className="verse-text">{comment_text}</p>

					<div className="reply-area">
						<div
							style={{
								border: "1px solid #dcdce6",
								width: "100%",
							}}
						>
							<MDEditor value={text} onChange={this.changeText} />
							<MDEditor.Markdown value={text} />
						</div>
						<button className="answer-btn" onClick={postNewQuestion}>
							Postar
						</button>
					</div>
				</div>
			) : (
				<div
					onClick={handleCloseNewPost}
					style={{
						width: "100%",
						height: "100%",
					}}
				/>
			)}
		</div>
	);
}
AnswerForm.propTypes = {
	answers: PropTypes.array,
	location: PropTypes.shape({
		state: {},
	}).isRequired,
	text: PropTypes.string.isRequired,
	selected: PropTypes.number.isRequired,
	closeAnswers: PropTypes.func.isRequired,
	comment_text: PropTypes.string.isRequired,
	postNewQuestion: PropTypes.func.isRequired,
	setAnswersToDiscussions: PropTypes.func.isRequired,
};
