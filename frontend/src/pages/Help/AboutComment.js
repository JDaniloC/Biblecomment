import React from "react";

import bookIcon from "../../assets/book.svg";
import handIcon from "../../assets/hand.svg";
import penIcon from "../../assets/pen.svg";
import personIcon from "../../assets/person.svg";

export default function AboutComment() {
    return (
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
                        checked readOnly
                    />
                    <img className="tag" src={handIcon} alt="handIcon" />
                    Comentário devocional, indica um ensinamento extraído do texto,
                    trazendo uma aplicação prática para a vida.
                </div>
                <div>
                    <input
                        type="checkbox"
                        name="book"
                        id="exegese"
                        checked readOnly
                    />
                    <img className="tag" src={bookIcon} alt="bookIcon" />
                    Comentário exegético, indica um comentário que é necessário estudo
                    da língua original, cultura, curiosidades e teólogos.
                </div>
                <div>
                    <input
                        type="checkbox"
                        name="person"
                        id="pessoal"
                        checked readOnly
                    />
                    <img className="tag" src={personIcon} alt="personIcon" />
                    Comentário pessoal, feito caso o verso tenha tocado a pessoa em
                    algum momento na vida, e queira relatar para os demais.
                </div>
                <div>
                    <input
                        type="checkbox"
                        name="pen"
                        id="inspirado"
                        checked readOnly
                    />
                    <img className="tag" src={penIcon} alt="penIcon" />
                    Comentário inspirado, indica comentários de algum profeta
                    inspirado, canônico ou não.
                </div>
            </div>
        </section>
    )
}