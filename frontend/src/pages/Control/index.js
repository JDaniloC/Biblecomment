import React, { Component } from "react";
import axios from "../../services/api";
import { Pagination } from "@material-ui/lab";

import { isAuthenticated, TOKEN_KEY } from "../../services/auth";
import "./styles.css";

const PAGE_LENGTH = 5;

export default class Control extends Component {
	constructor(props) {
		super(props);

		this.state = {
			authorized: false,
			comments: [],
			users: [],
			discussions: [],

			usersLength: 0,
			commentsLength: 0,

			commentsPage: 1,
			usersPage: 1,
			discussionLength: 0,
			discussionsPage: 1,
		};

		this.changeUsersPage = this.changeUsersPage.bind(this);
		this.changeCommentPage = this.changeCommentPage.bind(this);
		this.changeDiscussionsPage = this.changeDiscussionsPage.bind(this);
	}

	async getUsers(currentPage = 1) {
		const { data: newUsers } = await axios.get("users", 
			{ params: { pages: currentPage } });
		const usersCount = this.state.users.length;
		const length = Math.ceil(usersCount / PAGE_LENGTH);

		this.setState(prevState => ({
			users: [...prevState.users, ...newUsers]
		}))
		if (newUsers.length === PAGE_LENGTH) {
			this.setState({ usersLength: length + 1 });
		} else {
			this.setState({
				usersLength: length,
				usersPage: currentPage - 1,
			});
		}
	}

	async getComments(currentPage = 1) {
		const { data: comments } = await axios.get("comments", 
			{ params: { pages: currentPage } });
		const newComments = comments.map((item) => {
			item.likes = JSON.parse(item.likes);
			item.reports = JSON.parse(item.reports);
			return item;
		})
		const commentsCount = this.state.comments.length;
		const length = Math.ceil(commentsCount / PAGE_LENGTH);

		this.setState(prevState => ({
			comments: [...prevState.comments, ...newComments],
		}));
		if (newComments.length === PAGE_LENGTH) {
			this.setState({ commentsLength: length + 1 });
		} else {
			this.setState({
				commentsPage: currentPage - 1,
				commentsLength: length,
			});
		}
	}

	async getDiscussions(currentPage = 1) {
		const { data: newDiscussions } = await axios.get(
			"discussions", { params: { pages: currentPage } });
		const discussionsCount = this.state.discussions.length
		const length = Math.ceil(discussionsCount / PAGE_LENGTH);
		
		this.setState(prevState => ({
			discussions: [...prevState.state.discussions, ...newDiscussions],
		}));
		if (newDiscussions.length === PAGE_LENGTH) {
			this.setState({ discussionLength: length + 1 });
		} else {
			this.setState({
				discussionsPage: currentPage - 1,
				discussionLength: length,
			});
		}
	}

	componentDidMount() {
		function getUser(token) {
			return axios.get("session", {
				headers: { token: token },
			});
		}

		if (isAuthenticated()) {
			getUser(localStorage.getItem(TOKEN_KEY)).then((response) => {
				if (response.data.moderator) {
					this.setState({ authorized: true });
					this.getUsers();
					this.getComments();
					this.getDiscussions();
				}
			});
		}
	}

	async deleteAccount(email) {
		await axios
			.delete("users", {
				data: { token: localStorage.getItem(TOKEN_KEY), email },
			})
			.then((response) => {
				if (typeof response.data.error === "undefined") {
					this.setState(prevState => ({
						users: prevState.users.filter(
							user => user.email !== email
						),
					}));
				}
			});
	}

	async deleteComment(id) {
		await axios
			.delete(`comments/${id}`, {
				headers: { token: localStorage.getItem(TOKEN_KEY) },
			})
			.then((response) => {
				if (typeof response.data.error === "undefined") {
					this.setState(prevState => ({
						comments: prevState.comments.filter(
							(comment) => comment.id !== id
						),
					}));
				}
			});
	}

	async deleteDiscussion(id) {
		await axios
			.delete(`discussion/${id}`, {
				data: { token: localStorage.getItem(TOKEN_KEY) },
			})
			.then((response) => {
				if (typeof response.data.error === "undefined") {
					this.setState(prevState => ({
						discussions: prevState.discussions.filter(
							(discussion) => discussion.id !== id
						),
					}));
				}
			});
	}

	calculatePagination(type) {
		let page = 0;
		let array = [];
		if (type === "users") {
			page = this.state.usersPage;
			array = this.state.users;
		} else if (type === "comments") {
			page = this.state.commentsPage;
			array = this.state.comments;
		} else {
			page = this.state.discussionsPage;
			array = this.state.discussions;
		}
		var inicio = (page - 1) * 5;
		var final = inicio + 5;

		return array.slice(inicio, final);
	}

