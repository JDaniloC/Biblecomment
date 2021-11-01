import React, { createContext, useContext, useEffect, useState } from "react";
import { NotificationContext } from "./NotificationContext";
import { isAuthenticated, TOKEN_KEY } from "services/auth";

import PropTypes from "prop-types";
import axios from "services/api";

const PAGE_LENGTH = 5;
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
			if (typeof currentCommented[book] === "object") {
				currentChaptersCount += currentCommented[book].length;
			}
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

		return Math.ceil((commentaries.length + 1) / 5);
	}

	async function getComments(page) {
		try {
			const pages = Math.ceil((page * PAGE_LENGTH) / 50);
			const { data } = await axios.get("users/comments", {
				headers: { name },
				params: { pages },
			});

			const { comments } = data;
			if (typeof comments !== "undefined") {
				const newResult = [...commentaries, ...comments];
				setCommentaries(newResult);
				return comments;
			}
		} catch (error) {
			handleNotification("error", error.toString());
		}
		return [];
	}

	async function getFavorites(page) {
		try {
			const pages = Math.ceil((page * PAGE_LENGTH) / 50);
			const { data } = await axios.get("users/favorites", {
				headers: { name },
				params: { pages },
			});
			if (typeof data.favorites !== "undefined") {
				const newFavorites = data.favorites;
				const newResult = [...favorites, ...newFavorites];
				setFavorites(newResult);
				return newFavorites;
			}
		} catch (error) {
			handleNotification("error", error.toString());
		}
		return [];
	}

	useEffect(() => {
		async function getUserInfos(token) {
			await axios.get("session", { headers: { token } }).then((response) => {
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

	async function updateAccount() {
		try {
			await axios
				.patch("users", {
					token: localStorage.getItem(TOKEN_KEY),
					state: stateName,
					belief,
				})
				.then(({ data }) => {
					if (typeof data.error === "undefined") {
						handleNotification("success", "Conta atualizada com sucesso.");
					} else {
						handleNotification("warning", data.error);
					}
				});
		} catch (error) {
			handleNotification("error", error.toString());
		}
	}

	async function deleteAccount() {
		try {
			await axios
				.delete("users", {
					data: { token: localStorage.getItem(TOKEN_KEY), email },
				})
				.then(({ data }) => {
					if (typeof data.error === "undefined") {
						handleNotification("success", "Conta removida com sucesso.");
					} else {
						handleNotification("warning", data.error);
					}
				});
		} catch (error) {
			handleNotification("error", error.toString());
		}
	}

	return (
		<ProfileContext.Provider
			value={{
				email,
				name,
				stateName,
				belief,
				chaptersCount,
				commentsCount,
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
				getFavorites,
				setStateName,
				addNewComment,
				updateAccount,
				deleteAccount,
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
