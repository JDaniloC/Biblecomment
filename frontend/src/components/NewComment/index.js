import { isAuthenticated, TOKEN_KEY } from "../../services/auth";
import { ProfileContext } from "../../contexts/ProfileContext";

import React, { Component } from "react";
import axios from "../../services/api";
import PropTypes from "prop-types";

import "balloon-css";
import "./styles.css";

const close = require("../../assets/x.svg");
const pen = require("../../assets/pen.svg");
const book = require("../../assets/book.svg");
const hand = require("../../assets/hand.svg");
const person = require("../../assets/person.svg");

export default class NewComment extends Component {
	static contextType = ProfileContext;

	constructor(props) {
		super(props);

		this.state = {
			devocional: false,
			exegese: false,
			inspirado: false,
			pessoal: false,
			texto: "",
			comment_id: -1,
		};
	}

	componentDidMount() {
		if (this.props.text !== "") {
			this.setState({ texto: this.props.text });
		}
	}

	postNewComment(evt) {
		evt.preventDefault();

		if (this.state.nome === "") {
			return this.context.handleNotification(
				"info",
				"Você precisa estar logado!"
			);
		} else if (
			this.state.texto.length < 200 ||
			this.state.texto.length > 1000
		) {
			return this.context.handleNotification(
				"O mínimo de caracteres é 200 e o máximo de 1000!",
				"info"
			);
		}
		const tags = [];
		if (this.state.devocional) {
			tags.push("devocional");
		}
		if (this.state.exegese) {
			tags.push("exegese");
		}
		if (this.state.inspirado) {
			tags.push("inspirado");
		}
		if (this.state.pessoal) {
			tags.push("pessoal");
		}

		try {
			if (isAuthenticated()) {
				const token = localStorage.getItem(TOKEN_KEY);
				const text = this.state.texto;
				if (this.props.post) {
					const abbrev = this.props.abbrev;
					const number = this.props.number;
					const verso = this.props.verso() + 1;
					axios
						.post(`books/${abbrev}/chapters/${number}/comments/${verso}`, {
							on_title: this.props.on_title.selected,
							text,
							token,
							tags,
						})
						.then((response) => {
							this.context.handleNotification(
								"success",
								"Comentário enviado!"
							);
							this.props.addNewComment(response.data);
							this.context.addNewComment(response.data);
						});
				} else {
					axios
						.patch(`/comments/${this.state.comment_id}`, {
							text,
							token,
							tags,
						})
						.then((response) => {
							this.context.handleNotification(
								"success",
								"Comentário editado!"
							);
							this.props.addNewComment(response.data);
						});
				}
			} else {
				this.context.handleNotification(
					"info", 
					"Você precisa estar logado", 
				);
			}
		} catch (error) {
			this.context.handleNotification(
				"error", 
				error.toString(), 
			);
		}
		this.setState({ texto: "" });
		this.props.close(evt);
	}

	handleChange(event) {
		let value = "";
		if (typeof event.target.checked !== "undefined") {
			value = event.target.checked;
		} else {
			value = event.target.value;
			if (value.slice(-2) === "  ") {
				value = value.slice(0, -1);
			}
			if (value.length < 200 || value.length > 1000) {
				this.textArea.style.borderColor = "red";
			} else {
				this.textArea.style.borderColor = "aquamarine";
			}
		}
		this.setState({ [event.target.name.replace("y", "")]: value });
	}

	render() {
		const tipo = this.props.post ? "" : "y";

		return (
			<div className="pop-up">
				<div className="top">
					<h2 style={{ alignSelf: "center" }}>{this.props.title}</h2>
					<button onClick={this.props.close}>
						<img src={close} alt="Fechar" />
					</button>
				</div>

				<div className="text-area">
					<div className="textarea-top">
						<label
							style={{ marginLeft: "20px" }}
							aria-label="Devocional"
							data-balloon-pos="down-right"
							htmlFor={`devocional${tipo}`}
						>
							<input
								type="checkbox"
								name={`devocional${tipo}`}
								value={this.state.devocional}
								onChange={(evt) => {
									this.handleChange(evt);
								}}
								id={`devocional${tipo}`}
							/>
							<img className="tag" src={hand} alt="handIcon" />
						</label>
						<label
							aria-label="Exegese"
							data-balloon-pos="down-right"
							htmlFor={"exegese" + tipo}
						>
							<input
								type="checkbox"
								name={"exegese" + tipo}
								value={this.state.exegese}
								onChange={(evt) => {
									this.handleChange(evt);
								}}
								id={"exegese" + tipo}
							/>
							<img className="tag" src={book} alt="bookIcon" />
						</label>
						<label
							aria-label="Inspirado"
							data-balloon-pos="down-right"
							htmlFor={"inspirado" + tipo}
						>
							<input
								type="checkbox"
								name={"inspirado" + tipo}
								value={this.state.inspirado}
								onChange={(evt) => {
									this.handleChange(evt);
								}}
								id={"inspirado" + tipo}
							/>
							<img className="tag" src={pen} alt="penIcon" />
						</label>
						<label
							aria-label="Pessoal"
							data-balloon-pos="down-right"
							htmlFor={"pessoal" + tipo}
						>
							<input
								type="checkbox"
								name={"pessoal" + tipo}
								value={this.state.pessoal}
								onChange={(evt) => {
									this.handleChange(evt);
								}}
								id={"pessoal" + tipo}
							/>
							<img className="tag" src={person} alt="personIcon" />
						</label>
					</div>
					<textarea
						name="texto"
						id="texto"
						value={this.state.texto}
						onChange={(evt) => {
							this.handleChange(evt);
						}}
						ref={(ref) => (this.textArea = ref)}
						placeholder="Descreva seu comentário"
					></textarea>
				</div>
				<button
					type="submit"
					onClick={(evt) => {
						this.postNewComment(evt);
					}}
					className="entry"
				>
					Enviar
				</button>
			</div>
		);
	}
}
NewComment.propTypes = {
	verso: PropTypes.func,
	text: PropTypes.string,
	number: PropTypes.number,
	abbrev: PropTypes.string,
	on_title: PropTypes.object,
	post: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	title: PropTypes.string.isRequired,
	addNewComment: PropTypes.func.isRequired,
}
NewComment.defaultProps = {
	text: "",
	number: 0,
	abbrev: "",
	verso: () => 0,
	on_title: { selected: 0 }
}