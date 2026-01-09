import React , {useEffect, useState} from 'react'
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/store';
function Login() {
    const [email, setEmail] = useState < string > ("")
    const [password, setPassword] = useState < string > ("")
    const [error, setError] = useState < string > ("");
    const navigate = useNavigate();
    const setUser = useAuthStore((s) => s.setUser);
    const isLoggedIn = useAuthStore((s)=>s.isAuthenticated);
    useEffect(()=>{
      if (isLoggedIn){
        navigate("/");
      }
    },[isLoggedIn,navigate]);
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/login`,
        { email, password },
        { withCredentials: true } 
      );


      setUser(response.data.data);

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

                <button type="submit">Login</button>
                <p className='text-red-600'>{error}</p>
            </form>
        </div>
    )
}

export default Login
