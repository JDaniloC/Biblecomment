import React, { Component } from 'react';

import 'balloon-css';
import "./styles.css";

import { isAuthenticated, TOKEN_KEY } from "../../services/auth";
import axios from '../../services/api';

const close = require("../../assets/x.svg")
const book = require("../../assets/book.svg")
const hand = require("../../assets/hand.svg")
const person = require("../../assets/person.svg")
const pen = require("../../assets/pen.svg")

export default class NewComment extends Component {
    constructor(props) {
        super(props);

        this.state = {
            devocional: false,
            exegese: false,
            inspirado: false,
            pessoal: false,
            texto: ""
        }
    }

    postNewComment(evt) {
        evt.preventDefault();

        if (this.state.texto === "" | this.state.nome === "") {
            return
        }
        const tags = [];
        if (this.state.devocional) {
            tags.push("devocional")
        }
        if (this.state.exegese) {
            tags.push("exegese")
        }
        if (this.state.inspirado) {
            tags.push("inspirado")
        }
        if (this.state.pessoal) {
            tags.push("pessoal")
        }

        try {
            var token = "0";
            if (isAuthenticated()) {
                token = localStorage.getItem(TOKEN_KEY);
            }

            axios.post(
                `books/${this.props.abbrev}/chapters/${this.props.number}/comments/${this.props.verso() + 1}`, {
                    on_title: this.props.on_title.selected,
                    token: token,
                    text: this.state.texto,
                    tags: tags
                }).then(response => {
                    this.props.notification(
                        true, "Comentário enviado!", 
                        "success", response.data
                    )
                })
        } catch (error) {
            this.props.notification(
                true, "Problema na requisição", "error"
            )
        }

        this.props.close(evt)
    }


    handleChange(event) {
        const value = event.target.checked ? (
            event.target.checked !== undefined
        ) : event.target.value
        this.setState({[event.target.name]: value});
    }

    render() {
        return (
            <div className="new-comment">
                <div className="top">
                    <button onClick={this.props.close}>
                        <img src={close} alt="Fechar"/>
                    </button>
                    <h2 style = {{ alignSelf: "center" }}> 
                        Novo comentário 
                    </h2>
                </div>
                
                <div className="text-area">
                    <div className="textarea-top">
                        <label 
                        style = {{ marginLeft: "20px"}}
                        aria-label="Devocional" 
                        data-balloon-pos="down-right" 
                        htmlFor="devocional">
                            <input 
                                type="checkbox" 
                                name="devocional" 
                                value = {this.state.devocional}
                                onChange = {
                                    (evt) => {this.handleChange(evt)}
                                }
                                id="devocional"/> 
                            <img 
                                className = "tag"
                                src={hand} 
                                alt="handicon"/>
                        </label>
                        <label 
                        aria-label="Exegese" 
                        data-balloon-pos="down-right" 
                        htmlFor="exegese">
                            <input 
                                type="checkbox" 
                                name="exegese" 
                                value = {this.state.exegese}
                                onChange = {
                                    (evt) => {this.handleChange(evt)}
                                }
                                id="exegese"/>
                            <img 
                                className = "tag"
                                src={book} 
                                alt="bookicon"/>
                        </label>
                        <label 
                        aria-label="Inspirado" 
                        data-balloon-pos="down-right" 
                        htmlFor="inspirado">
                            <input 
                                type="checkbox" 
                                name="inspirado" 
                                value = {this.state.inspirado}
                                onChange = {
                                    (evt) => {this.handleChange(evt)}
                                }
                                id="inspirado"/>
                            <img 
                                className = "tag"
                                src={pen} 
                                alt="penicon"/>
                        </label>
                        <label 
                        aria-label="Pessoal" 
                        data-balloon-pos="down-right" 
                        htmlFor="pessoal">
                            <input 
                                type="checkbox" 
                                name="pessoal" 
                                value = {this.state.pessoal}
                                onChange = {
                                    (evt) => {this.handleChange(evt)}
                                }
                                id="pessoal"/>
                            <img 
                                className = "tag"
                                src={person} 
                                alt="personicon"/>
                        </label>
                    </div>
                    <textarea 
                        name = "texto" 
                        id = "texto" 
                        value = {this.state.texto}
                        onChange = {(evt) => {this.handleChange(evt)}}
                        placeholder = "Descreva seu comentário">
                    </textarea>
                </div>
                <button 
                    type = "submit"
                    onClick = {(evt) => {this.postNewComment(evt)}}
                    className="entry"> 
                    Enviar 
                </button>
            </div>
        )
    }
}