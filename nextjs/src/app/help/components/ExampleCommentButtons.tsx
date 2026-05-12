import Image from "next/image";

export default function ExampleCommentButtons() {
  return (
    <span className="flex items-center gap-3 mt-2">
      <span className="text-xs text-gray-500">
        Favoritado por <strong>10</strong> pessoas
      </span>
      <button type="button" className="opacity-60 hover:opacity-100">
        <Image src="/assets/heart.svg" alt="like" width={18} height={18} />
      </button>
      <button type="button" className="opacity-60 hover:opacity-100">
        <Image src="/assets/chat.svg" alt="chat" width={18} height={18} />
      </button>
      <button type="button" className="opacity-60 hover:opacity-100">
        <Image src="/assets/warning.svg" alt="report" width={18} height={18} />
      </button>
    </span>
  );
}
