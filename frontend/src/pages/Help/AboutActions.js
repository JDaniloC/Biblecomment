import ExampleComments from "./components/ExampleComments";

import React from "react";

export default function AboutActions() {
	return (
		<section>
			<div>
				<ExampleComments />
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
					Caso houver alguma discordância em relação a alguma comentário, então
					o botão cria um novo tópico para que através da orientação do Espírito
					Santo possamos entender a verdadeira interpretação.
				</p>
				<h2> Quando devo reportar um comentário? </h2>
				<p>
					Quando o comentário tem o único objetivo de
					<b> ofender</b>, esteja totalmente desconexo com a realidade do
					capítulo ou seja apenas interjeições como &quot;amém&quot;
				</p>
			</div>
		</section>
	);
}
