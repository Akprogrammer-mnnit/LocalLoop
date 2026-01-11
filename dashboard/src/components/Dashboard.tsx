import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Play, Clock, ArrowRight, Activity, Database, Hash, Globe } from 'lucide-react';
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
      try {
        const res = await axios.get(`${SERVER_URL}/api/history/${SUBDOMAIN}`, { withCredentials: true });
        setRequests(res.data.data);
      } catch (e) {
        console.error("Failed to fetch history", e);
      }
    }

    getHistory();

    const socket = io(SERVER_URL);
    
    socket.on('connect', () => {
      console.log("Connected to server")
    });

    socket.on('new-request', (newReq: RequestLog) => {
      setRequests(prev => [newReq, ...prev]);
    });
    
    socket.emit('join-room', SUBDOMAIN);

    return () => { socket.disconnect(); };
  }, [SUBDOMAIN]);

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
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
      
      <div className="w-96 shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        
        <div className="p-5 border-b border-gray-200 bg-white">
          <h1 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <Activity className="text-cyan-600" /> LocalLoop
          </h1>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit">
            <Globe size={12} />
            <span className="truncate max-w-50">{SUBDOMAIN}</span>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-200">
          {requests.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              Waiting for requests...
            </div>
          )}
          
          {requests.map(req => (
            <div 
              key={req.id}
              onClick={() => setSelectedReq(req)}
              className={`group p-4 border-b border-gray-100 cursor-pointer transition-all duration-200 hover:bg-gray-50
                ${selectedReq?.id === req.id ? 'bg-cyan-50 border-l-4 border-l-cyan-600 pl-3' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded border ${getMethodColor(req.method)}`}>
                  {req.method}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {new Date(req.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-700 truncate font-mono">
                {(req.path === "/" ? "" : "/" )}{req.path}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full bg-gray-50">
        {selectedReq ? (
          <>
            <div className="px-8 py-6 bg-white border-b border-gray-200 shadow-sm flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <span className={`px-3 py-1 text-sm font-bold rounded-md shadow-sm border ${getMethodColor(selectedReq.method)}`}>
                    {selectedReq.method}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 font-mono tracking-tight">/{selectedReq.path}</h2>
                </div>
                
                <div className="flex gap-6 text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1.5">
                    <Clock size={16} className="text-gray-400"/> 
                    {new Date(selectedReq.timestamp).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                    <Hash size={12} className="text-gray-400"/> 
                    {selectedReq.id}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => handleReplay(selectedReq)}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors active:scale-95"
              >
                <Play size={18} fill="currentColor" /> Replay
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-5xl mx-auto space-y-8">
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <Database size={16} className="text-gray-500"/>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Request Body</h3>
                  </div>
                  <div className="p-0">
                    <pre className="text-sm text-gray-800 bg-white p-5 overflow-x-auto font-mono leading-relaxed">
                      {selectedReq.body && Object.keys(selectedReq.body).length > 0 
                        ? JSON.stringify(selectedReq.body, null, 2) 
                        : <span className="text-gray-400 italic">No body content</span>}
                    </pre>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <ArrowRight size={16} className="text-gray-500"/>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Headers</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {Object.entries(selectedReq.headers).map(([k, v]) => (
                      <div key={k} className="flex text-sm p-3 hover:bg-gray-50 transition-colors">
                        <span className="w-1/3 min-w-37.5 text-gray-500 font-medium truncate pr-4">{k}</span>
                        <span className="w-2/3 text-gray-900 font-mono break-all">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
              <Activity size={48} className="text-cyan-100" />
            </div>
            <p className="text-lg font-medium text-gray-600">Select a request to view details</p>
            <p className="text-sm mt-1 text-gray-400">Incoming requests will appear in real-time</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getMethodColor(method: string) {
  switch (method) {
    case 'GET': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'POST': return 'bg-green-50 text-green-700 border-green-200';
    case 'DELETE': return 'bg-red-50 text-red-700 border-red-200';
    case 'PUT': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'PATCH': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export default Dashboard;