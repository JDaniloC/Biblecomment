import React, { Component, createRef } from "react";
import { ProfileContext } from "contexts/ProfileContext";

import NewComment from "components/NewComment";
import ProfileHeader from "./components/ProfileHeader";
import ProfileConfig from "./components/ProfileConfig";
import ProfileComments from "./components/ProfileComments";

import PropTypes from "prop-types";

import "./styles.css";

export default class Profile extends Component {
	static contextType = ProfileContext;

	constructor(props) {
		super(props);

		this.state = {
			perfilClass: "invisible",
			editBox: "invisible",
			blur: "none",
			selected: 0,
			perfilDisplay: "contents",
			configDisplay: "none",
			buttonDisplay: "block",
		};

		this.editComponent = createRef();
		this.handleConfig = this.handleConfig.bind(this);
		this.closeEditComment = this.closeEditComment.bind(this);
		this.handleCommentEdit = this.handleCommentEdit.bind(this);
	}

	handleCommentEdit(comment) {
		this.context.commentaries[this.state.selected].text = comment.text;
	}
	editComment(identificador) {
		let selected = "";
		let index = 0;
		this.context.commentaries.forEach((element, i) => {
			if (element.id === identificador) {
				selected = element.text;
				index = i;
			}
		});
		this.editComponent.current.setState({
			texto: selected,
			comment_id: identificador,
		});

		this.setState({
			selected: index,
			blur: "block",
			editBox: "visible centro",
		});
	}
	closeEditComment(evt) {
		evt.preventDefault();
		this.setState({ blur: "none", editBox: "invisible" });
	}

	deleteComment(identificador) {
		if (window.confirm("Tem certeza que quer deletar este comentário?")) {
			this.context.setCommentaries(
				this.context.commentaries.filter((item) => {
					return item.id !== identificador;
				})
			);
			this.props.deleteComment(identificador);
		}
	}

	handleConfig() {
		if (this.state.perfilDisplay === "contents") {
			this.setState({
				perfilDisplay: "none",
				buttonDisplay: "none",
				configDisplay: "flex",
			});
		} else {
			this.setState({
				perfilDisplay: "contents",
				buttonDisplay: "block",
				configDisplay: "none",
			});
		}
	}

	render() {
		return (
			<>
				<section className={this.context.perfilClass}>
					<ProfileHeader
						username={this.context.name}
						handleConfig={this.handleConfig}
					/>
					<ul style={{ display: this.state.perfilDisplay }}>
						<li>
							Total de livros comentados:
							{this.context.booksCount} de 66
						</li>
						<li>
							Total de capítulos comentados:
							{this.context.chaptersCount} de 1.189
						</li>
						<li>
							Total de comentários feitos:
							{this.context.commentsCount}
						</li>

						<ProfileComments
							type="comments"
							comments={this.context.commentaries}
							getComments={this.context.getComments}
							editComment={this.editComment.bind(this)}
							deleteComment={this.deleteComment.bind(this)}
						/>
						<ProfileComments
							type="favorites"
							comments={this.context.favorites}
							getComments={this.context.getFavorites}
						/>
					</ul>
					<ProfileConfig
						configDisplay={this.state.configDisplay}
						closeAccount={this.props.closeAccount}
					/>
					<button
						style={{ display: this.state.buttonDisplay }}
						onClick={this.props.closeAccount}
					>
						Sair
					</button>
				</section>

				<div className={this.state.editBox}>
					<NewComment
						post={false}
						ref={this.editComponent}
						title="Editar comentário"
						close={this.closeEditComment}
						addNewComment={this.handleCommentEdit}
					/>
				</div>
				<div className="overlay" style={{ display: this.state.blur }}></div>
			</>
		);
	}
}
Profile.propTypes = {
	closeAccount: PropTypes.func.isRequired,
	deleteComment: PropTypes.func.isRequired,
};
