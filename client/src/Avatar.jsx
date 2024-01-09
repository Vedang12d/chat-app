export default function Avatar({ online, username, userId }) {
  const colors = [
    "bg-red-200",
    "bg-lime-200",
    "bg-purple-200",
    "bg-amber-200",
    "bg-teal-200",
    "bg-orange-200",
    "bg-fuchsia-200",
  ];
  const textColors = [
    "text-red-900",
    "text-lime-900",
    "text-purple-900",
    "text-amber-900",
    "text-teal-900",
    "text-orange-900",
    "text-fuchsia-900",
  ];
  const userIdBase16 = parseInt(userId, 16);
  const colorIndex = ((userIdBase16 % colors.length) + 0) % colors.length;
  const color = colors[colorIndex];
  const textColor = textColors[colorIndex];
  return (
    <div className={"w-9 h-9 relative rounded-full flex items-center " + color}>
      <div className={"text-center w-full " + textColor}>{username[0]}</div>
      {online && (
        <div className="absolute w-2.5 h-2.5 bg-green-500 bottom-0 right-0 rounded-full "></div>
      )}
      {!online && (
        <div className="absolute w-2.5 h-2.5 bg-gray-400 bottom-0 right-0 rounded-full "></div>
      )}
    </div>
  );
}
