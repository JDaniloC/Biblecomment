import "./styles.css";

import { Link } from "react-router-dom";
import React from "react";

const backArrow = require("../../assets/backArrow.svg");

const book = require("../../assets/book.svg");
const hand = require("../../assets/hand.svg");
const person = require("../../assets/person.svg");
const pen = require("../../assets/pen.svg");

const warning = require("../../assets/warning.svg");
const heart = require("../../assets/heart.svg");
const chat = require("../../assets/chat.svg");

const handleNothing = (e) => {e.preventDefault()}

export default function Help (){
	return (
		<div className="help-component">
			<section>
				<Link to="/">
					<img style={{ height: "30px" }} src={backArrow} alt="back arrow" />
				</Link>
				<h1 style={{ marginLeft: "1em" }}>Sobre o Bible Comment</h1>
			</section>
			<section id="what-biblecomment">
				<div>
					<h2> O que é o Bible Comment? </h2>
					<p>
						Um projeto desenvolvido com intuito de ser um meio de ensino e
						propagação do livro sagrado cristão, através do
						<b> compartilhamento</b> de comentários e interpretações do mesmo.
					</p>
					<p>
						&quot;[...] Deus nosso Salvador, o qual deseja que todos os homens
						sejam salvos e cheguem ao pleno conhecimento da verdade.&quot; 1
						Timóteo 2:3-4
					</p>
					<h2> Como posso participar? </h2>
					<p>
						Assim como o projeto&nbsp;
						<a href="https://reavivadosporsuapalavra.org/">
							reavivados por sua palavra
						</a>
						, o projeto incentiva a <b>leitura da bíblia</b>, um capítulo por
						dia, para o melhor entendimento da palavra de Deus. Uma vez
						realizado a leitura, por vezes será percebido detalhes
						interessantes para a compreensão do texto bíblico ou lições
						edificantes para a vida. São esse tipo de comentário ou relato
						pessoal que é interessante compartilhar.
					</p>
				</div>
				<div>
					<h2> Eu não gosto de ler no site </h2>
					<p>
						E nem terá a necessidade, o site serve apenas para a alocação dos
						comentários e tópicos levantados pela comunidade. A leitura deve
						ser feita na sua
						<b> bíblia pessoal</b>, independente da versão, de forma que os
						versos aqui encontrados sirvam apenas para a procura ou consulta.
					</p>
					<h2> Como posso ajudar? </h2>
					<p>
						Divulgando o projeto para amigos e familiares, para que mais
						pessoas sejam edificadas. Encontrando e relatando <b>problemas</b>
						, oferecendo sugestões ou contribuindo diretamente no&nbsp;
						<a href="https://github.com/JDaniloC/Biblecomment">
							código do projeto
						</a>
						, ainda assim mais importante do que tudo isso é você mesmo
						participar do projeto.
					</p>
				</div>
			</section>
			<section id="what-account">
				<div>
					<h2> Por que preciso me cadastrar? </h2>
					<p>
						Para o controle de possíveis usuários indesejados e a
						identificação na criação dos comentários e tópicos. Mas o conteúdo
						é <b> disponível para visualização</b> independente da criação de
						uma conta.
					</p>
					<h2> Como se cadastrar </h2>
					<p>
						<b>Vá para a página inicial</b>, clique no botão verde para
						cadastro, preencha com o seu melhor e-mail, nome de usuário e uma
						senha. Por fim clique novamente no botão verde.
					</p>
					<h2> Irei receber notificações ou e-mails? </h2>
					<p>
						Não, você entra quando quiser, <b>não receberá </b>
						nenhum e-mail nem notificação, o e-mail será apenas necessário
						como uma forma de identificação ao entrar na conta.
					</p>
					<h2> É possível deletar a conta? </h2>
					<p>
						Sim, você é livre para <b>deletar sua conta</b>, assim como é
						possível deletar quaisquer comentários feitos na plataforma.
					</p>
				</div>
				<div style={{ width: "100%", minWidth: "300px" }}>
					<div className="login-container" onSubmit = {handleNothing}>
						<form style={{ width: "100%" }}>
							<input type="email" disabled placeholder="E-mail" />
							<input type="text" disabled placeholder="Nome de usuário" />
							<input type="password" disabled placeholder="Senha" />
							<input
								style={{ backgroundColor: "#1E7" }}
								type="submit"
								value="Cadastrar"
							/>
							<hr />
							<button
								type="button"
								style={{
									backgroundColor: "rgb(136, 136, 136)",
								}}
							>
								Login
							</button>
						</form>
					</div>
				</div>
			</section>
			<section id="what-comment">
				<div>
					<h2> Quais informações são armazenadas? </h2>
					<p>
						O número de capítulos comentados, os comentários favoritados e
						opiniões na aba de discussões. A sua
						<b> crença atual e o seu Estado</b> podem ser armazenados nas
						configurações da conta.
					</p>
					<h2> Há mais de um local para comentar? </h2>
					<p>
						Sim, além dos comentários de cada verso, é possível comentar ao
						clicar no <b>título</b> do capítulo, no qual representa
						comentários para todo o capítulo.
					</p>
					<h2> Eu preciso comentar? </h2>
					<p>
						Não, você pode criar uma conta com o único intuito de{" "}
						<b>participar</b> dos tópicos ou interagir favoritando
						comentários.
					</p>
				</div>
				<div>
					<h2> O que significa cada tipo de comentário? </h2>
					<div>
						<input
							type="checkbox"
							name="hand"
							id="devocional"
							checked
						/>
						<img className="tag" src={hand} alt="handIcon" />
						Comentário devocional, indica um ensinamento extraído do texto,
						trazendo uma aplicação prática para a vida.
					</div>
					<div>
						<input
							type="checkbox"
							name="book"
							id="exegese"
							checked
						/>
						<img className="tag" src={book} alt="bookIcon" />
						Comentário exegético, indica um comentário que é necessário estudo
						da língua original, cultura, curiosidades e teólogos.
					</div>
					<div>
						<input
							type="checkbox"
							name="person"
							id="pessoal"
							checked
						/>
						<img className="tag" src={person} alt="personIcon" />
						Comentário pessoal, feito caso o verso tenha tocado a pessoa em
						algum momento na vida, e queira relatar para os demais.
					</div>
					<div>
						<input
							type="checkbox"
							name="pen"
							id="inspirado"
							checked
						/>
						<img className="tag" src={pen} alt="penIcon" />
						Comentário inspirado, indica comentários de algum profeta
						inspirado, canônico ou não.
					</div>
				</div>
			</section>
			<section>
				<div
					style={{
						width: "100%",
						minWidth: "300px",
					}}
				>
					<ul className="commentaries" style={{ fontSize: 14 }}>
						<input type="checkbox" checked />
						<div className="user-comment">
							<p
								style={{
									textAlign: "justify",
									whiteSpace: "break-spaces",
								}}
							>
								O livro de Gênesis começa com uma verdade absoluta que vai de
								contrário a muitos pensamentos da época: <br />
								1 - &quot;No princípio&quot;, significa que houve um início (a
								título de exemplo os gregos, anos depois, acreditavam que o
								universo sempre existiu, e só foi descoberto que houve um
								início no século XX).
								<br />
								2 - &quot;criou&quot;, não apenas teve um início, mas veio a
								existir não pelo acaso divino ou evolucionista, mas por meio
								de uma criação planejada. <br />3 - &quot;Deus&quot;, em
								contrapartida ao panteísmo essa criação se deu por um único
								Deus. <br />
								Por fim, contrário ao deísmo, esse Deus se importa com suas
								criaturas. <br />
								Ou seja, vai de contrário ao ateísmo, materialismo, humanismo,
								deísmo, evolucionismo entre outras concepções. Mostrando o
								perigo de tentar enquadrar os ensinos bíblicos em sistemas
								humanos.
							</p>
							<span className="comment-buttons">
								<p>
									Favoritado por <b>10</b> pessoas
								</p>
								<button type="button">
									<img src={heart} alt="like" />
								</button>
								<button type="button">
									<img src={chat} alt="chat" />
								</button>
								<button type="button">
									<img src={warning} alt="report" />
								</button>
							</span>
						</div>
					</ul>
				</div>
				<div>
					<h2> O que significa o coração? </h2>
					<p>
						Ele favorita o comentário para que ao logar na conta possa vê-lo
						diretamente na aba de comentários favoritados em vez de precisar
						procurar.
					</p>
					<h2> Para que serve o botão de chat? </h2>
					<p>
						Caso houver alguma discordância em relação a alguma comentário,
						então o botão cria um novo tópico para que através da orientação
						do Espírito Santo possamos entender a verdadeira interpretação.
					</p>
					<h2> Quando devo reportar um comentário? </h2>
					<p>
						Quando o comentário tem o único objetivo de
						<b> ofender</b>, esteja totalmente desconexo com a realidade do
						capítulo ou seja apenas interjeições como &quot;amém&quot;
					</p>
				</div>
			</section>
		</div>
	);
}
