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
			submitName: "Entrar",
			switchBtnName: "Cadastrar",

			name: "",
			email: "",
			password: "",
		};

		this.profileComponent = createRef();

		this.handleForm = this.handleForm.bind(this);
		this.changeState = this.changeState.bind(this);
		this.changeMethod = this.changeMethod.bind(this);
		this.closeAccount = this.closeAccount.bind(this);
		this.deleteComment = this.deleteComment.bind(this);
	}

	componentDidMount() {
		const {
			setShowLogin,
			setFavorites,
			loadUserInfos,
			setCommentaries,
			handleNotification,
		} = this.context;

		this.setFavorites = setFavorites;
		this.setShowLogin = setShowLogin;
		this.loadUserInfos = loadUserInfos;
		this.setCommentaries = setCommentaries;
		this.handleNotification = handleNotification;
	}

	_isInLoginState() {
		return this.state.submitName === "Entrar";
	}

	changeMethod() {
		if (this._isInLoginState()) {
			this.setState({
				submitName: "Cadastrar",
				switchBtnName: "Entrar",
			});
		} else {
			this.setState({
				switchBtnName: "Cadastrar",
				submitName: "Entrar",
			});
		}
	}

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
				.post("/session/login/", {
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
					this.context.getComments(1);
					this.context.getFavorites(1);
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
				.post("/session/register/", {
					email,
					name,
					password,
				})
				.then(() => {
					this.changeMethod();
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

		if (!this.state.showNameField) {
			this.tryLogin(this.state.email, this.state.password);
		} else {
			this.tryRegister(this.state.email, this.state.name, this.state.password);
		}
	}

	closeAccount() {
		logout();
		this.setShowLogin(true);
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
				
				{(this.context.showLogin) && 
				<form onSubmit={this.handleForm}>
					<input
						type="email"
						name="email"
						id="email"
						placeholder="E-mail"
						onChange={this.changeState}
						required
					/>
					{(!this._isInLoginState()) &&
						<input
							type="text"
							name="name"
							maxLength="15"
							placeholder="Nome de usuário"
							onChange={this.changeState}
						/>
					}
					<input
						type="password"
						name="password"
						placeholder="Senha"
						onChange={this.changeState}
						required
					/>
					<input
						style={{ backgroundColor: "#1E7" }}
						type="submit"
						value={this.state.submitName}
					/>
					<hr />
					<button
						type = "button"
						style={{ backgroundColor: "#888" }}
						onClick={this.changeMethod}
					>
						{this.state.switchBtnName}
					</button>
				</form>
				}
			</div>
		);
	}
}
