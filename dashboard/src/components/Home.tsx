import axios from 'axios'
import  { useState } from 'react'

import { useAuthStore } from '../store/store'
function Home() {
    const userData = useAuthStore((s => s.user));
    if (!userData) return <p>ERROR</p>
    const [apiKey, setApiKey] = useState < string > ("");
    const [show, setShow] = useState < boolean > (false);
    const handleClick = async () => {
        if (show) {
            setApiKey("");
        }
        else {
            const response: {
                data: {message: string;
                data: string;}
            } | null  = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/getApi/${userData.id}`,{withCredentials: true});
            console.log(response);
            if (!response) {
                return;
            }

            setApiKey(response.data.data);
        }
        setShow(prev => !prev);
    };
    return (
        <div className='flex flex-row gap-3'>
            <div >
                {apiKey}
            </div>
            <button className='bg-cyan-700' onClick={handleClick}>Show Key</button>
        </div>
    )
}

export default Home
