import React , {useState} from 'react'
import axios from 'axios';
function Login() {
    const [email, setEmail] = useState < string > ("")
    const [password, setPassword] = useState < string > ("")
    const [error, setError] = useState < string > ("");
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const response: {
            error?: string;
            message?: string;
            data?: string;
        } = await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/login`, { email, password });

        if (!response) {
            setError("Something went wrong");
            return;
        }

        if (response.error) {
            setError(response.error);
            return;
        }

        if (response.data) {
            console.log(response.data);
        }
    }
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
