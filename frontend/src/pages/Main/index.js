import React, { Component } from 'react';
import Login from "../../components/Login";
import BooksIndex from "../../components/BooksIndex";

import "./styles.css";

const logo = require("../../assets/logo.png")

export default class Main extends Component {
    render() {
        return (
            <div className="panel">
                <div className="logo-container">
                    <img src={logo} alt="logo"/>
                    <p> 
                        Compartilhe a mensagem de Deus <br/> com seus irmãos 
                    </p>
                    <Login/>
                </div>
                <BooksIndex/>
            </div>   
            )
    }
}