import React from "react";

import Favorite from "models/Favorite";
import PropTypes from "prop-types";

export default function FavoriteRow({ favorite, index }) {
    return (
        <li key={"-" + index}>
            <h5 style={{ display: "inline" }}>
                {favorite.username} em {favorite.book_reference}
            </h5>
            <label
                style={{ display: "flex" }}
                htmlFor={"-" + index}
            >
                <p>{favorite.text}</p>
            </label>
            <input type="checkbox" id={"-" + index} />
            <div className="user-comment">{favorite.text}</div>
        </li>
    )
}
FavoriteRow.propTypes = {
    favorite: Favorite,
    index: PropTypes.number.isRequired
}