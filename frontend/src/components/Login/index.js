import React, { Component } from 'react';

import "./styles.css"

export default class Login extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loginClass: "",
            registerClass: "invisible",
            buttonColor: "#1E7",
            buttonName: "Cadastrar"
        }
    }

    changeState(evt) {
        evt.preventDefault();
        if (this.state.loginClass === "") {
            this.setState({ 
                loginClass: "invisible" 
            })
            this.setState({
                registerClass: ""
            })
            
            this.setState({
                buttonColor: "#888"
            })
            this.setState({
                buttonName: "Login"
            })
        } else {
            this.setState({ 
                loginClass: "" 
            })
            this.setState({
                registerClass: "invisible"
            })
    
            this.setState({
                buttonColor: "#1E7"
            })
            this.setState({
                buttonName: "Cadastrar"
            })
        }
    }

    render() { 
        return (
            <form className="login-container">
                <input 
                    type="email" 
                    name="email" 
                    id="email" 
                    placeholder = "E-mail"    
                />
                <input 
                    className = {
                    this.state.registerClass}
                    type="text" 
                    name="nickname" 
                    placeholder = "Nome de usuário"
                />
                <input 
                    type="password" 
                    name="password" 
                    placeholder = "Senha"
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
                        this.changeState(evt)
                    }>
                        {this.state.buttonName} 
                </button>
            </form>
    )}
}