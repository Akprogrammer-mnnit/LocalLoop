import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom';
function SignUp() {
    const [email, setEmail] = useState < string > ("")
    const [password, setPassword] = useState < string > ("")
    const [error,setError] = useState<string>("");
    const navigate = useNavigate();
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/register`,
        { email, password },
        { withCredentials: true } 
      );

      navigate("/");
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Login failed"
      );
    }
  };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={email}
                    placeholder='Enter your email...'
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    value={password}
                    placeholder='Enter password'
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button type="submit">SignUp</button>
                <p className='text-red-600'>{error}</p>
            </form>
        </div>
    )
}

export default SignUp
