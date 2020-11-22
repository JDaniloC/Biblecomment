import React, { Component, createRef } from 'react';
import axios from '../../services/api';
import Snackbar from '@material-ui/core/Snackbar';
import Profile from '../Profile';
import { Alert } from '@material-ui/lab';

import { 
    login, logout, isAuthenticated, TOKEN_KEY 
} from "../../services/auth";
import "./styles.css"

export default class Login extends Component {
    constructor(props) {
        super(props);

        this.state = {
            formClass: "",
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
            commented: {}
        }
        
        this.profileComponent = createRef();

        this.updateAccount = this.updateAccount.bind(this);
        this.deleteAccount = this.deleteAccount.bind(this);
        this.deleteComment = this.deleteComment.bind(this);
        this.handleNotification = this.handleNotification.bind(this);
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
    } 

    _isLoginClassEmpty = () => {
        return this.state.loginClass === "";
    }

    _setStateCaseLoginClassIsEmpty = () => {
        this.setState({ 
            loginClass: "invisible",
            registerClass: "",
            buttonColor: "#888",
            buttonName: "Login"
        })
    }

    _setStateCaseLoginClassIsNotEmpty = () => {
        this.setState({ 
            loginClass: "", 
            registerClass: "invisible",
            buttonColor: "#1E7",
            buttonName: "Cadastrar"
        })
    }

    componentDidMount() {
        async function getUser(token) {
            return await axios.get("session", {
                headers: { "token": token }
            })
        }

        if (isAuthenticated()) {
            getUser(localStorage.getItem(TOKEN_KEY)).then(response => {
                if (response.data.chapters_commented) {
                    this.parse_user(response)
                } else {
                    this.handleNotification(
                        "Não consegui acessar sua conta.", "info")
                }
            })

        }
    }

    changeState(event) {
        event.preventDefault();
        this.setState({[event.target.name]: event.target.value});
    }

    async deleteComment(identificador) {
        try {
            await axios.delete(`/comments/${identificador}`, {
                headers: { "token": localStorage.getItem(TOKEN_KEY) }
            }).then( response => {
                this.handleNotification("Comentário excluído com sucesso.", "success")
            })
        } catch (err) {
            this.handleNotification("Problema no servidor", "error")
        }
    }

    async get_infos() {
        this.profileComponent.current.setState({
            totalCpages: -1,
            totalFpages: -1
        })

        try {
            await axios.get("users/infos", {
                headers: { "name": this.state.name }
            }).then( response => {
                if (response.data.favorites !== undefined) {
                    const favorites = response.data.favorites;
                    const comments = response.data.comments;
                    this.profileComponent.current.setState({
                        favorites: favorites,
                        commentaries: comments, 
                        totalFpages: Math.ceil(favorites.length / 5), 
                        totalCpages: Math.ceil(comments.length / 5) 
                    })}
                }
            )
        } catch (error) {
            this.handleNotification("Problema no servidor", "error")
        }
    }

    parse_user(response) {
        const data = response.data;

        const commented = JSON.parse(
            data.chapters_commented)
        this.setState({ commented: commented })
        const total_books = Object.keys(commented).length
        let total_chapters = 0
        for (var book in commented) {
            total_chapters += commented[book].length
        }

        this.profileComponent.current.setState({   
            email: this.state.email,             
            name: data.name,
            total_books: total_books,
            total_chapters: total_chapters,
            total_comments: data.total_comments,
            perfilClass: "",
            belief: (data.belief !== null) ? data.belief : "",
            state: (data.state !== null) ? data.state : ""
        })
        this.setState({
            name: data.name,
            formClass: "invisible",
        })

        this.get_infos()
    }

    async tryLogin(email, password) {
        try { 
            await axios.post("session/login", {
                email, password
            }).then(response => {
                const token = response.data.token;
                if (token !== undefined) {
                    this.parse_user(response)
                    this.handleNotification(
                        "Login realizado com sucesso!", "success")
                    login(token);
                } else {
                    this.handleNotification(response.data.msg, "warning")
                }
            })
        } catch (error) {
            this.handleNotification("Problema no servidor", "error")
        }
    }

