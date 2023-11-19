import React, { useContext, useCallback } from "react";
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

	const handleChangeState = useCallback(
		(evt) => {
			setStateName(evt.target.value);
		},
		[setStateName],
	);

	const handleChangeBelief = useCallback(
		(evt) => {
			setBelief(evt.target.value);
		},
		[setBelief],
	);

	const handleDeleteAccount = useCallback(() => {
		deleteAccount();
		closeAccount();
	}, [deleteAccount, closeAccount]);

	return (
		<div className="user-config" style={{ display: configDisplay }}>
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
						<option key={item} value={item}>
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
						<option key={item} value={item}>
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
