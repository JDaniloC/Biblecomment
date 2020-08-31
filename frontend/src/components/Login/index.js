import React, { Component } from 'react';
import axios from '../../services/api';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

import { login } from "../../services/auth";
import "./styles.css"

export default class Login extends Component {
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
            password: ""
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

    changeState(event) {
        event.preventDefault();
        this.setState({[event.target.name]: event.target.value});
    }

    async login(email, password) {
        try { 
            await axios.post("users/login", {
                email,
                password,
            }).then(response => {
                const token = response.data.token;
                if (token !== undefined) {
                    this.setState({
                        aviso: true,
                        mensagem: "Login realizado com sucesso!",
                        severidade: "success"
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

    async register(email, name, password) {
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
            this.login(this.state.email, this.state.password)
        } else {
            this.register(
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
            <form className="login-container" onSubmit={(evt) => {this.handleForm(evt)}}>
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
            <Snackbar 
                open={this.state.aviso} 
                autoHideDuration={6000} 
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