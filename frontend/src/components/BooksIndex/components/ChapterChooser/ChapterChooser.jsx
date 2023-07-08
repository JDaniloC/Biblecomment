import React, { useState, useEffect, useContext, useCallback } from "react";
import { ProfileContext } from "contexts/ProfileContext";
import { Link } from "react-router-dom";

import { ReactComponent as CloseIcon } from "assets/x.svg";
import styles from "./ChapterChooser.module.scss";
import PropTypes from "prop-types";

function ChapterChooser({
	onCloseButtonClick,
	onSelectChapter,
	chaptersAmount,
	abbrev,
}) {
	const [chapterCount, setChapterCount] = useState([]);
	const { commented } = useContext(ProfileContext);

	useEffect(() => {
		const number_list = [];
		for (let i = 1; i <= chaptersAmount; i++) {
			number_list.push(i);
		}
		setChapterCount(number_list);
	}, [chaptersAmount]);

	const isCommented = useCallback(
		(chapter) => {
			if (abbrev in commented) {
				return commented[abbrev].indexOf(chapter) !== -1;
			}
			return false;
		},
		[abbrev, commented]
	);

	const onChapterClick = useCallback(
		(event) => {
			event.preventDefault();
			const { target } = event;
			const chapterNumber = target.getAttribute("data-number");
			onSelectChapter(abbrev, Number(chapterNumber));
		},
		[onSelectChapter, abbrev]
	);

	return (
		<div className={styles.chaptersChooserContainer}>
			<div className="top">
				<h2> Escolha o capítulo </h2>
				<button type="button" onClick={onCloseButtonClick}>
					<CloseIcon />
				</button>
			</div>

			<ul>
				{chapterCount.map((chapter) => (
					<Link
						key={chapter}
						data-number={chapter}
						onMouseDown={onChapterClick}
						to={`/verses/${abbrev}/${chapter}`}
						data-visited={isCommented(chapter)}
					>
						{chapter}
					</Link>
				))}
			</ul>
		</div>
	);
}
ChapterChooser.propTypes = {
	onCloseButtonClick: PropTypes.func.isRequired,
	chaptersAmount: PropTypes.number.isRequired,
	onSelectChapter: PropTypes.func.isRequired,
	abbrev: PropTypes.string.isRequired,
};
export default React.memo(ChapterChooser);
