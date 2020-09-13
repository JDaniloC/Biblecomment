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
        console.log("Dando like")

        if (isAuthenticated()) {
            var token = localStorage.getItem(TOKEN_KEY);
            try {
                axios.patch(
                    `comments/${identificador}`, {
                        token,
                        likes: true
                    }).then(response => {
                        this.props.notification(
                            true, "Adicionado aos favoritos", "success"
                        )
                })
            } catch (error) {
                this.props.notification(
                    true, "Problema na requisição", "error"
                )
            }
        } else {
            this.props.notification(
                true, "Você precisa está logado", "warning"
            )
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
                            true, "Comentário reportado!", "success"
                        )
                })
            } catch (error) {
                this.props.notification(
                    true, "Problema na requisição", "error"
                )
            }
        } else {
            this.props.notification(
                true, "Você precisa está logado", "warning"
            )
        }
    }

    render() {
        return (
            <div className="side">
                <div className="top">
                    <button onClick = { this.props.closeFunction }>
                        <img src = { close } alt="Fechar"/>
                    </button>
                    <h2 style = {{ alignSelf: "center" }}> Comentários </h2>
                </div>
                
                <ul className="commentaries">
                    {this.props.commentaries.map(commentary => (
                        <li key = {commentary.id}>
                            <h3 style={{ display: "inline" }} >
                                {commentary.name} 
                            </h3> {commentary.tags.map((tag, index) => (
                                    <img 
                                        key = {index}
                                        src = {this.props.imageFunction(tag)}
                                        className = "tag"
                                        alt = {tag}/>
                                )
                            )}
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
                    ))}
                </ul>
                <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems:"center"
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