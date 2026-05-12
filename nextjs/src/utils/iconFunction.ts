export function getIconPath(tag: string): string {
  switch (tag) {
    case "heart":
      return "/assets/heart.svg";
    case "warning":
      return "/assets/warning.svg";
    case "chat":
      return "/assets/chat.svg";
    case "devocional":
      return "/assets/hand.svg";
    case "inspirado":
      return "/assets/pen.svg";
    case "pessoal":
      return "/assets/person.svg";
    default:
      return "/assets/book.svg";
  }
}

export function dateFormat(dateString: string): string {
  if (!dateString) return "";
  const DATE_LENGTH = 10;
  const part = dateString.slice(0, DATE_LENGTH);
  const [year, month, day] = part.split("-");
  return `${day}/${month}/${year}`;
}
