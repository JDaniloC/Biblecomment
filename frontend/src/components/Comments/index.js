import React, { Component } from 'react';
import { isAuthenticated, TOKEN_KEY } from "../../services/auth";
import axios from '../../services/api';

import "./styles.css";
const close = require("../../assets/x.svg")

export default class Comments extends Component {
    constructor(props) {
        super(props);

        this.selected = false;
    }
    showNewComment(evt) {
        this.selected = true;
        this.props.handleNewComment(evt)
    }
    handleLike(evt, identificador) {
        evt.preventDefault();

        if (isAuthenticated()) {
            var token = localStorage.getItem(TOKEN_KEY);
            try {
                axios.patch(
                    `comments/${identificador}`, {
                        token,
                        likes: true
                    }).then(response => {
                        this.props.notification("Adicionado aos favoritos", "success")
                        this.props.commentaries.forEach(
                            function(part, index, array) {
                                if (array[index].id === identificador) {
                                    const likes = JSON.parse(array[index].likes);
                                    if (!("+1" in likes)) {
                                        likes.push("+1");
                                        array[index].likes = JSON.stringify(likes);
                                    } 
                                }
                        });
                })
            } catch (error) {
                this.props.notification("Problema na requisição", "error")
            }
        } else {
            this.props.notification("Você precisa está logado", "warning")
        }
    }
    
    handleReport(evt, identificador) {
        evt.preventDefault();
        if (isAuthenticated()) {
            var token = localStorage.getItem(TOKEN_KEY);
            const message = window.prompt(
                "Qual o problema com o comentário?")
            try {
                axios.patch(
                    `comments/${identificador}`, {
                        token,
                        reports: message
                    }).then(response => {
                        this.props.notification(
                            "Comentário reportado!", "success"
                        )
                })
            } catch (error) {
                this.props.notification("Problema na requisição", "error")
            }
        } else {
            this.props.notification("Você precisa está logado", "warning")
        }
    }

    render() {
        return (
            <div className="side">
                <div className="top">
                    <h2 style = {{ alignSelf: "center" }}> Comentários </h2>
                    <button onClick = { this.props.closeFunction }>
                        <img src = { close } alt="Fechar"/>
                    </button>
                </div>
                
                <ul className="commentaries">
                    {(this.props.commentaries.length !== 0) ? 
                    this.props.commentaries.map(commentary => (
                        <li key = {commentary.id}>
                            <h3 style={{ display: "flex" }} >
                                {commentary.name} 
                                {commentary.tags.map((tag, index) => (
                                    <img key = {index} alt = {tag}
                                        src = {this.props.imageFunction(tag)}
                                        style = {{ height: "1rem", margin: "0 4px" }}/>)
                                )}
                            </h3> 
                            <label 
                                style = {{ display: "flex" }}
                                htmlFor={commentary.id}> 
                                <p>
                                    {commentary.text}
                                </p> 
                            </label>
                            <input type="checkbox" id={commentary.id}/>
                            <div className = "user-comment">
                                {commentary.text}
                                <span>
                                    <p> Favoritado por <b>{JSON.parse(commentary.likes).length}</b> pessoas </p>
                                    <button 
                                        onClick = {(evt) => this.handleLike(evt, commentary.id)}>
                                        <img src = {this.props.imageFunction("heart")} alt="like"/>
                                    </button>
                                    <button 
                                        onClick = {(evt) => this.handleReport(evt, commentary.id)}>
                                        <img src={this.props.imageFunction("warning")} alt="report"/>
                                    </button>
                                </span>
                            </div>
                        </li>
                    )) : // Ternary operator
                    <li>
                        <h3> Nenhum comentário </h3>
                        <p> Seja o primeiro a comentar </p>
                    </li>}
                </ul>
                <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems:"center",
                        width: "100%"
                    }}>
                    <button 
                        className = "entry" 
                        onClick = { (evt) => {this.showNewComment(evt)} }> 
                        Comentar 
                    </button>
                </div>
            </div>
        )
    }
}