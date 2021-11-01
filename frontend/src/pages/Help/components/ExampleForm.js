import React from "react";

export default function ExampleForm() {
	function handleNothing(event) {
		event.preventDefault();
	}

	return (
		<div className="login-container" onSubmit={handleNothing}>
			<form>
				<input 
					readOnly 
					disabled 
					type="email" 
					placeholder="E-mail" 
				/>
				<input 
					readOnly 
					disabled 
					type="text" 
					placeholder="Nome de usuário" 
				/>
				<input 
					readOnly 
					disabled 
					type="password" 
					placeholder="Senha" 
				/>
				<input
					readOnly
					type="submit"
					value="Cadastrar"
				/>
				<hr />
				<button type="button">
					Login
				</button>
			</form>
		</div>
	);
}
