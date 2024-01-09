import axios from "axios";
import { useContext, useState } from "react";
import { UserContext } from "./UserContext";

export default function RegisterAndLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("login");
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

  const register = async (ev) => {
    ev.preventDefault();
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    try {
      const { data } = await axios.post("/register", { username, password });
      setLoggedInUsername(username);
      setId(data.id);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setErrorMessage("Username already exists.");
      } else {
        setErrorMessage("Registration failed. Please try again.");
      }
    }
  };

  const login = async (ev) => {
    ev.preventDefault();
    try {
      const { data } = await axios.post("/login", { username, password });
      setLoggedInUsername(username);
      setId(data.id);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Registration failed. Please try again.");
      }
    }
  };

  return (
    <div className='bg-blue-50 h-screen flex items-center'>
      <form
        className='w-64 mx-auto mb-12'
        onSubmit={isLoginOrRegister === "register" ? register : login}
      >
        <input
          type='text'
          placeholder='Username'
          value={username}
          className='block w-full rounded-sm p-2 mb-2 border'
          onChange={(ev) => setUsername(ev.target.value)}
        />
        <input
          type='password'
          placeholder='Password'
          value={password}
          className='block w-full rounded-sm p-2 mb-2 border'
          onChange={(ev) => setPassword(ev.target.value)}
        />
        {isLoginOrRegister === "register" && (
          <div>
            <input
              type='password'
              placeholder='Confirm Password'
              value={confirmPassword}
              className='block w-full rounded-sm p-2 mb-2 border'
              onChange={(ev) => setConfirmPassword(ev.target.value)}
            />
          </div>
        )}
        {errorMessage && ( // Display error message if present
          <p className='text-center text-red-500 mb-2'>{errorMessage}</p>
        )}
        <button className='bg-blue-500 text-white block w-full rounded-sm p-2'>
          {isLoginOrRegister === "register" ? "Register" : "Login"}
        </button>
        <div className='text-center mt-2'>
          {isLoginOrRegister === "register" && (
            <div>
              Already a member?&nbsp;
              <button
                className='underline decoration-2 underline-offset-2'
                onClick={() => setIsLoginOrRegister("login")}
              >
                Login
              </button>
            </div>
          )}
          {isLoginOrRegister === "login" && (
            <div>
              Don&apos;t have an account?&nbsp;
              <button
                className='underline decoration-2 underline-offset-2'
                onClick={() => setIsLoginOrRegister("register")}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
