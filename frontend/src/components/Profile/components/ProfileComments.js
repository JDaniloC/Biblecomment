import React, { useState, useEffect, useContext, useCallback } from "react";
import { ProfileContext } from "contexts/ProfileContext";
import Pagination from "@mui/material/Pagination";
import { Loading } from "components/Partials";

import CommentRow from "./CommentRow";
import PropTypes from "prop-types";
import { isAuthenticated } from "services/auth";

const PAGE_LENGTH = 5;

export default function ProfileComments({
	getComments,
	editComment,
	deleteComment,
}) {
	const [maxPages, setMaxPages] = useState(1);
	const [currentPage, setCurrentPage] = useState(1);
	const [commentsLoaded, setCommentsLoaded] = useState([]);

	const { commentaries } = useContext(ProfileContext);

	const handleLoadMore = useCallback(async () => {
		setMaxPages(-1);
		const page = currentPage > 0 ? currentPage : 1;
		const newComments = await getComments(page);
		const allComments = [...commentaries, ...newComments];

		if (currentPage > 1 && newComments.length > 0) {
			setCurrentPage(currentPage - 1);
		}
		return allComments;
	}, [currentPage, commentaries, getComments]);

	useEffect(() => {
		const inicio = (currentPage - 1) * PAGE_LENGTH;
		const final = inicio + PAGE_LENGTH;
		const comments = commentaries.slice(inicio, final);
		if (isAuthenticated() && comments.length === 0) {
			handleLoadMore();
		} else {
			setCommentsLoaded(comments);
		}
	}, [currentPage, commentaries, handleLoadMore]);

	useEffect(() => {
		let totalPages = Math.ceil(commentaries.length / PAGE_LENGTH);
		if (commentaries.length % 50 === 0) totalPages += 1;
		setMaxPages(totalPages);
	}, [commentaries]);

	const handleChangePage = useCallback(
		(_, page) => {
			setCurrentPage(page);
		},
		[setCurrentPage],
	);

	return (
		<ul className="commentaries">
			<h3> Comentários feitos </h3>
			{commentaries.length !== 0 ? (
				commentsLoaded.map((comment) => (
					<CommentRow
						key={comment.id}
						comment={comment}
						editCommentFunction={editComment}
						deleteCommentFunction={deleteComment}
					/>
				))
			) : maxPages !== -1 ? (
				<li>
					<p> Nenhum comentário realizado </p>
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
	editComment: PropTypes.func,
	deleteComment: PropTypes.func,
	getComments: PropTypes.func.isRequired,
};
ProfileComments.defaultProps = {
	editComment: (id) => id,
	deleteComment: (id) => id,
};
