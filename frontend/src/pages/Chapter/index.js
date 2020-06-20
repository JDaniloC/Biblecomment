import React, { useState, useEffect } from 'react';
import "./styles.css";

const close = require("../../assets/x.svg")

export default function Chapter() {
    const [asideclass, setAsideclass] = useState("invisible");
    const [main, setMain] = useState("main text");
    const [newbox, setNewbox] = useState("invisible")
    const [verses, setVerses] = useState([]);
    const [allCommentaries, setAllCommentaries] = useState([]);
    const [commentaries, setCommentaries] = useState([]);
    const [actual, setActual] = useState({linha: 0});

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
            setAllCommentaries(result[1])
        }
        loadCommentaries();
    }, []);

    function handleCommentaries(evt, verse) {
        evt.preventDefault();        
        const linha = evt.target
        
        if (actual.linha !== 0 && actual.verse === verse) {
            linha.style.backgroundColor = "white";
            setActual({"linha": 0})
            setCommentaries([]);
            setAsideclass("invisible")
            setMain("main text")
        } else {
            setAsideclass("visible")
            setMain("main comment")
            if (actual.linha !== 0) {
                actual.linha.style.backgroundColor = "white";
            } 
    
            linha.style.backgroundColor = "yellow"
            
            setActual({
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
                        "text": "Seja o primeiro a comentar"
                    }
                ])
            }
        }
    }

    function closeCommentaries(evt) {
        evt.preventDefault();
        const linha = actual.linha;
        linha.style.backgroundColor = "white";
        setActual({"linha": 0})
        setCommentaries([]);
        setAsideclass("invisible")
        setMain("main text")
    }

    function handleNewComment(evt) {
        evt.preventDefault();
        setNewbox("visible centro");
    }

    return (
        <>  
            <div className={main}>
                <h1> Gênesis 01 </h1>
                <ul className="verse-list">
                    {verses.map((verse, index) => (
                        <li key = {index + 1}>
                            <sup> {index + 1} </sup>
                            <p style={{ display: "inline" }} onClick = {(evt) => handleCommentaries(evt, index)}>
                                { verse }
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
            
            <aside className={asideclass}>
                <div className="top">
                    <button onClick={closeCommentaries}>
                        <img src={close} alt="Fechar"/>
                    </button>
                    <h2 style = {{ alignSelf: "center" }}> Comentários </h2>
                </div>
                
                <ul className="commentaries">
                    {commentaries.map(commentary => (
                        <li key = {commentary.id}>
                            <h3> {commentary.name} </h3>
                            <p> {commentary.text} </p>
                        </li>
                    ))}
                </ul>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems:"center"}}>
                    <button className="entry" onClick={handleNewComment}> Comentar </button>
                </div>
            </aside>

            <spam className={newbox}>
                <div className="new-comment">
                    <div className="top">
                        <button onClick={closeCommentaries}>
                            <img src={close} alt="Fechar"/>
                        </button>
                        <h2 style = {{ alignSelf: "center" }}> Comentários </h2>
                    </div>

                    <textarea name="new" id="new" cols="30" rows="10">

                    </textarea>
                    <button className="entry"> Enviar </button>
                </div>
            </spam>
        </>
    )
}

/*
TODO
1 - Se clicar em um comentário, vai abrir uma caixinha flutuante ao lado, para adicionar.
2 - Se clicar em comentários, vai abrir uma aba do lado com todos os comentários, emabaixo da mesma vai ter adicionar comentários. Não esquecer de classificar os comentários.
*/