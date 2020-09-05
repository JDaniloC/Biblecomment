import React, { Component } from 'react';
import axios from '../../services/api';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

import { 
    login, logout, isAuthenticated, TOKEN_KEY 
} from "../../services/auth";
import "./styles.css"

export default class Login extends Component {
    constructor(props) {
        super(props);

        this.state = {
            formClass: "",
            perfilClass: "invisible",
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

            total_comments: 0,
            total_books: 0,
            total_chapters: 0
        }
    }

    changeMethod(evt) {
        if (evt !== null) { evt.preventDefault(); }
        if (this.state.loginClass === "") {
            this.setState({ 
                loginClass: "invisible",
                registerClass: "",
                buttonColor: "#888",
                buttonName: "Login"
            })
        } else {
            this.setState({ 
                loginClass: "", 
                registerClass: "invisible",
                buttonColor: "#1E7",
                buttonName: "Cadastrar"
            })
        }
    }

    componentDidMount() {
        async function get_infos(token) {
            return await axios.get("users", {
                headers: {
                    "token": token
                }
            })
        }

        if (isAuthenticated()) {
            get_infos(localStorage.getItem(TOKEN_KEY)).then(response => {
                const info = this.parse_user(response)
                this.setState({                
                    name: info["name"],
                    total_books: info["total_books"],
                    total_chapters: info["total_chapters"],
                    total_comments: info["total_comments"],
    
                    formClass: "invisible",
                    perfilClass: ""
                })
            })

        }
    }

    closeAccount(evt) {
        evt.preventDefault();
        logout();

        this.setState({
            formClass: "",
            perfilClass: "invisible"
        })
    }

    changeState(event) {
        event.preventDefault();
        this.setState({[event.target.name]: event.target.value});
    }

    parse_user(response) {
        const commented = JSON.parse(
            response.data.chapters_commented)
        const total_books = Object.keys(commented).length
        let total_chapters = 0
        for (var book in commented) {
            total_chapters += book.length
        }

        return {
            "name": response.data.name,
            "total_books": total_books,
            "total_chapters": total_chapters,
            "total_comments": response.data.total_comments
        }
    }

    async try_login(email, password) {
        try { 
            await axios.post("users/login", {
                email,
                password
            }).then(response => {
                const token = response.data.token;
                if (token !== undefined) {
                    const info = this.parse_user(response)
                    this.setState({
                        aviso: true,
                        mensagem: "Login realizado com sucesso!",
                        severidade: "success",
                        
                        name: info["name"],
                        total_books: info["total_books"],
                        total_chapters: info["total_chapters"],
                        total_comments: info["total_comments"],

                        formClass: "invisible",
                        perfilClass: ""
                    })
                    login(token);
                } else {
                    this.setState({
                        aviso: true,
                        severidade: "warning",
                        mensagem: response.data.msg
                    })
                }
            })
        } catch (error) {
            this.setState({
                aviso: true,
                mensagem: "Problema no servidor",
                severidade: "error"
            })
        }
    }

    async try_register(email, name, password) {
        try {
            await axios.post("users/register", {
                email,
                name,
                password
            }).then(response => {
                if (response.data.error === undefined) {
                    this.setState({
                        aviso: true,
                        mensagem: "Cadastro realizado com sucesso!",
                        severidade: "success"
                    })
                    this.changeMethod(null)
                } else {
                    this.setState({
                        aviso: true,
                        severidade: "warning",
                        mensagem: response.data.error
                    })
                }
            })
        } catch (error) {
            this.setState({
                aviso: true,
                mensagem: "Problema no servidor",
                severidade: "error"
            })
        }
    }

    handleForm(evt) {
        evt.preventDefault();
        
        if (this.state.loginClass === "") {
            this.try_login(this.state.email, this.state.password)
        } else {
            this.try_register(
                this.state.email, 
                this.state.name, 
                this.state.password)
        }
    }

    closeAviso(evt, reason) {
        if (evt != null){
            evt.preventDefault();
        }

        if (reason === 'clickaway') {
            return;
        }
      
        this.setState({ aviso:false });
    }

    render() { 
        return (
            <>
            <div className="login-container" >
                <section className={this.state.perfilClass}>
                    <h2> Adorador {this.state.name} </h2>
                    <p> {this.state.email} </p>
                    <ul>
                        <li>
                            Total de livros comentados: {this.state.total_books} de 66
                        </li>
                        <li>
                            Total de capítulos comentados: {this.state.total_chapters} de 1.189
                        </li>
                        <li>
                            Total de comentários feitos: {this.state.total_comments}
                        </li>
                    </ul>
                    <button 
                        onClick = {(evt) => {this.closeAccount(evt)}} > 
                        Sair 
                    </button>
                </section>
                <form className = {this.state.formClass} onSubmit={
                    (evt) => {this.handleForm(evt)}}>
                    <input 
                        type="email" 
                        name="email" 
                        id="email" 
                        placeholder = "E-mail"
                        onChange = {(evt) => {this.changeState(evt)}}
                        required
                    />
                    <input 
                        className = {
                        this.state.registerClass}
                        type="text" 
                        name="name" 
                        placeholder = "Nome de usuário"
                        onChange = {(evt) => {this.changeState(evt)}}
                    />
                    <input 
                        type="password" 
                        name="password" 
                        placeholder = "Senha"
                        onChange = {(evt) => {this.changeState(evt)}}
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
                            (evt) => 
                            this.changeMethod(evt)
                        }>
                            {this.state.buttonName} 
                    </button>
                </form>
            </div>
            <Snackbar 
                open={this.state.aviso} 
                autoHideDuration={2000} 
                onClose={(evt, reason) => {
                    this.closeAviso(evt, reason)}}>
                <Alert onClose={(evt, reason) => {
                    this.closeAviso(evt, reason)}} 
                severity={this.state.severidade}>
                    {this.state.mensagem}
                </Alert>
            </Snackbar>
            </>
    )}
}