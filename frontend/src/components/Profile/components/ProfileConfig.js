import React, { useContext } from "react";
import { ProfileContext } from "contexts/ProfileContext";

import PropTypes from "prop-types";

const dataCollection = require("data/collections.json");
const { beliefs, states } = dataCollection;

export default function ProfileConfig({ configDisplay, closeAccount }) {
	const { 
		belief, 
		stateName, 
		setBelief, 
		setStateName, 
		updateAccount,
		deleteAccount,
	} = useContext(ProfileContext);

	function handleChangeState(evt) {
		setStateName(evt.target.value);
	}
	function handleChangeBelief(evt) {
		setBelief(evt.target.value);
	}
	function handleDeleteAccount() {
		deleteAccount();
		closeAccount();
	}

	return (
		<div style={{ display: configDisplay }} className="user-config">
			<div className="dropdown-menu">
				<label htmlFor="state"> Estado: </label>
				<select
					id="state"
					name="state"
					value={stateName}
					onBlur={handleChangeState}
					onChange={handleChangeState}
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
					id="belief"
					name="belief"
					value={belief}
					onBlur={handleChangeBelief}
					onChange={handleChangeBelief}
				>
					{beliefs.map((item) => (
						<option value={item} key={item}>
							{item}
						</option>
					))}
				</select>
			</div>
			<div className="config-buttons">
				<button onClick={updateAccount} type="button">
					Salvar
				</button>
				<button onClick={handleDeleteAccount} type="button">
					Excluir conta
				</button>
			</div>
		</div>
	);
}
ProfileConfig.propTypes = {
	configDisplay: PropTypes.string.isRequired,
	closeAccount: PropTypes.func.isRequired,
};
