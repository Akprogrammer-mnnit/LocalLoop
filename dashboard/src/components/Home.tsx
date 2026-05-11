import axios from 'axios'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/store'
import { Link, useNavigate } from "react-router-dom"
import { Key, Globe, Calendar, ExternalLink, LogOut } from 'lucide-react'

interface Tunnel {
  _id: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
}

function Home() {
  const userData = useAuthStore((s => s.user));
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState<string>("");
  const [show, setShow] = useState<boolean>(false);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState("");

  if (!userData) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-red-600 font-medium">Session Error: User data not found.</p>
    </div>
  );

  useEffect(() => {
    const fetchTunnels = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/my-subdomains`,
          { withCredentials: true }
        );
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
      try {
        const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/getApi`, { withCredentials: true });
        if (response.data) {
          setApiKey(response.data.data);
        }
      } catch (e) {
        console.error("Failed to fetch API key");
      }
    }
    setShow(prev => !prev);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/logout`, {}, { withCredentials: true });
    } catch (e) {
      console.error("Logout failed on server", e);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Welcome back, <span className="text-cyan-600">{userData.email?.split('@')[0]}</span>
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your local tunnels and API configurations.
            </p>
          </div>

          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <LogOut className="h-4 w-4 text-gray-500" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg mb-8 border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
              <Key className="h-5 w-5 text-gray-400" />
              API Key Configuration
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Use this key to authenticate your CLI client. Keep it secret.</p>
            </div>
            <div className="mt-5 sm:flex sm:items-center">
              <div className="w-full sm:max-w-lg">
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    readOnly
                    value={apiKey || "••••••••••••••••••••••••••••••••"}
                    className="focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-4 pr-12 sm:text-sm border-gray-300 rounded-md bg-gray-50 font-mono py-2.5 text-gray-600"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleClick}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-cyan-600 text-base font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
              >
                {show ? "Hide Key" : "Show Key"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-400" />
              Active Subdomains
            </h3>
            <span className="bg-gray-100 text-gray-600 py-1 px-3 rounded-full text-xs font-medium">
              Total: {tunnels.length}
            </span>
          </div>

          <div className="px-4 py-5 sm:p-0">
            {loading ? (
              <div className="p-10 text-center text-gray-500 animate-pulse">
                Loading your tunnels...
              </div>
            ) : error ? (
              <div className="p-10 text-center text-red-500 bg-red-50 m-4 rounded-md">
                {error}
              </div>
            ) : tunnels.length === 0 ? (
              <div className="p-12 text-center">
                <Globe className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No subdomains</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by running the CLI tool.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Subdomain
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Created At
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tunnels.map((tunnel) => (
                            <tr key={tunnel._id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {tunnel.subdomain}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tunnel.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                                  }`}>
                                  {tunnel.isActive ? 'Active' : 'Offline'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(tunnel.createdAt).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link
                                  to={`/dashboard/${tunnel.subdomain}`}
                                  className="text-cyan-600 hover:text-cyan-900 flex items-center justify-end gap-1"
                                >
                                  Dashboard <ExternalLink className="h-4 w-4" />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home