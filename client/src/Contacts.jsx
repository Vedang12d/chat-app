import Avatar from "./Avatar";

export default function Contacts({
  people,
  id,
  selectedUserId,
  setSelectedUserId,
  online,
}) {
  return (
    <>
      {Object.keys(people).map(
        (userId) =>
          userId !== id && (
            <div
              key={userId}
              onClick={() => {
                setSelectedUserId(userId);
              }}
              className={
                "border-b border-gray-100 flex items-center mx-2 rounded-md gap-2 cursor-pointer " +
                (userId === selectedUserId ? "bg-blue-200" : "")
              }
            >
              {userId === selectedUserId && (
                <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
              )}
              <div className="flex gap-2 py-2 pl-1 items-center">
                <Avatar
                  online={online}
                  username={people[userId]}
                  userId={userId}
                />
                <span>{people[userId]}</span>
              </div>
            </div>
          )
      )}
    </>
  );
}
