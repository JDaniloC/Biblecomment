import React from "react";

import chatIcon from "../../assets/chat.svg";
import heartIcon from "../../assets/heart.svg";
import warningIcon from "../../assets/warning.svg";

export default function AboutActions() {
    return (
        <section>
            <div>
                <ul className="commentaries">
                    <input type="checkbox" checked readOnly/>
                    <div className="user-comment">
                        <p>
                            O livro de Gênesis começa com uma verdade absoluta que vai de
                            contrário a muitos pensamentos da época: 
                            <br />
                            1 - &quot;No princípio&quot;, significa que houve um início (a
                            título de exemplo os gregos, anos depois, acreditavam que o
                            universo sempre existiu, e só foi descoberto que houve um
                            início no século XX).
                            <br />
                            2 - &quot;criou&quot;, não apenas teve um início, mas veio a
                            existir não pelo acaso divino ou evolucionista, mas por meio
                            de uma criação planejada. 
                            <br />
                            3 - &quot;Deus&quot;, em contrapartida ao panteísmo essa 
                            criação se deu por um único Deus. 
                            <br />
                            Por fim, contrário ao deísmo, esse Deus se importa com suas
                            criaturas. 
                            <br />
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
                                <img src={heartIcon} alt="like" />
                            </button>
                            <button type="button">
                                <img src={chatIcon} alt="chat" />
                            </button>
                            <button type="button">
                                <img src={warningIcon} alt="report" />
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
    )
}