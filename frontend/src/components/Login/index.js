import React, { Component, createRef } from "react";
import axios from "../../services/api";

import { ProfileContext } from "../../contexts/ProfileContext";
import { login, logout, TOKEN_KEY } from "../../services/auth";
import Profile from "../Profile";

import "./styles.css";

export default class Login extends Component {
	static contextType = ProfileContext;

	constructor(props) {
		super(props);

		this.state = {
			loginClass: "",
			registerClass: "invisible",
			buttonColor: "#1E7",
			buttonName: "Cadastrar",

			name: "",
			email: "",
			password: "",
		};

		this.profileComponent = createRef();

		this.handleForm = this.handleForm.bind(this);
		this.changeState = this.changeState.bind(this);
		this.closeAccount = this.closeAccount.bind(this);
		this.updateAccount = this.updateAccount.bind(this);
		this.deleteAccount = this.deleteAccount.bind(this);
		this.deleteComment = this.deleteComment.bind(this);
	}

	componentDidMount() {
		const { 
			setFormClass,
			setFavorites, 
			loadUserInfos, 
			setCommentaries, 
			handleNotification
		} =this.context;

		this.setFavorites = setFavorites;
		this.setFormClass = setFormClass;
		this.loadUserInfos = loadUserInfos;
		this.setCommentaries = setCommentaries;
		this.handleNotification = handleNotification;
	}

	changeMethod(event) {
		if (this._isEventNotNull(event)) {
			event.preventDefault();
		}

		if (this._isLoginClassEmpty()) {
			this._setStateCaseLoginClassIsEmpty();
		} else {
			this._setStateCaseLoginClassIsNotEmpty();
		}
	}

	_isEventNotNull = (event) => {
		return event !== null;
	};

	_isLoginClassEmpty = () => {
		return this.state.loginClass === "";
	};

	_setStateCaseLoginClassIsEmpty = () => {
		this.setState({
			loginClass: "invisible",
			registerClass: "",
			buttonColor: "#888",
			buttonName: "Login",
		});
	};

	_setStateCaseLoginClassIsNotEmpty = () => {
		this.setState({
			loginClass: "",
			registerClass: "invisible",
			buttonColor: "#1E7",
			buttonName: "Cadastrar",
		});
	};

	changeState(event) {
		event.preventDefault();
		this.setState({ [event.target.name]: event.target.value });
	}

	async deleteComment(identificador) {
		try {
			await axios
				.delete(`/comments/${identificador}`, {
					headers: { token: localStorage.getItem(TOKEN_KEY) },
				})
				.then(() => {
					this.handleNotification(
						"success",
						"Comentário excluído com sucesso."
					);
				});
		} catch (error) {
			this.handleNotification("error", error.toString());
		}
	}

	async tryLogin(email, password) {
		try {
			await axios
				.post("session/login", {
					email,
					password,
				})
				.then((response) => {
					const token = response.data.token;
					if (typeof token !== "undefined") {
						this.context.loadUserInfos(response);
						this.handleNotification("success", "Login realizado com sucesso!");
						login(token);
					} else {
						this.handleNotification("warning", response.data.error);
					}
				});
		} catch (error) {
			this.handleNotification("error", error.toString());
		}
	}

	async tryRegister(email, name, password) {
		try {
			await axios
				.post("session/register", {
					email,
					name,
					password,
				})
				.then((response) => {
					if (typeof response.data.error === "undefined") {
						this.changeMethod(null);
						this.handleNotification(
							"success",
							"Cadastro realizado com sucesso!"
						);
					} else {
						this.handleNotification("warning", response.data.error);
					}
				});
		} catch (error) {
			this.handleNotification("error", error.toString());
		}
	}

	handleForm(event) {
		event.preventDefault();

		if (this.state.loginClass === "") {
			this.tryLogin(this.state.email, this.state.password);
		} else {
			this.tryRegister(this.state.email, this.state.name, this.state.password);
		}
	}

	async updateAccount(belief, state) {
		try {
			await axios
				.patch("users", {
					token: localStorage.getItem(TOKEN_KEY),
					belief,
					state,
				})
				.then((response) => {
					if (typeof response.data.error === "undefined") {
						this.handleNotification("success", "Conta atualizada com sucesso.");
					} else {
						this.handleNotification("warning", response.data.error);
					}
				});
		} catch (error) {
			this.handleNotification("error", error.toString());
		}
	}

	async deleteAccount(email) {
		try {
			await axios
				.delete("users", {
					data: { token: localStorage.getItem(TOKEN_KEY), email },
				})
				.then((response) => {
					if (typeof response.data.error === "undefined") {
						this.handleNotification("success", "Conta removida com sucesso.");
						this.profileComponent.current.closeAccount();
					} else {
						this.handleNotification("warning", response.data.error);
					}
				});
		} catch (error) {
			this.handleNotification("error", error.toString());
		}
	}

	closeAccount() {
		logout();
		this.setFormClass("");
	}

	render() {
		return (
			<div className="login-container">
				<Profile
					ref={this.profileComponent}
					closeAccount={this.closeAccount}
					deleteComment={this.deleteComment}
					updateAccount={this.updateAccount}
					deleteAccount={this.deleteAccount}
				/>
				<form
					className={this.context.formClass}
					onSubmit={this.handleForm}
				>
					<input
						type="email"
						name="email"
						id="email"
						placeholder="E-mail"
						onChange={this.changeState}
						required
					/>
					<input
						className={this.state.registerClass}
						type="text"
						name="name"
						maxLength="15"
						placeholder="Nome de usuário"
						onChange={this.changeState}
					/>
					<input
						type="password"
						name="password"
						placeholder="Senha"
						onChange={this.changeState}
						required
					/>
					<input
						className={this.state.loginClass}
						type="submit"
						value="Entrar"
					/>
					<input
						className={this.state.registerClass}
						style={{ backgroundColor: "#1E7" }}
						type="submit"
						value="Cadastrar"
					/>
					<hr />
					<button
						style={{ backgroundColor: this.state.buttonColor }}
						onClick={this.changeMethod}
					>
						{this.state.buttonName}
					</button>
				</form>
			</div>
		);
	}
}
