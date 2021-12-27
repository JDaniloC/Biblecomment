import "./styles.css";

import React, { Component } from "react";
import { Pagination } from "@material-ui/lab";
import { isAuthenticated } from "../../services/auth";

import axios from "../../services/api";

const PAGE_LENGTH = 5;

export default class Control extends Component {
	constructor(props) {
		super(props);

		this.state = {
			authorized: false,
			discussions: [],
			comments: [],
			users: [],

			usersTotalPages: 0,
			commentsTotalPages: 0,

			usersPage: 1,
			commentsPage: 1,
			discussionsPage: 1,
			discussionsTotalPages: 0,
		};

		this.handleUsersPage = this.handleUsersPage.bind(this);
		this.handleCommentsPage = this.handleCommentsPage.bind(this);
		this.handleDiscussionsPage = this.handleDiscussionsPage.bind(this);

		this.handleLoadUsers = this.handleLoadUsers.bind(this);
		this.handleLoadComments = this.handleLoadComments.bind(this);
		this.handleLoadDiscussion = this.handleLoadDiscussion.bind(this);
	}

	shouldComponentUpdate(nextProperties, nextState) {
		if (this.state !== nextState || this.props !== nextProperties) {
			return true;
		}
		return false;
	}

	async getUsers(currentPage = 1) {
		const { users } = this.state;
		const { data: newUsers } = await axios.get("users", {
			params: { pages: currentPage },
		});

		const usersSum = users.length + newUsers.length;
		const newTotal = Math.ceil(usersSum / PAGE_LENGTH);

		this.setState((prevState) => ({
			users: [...prevState.users, ...newUsers],
		}));

		if (newUsers.length === PAGE_LENGTH) {
			this.setState({ usersTotalPages: newTotal + 1 });
		} else {
			this.setState({
				usersTotalPages: newTotal,
				usersPage: currentPage - 1,
			});
		}
	}

	async getComments(currentPage = 1) {
		const { comments } = this.state;

		const { data: dataComments } = await axios.get("comments/", {
			params: { pages: currentPage },
		});
		const newComments = dataComments.map((item) => {
			item.likes = JSON.parse(item.likes);
			item.reports = JSON.parse(item.reports);
			return item;
		});
		const commentsSum = comments.length + newComments.length;
		const newTotal = Math.ceil(commentsSum / PAGE_LENGTH);

		this.setState((prevState) => ({
			comments: [...prevState.comments, ...newComments],
		}));
		if (newComments.length === PAGE_LENGTH) {
			this.setState({ commentsTotalPages: newTotal + 1 });
		} else {
			this.setState({
				commentsPage: currentPage - 1,
				commentsTotalPages: newTotal,
			});
		}
	}

	async getDiscussions(currentPage = 1) {
		const { discussions } = this.state;

		const { data: newDiscussions } = await axios.get("discussions/", {
			params: { pages: currentPage },
		});

		const discussionSum = discussions.length + newDiscussions.length;
		const newTotal = Math.ceil(discussionSum / PAGE_LENGTH);

		this.setState((prevState) => ({
			discussions: [...prevState.discussions, ...newDiscussions],
		}));
		if (newDiscussions.length === PAGE_LENGTH) {
			this.setState({ discussionsTotalPages: newTotal + 1 });
		} else {
			this.setState({
				discussionsPage: currentPage - 1,
				discussionsTotalPages: newTotal,
			});
		}
	}

	componentDidMount() {
		if (isAuthenticated()) {
			axios.get("session/").then(({ data }) => {
				if (data.moderator) {
					this.setState({ authorized: true });
					this.getUsers();
					this.getComments();
					this.getDiscussions();
				}
			})
			.catch(({ response }) => {
				this.handleNotification("error", response.data.error);
			});
		}
	}

	async handleDeleteAccount(evt) {
		const email = evt.target.getAttribute("data-email");
		await axios
			.delete("users/", { data: { email } })
			.then(({ status }) => {
				if (status === 200) {
					this.setState((prevState) => ({
						users: prevState.users.filter(
							(user) => user.email !== email
					)}));
				}
			})
			.catch(({ response }) => {
				this.handleNotification("error", response.data.error);
			});
	}

	async handleDeleteComment(evt) {
		const id = evt.target.getAttribute("data-id");
		await axios
			.delete(`comments/${id}/`)
			.then((response) => {
				if (typeof response.data.error === "undefined") {
					this.setState((prevState) => ({
						comments: prevState.comments.filter((comment) => comment.id !== id),
					}));
				}
			})
			.catch(({ response }) => {
				this.handleNotification("error", response.data.error);
			});
	}

