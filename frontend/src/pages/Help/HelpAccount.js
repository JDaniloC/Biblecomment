import ExampleForm from "./components/ExampleForm";

import React from "react";

export default function HelpAccount() {
	return (
		<section id="what-account">
			<div>
				<h2> Por que preciso me cadastrar? </h2>
				<p>
					Para o controle de possíveis usuários indesejados e a identificação na
					criação dos comentários e tópicos. Mas o conteúdo é{" "}
					<b> disponível para visualização</b> independente da criação de uma
					conta.
				</p>
				<h2> Como se cadastrar </h2>
				<p>
					<b>Vá para a página inicial</b>, clique no botão verde para cadastro,
					preencha com o seu melhor e-mail, nome de usuário e uma senha. Por fim
					clique novamente no botão verde.
				</p>
				<h2> Irei receber notificações ou e-mails? </h2>
				<p>
					Não, você entra quando quiser, <b>não receberá </b>
					nenhum e-mail nem notificação, o e-mail será apenas necessário como
					uma forma de identificação ao entrar na conta.
				</p>
				<h2> É possível deletar a conta? </h2>
				<p>
					Sim, você é livre para <b>deletar sua conta</b>, assim como é possível
					deletar quaisquer comentários feitos na plataforma.
				</p>
			</div>
			<div style={{ width: "100%", minWidth: "300px" }}>
				<ExampleForm />
			</div>
		</section>
	);
}
