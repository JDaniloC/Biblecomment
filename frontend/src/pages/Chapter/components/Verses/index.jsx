import "./styles.scss";
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

import { CommentCount } from "shared/components";
import { Loading } from "components/Partials";
import Comment from "models/Comment";
import Verse from "models/Verse";

export default function Verses({
	verseList,
	commentList,
	currentVerse,
	onHandleComments,
}) {
	const [commentsCount, setCommentsCount] = useState([]);

	useEffect(() => {
		const comments = verseList.map((verse) => {
			const amount = commentList.filter(
				(comment) => comment.verse_id === verse.id,
			).length;
			return amount;
		});
		setCommentsCount(comments);
	}, [commentList, verseList]);

	return (
		<ul className="verse-list">
			{verseList.length > 0 ? (
				verseList.map((verse, index) => (
					<li key={verse.id} id={verse.verse_number}>
						<sup> {verse.verse_number} </sup>
						<p
							role="button"
							className="verse-text"
							data-index={verse.id}
							onClick={onHandleComments}
							onKeyUp={onHandleComments}
							data-active={currentVerse === verse.id}
						>
							{verse.text}
						</p>
						<CommentCount commentsCount={commentsCount} currentIndex={index} />
					</li>
				))
			) : (
				<Loading />
			)}
		</ul>
	);
}
Verses.propTypes = {
	commentList: PropTypes.arrayOf(Comment).isRequired,
	verseList: PropTypes.arrayOf(Verse).isRequired,
	onHandleComments: PropTypes.func.isRequired,
	currentVerse: PropTypes.number.isRequired,
};
