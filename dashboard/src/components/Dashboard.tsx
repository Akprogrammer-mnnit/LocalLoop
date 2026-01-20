import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Play, Clock, ArrowRight, Activity, Database, Hash, Globe, Pause, Zap, X, AlertTriangle, Send } from 'lucide-react';
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

interface InterceptedRequest {
  id: string;
  method: string;
  path: string;
  headers: any;
  body: any;
  timestamp: number;
}

function Dashboard() {
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [selectedReq, setSelectedReq] = useState<RequestLog | null>(null);
  const [isIntercepting, setIsIntercepting] = useState(false);
  const [pausedRequests, setPausedRequests] = useState<InterceptedRequest[]>([]);
  const [editingRequest, setEditingRequest] = useState<InterceptedRequest | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const { token, SUBDOMAIN } = useParams();
  const secureId = token ? `${token}/${SUBDOMAIN}` : SUBDOMAIN;
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const getHistory = async () => {
      try {
        const res = await axios.get(`${SERVER_URL}/api/history/${SUBDOMAIN}`, { withCredentials: true });
        setRequests(res.data.data);
      } catch (e) {
        console.error("Failed to fetch history", e);
      }
    }

    getHistory();

    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log("Connected to server")
    });

    newSocket.on('new-request', (newReq: RequestLog) => {
      setRequests(prev => [newReq, ...prev]);
    });

    newSocket.on('intercepted-request', (req: InterceptedRequest) => {
        setPausedRequests((prev) => [req, ...prev]);
    });

    newSocket.on('interception-status', (status: boolean) => {
        setIsIntercepting(status);
    });

    newSocket.emit('join-room', SUBDOMAIN);

    return () => { newSocket.disconnect(); };
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
      alert("Replay failed");
    }
  };

  const toggleInterception = () => {
    const newState = !isIntercepting;
    setIsIntercepting(newState);
    socket?.emit("toggle-interception", { 
        subdomain: SUBDOMAIN, 
        active: newState 
    });
  };

  const forwardRequest = () => {
    if (!editingRequest) return;
  
    try {
      const parsedBody = JSON.parse(editedBody);
      
      socket?.emit("resume-request", {
        requestId: editingRequest.id,
        modifiedBody: parsedBody,
        modifiedHeaders: editingRequest.headers
      });
  
      setPausedRequests((prev) => prev.filter(r => r.id !== editingRequest.id));
      setEditingRequest(null);
      setEditedBody("");
      
    } catch (e) {
      alert("Invalid JSON");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
      
      <div className="w-96 shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        
        <div className="p-5 border-b border-gray-200 bg-white">
          <h1 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <Activity className="text-cyan-600" /> LocalLoop
          </h1>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit">
                <Globe size={12} />
                <span className="truncate max-w-24">{SUBDOMAIN}</span>
            </div>
            <button
                onClick={toggleInterception}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isIntercepting 
                    ? "bg-amber-100 text-amber-700 border border-amber-200 animate-pulse" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
                {isIntercepting ? <Pause size={10} /> : <Play size={10} />}
                {isIntercepting ? "INTERCEPTING" : "PASSTHROUGH"}
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-200">
          
          {pausedRequests.length > 0 && (
             <div className="bg-amber-50 border-b border-amber-100">
                <div className="px-4 py-2 bg-amber-100/50 text-amber-800 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={12} />
                    PENDING APPROVAL ({pausedRequests.length})
                </div>
                {pausedRequests.map(req => (
                    <div 
                        key={req.id}
                        onClick={() => {
                            setEditingRequest(req);
                            setEditedBody(JSON.stringify(req.body, null, 2));
                        }}
                        className="p-4 border-b border-amber-100 cursor-pointer hover:bg-amber-100/40 transition-colors group"
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded border ${getMethodColor(req.method)}`}>
                                {req.method}
                            </span>
                            <span className="text-xs text-amber-600 font-mono bg-amber-100 px-1.5 rounded">
                                PAUSED
                            </span>
                        </div>
                        <div className="text-sm font-medium text-gray-700 truncate font-mono">
                            {req.path}
                        </div>
                        <div className="mt-2 text-xs text-amber-700 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Zap size={10} /> Click to Inspect
                        </div>
                    </div>
                ))}
             </div>
          )}

          {requests.length === 0 && pausedRequests.length === 0 && (
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

      {editingRequest && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Zap size={18} className="text-amber-500" fill="currentColor" />
                            Intercept Request
                        </h3>
                        <p className="text-xs text-gray-500 font-mono mt-1">{editingRequest.method} {editingRequest.path}</p>
                    </div>
                    <button onClick={() => setEditingRequest(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                            Modify Body (JSON)
                        </label>
                        <div className="relative">
                            <textarea
                                value={editedBody}
                                onChange={(e) => setEditedBody(e.target.value)}
                                className="w-full h-80 bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none shadow-inner"
                                spellCheck="false"
                            />
                        </div>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 flex items-start gap-2">
                         <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                         <p>Changes made here will be forwarded to your local application as if they came from the original client.</p>
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={() => setEditingRequest(null)}
                        className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg text-sm transition-colors"
                    >
                        Drop Request
                    </button>
                    <button 
                        onClick={forwardRequest}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Send size={16} />
                        Forward Request
                    </button>
                </div>
            </div>
        </div>
      )}
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