	loadPagination(type) {
		if (type === "users") {
			this.getUsers(this.state.usersPage);
		} else if (type === "comments") {
			this.getComments(this.state.commentsPage);
		} else {
			this.getDiscussions(this.state.discussionsPage);
		}
	}
	changeUsersPage(_, page) {
		this.setState({ usersPage: page });
	}
	changeCommentPage(_, page) {
		this.setState({ commentsPage: page });
	}
	changeDiscussionsPage(_, page) {
		this.setState({ discussionsPage: page });
	}

	render() {
		return this.state.authorized ? (
			<main className="control">
				<h1> Painel de Controle </h1>

				<div className="control-container">
					<ul>
						<h3> Usuários </h3>
						{this.calculatePagination("users").length > 0 ? (
							this.calculatePagination("users").map((user) => (
								<li key={user.email}>
									<label style={{ display: "flex" }} htmlFor={user.email}>
										<p> {user.email} </p>
									</label>
									<input type="checkbox" id={user.email} />
									<div
										className="user-comment"
										style={{ alignItems: "flex-start" }}
									>
										<p> E-mail: {user.email} </p>
										<p> Name: {user.name} </p>
										<p> State: {user.state} </p>
										<p> Belief: {user.belief} </p>
										<p> Since: {user.created_at} </p>
										<p> Total Comments: {user.total_comments} </p>
										<div className="config-buttons">
											<button
												style={{
													backgroundColor: "#FF4030",
												}}
												onClick={() => this.deleteAccount(user.email)}
											>
												Deletar
											</button>
										</div>
									</div>
								</li>
							))
						) : (
							<button
								className="load-btn"
								onClick={() => this.loadPagination("users")}
							>
								Carregar
							</button>
						)}
						<Pagination
							showFirstButton
							showLastButton
							size="small"
							shape="rounded"
							page={this.state.usersPage}
							count={this.state.usersLength}
							onChange={this.changeUsersPage}
						/>
					</ul>
					<ul>
						<h3> Últimos comentários </h3>
						{this.calculatePagination("comments").length > 0 ? (
							this.calculatePagination("comments").map((comment) => (
								<li key={comment.id}>
									<label style={{ display: "flex" }} htmlFor={comment.text}>
										<p>
											{comment.book_reference} {comment.text}
										</p>
									</label>
									<input type="checkbox" id={comment.text} />
									<div className="user-comment">
										<p> Por: {comment.username}</p>
										<p> {comment.text} </p>
										<p> Denúncias: {comment.reports.length}</p>
										<p> Favoritos: {comment.likes.length}</p>

										{comment.reports.length > 0 ? (
											<ul style={{ width: "100%" }}>
												<h4> Denúncias </h4>
												{comment.reports.map((report) => (
													<li key={report.msg}>
														<h5> {report.user} </h5>
														<p> {report.msg} </p>
													</li>
												))}
											</ul>
										) : (
											<></>
										)}

										<div className="config-buttons">
											<button
												style={{
													backgroundColor: "#FF4030",
												}}
												onClick={() => this.deleteComment(comment.id)}
											>
												Deletar
											</button>
										</div>
									</div>
								</li>
							))
						) : (
							<button
								className="load-btn"
								onClick={() => this.loadPagination("comments")}
							>
								Carregar
							</button>
						)}
						<Pagination
							showFirstButton
							showLastButton
							size="small"
							shape="rounded"
							page={this.state.commentsPage}
							count={this.state.commentsLength}
							onChange={this.changeCommentPage}
						/>
					</ul>
					<ul>
						<h3> Discussões </h3>
						{this.calculatePagination("discussions").length > 0 ? (
							this.calculatePagination("discussions").map((discussion) => (
								<li key={discussion.id * -1}>
									<label
										style={{ display: "flex" }}
										htmlFor={discussion.question}
									>
										<p>
											{" "}
											{discussion.book_abbrev} {discussion.verse_reference} -
											{discussion.question}{" "}
										</p>
									</label>
									<input type="checkbox" id={discussion.question} />
									<div className="user-comment">
										<p> Por: {discussion.username}</p>
										<p> {discussion.verse_text} </p>
										<hr />
										<p> {discussion.comment_text}</p>
										<hr />
										<p> {discussion.question} </p>

										<div className="config-buttons">
											<button
												style={{
													backgroundColor: "#FF4030",
												}}
												onClick={() => this.deleteDiscussion(discussion.id)}
											>
												Deletar
											</button>
										</div>
									</div>
								</li>
							))
						) : (
							<button
								className="load-btn"
								onClick={() => this.loadPagination("discussion")}
							>
								Carregar
							</button>
						)}
						<Pagination
							showFirstButton
							showLastButton
							size="small"
							shape="rounded"
							page={this.state.discussionsPage}
							count={this.state.discussionLength}
							onChange={this.changeDiscussionsPage}
						/>
					</ul>
				</div>
			</main>
		) : (
			<h1> Não autorizado </h1>
		);
	}
}
