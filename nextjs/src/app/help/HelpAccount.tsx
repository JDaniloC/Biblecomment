import Image from "next/image";

const ACCOUNT_CARDS = [
  {
    src: "/assets/person.svg",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-100 dark:border-violet-900/40",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    title: "Por que me cadastrar?",
    desc: "Para identificar quem cria comentários e tópicos, e para manter a comunidade saudável. O conteúdo continua disponível para todos mesmo sem conta.",
  },
  {
    src: "/assets/pen.svg",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-100 dark:border-blue-900/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    title: "Como me cadastrar?",
    desc: "Na página inicial, clique em Cadastrar-se, preencha com seu e-mail, nome de usuário e senha e confirme. Pronto, sua conta está criada.",
  },
  {
    src: "/assets/gears.svg",
    bg: "bg-stone-50 dark:bg-slate-800/50",
    border: "border-stone-200 dark:border-slate-700",
    iconBg: "bg-stone-200 dark:bg-slate-700",
    title: "Receberei e-mails?",
    desc: "Não. Nenhum e-mail ou notificação será enviado. O e-mail é usado somente como identificador para entrar na conta quando você quiser.",
  },
  {
    src: "/assets/delete.svg",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-100 dark:border-rose-900/40",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
    title: "Posso deletar minha conta?",
    desc: "Sim. Você pode deletar sua conta a qualquer momento, assim como pode remover individualmente qualquer comentário que tiver feito na plataforma.",
  },
];

export default function HelpAccount() {
  return (
    <section id="what-account">
      <h2 className="text-base font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-5">
        Conta
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ACCOUNT_CARDS.map(({ src, bg, border, iconBg, title, desc }) => (
          <div
            key={title}
            className={`${bg} border ${border} rounded-2xl p-5 flex flex-col gap-3`}
          >
            <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
              <Image src={src} alt={title} width={20} height={20} />
            </div>
            <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-sm leading-snug">{title}</h3>
            <p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
