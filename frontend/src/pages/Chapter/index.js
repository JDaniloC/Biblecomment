import React, { useState, useEffect } from 'react';
import "./styles.css";

export default function Chapter() {
    const [verses, setVerses] = useState({});
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
        } else {
            if (actual.linha !== 0) {
                actual.linha.style.backgroundColor = "white";
            } 
    
            linha.style.backgroundColor = "yellow"
            
            setActual({
                verse,
                linha
            })
    
            if (allCommentaries.length >= verse) {
                setCommentaries(allCommentaries[verse - 1])
            } else {
                setCommentaries([
                    {
                        "id": 0,
                        "name": "Nenhum comentário",
                        "text": "Seja o primeiro a comentar"
                    }
                ])
            }
        }
    }

    return (
        <>  
            <div className="main">
                <h1> Gênesis 01 </h1>
                <ul className="verse-list">
                    {Object.keys(verses).map(verse => (
                        <li key = {verse}>
                            <sup> {verse} </sup>
                            <p style={{ display: "inline" }} onClick = {(evt) => handleCommentaries(evt, verse)}>
                                { verses[verse] }
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
            
            <aside>
                <ul className="commentaries">
                    {commentaries.map(commentary => (
                        <li key = {commentary.id}>
                            <h3> {commentary.name} </h3>
                            <p> {commentary.text} </p>
                        </li>
                    ))}
                </ul>
            </aside>
        </>
    )
}

/*
TODO
1 - Se clicar em um comentário, vai abrir uma caixinha flutuante ao lado, para adicionar.
2 - Se clicar em comentários, vai abrir uma aba do lado com todos os comentários, emabaixo da mesma vai ter adicionar comentários. Não esquecer de classificar os comentários.
*/