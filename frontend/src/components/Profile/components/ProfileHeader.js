import React from "react";
import PropTypes from "prop-types";

import gearsIcon from "assets/gears.svg";

export default function ProfileHeader({ username, handleConfig }) {
    return (
        <h2>
            Membro {username}
            <button onClick={handleConfig}>
                <img src={gearsIcon} alt="config" />
            </button>
        </h2>
    )
}
ProfileHeader.propTypes = {
	username: PropTypes.string.isRequired,
	handleConfig: PropTypes.func.isRequired,
};
