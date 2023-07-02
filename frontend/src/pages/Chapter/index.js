import "./styles.css";

import React, { useEffect, useState } from "react";
import axios from "services/api";
import PropTypes from "prop-types";

import { NotificationContext } from "contexts/NotificationContext";
import { isAuthenticated, TOKEN_KEY } from "services/auth";
import { chapterAPI } from "./api";

import TitleComment from "components/TitleComments";
import NewComment from "components/NewComment";
import Comments from "components/Comments";
import Header from "components/Header";

import bookIcon from "assets/book.svg";
import chatIcon from "assets/chat.svg";
import handIcon from "assets/hand.svg";
import heartIcon from "assets/heart.svg";
import penIcon from "assets/pen.svg";
import personIcon from "assets/person.svg";
import warningIcon from "assets/warning.svg";

import Verses from "./components/Verses";
import { useCallback } from "react";

function getIconImage(tag) {
	switch (tag) {
		case "heart":
			return heartIcon;
		case "warning":
			return warningIcon;
		case "chat":
			return chatIcon;
		case "devocional":
			return handIcon;
		case "inspirado":
			return penIcon;
		case "pessoal":
			return personIcon;
		default:
			return bookIcon;
	}
}

export default function Chapter(props) {
	const { handleNotification } = React.useContext(NotificationContext);

	const [newBoxClass, setNewBoxClass] = useState("invisible");
	const [asideClass, setAsideClass] = useState("invisible");
	const [mainClass, setMainClass] = useState("main text");
	const [navClass, setNavClass] = useState("visible");
	const [blur, setBlur] = useState("none");

	const [titleName, setTitleName] = useState("Chapter");
	const [chapterNumber, setChapterNumber] = useState("0");

	const [comments, setComments] = useState([]);
	const [verseList, setVerseList] = useState([]);
	const [allComments, setAllComments] = useState([]);
	const [currentVerse, setCurrentVerse] = useState(-1);
	const [titleComments, setTitleComments] = useState([]);
	const [newTitleComment, setNewTitleComment] = useState(false);

	const loadChapter = useCallback((abbrev, chapter) => {
		chapterAPI.getBook(abbrev).then((response) => {
			if (response.error) {
				return handleNotification("error", response.error);
			}
			setTitleName(response.data.title);
		});
		chapterAPI.getChapterVerses(abbrev, chapter).then((response) => {
			if (response.error) {
				return handleNotification("error", response.error);
			}
			setVerseList(response.data);
		});
		chapterAPI.getChapterComments(abbrev, chapter).then((response) => {
			if (response.error) {
				return handleNotification("error", response.error);
			}
			setAllComments(response.data.verseComments);
			setTitleComments(response.data.titleComments);
		});

		const newChapterNumber = chapter.length === 1 ?
								 `0${chapter}` : chapter;
		setChapterNumber(newChapterNumber);
		return true;
	}, [handleNotification]);

	useEffect(() => {
		const { abbrev, number } = props.match.params;
		loadChapter(abbrev, number);
	}, [loadChapter, props.match.params]);

	function closeComments() {
		setComments([]);
		setCurrentVerse(-1);
		setAsideClass("invisible");
		setMainClass("main text");
		setNavClass("visible");
	}

	function handleComments(event) {
		const target = event.target;
		const verseID = parseInt(target.getAttribute("data-index"), 10);

		if (currentVerse === verseID) {
			closeComments(event);
		} else {
			setCurrentVerse(verseID);
			setAsideClass("visible");
			setMainClass("main comment");
			setNavClass(navClass.includes("navHide") ?
						navClass : `${navClass} navHide`);
			setComments(allComments.filter((comment) =>
						comment.verse_id === verseID));
		}
	}

	function onHandleNewComment(evt, isTitle = false) {
		evt.preventDefault();

		setNewBoxClass("visible centro");
		setNewTitleComment(isTitle);
		setNavClass("invisible");
		setBlur("block");
	}

	function closeNewCommentary(evt) {
		evt.preventDefault();

		setBlur("none");
		setNavClass("visible");
		setNewBoxClass("invisible");
	}

	function addNewComment(comment) {
		if (comment.on_title) {
			setTitleComments((prevState) => [...prevState, comment]);
		} else {
			setComments((prevState) => [...prevState, comment]);
			setAllComments((prevState) => [...prevState, comment]);
		}
	}

	function renderAmount(index) {
		const allCommentsLength = allComments.filter(
			(comment) => comment.verse === index + 1
		).length;

		let amount = titleComments.length;
		if (index !== false) {
			amount = allCommentsLength;
		}

		if (amount === 0) {
			return <></>;
		}

		const color =
			amount === 1
				? "lightgray"
				: amount < 3
				? "lightblue"
				: amount < 5
				? "lightgreen"
				: amount < 10
				? "gold"
				: "lightcoral";
		return (
			<div className="amount" style={{ backgroundColor: color }}>
				{amount}
			</div>
		);
	}

	function onHandleLike(identificador) {
		function searchLike(comments) {
			let commentFound = false;
			comments.forEach((part, index, array) => {
				if (array[index].id === identificador) {
					const likes = JSON.parse(array[index].likes);
					if (!("+1" in likes)) {
						likes.push("+1");
						array[index].likes = JSON.stringify(likes);
						commentFound = true;
					}
				}
			});
			return commentFound;
		}
		if (isAuthenticated()) {
			try {
				axios
					.patch(`comments/${identificador}`, {
						token: localStorage.getItem(TOKEN_KEY),
						likes: true,
					})
					.then(() => {
						handleNotification("success", "Adicionado aos favoritos");
						const found = searchLike(comments);
						if (!found) {
							searchLike(titleComments);
						}
					});
			} catch (error) {
				handleNotification("error", error.toString());
			}
		} else {
			handleNotification("warning", "Você precisa está logado");
		}
	}

	function onHandleReport(identificador) {
		if (isAuthenticated()) {
			const token = localStorage.getItem(TOKEN_KEY);
			const message = window.prompt("Qual o problema com o comentário?");
			try {
				axios
					.patch(`comments/${identificador}`, {
						token,
						reports: message,
					})
					.then(() => {
						handleNotification("success", "Comentário reportado!");
					});
			} catch (error) {
				handleNotification("error", error.toString());
			}
		} else {
			handleNotification("warning", "Você precisa está logado");
		}
	}

	function onHandleDiscussion(comment_id, comment_text, comment_reference) {
		const { abbrev } = props.match.params;
		props.history.push({
			pathname: `/discussion/${abbrev}`,
			state: {
				title: titleName,
				comment_id: parseInt(comment_id, 10),
				comment_text,
				comment_reference,
			},
		});
	}

	return (
		<>
			<Header changeChapter={loadChapter} />
			<div className="container">
				<div className="chapter-container">
					<div className={mainClass}>
						<label htmlFor="toggle" style={{ display: "flex" }}>
							{titleName} {chapterNumber}{" "}
							{renderAmount(false)}
						</label>
						<input type="checkbox" id="toggle" />
						<TitleComment
							comments={titleComments}
							likeFunction={onHandleLike}
							imageFunction={getIconImage}
							reportFunction={onHandleReport}
							handleNewComment={onHandleNewComment}
							discussionFunction={onHandleDiscussion}
						/>
						<Verses
							verseList={verseList}
							commentList={allComments}
							currentVerse={currentVerse}
							handleComments={handleComments}
						/>
					</div>
				</div>
				<aside className={asideClass}>
					<Comments
						comments={comments}
						likeFunction={onHandleLike}
						imageFunction={getIconImage}
						closeFunction={closeComments}
						reportFunction={onHandleReport}
						handleNewComment={onHandleNewComment}
						discussionFunction={onHandleDiscussion}
					/>
				</aside>

				<div className={newBoxClass}>
					<NewComment
						post
						verseID={currentVerse}
						title="Criar comentário"
						close={closeNewCommentary}
						addNewComment={addNewComment}
						isTitleComment={newTitleComment}
					/>
				</div>

				<div className="overlay" style={{ display: blur }} />
			</div>
		</>
	);
}
Chapter.propTypes = {
	match: PropTypes.shape({
		params: PropTypes.shape({
			abbrev: PropTypes.string.isRequired,
			number: PropTypes.string.isRequired,
		}),
	}).isRequired,
	history: PropTypes.shape({
		push: PropTypes.func.isRequired,
	}).isRequired,
};