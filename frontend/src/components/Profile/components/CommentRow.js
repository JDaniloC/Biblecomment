import React from "react";

import deleteIcon from "assets/delete.svg";
import editIcon from "assets/edit.svg";
import heartIcon from "assets/heart.svg";

import Comment from "models/Comment";

export default function CommentRow({ comment }) {
    return (
        <li key={comment.id}>
            <label
                style={{ display: "flex" }}
                htmlFor={comment.id}
            >
                <p>
                    {comment.book_reference} {comment.text}
                </p>
            </label>
            <input type="checkbox" id={comment.id} />
            <div className="user-comment">
                {comment.text}
                <p>
                    <button
                        onClick={() => {
                            this.editComment(comment.id);
                        }}
                    >
                        <img src={editIcon} alt="Edit" />
                    </button>
                    <b>
                        {JSON.parse(comment.likes).length}
                        <img src={heartIcon} alt="Heart" />
                    </b>
                    <button
                        onClick={() => {
                            this.deleteComment(comment.id);
                        }}
                    >
                        <img src={deleteIcon} alt="Delete" />
                    </button>
                </p>
            </div>
        </li>
    )
}
CommentRow.propTypes = { comment: Comment }