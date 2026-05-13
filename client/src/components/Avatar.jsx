export default function Avatar({ user, size = "md", online = false }) {
  const sizes = {
    xs: "w-7 h-7 text-xs",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
    "2xl": "w-20 h-20 text-xl",
  };

  const dotSizes = {
    xs: "w-2 h-2 border",
    sm: "w-2.5 h-2.5 border",
    md: "w-3 h-3 border-2",
    lg: "w-3.5 h-3.5 border-2",
    xl: "w-4 h-4 border-2",
    "2xl": "w-5 h-5 border-2",
  };

  const name = user?.display_name || user?.username || "?";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const colors = [
    "bg-purple-600", "bg-blue-600", "bg-green-600",
    "bg-pink-600", "bg-orange-600", "bg-teal-600",
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;

  return (
    <div className="relative flex-shrink-0">
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={name}
          className={`${sizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizes[size]} ${colors[colorIdx]} rounded-full flex items-center justify-center font-semibold text-white`}>
          {initials}
        </div>
      )}
      {online && (
        <span className={`absolute bottom-0 right-0 ${dotSizes[size]} bg-green-500 rounded-full border-bg`} />
      )}
    </div>
  );
}
