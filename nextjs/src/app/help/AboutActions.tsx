import Image from "next/image";

const ACTIONS = [
  {
    src: "/assets/heart.svg",
    bg: "bg-rose-50",
    border: "border-rose-100",
    iconBg: "bg-rose-100",
    title: "Favoritar",
    desc: "Salva o comentário na sua lista de favoritos. Ao entrar na conta, você pode acessá-los diretamente na aba de comentários favoritados, sem precisar procurar novamente.",
  },
  {
    src: "/assets/chat.svg",
    bg: "bg-blue-50",
    border: "border-blue-100",
    iconBg: "bg-blue-100",
    title: "Abrir debate",
    desc: "Abre um novo tópico de discussão ligado àquele comentário. Útil quando há discordância ou curiosidade — para que, com orientação do Espírito, a interpretação correta seja alcançada.",
  },
  {
    src: "/assets/warning.svg",
    bg: "bg-amber-50",
    border: "border-amber-100",
    iconBg: "bg-amber-100",
    title: "Denunciar",
    desc: 'Reporte um comentário que tenha o único objetivo de ofender, esteja totalmente desconexo do capítulo, ou seja apenas uma interjeição sem conteúdo (como um simples "amém").',
  },
];

export default function AboutActions() {
  return (
    <section id="what-actions">
      <h2 className="text-base font-semibold text-stone-500 uppercase tracking-widest mb-5">
        Ações sobre Comentários
      </h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {ACTIONS.map(({ src, bg, border, iconBg, title, desc }) => (
          <div
            key={title}
            className={`${bg} border ${border} rounded-2xl p-5 flex flex-col gap-3`}
          >
            <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
              <Image src={src} alt={title} width={20} height={20} />
            </div>
            <h3 className="font-semibold text-stone-800 text-sm">{title}</h3>
            <p className="text-stone-600 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
