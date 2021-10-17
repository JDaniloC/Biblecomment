import React from "react";

import chatIcon from "assets/chat.svg";
import heartIcon from "assets/heart.svg";
import warningIcon from "assets/warning.svg";

export default function ExampleCommentButtons() {
    return (
        <span className="comment-buttons">
            <p>
                Favoritado por <b>10</b> pessoas
            </p>
            <button type="button">
                <img src={heartIcon} alt="like" />
            </button>
            <button type="button">
                <img src={chatIcon} alt="chat" />
            </button>
            <button type="button">
                <img src={warningIcon} alt="report" />
            </button>
        </span>
    )
}