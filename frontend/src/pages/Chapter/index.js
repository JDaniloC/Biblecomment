import React, { useState, useEffect } from 'react';
import NewComment from "../../components/NewComment";
import TitleComment from "../../components/TitleComments";
import Comments from "../../components/Comments";

import "./styles.css";

const book = require("../../assets/book.svg")
const hand = require("../../assets/hand.svg")
const person = require("../../assets/person.svg")
const pen = require("../../assets/pen.svg")

export default function Chapter() {
    const [verses, setVerses] = useState([]);
    const [allCommentaries, setAllCommentaries] = useState([]);
    const [titleComments, setTitleComments] = useState([]);
    const [commentaries, setCommentaries] = useState([]);

    const [asideclass, setAsideclass] = useState("invisible");
    const [main, setMain] = useState("main text");
    const [newbox, setNewbox] = useState("invisible")
    const [blur, setBlur] = useState("none");

    const [verseatual, setVerseatual] = useState({linha: 0});

    useEffect(() => {
        async function loadVerses() {
            const result = require("./gn.json");
            setVerses(result[1])
        }
        loadVerses();
    }, []);
    
    useEffect(() => {
        async function loadCommentaries() {
            const result = require("./gnc.json");
            setTitleComments(result[1]["title"])
            setAllCommentaries(result[1]["verses"])
        }
        loadCommentaries();
    }, []);

    function handleCommentaries(evt, verse) {
        evt.preventDefault();        
        const linha = evt.target
        
        if (verseatual.linha !== 0 && verseatual.verse === verse) {
            closeCommentaries(evt);
        } else {
            setAsideclass("visible")
            setMain("main comment")
            if (verseatual.linha !== 0) {
                verseatual.linha.style.backgroundColor = "white";
            } 
    
            linha.style.backgroundColor = "yellow"
            
            setVerseatual({
                verse,
                linha
            })
    
            if (allCommentaries.length > verse) {
                setCommentaries(allCommentaries[verse])
            } else {
                console.log(verse)
                setCommentaries([
                    {
                        "id": -1,
                        "name": "Nenhum comentário",
                        "text": "Seja o primeiro a comentar",
                        "tags": []
                    }
                ])
            }
        }
    }

    function closeCommentaries(evt) {
        evt.preventDefault();
        const linha = verseatual.linha;
        linha.style.backgroundColor = "white";
        setVerseatual({"linha": 0})
        setCommentaries([]);
        setAsideclass("invisible")
        setMain("main text")
    }

    function handleNewComment(evt, type) {
        evt.preventDefault();
        console.log(type)
        setNewbox("visible centro");
        setBlur("block");
    }

    function getImage(tag) {
        switch (tag) {
            case "devocional":
                return hand;
            case "inspirado":
                return pen;
            case "pessoal":
                return person;
            default:
                return book;
        }
    }

    function closeNew(evt) {
        evt.preventDefault();
        setNewbox("invisible");
        setBlur("none");
    }

    return (
        <>  
            <div className={main}>
                <label htmlFor="toggle"> Gênesis 01 </label>
                <input type="checkbox" id='toggle'/>
                <TitleComment 
                    comments = {titleComments} 
                    commentFunction = {handleNewComment}
                    imageFunction = {getImage}
                />
                
                <ul className="verse-list">
                    {verses.map((verse, index) => (
                        <li key = {index + 1}>
                            <sup> {index + 1} </sup>
                            <p 
                                style={{ display: "inline" }} 
                                onClick = {
                                    (evt) => handleCommentaries(evt, index)
                                }>
                                { verse }
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
            
            <aside className={asideclass}>
                <Comments 
                    closeFunction = {closeCommentaries}
                    commentaries = {commentaries}
                    newComment = {handleNewComment}
                    imageFunction = {getImage}
                />
            </aside>

            <div className={newbox}>
                <NewComment close = {closeNew}/>
            </div>

            <div className="overlay" style={{ display: blur }}></div>
        </>
    )
}