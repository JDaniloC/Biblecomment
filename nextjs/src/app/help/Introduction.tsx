export default function Introduction() {
  const cards = [
    {
      emoji: "📖",
      bg: "bg-blue-50",
      border: "border-blue-100",
      title: "O que é o Bible Comment?",
      desc: "Um projeto para ensino e propagação do livro sagrado cristão, por meio do compartilhamento de comentários e interpretações bíblicas.",
    },
    {
      emoji: "🕊️",
      bg: "bg-violet-50",
      border: "border-violet-100",
      title: "Como posso participar?",
      desc: 'Leia um capítulo por dia — como propõe o projeto "Reavivados por Sua Palavra" — e compartilhe os insights, reflexões e aplicações que surgirem durante a leitura.',
    },
    {
      emoji: "📚",
      bg: "bg-stone-50",
      border: "border-stone-200",
      title: "Não gosto de ler no site",
      desc: "Tudo bem. O site existe apenas para armazenar comentários e discussões. A leitura deve ser feita na sua bíblia pessoal; os versículos aqui servem apenas como referência e consulta.",
    },
    {
      emoji: "🤝",
      bg: "bg-green-50",
      border: "border-green-100",
      title: "Como posso ajudar?",
      desc: "Divulgando o projeto, reportando problemas ou contribuindo diretamente no código. Mas o mais importante é simplesmente participar com comentários edificantes.",
    },
  ];

  return (
    <section id="what-biblecomment">
      <h2 className="text-base font-semibold text-stone-500 uppercase tracking-widest mb-5">
        O Projeto
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <div
            key={c.title}
            className={`${c.bg} border ${c.border} rounded-2xl p-5 flex flex-col gap-2`}
          >
            <span className="text-2xl">{c.emoji}</span>
            <h3 className="font-semibold text-stone-800 text-sm leading-snug">{c.title}</h3>
            <p className="text-stone-600 text-sm leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
