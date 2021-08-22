import React, { Component, createRef } from "react";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "@material-ui/lab";
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

			aviso: false,
			mensagem: "",
			severidade: "",

			email: "",
			name: "",
			password: "",
		};

		this.profileComponent = createRef();

		this.updateAccount = this.updateAccount.bind(this);
		this.deleteAccount = this.deleteAccount.bind(this);
		this.deleteComment = this.deleteComment.bind(this);
		this.handleNotification = this.handleNotification.bind(this);
	}

	componentDidMount() {
		const { setFavorites, loadUserInfos, setCommentaries, setFormClass } =
			this.context;

		this.setFavorites = setFavorites;
		this.setFormClass = setFormClass;
		this.loadUserInfos = loadUserInfos;
		this.setCommentaries = setCommentaries;
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
				.then((response) => {
					this.handleNotification(
						"Comentário excluído com sucesso.",
						"success"
					);
				});
		} catch (err) {
			this.handleNotification("Problema no servidor", "error");
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
						this.handleNotification("Login realizado com sucesso!", "success");
						login(token);
					} else {
						this.handleNotification(response.data.error, "warning");
					}
				});
		} catch (error) {
			console.log(error);
			this.handleNotification("Problema no servidor", "error");
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
							"Cadastro realizado com sucesso!",
							"success"
						);
					} else {
						this.handleNotification(response.data.error, "warning");
					}
				});
		} catch (error) {
			this.handleNotification("Problema no servidor", "error");
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

	handleNotification(mensagem, severidade, data = null) {
		this.setState({
			aviso: true,
			mensagem: mensagem,
			severidade: severidade,
		});
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
						this.handleNotification("Conta atualizada com sucesso.", "success");
					} else {
						this.handleNotification(response.data.error, "warning");
					}
				});
		} catch (error) {
			this.handleNotification(`${error}`, "error");
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
						this.handleNotification("Conta removida com sucesso.", "success");
						this.profileComponent.current.closeAccount();
					} else {
						this.handleNotification(response.data.error, "warning");
					}
				});
		} catch (error) {
			this.handleNotification(`${error}`, "error");
		}
	}

	render() {
		return (
			<>
				<div className="login-container">
					<Profile
						ref={this.profileComponent}
						deleteComment={this.deleteComment}
						notification={this.handleNotification}
						closeAccount={() => {
							logout();
							this.setFormClass("");
						}}
						updateAccount={this.updateAccount}
						deleteAccount={this.deleteAccount}
					/>
					<form
						className={this.context.formClass}
						onSubmit={(event) => {
							this.handleForm(event);
						}}
					>
						<input
							type="email"
							name="email"
							id="email"
							placeholder="E-mail"
							onChange={(event) => {
								this.changeState(event);
							}}
							required
						/>
						<input
							className={this.state.registerClass}
							type="text"
							name="name"
							maxLength="15"
							placeholder="Nome de usuário"
							onChange={(event) => {
								this.changeState(event);
							}}
						/>
						<input
							type="password"
							name="password"
							placeholder="Senha"
							onChange={(event) => {
								this.changeState(event);
							}}
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
							onClick={(event) => this.changeMethod(event)}
						>
							{this.state.buttonName}
						</button>
					</form>
				</div>
				<Snackbar
					open={this.state.aviso}
					autoHideDuration={2000}
					onClose={() => {
						this.setState({ aviso: false });
					}}
				>
					<Alert
						onClose={() => {
							this.setState({ aviso: false });
						}}
						severity={this.state.severidade}
					>
						{this.state.mensagem}
					</Alert>
				</Snackbar>
			</>
		);
	}
}
