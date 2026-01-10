import axios from 'axios'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/store'
import { Link } from "react-router-dom"

interface Tunnel {
  _id: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
}

function Home() {
  const userData = useAuthStore((s => s.user));
  const [apiKey, setApiKey] = useState<string>("");
  const [show, setShow] = useState<boolean>(false);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState("");

  if (!userData) return <p>ERROR</p>

  useEffect(() => {
    const fetchTunnels = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/getMySubdomains`,
          { withCredentials: true }
        );
        console.log(response);
        setTunnels(response.data.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load your tunnels.");
      } finally {
        setLoading(false);
      }
    };

    fetchTunnels();
  }, []);

  const handleClick = async () => {
    if (show) {
      setApiKey("");
    }
    else {
      const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/getApi/${userData.id}`, { withCredentials: true });
      if (!response) {
        return;
      }
      setApiKey(response.data.data);
    }
    setShow(prev => !prev);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className='flex flex-row gap-3 items-center mb-10'>
        <div className="font-mono bg-gray-100 px-4 py-2 rounded border border-gray-300 min-w-75 h-10 flex items-center">
          {apiKey || "********************************"}
        </div>
        <button className='bg-cyan-700 text-white px-4 py-2 rounded hover:bg-cyan-800 transition' onClick={handleClick}>
          {show ? "Hide Key" : "Show Key"}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">My Subdomains</h2>
        </div>
        
        <div className="p-6">
          {loading ? (
            <p className="text-gray-500">Loading tunnels...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : tunnels.length === 0 ? (
            <p className="text-gray-500">You haven't registered any subdomains yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tunnels.map((tunnel) => (
                    <tr key={tunnel._id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {tunnel.subdomain}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tunnel.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tunnel.isActive ? 'Active' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tunnel.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          to={`/dashboard/${tunnel.subdomain}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View Dashboard
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home