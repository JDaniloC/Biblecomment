import MDEditor, { commands } from "@uiw/react-md-editor";
import { NotificationContext } from "contexts/NotificationContext";
import { TOKEN_KEY, isAuthenticated } from "services/auth";
import React, { useState, useContext, useCallback } from "react";

import axios from "services/api";
import PropTypes from "prop-types";

import Answer from "models/Answer";
import { ReactComponent as CloseIcon } from "assets/x.svg";

import "./styles.css";

export default function AnswerForm({
	answers,
	selected,
	commentText,
	onCloseAnswers,
	commentReference,
	appendNewDiscussion,
	setAnswersToDiscussions,
}) {
	const [newAnswerClass, setNewAnswerClass] = useState("invisible");
	const [newPostClass, setNewPostClass] = useState("pop-up");
	const [replyText, setReplyText] = useState("");

	const { handleNotification } = useContext(NotificationContext);

	const handleCloseNewPost = useCallback(() => {
		setNewPostClass("invisible");
		setNewAnswerClass("pop-up");
		onCloseAnswers();
	}, [setNewPostClass, setNewAnswerClass, onCloseAnswers]);

	const canPostSomething = useCallback(() => {
		if (!isAuthenticated()) {
			handleNotification("info", "Você precisa estar logado");
		}
		return replyText !== "" && isAuthenticated();
	}, [replyText, handleNotification]);

	const handlePostNewAnswer = useCallback(() => {
		onCloseAnswers();
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
							const answersToDiscussion = JSON.parse(response.data.answers);
							setReplyText("");
							setAnswersToDiscussions(answersToDiscussion);
							handleNotification("success", "Resposta enviada");
						} else {
							handleNotification("warning", "Algo deu errado");
						}
					});
			} catch (error) {
				handleNotification("error", error.toString());
			}
		}
	}, [replyText, selected, setAnswersToDiscussions,
		onCloseAnswers, handleNotification, canPostSomething]);

	const handlePostNewQuestion = useCallback(() => {
		handleCloseNewPost();
		const hasPermissionToPost = canPostSomething();
		if (hasPermissionToPost) {
			try {
				const [username, abbrev, verseReference] =
					commentReference.split(" ");

				axios
					.post(`/discussion/${abbrev}/`, {
						verseReference,
						question: replyText,
						comment_id: selected,
						verse_text: commentText,
						token: localStorage.getItem(TOKEN_KEY),
					})
					.then((response) => {
						if (typeof response.data === "object" && response.data.question) {
							response.data.answers = [];
							setReplyText("");
							appendNewDiscussion(response.data);
							handleNotification(
								"success",
								`Comentário enviado à ${username}!`
							);
						} else {
							handleNotification("warning", response.data.error);
						}
					})
					.catch(({ response }) => {
						handleNotification("error", response.data.error);
					});
			} catch (error) {
				handleNotification("error", error.toString());
			}
		}
	}, [handleCloseNewPost, canPostSomething, handleNotification, replyText,
		commentReference, selected, commentText, appendNewDiscussion]);

	const handleChangeText = useCallback((value) => {
		setReplyText(value);
	}, [setReplyText]);

	return (
		<div className="answersComponent">
			<div className={newAnswerClass}>
				<div className="top">
					<h1> Respostas </h1>
					<button onClick={onCloseAnswers} type="button">
						<CloseIcon />
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

			{commentText !== "" && (
				<div className={newPostClass}>
					<div className="top">
						<h1> Postar novo ponto </h1>
						<button type="button" onClick={handleCloseNewPost}>
							<CloseIcon />
						</button>
					</div>

					<h2> {commentReference} </h2>
					<p className="verse-text">{commentText}</p>

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
			)}
		</div>
	);
}
AnswerForm.propTypes = {
	answers: PropTypes.arrayOf(Answer),
	selected: PropTypes.number.isRequired,
	commentText: PropTypes.string.isRequired,
	onCloseAnswers: PropTypes.func.isRequired,
	commentReference: PropTypes.string.isRequired,
	appendNewDiscussion: PropTypes.func.isRequired,
	setAnswersToDiscussions: PropTypes.func.isRequired,
};
AnswerForm.defaultProps = {
	answers: [],
};