	async handleDeleteDiscussion(evt) {
		const id = evt.target.getAttribute("data-id");
		await axios
			.delete(`discussion/${id}`)
			.then((response) => {
				if (typeof response.data.error === "undefined") {
					this.setState((prevState) => ({
						discussions: prevState.discussions.filter(
							(discussion) => discussion.id !== id
						),
					}));
				}
			})
			.catch(({ response }) => {
				this.handleNotification("error", response.data.error);
			});
	}

	calculatePagination(type) {
		const {
			users,
			usersPage,
			comments,
			commentsPage,
			discussions,
			discussionsPage,
		} = this.state;
		let page = 0;
		let array = [];

		if (type === "users") {
			page = usersPage;
			array = users;
		} else if (type === "comments") {
			page = commentsPage;
			array = comments;
		} else {
			page = discussionsPage;
			array = discussions;
		}
		const inicio = (page - 1) * PAGE_LENGTH;
		const final = inicio + PAGE_LENGTH;

		return array.slice(inicio, final);
	}

	handleUsersPage(_, page) {
		this.setState({ usersPage: page });
	}
	handleCommentsPage(_, page) {
		this.setState({ commentsPage: page });
	}
	handleDiscussionsPage(_, page) {
		this.setState({ discussionsPage: page });
	}

	handleLoadUsers() {
		const { usersPage } = this.state;
		this.getUsers(usersPage);
	}
	handleLoadComments() {
		const { commentsPage } = this.state;
		this.getComments(commentsPage);
	}
	handleLoadDiscussion() {
		const { discussionsPage } = this.state;
		this.getDiscussions(discussionsPage);
	}

	render() {
		const {
			authorized,
			usersPage,
			commentsPage,
			discussionsPage,
			usersTotalPages,
			commentsTotalPages,
			discussionsTotalPages,
		} = this.state;

		return authorized ? (
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
										<p> Name: {user.username} </p>
										<p> State: {user.state} </p>
										<p> Belief: {user.belief} </p>
										<p> Since: {user.created_at} </p>
										<p> Total Comments: {user.total_comments} </p>
										<div className="config-buttons">
											<button
												type="button"
												style={{
													backgroundColor: "#FF4030",
												}}
												data-email={user.email}
												onClick={this.handleDeleteAccount}
											>
												Deletar
											</button>
										</div>
									</div>
								</li>
							))
						) : (
							<button
								type="button"
								className="load-btn"
								onClick={this.handleLoadUsers}
							>
								Carregar
							</button>
						)}
						<Pagination
							showFirstButton
							showLastButton
							size="small"
							shape="rounded"
							page={usersPage}
							onChange={this.handleUsersPage}
							count={usersTotalPages}
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

										{comment.reports.length > 0 && (
											<ul style={{ width: "100%" }}>
												<h4> Denúncias </h4>
												{comment.reports.map((report) => (
													<li key={report.msg}>
														<h5> {report.user} </h5>
														<p> {report.msg} </p>
													</li>
												))}
											</ul>
										)}

										<div className="config-buttons">
											<button
												type="button"
												style={{
													backgroundColor: "#FF4030",
												}}
												data-id={comment.id}
												onClick={this.handleDeleteComment}
											>
												Deletar
											</button>
										</div>
									</div>
								</li>
							))
						) : (
							<button
								type="button"
								className="load-btn"
								onClick={this.handleLoadComments}
							>
								Carregar
							</button>
						)}
						<Pagination
							showFirstButton
							showLastButton
							size="small"
							shape="rounded"
							page={commentsPage}
							count={commentsTotalPages}
							onChange={this.handleCommentsPage}
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
												type="button"
												style={{
													backgroundColor: "#FF4030",
												}}
												data-id={discussion.id}
												onClick={this.handleDeleteDiscussion}
											>
												Deletar
											</button>
										</div>
									</div>
								</li>
							))
						) : (
							<button
								type="button"
								className="load-btn"
								onClick={this.handleLoadDiscussion}
							>
								Carregar
							</button>
						)}
						<Pagination
							showFirstButton
							showLastButton
							size="small"
							shape="rounded"
							page={discussionsPage}
							count={discussionsTotalPages}
							onChange={this.handleDiscussionsPage}
						/>
					</ul>
				</div>
			</main>
		) : (
			<h1> Não autorizado </h1>
		);
	}
}
