import Image from "next/image";

const COMMENT_TYPES = [
  {
    src: "/assets/hand.svg",
    bg: "bg-amber-50",
    border: "border-amber-100",
    label: "Devocional",
    desc: "Um ensinamento extraído do texto que traz uma aplicação prática para o cotidiano e a vida espiritual.",
  },
  {
    src: "/assets/book.svg",
    bg: "bg-blue-50",
    border: "border-blue-100",
    label: "Exegético",
    desc: "Requer estudo da língua original, do contexto histórico-cultural, de curiosidades e de teólogos para embasar a interpretação.",
  },
  {
    src: "/assets/person.svg",
    bg: "bg-violet-50",
    border: "border-violet-100",
    label: "Pessoal",
    desc: "Um relato de como aquele verso tocou a vida de quem escreve — uma experiência ou testemunho para edificar os demais.",
  },
  {
    src: "/assets/pen.svg",
    bg: "bg-green-50",
    border: "border-green-100",
    label: "Inspirado",
    desc: "Comentários atribuídos a um profeta ou escritor inspirado, canônico ou não, que complementam a compreensão do texto.",
  },
];

const INFO_CARDS = [
  {
    emoji: "💾",
    bg: "bg-stone-50",
    border: "border-stone-200",
    title: "O que é armazenado?",
    desc: "O número de capítulos comentados, os comentários favoritados e as opiniões nos debates. Opcionalmente, sua crença atual e seu estado (cidade/região).",
  },
  {
    emoji: "🏷️",
    bg: "bg-stone-50",
    border: "border-stone-200",
    title: "Onde posso comentar?",
    desc: "Em cada versículo e também no título do capítulo — que representa um comentário sobre todo o capítulo como unidade.",
  },
  {
    emoji: "👁️",
    bg: "bg-stone-50",
    border: "border-stone-200",
    title: "Sou obrigado a comentar?",
    desc: "Não. Você pode criar uma conta apenas para participar de debates, favoritar comentários ou simplesmente acompanhar as reflexões da comunidade.",
  },
];

export default function AboutComment() {
  return (
    <section id="what-comment" className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-stone-500 uppercase tracking-widest mb-5">
          Tipos de Comentário
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMMENT_TYPES.map(({ src, bg, border, label, desc }) => (
            <div
              key={label}
              className={`${bg} border ${border} rounded-2xl p-5 flex flex-col gap-3`}
            >
              <div className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center shadow-sm">
                <Image src={src} alt={label} width={20} height={20} />
              </div>
              <h3 className="font-semibold text-stone-800 text-sm">{label}</h3>
              <p className="text-stone-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-stone-500 uppercase tracking-widest mb-5">
          Sobre os Comentários
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {INFO_CARDS.map((c) => (
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
      </div>
    </section>
  );
}
