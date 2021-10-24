import React, { useState, useEffect, useContext } from "react";
import { ProfileContext } from "contexts/ProfileContext";
import { Loading } from "components/Partials";
import { Pagination } from "@material-ui/lab";

import FavoriteRow from "./FavoriteRow";
import CommentRow from "./CommentRow";

import PropTypes from "prop-types";
import Favorite from "models/Favorite";
import Comment from "models/Comment";

const PAGE_LENGTH = 5;

export default function ProfileComments({ type, getComments }) {
	const [title, setTitle] = useState("");
	const [maxPages, setMaxPages] = useState(1);
	const [emptyMsg, setEmptyMsg] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [commentsLoaded, setCommentsLoaded] = useState([]);

	const [comments, setComments] = useState([]);

	const { name, commentaries, favorites } = useContext(ProfileContext);

	async function handleLoadMore() {
		const prevMaxPages = maxPages;
		setMaxPages(-1);
		const newComments = await getComments(currentPage);
		const allComments = [...comments, ...newComments];
		setComments((prevState) => [...prevState, ...newComments]);

		if (currentPage > 1 && newComments.length > 0) {
			setCurrentPage(currentPage - 1);
		}
		if (newComments.length === 50) {
			setMaxPages(prevMaxPages + 1);
		} else {
			setMaxPages(prevMaxPages);
		}
		return allComments;
	}

	function renderComments(page, optComments = []) {
		if (optComments.length === 0) {
			optComments = comments;
		}
		const inicio = (page - 1) * PAGE_LENGTH;
		const final = inicio + PAGE_LENGTH;
		setCommentsLoaded(optComments.slice(inicio, final));
	}

	async function initializeComments() {
		let renderArray = [];
		if (comments.length === 0) {
			renderArray = type === "comments" ? commentaries : favorites;

			if (renderArray.length > 0) {
				setComments(renderArray);
			} else {
				renderArray = await handleLoadMore();
			}
		} else {
			renderArray = comments;
		}
		renderComments(1, renderArray);
	}

	useState(async () => {
		if (type === "comments") {
			setTitle("Comentários feitos");
			setEmptyMsg("Nenhum comentário realizado");
		} else {
			setTitle("Comentários favoritados");
			setEmptyMsg("Você não favoritou nenhum comentário");
		}
		initializeComments();
	}, []);

	useEffect(() => {
		let totalPages = Math.ceil(comments.length / PAGE_LENGTH);
		if (comments.length % 50 === 0) {
			totalPages += 1;
		}
		setMaxPages(totalPages);
	}, [comments]);

	useEffect(initializeComments, [name]);

	useEffect(() => {
		renderComments(currentPage);
	}, [currentPage]);

	function handleChangePage(_, page) {
		setCurrentPage(page);
	}

	return (
		<ul className="commentaries">
			<h3> {title} </h3>
			{comments.length !== 0 ? (
				commentsLoaded.length > 0 ? (
					commentsLoaded.map((comment, index) => {
						return type === "comments" ? (
							<CommentRow key={comment.id} comment={comment} />
						) : (
							<FavoriteRow index={index} comment={comment} key={comment.text} />
						)
					})
				) : (
					<button type="button" className="load-btn" onClick={handleLoadMore}>
						Carregar
					</button>
				)
			) : maxPages !== -1 ? (
				<li>
					<p> {emptyMsg} </p>
				</li>
			) : (
				<Loading />
			)}
			<Pagination
				boundaryCount={2}
				showFirstButton
				showLastButton
				size="small"
				shape="rounded"
				count={maxPages}
				page={currentPage}
				onChange={handleChangePage}
			/>
		</ul>
	);
}
ProfileComments.propTypes = {
	type: PropTypes.string.isRequired,
	getComments: PropTypes.func.isRequired,
	comments: PropTypes.oneOfType([
		PropTypes.arrayOf(Comment),
		PropTypes.arrayOf(Favorite),
	]),
};
