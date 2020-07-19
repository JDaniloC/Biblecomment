import React, { Component } from 'react';

import "./styles.css";

export default class TitleComment extends Component {
    render() {
        return (
            <div className="title-comments">
                <ul>
                    {this.props.comments.map(comment => (
                        <li key = {comment.id}>
                            <h3 style={{ display: "inline" }} > 
                                {comment.name} 
                            </h3> {comment.tags.map((tag, index) => (
                                    <img
                                        key = {index}
                                        src={this.props.imageFunction(tag)}
                                        className = "tag"
                                        alt = {tag}/>
                                )
                            )}
                            <p> {comment.text} </p>
                        </li>
                    ))}
                </ul>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems:"center"}}>
                    <button 
                        className="entry" 
                        onClick={
                            (evt) => this.props.commentFunction(evt, "title")
                        }>
                            Comentar 
                    </button>
                </div>
            </div>
        )
    }
}