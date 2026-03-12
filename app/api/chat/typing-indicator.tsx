export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="prose max-w-[75%] rounded-2xl rounded-tl-none text-gray-900">
        <div className="flex space-x-2">
          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500"></div>
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-gray-500"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-gray-500"
            style={{ animationDelay: "0.4s" }}
          ></div>
        </div>
      </div>
    </div>
  );
}
