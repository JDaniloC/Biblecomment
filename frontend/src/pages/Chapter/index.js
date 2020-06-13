import React, { useState, useEffect } from 'react';
import "./styles.css";

export default function Chapter() {
    const [verses, setVerses] = useState({});
    const [commentaries, setCommentaries] = useState([]);

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
            setCommentaries(result[1])
        }
        loadCommentaries();
    }, []);

    function handleCommentaries(evt) {
        evt.preventDefault();
        const linha = evt.target
        
        if (linha.style.backgroundColor !== "yellow") {
            linha.style.backgroundColor = "yellow"
        } else {
            linha.style.backgroundColor = "white"
        }
    }

    return (
        <>
            <h1> Gênesis 01 </h1>
            <ul className="verse-list">
                {Object.keys(verses).map(verse => (
                    <li key = {verse}>
                        <sup> {verse} </sup>
                        <p style={{ display: "inline" }} onClick = {handleCommentaries}>
                            { verses[verse] }
                        </p>
                    </li>
                ))}
            </ul>
            <ul className="commentaries">
                {commentaries.map(commentary => (
                    <p> Teste </p>
                ))}
            </ul>
        </>
    )
}

/*
TODO
1 - Se clicar em um comentário, vai abrir uma caixinha flutuante ao lado, para adicionar.
2 - Se clicar em comentários, vai abrir uma aba do lado com todos os comentários, emabaixo da mesma vai ter adicionar comentários. Não esquecer de classificar os comentários.
*/