    async tryRegister(email, name, password) {
        try {
            await axios.post("session/register", {
                email,
                name,
                password
            }).then(response => {
                if (response.data.error === undefined) {
                    this.handleNotification(
                        "Cadastro realizado com sucesso!", "success");
                    this.changeMethod(null)
                } else {
                    this.handleNotification(response.data.error, "warning")
                }
            })
        } catch (error) {
            this.handleNotification("Problema no servidor", "error")
        }
    }

    handleForm(event) {
        event.preventDefault();
        
        if (this.state.loginClass === "") {
            this.tryLogin(this.state.email, this.state.password)
        } else {
            this.tryRegister(
                this.state.email, 
                this.state.name, 
                this.state.password
        )}
    }

    closeAviso(event, reason) {
        if (event != null){
            event.preventDefault();
        }

        if (reason === 'clickaway') {
            return;
        }
      
        this.setState({ aviso:false });
    }

    handleNotification(mensagem, severidade, data = null) {
        this.setState({
            aviso: true,
            mensagem: mensagem,
            severidade: severidade
        })
    }

    async updateAccount(belief, state) {
        try {
            await axios.patch("users", {
                token: localStorage.getItem(TOKEN_KEY),
                belief, state
            }).then(response => {
                if (response.data.error === undefined) {
                    this.handleNotification(
                        "Conta atualizada com sucesso.", "success");
                } else {
                    this.handleNotification(
                        response.data.error, "warning")
                }
            })
        } catch (error) {
            this.handleNotification(`${error}`, "error")
        }
    }

    async deleteAccount(email) {
        try {
            await axios.delete("users", {
                data: { token: localStorage.getItem(TOKEN_KEY), email }
            }).then(response => {
                if (response.data.error === undefined) {
                    console.log(response.data)
                    this.handleNotification(
                        "Conta removida com sucesso.", "success");
                    this.profileComponent.current.closeAccount();
                } else {
                    this.handleNotification(
                        response.data.error, "warning")
                }
            })
        } catch (error) {
            this.handleNotification(`${error}`, "error")
        }
    }
    
    render() { 
        return (
            <>
            <div className="login-container" >
                <Profile 
                    ref = {this.profileComponent}
                    deleteComment = {this.deleteComment}
                    notification = {this.handleNotification}
                    closeAccount = {() => {
                        logout();
                        this.setState({ formClass: "" })}}
                    updateAccount = {this.updateAccount}
                    deleteAccount = {this.deleteAccount}
                />
                <form className = {this.state.formClass} onSubmit={
                    (event) => {this.handleForm(event)}}>
                    <input 
                        type="email" 
                        name="email" 
                        id="email" 
                        placeholder = "E-mail"
                        onChange = {(event) => {this.changeState(event)}}
                        required
                    />
                    <input 
                        className = {
                        this.state.registerClass}
                        type="text" 
                        name="name" 
                        placeholder = "Nome de usuário"
                        onChange = {(event) => {this.changeState(event)}}
                    />
                    <input 
                        type="password" 
                        name="password" 
                        placeholder = "Senha"
                        onChange = {(event) => {this.changeState(event)}}
                        required
                    />
                    <input 
                        className = {
                        this.state.loginClass}
                        type="submit" 
                        value="Entrar"/>
                    <input 
                        className = {
                        this.state.registerClass}
                        style = {{backgroundColor:"#1E7"}}
                        type="submit" 
                        value="Cadastrar"/>
                    <hr/>   
                    <button
                        style = {
                        {backgroundColor:
                            this.state.buttonColor}}
                        onClick = {
                            (event) => 
                            this.changeMethod(event)
                        }>
                            {this.state.buttonName} 
                    </button>
                </form>
            </div>
            <Snackbar 
                open={this.state.aviso} 
                autoHideDuration={2000} 
                onClose={(event, reason) => {
                    this.closeAviso(event, reason)}}>
                <Alert onClose={(event, reason) => {
                    this.closeAviso(event, reason)}} 
                severity={this.state.severidade}>
                    {this.state.mensagem}
                </Alert>
            </Snackbar>
        </>
    )}
}