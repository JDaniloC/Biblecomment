import React from "react";

export default function ExampleForm() {
	function handleNothing(event) {
		event.preventDefault();
	}

	return (
		<div className="login-container" onSubmit={handleNothing}>
			<form style={{ width: "100%" }}>
				<input readOnly type="email" disabled placeholder="E-mail" />
				<input readOnly type="text" disabled placeholder="Nome de usuário" />
				<input readOnly type="password" disabled placeholder="Senha" />
				<input
					style={{ backgroundColor: "#1E7" }}
					type="submit"
					readOnly
					value="Cadastrar"
				/>
				<hr />
				<button
					type="button"
					style={{
						backgroundColor: "rgb(136, 136, 136)",
					}}
				>
					Login
				</button>
			</form>
		</div>
	);
}
