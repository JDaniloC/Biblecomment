import React, { Component } from 'react';
import 'balloon-css';
import "./styles.css";

const close = require("../../assets/x.svg")
const book = require("../../assets/book.svg")
const hand = require("../../assets/hand.svg")
const person = require("../../assets/person.svg")
const pen = require("../../assets/pen.svg")

export default class NewComment extends Component {

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
                                id="pessoal"/>
                            <img 
                                className = "tag"
                                src={person} 
                                alt="personicon"/>
                        </label>
                    </div>
                    <textarea 
                        name="new" 
                        id="new" 
                        placeholder="Descreva seu comentário">
                    </textarea>
                </div>
                <button className="entry"> Enviar </button>
            </div>
        )
    }
}