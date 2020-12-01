import React, { Component } from 'react';
import axios from '../../services/api';
import { Pagination } from '@material-ui/lab';

import { 
    isAuthenticated, TOKEN_KEY 
} from "../../services/auth";
import "./styles.css"

export default class Control extends Component {
    constructor(props) {
        super(props);

        this.state = {
            authorized: false,
            comments: [],
            users: [],
            discussions: [],

            totalUpages: 0,
            totalCpages: 0,
            totalDpages: 0,

            currentUpage: 1,
            currentCPage: 1,
            currentDPage: 1,
        }
    }

    async getUsers(page = 1) {
        return await axios.get("users",
        { params: {pages: page} }).then(response => {
            const users = response.data;
            this.setState({ 
                users: [...this.state.users, ...users],
            });
            const length = Math.ceil(this.state.users.length / 5);
            if (users.length === 5) {
                this.setState({ totalUpages: length + 1 });
            } else {
                this.setState({ totalUpages: length })
            }
        })
    }

    async getComments(page = 1) {
        return await axios.get("comments",
        { params: {pages: page} }).then(response => {
            const comments = response.data;
            this.setState({
                comments: [...this.state.comments, 
                    ...comments.map(item => {
                        item.likes = JSON.parse(item.likes);
                        item.reports = JSON.parse(item.reports);
                        return item;
                })],
            });
            const length = Math.ceil(this.state.comments.length / 5);
            if (comments.length === 5) {
                this.setState({ totalCpages: length + 1 });
            } else {
                this.setState({ totalCpages: length })
            }
        })
    }
    
