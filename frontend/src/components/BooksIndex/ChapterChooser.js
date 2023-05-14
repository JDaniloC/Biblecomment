import React, {
	memo,
	useState,
	useEffect,
	useContext,
	useCallback,
} from "react";
import { ProfileContext } from "contexts/ProfileContext";
import { Link } from "react-router-dom";

import { ReactComponent as CloseIcon } from "assets/x.svg";
import PropTypes from "prop-types";
import styles from "./ChapterChooser.module.css";

function ChapterChooser({
	handleChangePage,
	closeChapters,
	chapterLength,
	abbrev,
}) {
	const [chapterCount, setChapterCount] = useState([]);
	const { commented } = useContext(ProfileContext);

	useEffect(() => {
		const number_list = [];
		for (let i = 1; i <= 150; i++) {
			number_list.push(i);
		}
		setChapterCount(number_list);
	}, []);

	function chapterCommented(book, chapter) {
		if (book in commented) {
			return commented[book].indexOf(chapter) !== -1;
		}
		return false;
	}

	const handleClickLink = useCallback((event) => {
		event.preventDefault();
		const { target } = event;
		const chapterNumber = target.getAttribute("data-number");
		handleChangePage(abbrev, Number(chapterNumber));
	});

	return (
		<div className={styles.chaptersContainer}>
			<div className="top">
				<h2> Escolha o capítulo </h2>
				<button onClick={closeChapters} type="button">
					<CloseIcon />
				</button>
			</div>

			<ul className={styles.chaptersNumber}>
				{chapterCount.slice(0, chapterLength).map((chapterNumber) => (
					<Link
						key={chapterNumber}
						data-number={chapterNumber}
						onMouseDown={handleClickLink}
						data-visited={chapterCommented(abbrev, chapterNumber)}
						to={`/verses/${abbrev}/${chapterNumber}`}
					>
						{chapterNumber}
					</Link>
				))}
			</ul>
		</div>
	);
}
ChapterChooser.propTypes = {
	handleChangePage: PropTypes.func.isRequired,
	chapterLength: PropTypes.number.isRequired,
	closeChapters: PropTypes.func.isRequired,
	abbrev: PropTypes.string.isRequired,
};
export default memo(ChapterChooser);
