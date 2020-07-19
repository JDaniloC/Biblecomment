import React, { Component } from 'react';

import "./styles.css";
const close = require("../../assets/x.svg")

export default class Comments extends Component {
    render() {
        return (
            <div className="side">
                <div className="top">
                    <button onClick={this.props.closeFunction}>
                        <img src={close} alt="Fechar"/>
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
                                        src={this.props.imageFunction(tag)}
                                        className = "tag"
                                        alt = {tag}/>
                                )
                            )}
                            <label htmlFor={commentary.id}> 
                                <p>
                                    {commentary.text}
                                </p> 
                            </label>
                            <input type="checkbox" id={commentary.id}/>
                            <div className = "user-comment">
                                {commentary.text}
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
                        onClick = {
                            (evt) => this.props.newComment(evt, "verses")
                        }> 
                        Comentar 
                    </button>
                </div>
            </div>
        )
    }
}