    async getDiscussions(page = 1) {
        return await axios.get("discussions",
        { params: {pages: page} }).then(response => {
            const discussions = response.data;
            this.setState({ 
                discussions: [...this.state.discussions, ...discussions]
            });
            const length = Math.ceil(this.state.discussions.length / 5);
            if (discussions.length === 5) {
                this.setState({ totalDpages: length + 1 });
            } else {
                this.setState({ totalDpages: length })
            }
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
                if (response.data.moderator) {
                    this.setState({ authorized: true })
                    this.getUsers();
                    this.getComments();
                    this.getDiscussions();
                } 
            })
        }
    }

    async deleteAccount(email) {
        await axios.delete("users", {
            data: { token: localStorage.getItem(TOKEN_KEY), email }
        }).then(response => {
            console.log(response.data)
            if (response.data.error === undefined) {
                this.setState({ users: this.state.users.filter(
                    (user) => (user.email !== email))})
            }
        })
    }
    
    async deleteComment(id) {
        await axios.delete(`comments/${id}`, {
            headers: { token: localStorage.getItem(TOKEN_KEY) }
        }).then(response => {
            if (response.data.error === undefined) {
                this.setState({ comments: this.state.comments.filter(
                    (comment) => (comment.id !== id))})
            }
        })
    }

    async deleteDiscussion(id) {
        await axios.delete(`discussion/${id}`, {
            data: { token: localStorage.getItem(TOKEN_KEY) }
        }).then( response => {
            if (response.data.error === undefined) {
                this.setState({ discussions: this.state.discussions.filter(
                    (discussion) => (discussion.id !== id))})
            }
        })
    }

    calculatePagination(type) {
        let page = 0;
        let array = [];
        if (type === "users") {
            page = this.state.currentUpage;
            array = this.state.users;
        } else if (type === "comments") {
            page = this.state.currentCPage;
            array = this.state.comments;
        } else {
            page = this.state.currentDPage;
            array = this.state.discussions;
        }
        var inicio = (page - 1) * 5;
        var final = inicio + 5;

        return array.slice(inicio, final);
    }

    loadPagination(type) {
        if (type === "users") {
            const page = this.state.currentUpage;
            this.getUsers(page);
        } else if (type === "comments") {
            const page = this.state.currentCPage;
            this.getComments(page);
        } else {
            const page = this.state.currentDPage;
            this.getDiscussions(page);
        }
    }

    handleCPaginate(evt, page) { this.setState({ currentCPage: page }); }
    handleUPaginate(evt, page) { this.setState({ currentUPage: page }); }
    handleDPaginate(evt, page) { this.setState({ currentDPage: page }); }

    render() {
        return (
            (this.state.authorized) ? <main className="control">
                <h1> Painel de Controle </h1>
                
                <div className = "control-container">
                    <ul>
                        <h3> Usuários </h3>
                        {(this.calculatePagination("users").length > 0) ? 
                        this.calculatePagination("users").map(user => (
                            <li key={user.email}>
                                <label style = {{ display: "flex" }}
                                    htmlFor={user.email}> 
                                    <p> {user.email} </p> 
                                </label>
                                <input type="checkbox" id={user.email}/>
                                <div className = "user-comment">
                                    <p> E-mail: {user.email} </p>
                                    <p> Name: {user.name} </p>
                                    <p> State: {user.state} </p>
                                    <p> Belief: {user.belief} </p>
                                    <p> Since: {user.created_at} </p>
                                    <p> Total Comments: {user.total_comments} </p>
                                    <div className="config-buttons">
                                        <button 
                                            style={{ backgroundColor: "#FF4030"}}
                                            onClick = {() => this.deleteAccount(user.email)}>
                                            Deletar
                                        </button>
                                    </div>
                                </div>
                            </li>
                        )) : 
                        <button className = "load-btn" 
                            onClick = {() => this.loadPagination("users")}> 
                            Carregar 
                        </button> }
                        <Pagination 
                            className = "pagination" showFirstButton showLastButton
                            count = {this.state.totalUpages} size = "small" 
                            page = {this.state.currentUpage} shape="rounded"
                            onChange = {(evt, page) => {this.handleUPaginate(evt, page)}}/>
                    </ul>
                    <ul>
                        <h3> Últimos comentários </h3>
                        {(this.calculatePagination("comments").length > 0) ? 
                        this.calculatePagination("comments").map(comment => (
                            <li key={comment.id}>
                                <label style = {{ display: "flex" }}
                                    htmlFor={comment.text}> 
                                    <p> {comment.book_reference} {comment.text} </p> 
                                </label>
                                <input type="checkbox" id={comment.text}/>
                                <div className = "user-comment">
                                    <p> Por: {comment.username}</p>
                                    <p> {comment.text} </p>
                                    <p> Denúncias: {comment.reports.length}</p>
                                    <p> Favoritos: {comment.likes.length}</p>
                                    
                                    {(comment.reports.length > 0) ? 
                                    <ul style = {{ width: "100%" }}>
                                        <h4> Denúncias </h4>
                                        {comment.reports.map(report => (
                                            <li key={report.msg}>
                                                <h5> {report.user} </h5>
                                                <p> {report.msg} </p>
                                            </li>
                                        ))}
                                    </ul> : <></> }

                                    <div className="config-buttons">
                                        <button 
                                            style={{ backgroundColor: "#FF4030"}}
                                            onClick = {() => this.deleteComment(comment.id)}>
                                            Deletar
                                        </button>
                                    </div>
                                </div>
                            </li>
                        )) : 
                        <button className = "load-btn" 
                            onClick = {() => this.loadPagination("comments")}> 
                            Carregar 
                        </button>}
                        <Pagination 
                            className = "pagination" showFirstButton showLastButton
                            count = {this.state.totalCpages} size = "small" 
                            page = {this.state.currentCpage} shape="rounded"
                            onChange = {(evt, page) => {this.handleCPaginate(evt, page)}}/>
                    </ul>
                    <ul>
                        <h3> Discussões </h3>
                        {(this.calculatePagination("discussions").length > 0) ? 
                        this.calculatePagination("discussions").map(discussion => (
                            <li key={discussion.id * -1}>
                                <label style = {{ display: "flex" }}
                                    htmlFor={discussion.question}> 
                                    <p> {discussion.book_abbrev} {discussion.verse_reference} -{discussion.question} </p> 
                                </label>
                                <input type="checkbox" id={discussion.question}/>
                                <div className = "user-comment">
                                    <p> Por: {discussion.username}</p>
                                    <p> {discussion.verse_text} </p>
                                    <hr/>
                                    <p> {discussion.comment_text}</p>
                                    <hr/>
                                    <p> {discussion.question} </p>

                                    <div className="config-buttons">
                                        <button 
                                            style={{ backgroundColor: "#FF4030"}}
                                            onClick = {() => this.deleteDiscussion(discussion.id)}>
                                            Deletar
                                        </button>
                                    </div>
                                </div>
                            </li>
                        )) : 
                        <button className = "load-btn" 
                            onClick = {() => this.loadPagination("discussion")}> 
                            Carregar 
                        </button> }
                        <Pagination 
                            className = "pagination" showFirstButton showLastButton
                            count = {this.state.totalDpages} size = "small" 
                            page = {this.state.currentDpage} shape="rounded"
                            onChange = {(evt, page) => {this.handleDPaginate(evt, page)}}/>
                    </ul>
                </div>
            </main> : <h1> Não autorizado </h1>
        )
    }
}