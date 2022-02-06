import React, { useState, useEffect, useContext, useCallback } from "react";
import { ProfileContext } from "contexts/ProfileContext";
import { Loading } from "components/Partials";
import { Pagination } from "@material-ui/lab";
import debounce from "lodash.debounce";

import CommentRow from "./CommentRow";
import PropTypes from "prop-types";

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

	function renderComments(page, forceComments = null) {
		const comments = forceComments || commentaries;
		const inicio = (page - 1) * PAGE_LENGTH;
		const final = inicio + PAGE_LENGTH;
		const commentsToShow = comments.slice(inicio, final);
		if (commentsToShow.length === 0 && currentPage > 0) {
			// eslint-disable-next-line
			emitRenderDebounced();
		}
		setCommentsLoaded(commentsToShow);
	}

	const handleLoadMore = useCallback(async () => {
		setMaxPages(-1);
		const page = currentPage > 0 ? currentPage : 1;
		const newComments = await getComments(page);
		const allComments = [...commentaries, ...newComments];

		if (currentPage > 1 && newComments.length > 0) {
			setCurrentPage(currentPage - 1);
		} else {
			renderComments(1, allComments);
		}
		return allComments;
	});

	const emitRenderDebounced = debounce(handleLoadMore, 100);

	useEffect(() => {
		let totalPages = Math.ceil(commentaries.length / PAGE_LENGTH);
		if (commentaries.length % 50 === 0) totalPages += 1;
		setMaxPages(totalPages);
	}, [commentaries]);

	useEffect(() => {
		renderComments(currentPage);
	}, [currentPage]);

	const handleChangePage = useCallback((_, page) => {
		setCurrentPage(page);
	});

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
