import axios from "../services/api";
import React, { createContext, useEffect, useRef, useState } from "react";
import { isAuthenticated, TOKEN_KEY } from "../services/auth";

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

  const getFavoritesRef = useRef(getFavorites);
  const getCommentsRef = useRef(getComments);

  useEffect(() => {
    async function getUserInfos(token) {
      return await axios.get("session", {
        headers: { token: token },
      });
    }

    if (isAuthenticated()) {
      const token = localStorage.getItem(TOKEN_KEY);
      getUserInfos(token).then((response) => {
        const hasError = response.data.error;
        if (!hasError) {
          loadUserInfos(response);
        }
      });
    }
  }, []);

  useEffect(() => {
    async function getUserHistory() {
      await getFavoritesRef.current.bind(this)(name);
      await getCommentsRef.current.bind(this)(name);
    }
    if (name !== "") {
      getUserHistory();
    }
  }, [name]);

  function loadUserInfos(response) {
    const data = response.data;

    const { email, name } = data;
    const commentsCount = data.total_comments;
    const commented = JSON.parse(data.chapters_commented);
    const booksCount = Object.keys(commented).length;
    const belief = data.belief !== null ? data.belief : "";
    const stateName = data.state !== null ? data.state : "";

    let chaptersCount = 0;
    for (const book in commented) {
      chaptersCount += commented[book].length;
    }

    setEmail(email);
    setName(name);
    setCommented(commented);
    setChaptersCount(chaptersCount);
    setCommentsCount(commentsCount);
    setBooksCount(booksCount);
    setBelief(belief);
    setStateName(stateName);

    setPerfilClass(""); // Shows the profile component
    setFormClass("invisible"); // Shows the profile component
  }

  function addNewComment(comment) {
    setCommentaries([...commentaries, comment]);
    setCommentsCount(commentsCount + 1);

    const length = Math.ceil((commentaries.length + 1) / 5);
    setTotalCPages(length);
  }

  async function getComments(name) {
    let page = currentCPage;
    setTotalCPages(-1);

    try {
      await axios
        .get("users/comments", {
          headers: { name: name },
          params: { pages: Math.ceil((page * 5) / 50) },
        })
        .then((response) => {
          if (response.data.comments !== undefined) {
            const comments = response.data.comments;
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
      // this.handleNotification("Problema no servidor", "error")
    }
  }

  async function getFavorites(name) {
    let page = currentFPage;
    setTotalFPages(-1);

    try {
      await axios
        .get("users/favorites", {
          headers: { name: name },
          params: { pages: Math.ceil((page * 5) / 50) },
        })
        .then((response) => {
          if (response.data.favorites !== undefined) {
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
      // this.handleNotification("Problema no servidor", "error")
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
        loadUserInfos,
        getComments,
        setCommentaries,
        setBelief,
        setPerfilClass,
        setFavorites,
        setFormClass,
        setCurrentCPage,
        setCurrentFPage,
        getFavorites,
        setStateName,
        addNewComment,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
