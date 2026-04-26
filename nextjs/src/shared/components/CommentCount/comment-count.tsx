interface CommentCountProps {
  commentsCount: number[];
  currentIndex: number;
}

const colorMap: Record<string, string> = {
  "":       "bg-gray-200 text-gray-500",
  lighter:  "bg-green-100 text-green-700",
  light:    "bg-green-200 text-green-800",
  normal:   "bg-green-300 text-green-900",
  dark:     "bg-green-500 text-white",
  darker:   "bg-green-700 text-white",
};

export default function CommentCount({ commentsCount, currentIndex }: CommentCountProps) {
  const amount = commentsCount[currentIndex] ?? 0;

  const colorKey =
    amount === 0 ? "" :
    amount < 2   ? "lighter" :
    amount < 3   ? "light" :
    amount < 5   ? "normal" :
    amount < 10  ? "dark" :
                   "darker";

  return (
    <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${colorMap[colorKey]}`}>
      {amount}
    </div>
  );
}
