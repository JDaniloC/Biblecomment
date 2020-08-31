import React, { Component, createRef } from 'react';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

import NewComment from "../../components/NewComment";
import TitleComment from "../../components/TitleComments";
import Comments from "../../components/Comments";

import axios from '../../services/api';
import "./styles.css";

const book = require("../../assets/book.svg")
const hand = require("../../assets/hand.svg")
const person = require("../../assets/person.svg")
const pen = require("../../assets/pen.svg")

export default class Chapter extends Component{
    constructor(props) {
        super(props);
        
        this.state = {
            titleName: "Chapter",
            chapterNumber: "0",
            verses: [],
            asideclass: "invisible",
            blur: "none",
            comments: [],
            main: "main text",
            newbox: "invisible",
            titleComments: [],
            verseAtual: {linha: null, verse: 0},
            allComments: [],

            aviso: false,
            mensagem: "",
            severidade: ""
        }
        
        this.titleComponent = createRef();
        this.commentsComponent = createRef();

        // to use the state of parent in the children
        this.handleNewComment = this.handleNewComment.bind(this);
        this.closeComments = this.closeComments.bind(this);
        this.closeNewCommentary = this.closeNewCommentary.bind(this);
        this.getVerse = this.getVerse.bind(this);
        this.handleNotification = this.handleNotification.bind(this);
    }

    getVerse() {
        return this.state.verseAtual.verse;
    }

    componentDidMount() {
        let {abbrev, number} = this.props.match.params;
        this.abbrev = abbrev;
        this.number = number;

        try {
            axios.get(`books/${abbrev}/chapters/${number}`)
                .then(response => {
                const {title, verses} = response.data;
                this.setState({ titleName: title })
                this.setState({ verses: JSON.parse(verses) })
            });
        } catch (err) {
            this.setState({
                aviso: true,
                mensagem: "Não consegui me conectar com o servidor",
                severidade: "error"
            })
        }
        
        try {
            axios.get(`books/${abbrev}/chapters/${number}/comments`)
                .then(response => {
                const result = response.data.map(comment => {
                    comment.tags = JSON.parse(comment.tags);
                    return comment
                });
                const titleComments = [];
                const comments = [];
                for (const comment of result) {
                    if (comment.on_title) {
                        titleComments.push(comment)
                    } else {
                        comments.push(comment)
                    }
                }

                this.setState({ allComments: comments });
                this.setState({ titleComments: titleComments });
            });
        } catch (err) {
            this.setState({
                aviso: true,
                mensagem: "Não consegui me conectar com o servidor",
                severidade: "error"
            })
        }
        
        if (number.length === 1) {
            number = "0" + number
        }
        this.setState({ chapterNumber: number })
    }

    handlecomments(evt, verse) {
        evt.preventDefault();        
        const linha = evt.target
        
        if (
            this.state.verseAtual.linha !== null && 
            this.state.verseAtual.verse === verse) {
            this.closeComments(evt);
        } else {
            this.setState({ asideclass: "visible" });
            this.setState({ main: "main comment" });
            if (this.state.verseAtual.linha !== null) {
                var antigo = this.state.verseAtual;
                antigo.linha.style.backgroundColor = "white";
                this.setState({ verseAtual: {
                    "linha": antigo.linha,
                    "verse": antigo.verse
                }})
            } 
    
            linha.style.backgroundColor = "yellow"
            this.setState({ verseAtual: {
                verse,
                linha
            }})
            
            const thisComments = this.state.allComments.filter((comment) => {
                return comment.verse === verse + 1;
            })
            if (thisComments.length > 0) {
                this.setState({ comments: thisComments })
            } else {
                this.setState({ comments: [
                    {
                        "id": -1,
                        "name": "Nenhum comentário",
                        "text": "Seja o primeiro a comentar",
                        "tags": []
                    }
                ]})
            }
        }
    }

    closeComments(evt) {
        evt.preventDefault();
        const linha = this.state.verseAtual.linha;
        linha.style.backgroundColor = "white";

        this.setState({ verseAtual: {"linha": null, "verse": 0}})
        this.setState({ comments: []})
        this.setState({ asideclass: "invisible" })
        this.setState({ main: "main text" })
    }

    handleNewComment(evt) {
        evt.preventDefault();
        
        this.setState({ newbox: "visible centro"})
        this.setState({ blur: "block"})
    }

    getImage(tag) {
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

    closeNewCommentary(evt) {
        evt.preventDefault();
        
        this.titleComponent.current.selected = false;
        this.commentsComponent.current.selected = false;

        this.setState({ newbox: "invisible" });
        this.setState({ blur: "none" });
    }

    handleNotification(aviso, mensagem, severidade, comment) {
        this.setState({
            aviso: aviso,
            mensagem: mensagem,
            severidade: severidade
        })

        const all = this.state.allComments
        all.push(comment)
        this.setState({ allComments: all })
        if (comment.on_title) {
            const list = this.state.titleComments
            list.push(comment)
            this.setState({ titleComments: list })
        } else {
            const list = this.state.comments
            list.push(comment)
            this.setState({ comments: list })
        }
    }

    closeAviso(evt, reason) {
        if (evt != null){
            evt.preventDefault();
        }

        if (reason === 'clickaway') {
            return;
        }
      
        this.setState({ aviso:false });
    }

    render() {
        return (
            <>  
                <div className={this.state.main}>
                    <label htmlFor="toggle"> 
                        {this.state.titleName} {this.state.chapterNumber} 
                    </label>
                    <input type="checkbox" id='toggle'/>
                    <TitleComment 
                        comments = {this.state.titleComments} 
                        handleNewComment = {this.handleNewComment}
                        imageFunction = {this.getImage}
                        ref = {this.titleComponent}
                    />
                    
                    <ul className="verse-list">
                        {this.state.verses.map((verse, index) => (
                            <li key = {index + 1}>
                                <sup> {index + 1} </sup>
                                <p 
                                    style={{ display: "inline" }} 
                                    onClick = {
                                        (evt) => 
                                        this.handlecomments(
                                            evt, index
                                        )
                                    }>
                                    { verse }
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
                
                <aside className={this.state.asideclass}>
                    <Comments 
                        closeFunction = {this.closeComments}
                        commentaries = {this.state.comments}
                        imageFunction = {this.getImage}
                        handleNewComment = {this.handleNewComment}
                        ref = {this.commentsComponent}
                    />
                </aside>
    
                <div className={this.state.newbox}>
                    <NewComment 
                        on_title = {this.titleComponent.current}
                        abbrev = {this.abbrev}
                        number = {this.number}
                        verso = {this.getVerse}
                        close = {this.closeNewCommentary}
                        notification = {this.handleNotification}
                    />
                </div>
    
                <div className="overlay" style={
                    { display: this.state.blur }
                }></div>

                <Snackbar 
                    open={this.state.aviso} 
                    autoHideDuration={6000} 
                    onClose={(evt, reason) => {
                        this.closeAviso(evt, reason)}}>
                    <Alert onClose={(evt, reason) => {
                        this.closeAviso(evt, reason)}} 
                    severity={this.state.severidade}>
                        {this.state.mensagem}
                    </Alert>
                </Snackbar>
            </>
        )
    }

}