import { isAuthenticated, TOKEN_KEY } from "../../services/auth";
import { ProfileContext } from "../../contexts/ProfileContext";

import React, { useCallback, useContext, useState, useEffect } from "react";

import axios from "../../services/api";
import bookImg from "assets/book.svg";
import handImg from "assets/hand.svg";
import penImg from "assets/pen.svg";
import personImg from "assets/person.svg";
import { ReactComponent as CloseIcon } from "assets/x.svg";

import PropTypes from "prop-types";

import "balloon-css";
import "./styles.css";

export default function NewComment(props) {
	const { addNewComment, handleNotification } = useContext(ProfileContext);
	const [buttonDisabled, setButtonDisabled] = useState(true);
	const [commentText, setCommentText] = useState("");
	const [type, setType] = useState("");

	const [tags, setTags] = useState({
		devocional: false,
		inspirado: false,
		exegese: false,
		pessoal: false,
	});

	useEffect(() => {
		if (props.text !== "") {
			setCommentText(props.text);
		}
		setType(props.post ? "" : "y");
	}, [props.post, props.text]);

	const postNewComment = useCallback(
		(evt) => {
			evt.preventDefault();

			if (!isAuthenticated()) {
				return handleNotification("info", "Você precisa estar logado!");
			} else if (commentText.length < 200 || commentText.length > 1000) {
				return handleNotification(
					"info",
					"Reescreva o comentário entre 200-1000 caracteres!",
				);
			}
			const tagList = [];
			if (tags.devocional) tagList.push("devocional");
			if (tags.inspirado) tagList.push("inspirado");
			if (tags.exegese) tagList.push("exegese");
			if (tags.pessoal) tagList.push("pessoal");

			try {
				const token = localStorage.getItem(TOKEN_KEY);
				if (props.post) {
					const verseID = props.verseID;
					const isTitle = props.isTitleComment;
					axios
						.post(`/comments/${verseID}`, {
							on_title: isTitle,
							text: commentText,
							tags: tagList,
							token,
						})
						.then((response) => {
							handleNotification("success", "Comentário enviado!");
							props.addNewComment(response.data);
							addNewComment(response.data);
						})
						.catch(({ response }) => {
							handleNotification("error", response.data.error);
						});
				} else {
					axios
						.patch(`/comments/${props.commentID}`, {
							text: commentText,
							tags: tagList,
							token,
						})
						.then((response) => {
							handleNotification("success", "Comentário editado!");
							props.addNewComment(response.data);
						})
						.catch(({ response }) => {
							handleNotification("error", response.data.error);
						});
				}
			} catch (error) {
				handleNotification("error", error.toString());
			}
			setCommentText("");
			props.close(evt);
		},
		[addNewComment, commentText, tags, handleNotification, props],
	);

	const handleChange = useCallback(
		(event) => {
			let value = "";
			if (typeof event.target.checked !== "undefined") {
				value = event.target.checked;
				setTags({ ...tags, [event.target.name]: value });
			} else {
				value = event.target.value;
				if (value.slice(-2) === "  ") {
					value = value.slice(0, -1);
				}
				if (value.length < 200 || value.length > 1000) {
					if (!buttonDisabled) setButtonDisabled(true);
				} else if (buttonDisabled) {
					setButtonDisabled(false);
				}
				setCommentText(value);
			}
		},
		[buttonDisabled, tags, setTags, setButtonDisabled, setCommentText],
	);

	return (
		<div className="pop-up">
			<div className="top">
				<h2 style={{ alignSelf: "center" }}>{props.title}</h2>
				<button onClick={props.close}>
					<CloseIcon />
				</button>
			</div>

			<div className="text-area">
				<div className="textarea-top">
					<label
						style={{ marginLeft: "20px" }}
						aria-label="Devocional"
						data-balloon-pos="down-right"
						htmlFor={`devocional${type}`}
					>
						<input
							type="checkbox"
							name={`devocional${type}`}
							onChange={handleChange}
							id={`devocional${type}`}
						/>
						<img className="tag" src={handImg} alt="hand icon" />
					</label>
					<label
						aria-label="Exegese"
						data-balloon-pos="down-right"
						htmlFor={`exegese${type}`}
					>
						<input
							type="checkbox"
							name={`exegese${type}`}
							onChange={handleChange}
							id={`exegese${type}`}
						/>
						<img className="tag" src={bookImg} alt="book icon" />
					</label>
					<label
						aria-label="Inspirado"
						data-balloon-pos="down-right"
						htmlFor={`inspirado${type}`}
					>
						<input
							type="checkbox"
							name={`inspirado${type}`}
							onChange={handleChange}
							id={`inspirado${type}`}
						/>
						<img className="tag" src={penImg} alt="pencil icon" />
					</label>
					<label
						aria-label="Pessoal"
						data-balloon-pos="down-right"
						htmlFor={`pessoal${type}`}
					>
						<input
							type="checkbox"
							name={`pessoal${type}`}
							onChange={handleChange}
							id={`pessoal${type}`}
						/>
						<img className="tag" src={personImg} alt="person icon" />
					</label>
					<div className="char-count">
						{commentText.length}/{commentText.length < 200 ? 200 : 1000}
					</div>
				</div>
				<textarea
					name="commentText"
					id="commentText"
					value={commentText}
					onChange={handleChange}
					placeholder="Descreva seu comentário"
				/>
			</div>
			<button
				type="submit"
				className="entry"
				onClick={postNewComment}
				disabled={buttonDisabled}
			>
				Enviar
			</button>
		</div>
	);
}

NewComment.propTypes = {
	text: PropTypes.string,
	verseID: PropTypes.number,
	commentID: PropTypes.number,
	isTitleComment: PropTypes.bool,
	post: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	title: PropTypes.string.isRequired,
	addNewComment: PropTypes.func.isRequired,
};
NewComment.defaultProps = {
	text: "",
	verseID: 0,
	isTitleComment: false,
};
