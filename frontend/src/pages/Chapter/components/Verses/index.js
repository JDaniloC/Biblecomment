import "./styles.css";
import React from "react";
import PropTypes from "prop-types";

import { Loading } from "components/Partials";
import Verse from "models/Verse";
import Comment from "models/Comment";

export default function Verses({
	verseList,
	commentList,
	currentVerse,
	onHandleComments,
}) {
	function renderAmount(verseID) {
		const amount = commentList.filter(
			(comment) => comment.verse_id === verseID,
		).length;

		if (amount === 0) {
			return <React.Fragment></React.Fragment>;
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

	return (
		<ul className="verse-list">
			{verseList.length > 0 ? (
				verseList.map((verse) => (
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
						{renderAmount(verse.id)}
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
