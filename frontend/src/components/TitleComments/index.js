import React, { Component } from 'react';

import "./styles.css";

export default class TitleComment extends Component {
    constructor(props) {
        super(props);

        this.selected = false;
    }
    showNewComment(evt) {
        this.selected = true;
        this.props.handleNewComment(evt)
    }
    
    render() {
        return (
            <div className="title-comments">
                <ul>
                    {this.props.comments.map(comment => (
                        <li key = {comment.id}>
                            <h3> 
                                {comment.username} 
                                {comment.tags.map((tag, index) => (
                                    <img key = {index}
                                        src={this.props.imageFunction(tag)}
                                        className = "tag"
                                        alt = {tag}/>
                                ))}
                            </h3> 
                            <p style = {{ whiteSpace: "break-spaces" }}> {comment.text} </p>
                        </li>
                    ))}
                </ul>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems:"center"}}>
                    <button 
                        className="entry" 
                        onClick = { (evt) => {this.showNewComment(evt)} }>
                            Comentar 
                    </button>
                </div>
            </div>
        )
    }
}