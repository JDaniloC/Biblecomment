import React, { useState, useEffect } from 'react';
import "./styles.css";
import "./responsive.css"

const close = require("../../assets/x.svg")
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
    const [bottom, setBottom] = useState("invisible");

    const [verseatual, setVerseatual] = useState({linha: 0});
    const [commentatual, setCommentatual] = useState({number: 0, text: ""});

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
                        "text": "Seja o primeiro a comentar"
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

    function handleNewComment(evt) {
        evt.preventDefault();
        setNewbox("visible centro");
        setBlur("block");
    }

    function closeNew(evt) {
        evt.preventDefault();
        setNewbox("invisible");
        setBlur("none");
    }

    function showComment(evt) {
        evt.preventDefault();
        setBottom("bottom");
        const selecionado = evt.target;
        console.log(verseatual)
        setCommentatual({
            number: verseatual.verse + 1,
            text: selecionado.innerText
        });
        closeCommentaries(evt);
    }

    function closeComment(evt) {
        evt.preventDefault();
        setBottom("invisible");
    }

    return (
        <>  
            <div className={main}>
                {/* <h1> Gênesis 01 </h1> */}
                <label htmlFor="toggle"> Gênesis 01 </label>
                <input type="checkbox" id='toggle'/>
                <div className="title-comments">
                    <ul>
                        {titleComments.map(comment => (
                            <li key = {comment.id}>
                                <h3> {comment.name} </h3>
                                <p> {comment.text} </p>
                            </li>
                        ))}
                    </ul>
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems:"center"}}>
                        <button className="entry" onClick={handleNewComment}> Comentar </button>
                    </div>
                </div>
                
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
                <div className="side">
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
                                <p onClick = {showComment}> {commentary.text} </p>
                            </li>
                        ))}
                    </ul>
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems:"center"}}>
                        <button className="entry" onClick={handleNewComment}> Comentar </button>
                    </div>
                </div>
            </aside>

            <div className={newbox}>
                <div className="new-comment">
                    <div className="top">
                        <button onClick={closeNew}>
                            <img src={close} alt="Fechar"/>
                        </button>
                        <h2 style = {{ alignSelf: "center" }}> Novo comentário </h2>
                    </div>
                    
                    <div className="text-area">
                        <div className="textarea-top">
                            <label htmlFor="devocional">
                                <input type="checkbox" name="devocional" id="devocional"/> 
                                <img src={hand} alt="handicon"/>
                                {/* rosa */}
                            </label>
                            <label htmlFor="exegese">
                                <input type="checkbox" name="exegese" id="exegese"/>
                                <img src={book} alt="bookicon"/>
                                {/* amarelo */}
                            </label>
                            <label htmlFor="inspirado">
                                <input type="checkbox" name="inspirado" id="inspirado"/>
                                <img src={pen} alt="penicon"/>
                                {/* azul */}
                            </label>
                            <label htmlFor="pessoal">
                                <input type="checkbox" name="pessoal" id="pessoal"/>
                                <img src={person} alt="personicon"/>
                                {/* verde */}
                            </label>
                        </div>
                        <textarea 
                            name="new" 
                            id="new" 
                            cols="70" 
                            rows="10" 
                            placeholder="Descreva seu comentário">
                        </textarea>
                    </div>
                    <button className="entry"> Enviar </button>
                </div>
            </div>
            
            <div className={bottom}>
                <div className="top">
                    <button onClick={closeComment}>
                        <img src={close} alt="Fechar"/>
                    </button>
                </div>
                <sup>{commentatual.number}</sup>
                <p>{commentatual.text}</p>
            </div>

            <div className="overlay" style={{ display: blur }}></div>
        </>
    )
}

/*
TODO
1 - Fazer a classificação de comentários
*/