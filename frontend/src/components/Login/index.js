import React, { Component, createRef } from "react";

import { ProfileContext } from "contexts/ProfileContext";
import { login, logout, TOKEN_KEY } from "services/auth";

import axios from "services/api";
import Profile from "components/Profile";

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
		this.changeMethod = this.changeMethod.bind(this);
		this.deleteComment = this.deleteComment.bind(this);
	}

	componentDidMount() {
		const {
			setFormClass,
			setFavorites,
			loadUserInfos,
			setCommentaries,
			handleNotification,
		} = this.context;

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
				})
				.catch(({ response }) => {
					this.handleNotification("error", response.data.error);
				});
		} catch (error) {
			this.handleNotification("error", error.toString());
		}
	}

	async tryLogin(email, password) {
		try {
			await axios
				.post("session/login/", {
					email,
					password,
				})
				.then(({ data }) => {
					this.context.loadUserInfos(data);
					this.handleNotification(
						"success", 
						"Login realizado com sucesso!"
					);
					login(data.token);
				})
				.catch(({ response }) => {
					this.handleNotification("error", response.data.error);
				});
		} catch (error) {
			this.handleNotification("error", error.toString());
		}
	}

	async tryRegister(email, name, password) {
		try {
			await axios
				.post("session/register/", {
					email,
					name,
					password,
				})
				.then(() => {
					this.changeMethod(null);
					this.handleNotification(
						"success",
						"Cadastro realizado com sucesso!"
					);
				})
				.catch(({ response }) => {
					this.handleNotification("error", response.data.error);
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

	closeAccount() {
		logout();
		this.setFormClass("");
		this.setCommentaries([]);
		this.context.setName("");
		this.context.setPerfilClass("invisible");
	}

	render() {
		return (
			<div className="login-container">
				<Profile
					ref={this.profileComponent}
					closeAccount={this.closeAccount}
					deleteComment={this.deleteComment}
				/>
				<form className={this.context.formClass} onSubmit={this.handleForm}>
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
