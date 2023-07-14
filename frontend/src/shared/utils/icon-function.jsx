import bookIcon from "assets/book.svg";
import chatIcon from "assets/chat.svg";
import handIcon from "assets/hand.svg";
import heartIcon from "assets/heart.svg";
import penIcon from "assets/pen.svg";
import personIcon from "assets/person.svg";
import warningIcon from "assets/warning.svg";

function getIconImage(tag) {
	switch (tag) {
		case "heart":
			return heartIcon;
		case "warning":
			return warningIcon;
		case "chat":
			return chatIcon;
		case "devocional":
			return handIcon;
		case "inspirado":
			return penIcon;
		case "pessoal":
			return personIcon;
		default:
			return bookIcon;
	}
}

export default getIconImage;
