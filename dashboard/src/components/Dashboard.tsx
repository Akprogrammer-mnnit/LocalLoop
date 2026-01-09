import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Play, Clock, ArrowRight, Activity } from 'lucide-react';
import { useParams } from 'react-router-dom';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

interface RequestLog {
  id: string;
  method: string;
  path: string;
  timestamp: number;
  body: any;
  headers: any;
}

function Dashboard() {
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [selectedReq, setSelectedReq] = useState<RequestLog | null>(null);
  
  const {token , SUBDOMAIN} = useParams();
  const secureId = token ? `${token}/${SUBDOMAIN}` : SUBDOMAIN;
  useEffect(() => {
    
    const getHistory = async() => {
      await axios.get(`${SERVER_URL}/api/history/${SUBDOMAIN}`,{withCredentials: true})
      .then(res => {
        console.log(res);
        setRequests(res.data.data)});
    }

    getHistory();

    const socket = io(SERVER_URL);
    
    socket.on('connect', () => {
      console.log("Connected to server")
    });

    socket.on('new-request', (newReq: RequestLog) => {
      setRequests(prev => [newReq, ...prev]);
    });
    socket.emit('join-room',SUBDOMAIN);

    return () => { socket.disconnect(); };
  }, []);

  const handleReplay = async (req: RequestLog) => {
    try {
      await axios({
        method: req.method,
        url: `${SERVER_URL}/hook/${encodeURIComponent(secureId!)}/${req.path}`,
        headers: { 'Content-Type': 'application/json' },
        data: req.body
      });
      alert("Replay sent!");
    } catch (err) {
      console.error(err);
      alert("Replay failed (check console)");
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white font-mono">
      <div className="w-1/3 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-green-400" /> LocalLoop
          </h1>
          <p className="text-xs text-gray-400 mt-1">Watching: {SUBDOMAIN}</p>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {requests.length === 0 && <div className="p-4 text-gray-500">No requests yet...</div>}
          
          {requests.map(req => (
            <div 
              key={req.id}
              onClick={() => setSelectedReq(req)}
              className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition 
                ${selectedReq?.id === req.id ? 'bg-gray-800 border-l-4 border-l-green-400' : ''}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`px-2 py-0.5 text-xs font-bold rounded ${getMethodColor(req.method)}`}>
                  {req.method}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(req.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm truncate text-gray-300">/{req.path}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-900">
        {selectedReq ? (
          <>
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900">
              <div>
                <h2 className="text-2xl font-bold mb-1">/{selectedReq.path}</h2>
                <div className="flex gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1"><Clock size={14}/> {new Date(selectedReq.timestamp).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><ArrowRight size={14}/> ID: {selectedReq.id}</span>
                </div>
              </div>
              
              <button 
                onClick={() => handleReplay(selectedReq)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition"
              >
                <Play size={16} /> Replay Request
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">Request Body</h3>
                <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
                  <pre className="text-sm text-green-400 overflow-x-auto">
                    {JSON.stringify(selectedReq.body, null, 2) || "No Body"}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">Headers</h3>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(selectedReq.headers).map(([k, v]) => (
                    <div key={k} className="flex text-sm border-b border-gray-800 pb-1">
                      <span className="w-1/3 text-blue-400 font-semibold truncate">{k}</span>
                      <span className="w-2/3 text-gray-300 truncate font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <Activity size={48} className="mb-4 opacity-20" />
            <p>Select a request to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getMethodColor(method: string) {
  switch (method) {
    case 'GET': return 'bg-blue-900 text-blue-200';
    case 'POST': return 'bg-green-900 text-green-200';
    case 'DELETE': return 'bg-red-900 text-red-200';
    case 'PUT': return 'bg-yellow-900 text-yellow-200';
    default: return 'bg-gray-700 text-gray-200';
  }
}

export default Dashboard;