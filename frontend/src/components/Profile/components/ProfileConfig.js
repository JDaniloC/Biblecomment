import React, { useContext } from 'react';
import { ProfileContext } from "contexts/ProfileContext";

import PropTypes from "prop-types";

const dataCollection = require("data/collections.json");
const beliefs = dataCollection.beliefs;
const states = dataCollection.states;

export default function ProfileConfig({ configDisplay }) {
    const context = useContext(ProfileContext);

    return (
        <div
            style={{ display: configDisplay }}
            className="user-config"
        >
            <div className="dropdown-menu">
                <label htmlFor="state"> Estado: </label>
                <select
                    name="state"
                    id="state"
                    value={context.stateName}
                    onChange={(evt) => {
                        context.setStateName(evt.target.value);
                    }}
                >
                    {states.map((item) => (
                        <option value={item} key={item}>
                            {item}
                        </option>
                    ))}
                </select>
            </div>
            <div className="dropdown-menu">
                <label htmlFor="belief"> Crença: </label>
                <select
                    name="belief"
                    id="belief"
                    value={context.belief}
                    onChange={(evt) => {
                        context.setBelief(evt.target.value);
                    }}
                >
                    {beliefs.map((item) => (
                        <option value={item} key={item}>
                            {item}
                        </option>
                    ))}
                </select>
            </div>
            <div className="config-buttons">
                <button
                    style={{ backgroundColor: "#1D1" }}
                    onClick={() =>
                        this.props.updateAccount(
                            context.belief,
                            context.stateName
                        )
                    }
                >
                    Salvar
                </button>
                <button
                    style={{ backgroundColor: "#FF4030" }}
                    onClick={() => this.props.deleteAccount(context.email)}
                >
                    Excluir conta
                </button>
            </div>
        </div>
    )
}
ProfileConfig.propTypes = {
    configDisplay: PropTypes.string.isRequired,
}