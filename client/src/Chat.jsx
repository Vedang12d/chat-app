// Import necessary modules and components from React and other files
import { useEffect, useState, useContext, useCallback, useRef } from "react";
import Logo from "./Logo";
import { uniqBy } from "lodash";
import { UserContext } from "./UserContext";
import axios from "axios";
import Contacts from "./Contacts";

// Define the Chat component
export default function Chat() {
  // State variables using React hooks
  const [ws, setWs] = useState(null); // WebSocket state
  const [onlinePeople, setOnlinePeople] = useState({}); // State for online users
  const [offlinePeople, setOfflinePeople] = useState({}); // State for offline users
  const [selectedUserId, setSelectedUserId] = useState(null); // State to track the selected user
  const [newMessageText, setNewMessageText] = useState(""); // State to store new message text
  const [messages, setMessages] = useState([]); // State to store messages
  const { id, username, setId, setUsername } = useContext(UserContext); // User context for ID and username
  const messagesEndRef = useRef(null); // Ref to scroll messages container

  // Function to update online users
  const showOnlinePeople = useCallback((peopleArray) => {
    const people = peopleArray.reduce((acc, { userId, username }) => {
      acc[userId] = username;
      return acc;
    }, {});
    setOnlinePeople(people);
  }, []);

  // Function to handle incoming WebSocket messages
  const handleMessage = useCallback(
    (ev) => {
      const messageData = JSON.parse(ev.data);
      if ("online" in messageData) {
        // Update online users
        showOnlinePeople(messageData.online);
      } else if ("text" in messageData) {
        // Update messages if sender matches selected user or current user
        if (messageData.sender === selectedUserId) {
          setMessages((prev) => [...prev, { ...messageData }]);
        }
      }
    },
    [selectedUserId, showOnlinePeople]
  );

  // Function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    const newWs = new WebSocket("ws://localhost:4000");
    setWs(newWs);
    newWs.addEventListener("message", handleMessage);
    newWs.addEventListener("close", () => {
      setTimeout(() => {
        connectWebSocket();
      }, 2000);
    });
  }, [handleMessage]);

  // Effect hook to establish WebSocket connection when the component mounts
  useEffect(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  // Effect hook to scroll to the bottom when new messages are received
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages]);

  // Effect hook to fetch messages when a user is selected
  useEffect(() => {
    if (selectedUserId) {
      // Fetch messages for the selected user
      axios.get("/messages/" + selectedUserId).then((res) => {
        // Extract and update messages
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  // Effect hook to fetch online and offline users
  useEffect(() => {
    axios.get("/people").then((res) => {
      // Filter online and offline users
      const onlineIds = Object.keys(onlinePeople);
      const offlinePeople = {};
      res.data.forEach((item) => {
        if (!onlineIds.includes(item._id)) {
          offlinePeople[item._id] = item.username;
        }
      });
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);

  // Function to send a message
  const sendMessage = (ev, file = null) => {
    if (ev) ev.preventDefault();
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMessageText,
        file,
      })
    );
    if (file) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    } else {
      setNewMessageText("");
      setMessages((prev) => [
        ...prev,
        {
          text: newMessageText,
          sender: id,
          recipient: selectedUserId,
          _id: Date.now(),
        },
      ]);
    }
  };

  // Function to handle sending files
  const sendFile = (ev) => {
    // Read and send the file using FileReader
    const fileInput = ev.target;
    const file = fileInput.files[0];

    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        sendMessage(null, {
          name: file.name,
          type: file.type,
          data: reader.result,
        });
        fileInput.value = null;
      };
    }
  };

  // Function to initiate file download
  const downloadFile = (fileName) => {
    axios({
      url: axios.defaults.baseURL + `/uploads/${fileName}`,
      method: "GET",
      responseType: "blob", // Important: Set the response type to 'blob'
    })
      .then((response) => {
        // Create a link element to simulate the download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();

        // Clean up resources
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      })
      .catch((error) => {
        // Handle any errors
        console.error("Error downloading file:", error);
      });
  };

  // Function to handle user logout
  const logout = () => {
    // Perform logout action
    axios.post("/logout").then(() => {
      // Reset states and context upon logout
      setWs(null);
      setId(null);
      setUsername(null);
    });
  };

  // Store unique messages
  const uniqueMessages = uniqBy(messages, "_id");

  // Render the chat interface
  return (
    // Entire layout wrapped in a container with flex layout
    <div className='flex h-screen'>
      {/* Sidebar */}
      <div className='bg-blue-50 w-1/3 flex flex-col'>
        {/* Sidebar content */}
        <div className='flex-grow overflow-y-auto scrollbar-custom'>
          {/* Logo component */}
          <Logo />
          {/* Contacts component for online people */}
          <Contacts
            people={onlinePeople}
            id={id}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            online={true}
          />
          {/* Contacts component for offline people */}
          <Contacts
            people={offlinePeople}
            id={id}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            online={false}
          />
        </div>
        {/* User info and logout button */}
        <div className='p-2 text-center flex items-center justify-center border-t-2 border-t-blue-300'>
          {/* User information and username */}
          <span className='text-sm flex items-center'>
            <div className='flex gap-1 bg-blue-600 text-white px-2 py-1 rounded-sm'>
              {/* Icon */}
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={1.5}
                stroke='currentColor'
                className='w-5 h-5'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'
                />
              </svg>
              {/* Username */}
              {username}
            </div>
          </span>
          {/* Logout button */}
          <button
            onClick={logout}
            className='text-sm bg-blue-200 py-1 px-2 border rounded-sm hover:shadow-sm hover:shadow-blue-800'
          >
            Logout
          </button>
        </div>
      </div>
      {/* Main Chat Window */}
      <div className='flex flex-col bg-blue-200 w-2/3 px-2 py-1'>
        {/* Chat window content */}
        <div className='flex-grow'>
          {/* Placeholder when no user is selected */}
          {!selectedUserId && (
            <div className='flex h-full flex-grow items-center justify-center'>
              <div className='text-gray-500 opacity-75'>
                &larr; Select a person from the sidebar
              </div>
            </div>
          )}
          {/* Display messages when a user is selected */}
          {!!selectedUserId && (
            <div className='relative h-full'>
              <div className='overflow-y-auto absolute scrollbar-custom top-0 left-0 right-0 bottom-2 p-2'>
                {/* Iterate through unique messages */}
                {uniqueMessages.map((message, index) => (
                  <div
                    key={index}
                    className={
                      message.sender === id ? "text-right" : "text-left"
                    }
                  >
                    <div
                      key={index}
                      className={
                        "inline-block p-2 my-2 rounded-md text-sm " +
                        (message.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-500")
                      }
                    >
                      {/* Display message text */}
                      {message.text}
                      {/* Check if message contains a file */}
                      {message.file && message.type.startsWith("image") && (
                        <div>
                          <img
                            src={
                              axios.defaults.baseURL +
                              "/uploads/" +
                              message.file
                            }
                            className='max-w-xs max-h-xs'
                            style={{ maxWidth: "200px", maxHeight: "200px" }} // Set maximum width and height as needed
                            alt=''
                          />
                        </div>
                      )}
                      {message.file && !message.type.startsWith("image") && (
                        <div>
                          {/* Display filename */}
                          <div className='flex justify-center items-center'>
                            <p className='text-center'>
                              {message.file.split("-_-").length > 1
                                ? message.file.split("-_-")[1]
                                : message.file}
                            </p>
                          </div>
                          <div className='flex items-center gap-2 mt-2'>
                            {/* Button to open the file in browser */}
                            <button
                              onClick={() =>
                                window.open(
                                  axios.defaults.baseURL +
                                    "/uploads/" +
                                    message.file,
                                  "_blank"
                                )
                              }
                              className='bg-blue-300 text-blue-600 border border-blue-600 rounded-sm px-3 py-1 hover:bg-blue-400 hover:text-white'
                            >
                              Open
                            </button>
                            {/* Button to save the file */}
                            <a
                              onClick={() => {
                                downloadFile(message.file);
                              }}
                              className='bg-green-300 text-green-600 border border-green-600 rounded-sm px-3 py-1 hover:bg-green-400 hover:text-white'
                            >
                              Save
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* Reference for scrolling to the bottom */}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>
        {/* Input form for sending messages */}
        {!!selectedUserId && (
          <form className='flex gap-2' onSubmit={sendMessage}>
            {/* Input for message text */}
            <input
              type='text'
              value={newMessageText}
              onChange={(ev) => setNewMessageText(ev.target.value)}
              className='bg-white flex-grow border p-2 rounded-sm'
              placeholder='Type here'
            />
            {/* File upload button */}
            <label className='bg-blue-300 p-2 text-blue-600 border border-blue-600 rounded-sm cursor-pointer'>
              <input type='file' className='hidden' onChange={sendFile} />
              {/* File upload icon */}
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={1.5}
                stroke='currentColor'
                className='w-6 h-6'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13'
                />
              </svg>
            </label>
            {/* Send message button */}
            <button
              type='submit'
              className='bg-blue-500 p-2 text-white rounded-sm'
            >
              {/* Send message icon */}
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={1.5}
                stroke='currentColor'
                className='w-6 h-6'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5'
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
