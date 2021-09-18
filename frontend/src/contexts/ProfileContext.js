import { createContext, useContext, useEffect, useState } from "react";
import { TOKEN_KEY, isAuthenticated } from "../services/auth";
import { NotificationContext } from "./NotificationContext";

import PropTypes from "prop-types";
import React from "react";
import axios from "../services/api";

export const ProfileContext = createContext({});

export function ProfileProvider({ children }) {
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [belief, setBelief] = useState("");
	const [stateName, setStateName] = useState("");

	const [perfilClass, setPerfilClass] = useState("invisible");
	const [formClass, setFormClass] = useState("");

	const [booksCount, setBooksCount] = useState(0);
	const [chaptersCount, setChaptersCount] = useState(0);
	const [commentsCount, setCommentsCount] = useState(0);

	const [commentaries, setCommentaries] = useState([]);
	const [favorites, setFavorites] = useState([]);
	const [commented, setCommented] = useState({});

	const [totalFPages, setTotalFPages] = useState(1);
	const [totalCPages, setTotalCPages] = useState(1);
	const [currentFPage, setCurrentFPage] = useState(1);
	const [currentCPage, setCurrentCPage] = useState(1);

	const { handleNotification } = useContext(NotificationContext);

	function loadUserInfos({ data }) {
		const { email: currentEmail, name: currentName } = data;
		const currentCommentsCount = data.total_comments;
		const currentCommented = JSON.parse(data.chapters_commented);
		const currentBooksCount = Object.keys(currentCommented).length;
		const currentBelief = data.belief !== null ? data.belief : "";
		const currentStateName = data.state !== null ? data.state : "";

		let currentChaptersCount = 0;
		for (const book in currentCommented) {
			currentChaptersCount += currentCommented[book].length;
		}

		setName(currentName);
		setEmail(currentEmail);
		setCommented(currentCommented);
		setChaptersCount(currentChaptersCount);
		setCommentsCount(currentCommentsCount);
		setBooksCount(currentBooksCount);
		setStateName(currentStateName);
		setBelief(currentBelief);

		setPerfilClass(""); // Shows the profile component
		setFormClass("invisible"); // Shows the profile component
	}

	function addNewComment(comment) {
		setCommentaries([...commentaries, comment]);
		setCommentsCount(commentsCount + 1);

		const length = Math.ceil((commentaries.length + 1) / 5);
		setTotalCPages(length);
	}

	async function getComments() {
		let page = currentCPage;
		setTotalCPages(-1);

		try {
			await axios
				.get("users/comments", {
					headers: { name },
					params: { pages: Math.ceil((page * 5) / 50) },
				})
				.then(({ data }) => {
					const { comments } = data;
					if (typeof comments !== "undefined") {
						const newResult = [...commentaries, ...comments];
						setCommentaries(newResult);

						let length = Math.ceil(newResult.length / 5);
						if (comments.length === 50) {
							length += 1;
						} else if (page !== 1) {
							page -= 1;
						}

						setCurrentCPage(page);
						setTotalCPages(length);
					}
				});
		} catch (error) {
			handleNotification("error", "Problema no servidor");
		}
	}

	async function getFavorites() {
		let page = currentFPage;
		setTotalFPages(-1);

		try {
			await axios
				.get("users/favorites", {
					headers: { name },
					params: { pages: Math.ceil((page * 5) / 50) },
				})
				.then((response) => {
					if (typeof response.data.favorites !== "undefined") {
						const newFavorites = response.data.favorites;
						const newResult = [...favorites, ...newFavorites];
						setFavorites(newResult);

						let length = Math.ceil(newResult.length / 5);
						if (newFavorites.length === 50) {
							length += 1;
						} else if (page !== 1) {
							page -= 1;
						}

						setCurrentFPage(page);
						setTotalFPages(length);
					}
				});
		} catch (error) {
			handleNotification("error", "Problema no servidor");
		}
	}

	useEffect(() => {
		async function getUserInfos(token) {
			await axios
				.get("session", { headers: { token } })
				.then((response) => {
					const hasError = response.data.error;
					if (!hasError) {
						loadUserInfos(response);
					}
				});
		}

		if (isAuthenticated()) {
			const token = localStorage.getItem(TOKEN_KEY);
			getUserInfos(token);
		}
	}, []);

	useEffect(() => {
		async function getUserHistory() {
			await getFavorites();
			await getComments();
		}
		getUserHistory();
		// eslint-disable-next-line
	}, [name]);

	return (
		<ProfileContext.Provider
			value={{
				email,
				name,
				stateName,
				belief,
				chaptersCount,
				commentsCount,
				currentFPage,
				currentCPage,
				totalCPages,
				totalFPages,
				commentaries,
				favorites,
				perfilClass,
				formClass,
				commented,
				booksCount,
				setName,
				setBelief,
				getComments,
				loadUserInfos,
				setCommentaries,
				setPerfilClass,
				setFavorites,
				setFormClass,
				setCurrentCPage,
				setCurrentFPage,
				getFavorites,
				setStateName,
				addNewComment,
				handleNotification,
			}}
		>
			{children}
		</ProfileContext.Provider>
	);
}
ProfileProvider.propTypes = {
	children: PropTypes.node.isRequired,
};
