import { useState, useEffect } from "react";
import axios from "axios";
import { Play, Square, Circle, Save, Trash2, Film } from "lucide-react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

interface SavedSession {
    _id: string;
    name: string;
    requests: any[];
    createdAt: string;
}

interface RecorderProps {
    subdomain: string;
    secureId: string;
    requests: any[];
}

export default function Recorder({ subdomain, secureId, requests }: RecorderProps) {
    const [sessions, setSessions] = useState<SavedSession[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedRequests, setRecordedRequests] = useState<any[]>([]);
    const [sessionName, setSessionName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [recordingStartTime, setRecordingStartTime] = useState<number>(0);

    useEffect(() => {
        fetchSessions();
    }, [subdomain]);
    useEffect(() => {
        if (isRecording && requests.length > 0) {
            const newest = requests[0];

            if (newest.timestamp >= recordingStartTime) {
                if (recordedRequests.length === 0 || newest.id !== recordedRequests[recordedRequests.length - 1].id) {
                    setRecordedRequests(prev => [...prev, newest]);
                }
            }
        }
    }, [requests, isRecording, recordingStartTime]);

    const fetchSessions = async () => {
        try {
            const res = await axios.get(`${SERVER_URL}/api/sessions/${encodeURIComponent(secureId)}`);
            setSessions(res.data.data);
        } catch (e) { console.error(e); }
    };

    const startRecording = () => {
        setRecordedRequests([]);
        setRecordingStartTime(Date.now());
        setIsRecording(true);
    };

    const stopRecording = () => {
        setIsRecording(false);
        setIsSaving(true);
    };


    const saveSession = async () => {

        if (!sessionName) return alert("Enter a name");
        try {
            await axios.post(`${SERVER_URL}/api/sessions`, {
                subdomain: secureId,
                name: sessionName,
                requests: recordedRequests
            });
            setSessionName("");
            setIsSaving(false);
            setRecordedRequests([]);
            fetchSessions();
        } catch (e) { alert("Failed to save"); }
    };

    const deleteSession = async (id: string) => {
        await axios.delete(`${SERVER_URL}/api/sessions/${id}`);
        setSessions(prev => prev.filter(s => s._id !== id));
    };


    const playSession = async (session: SavedSession) => {
        alert(`▶️ Playing Session: ${session.name} (${session.requests.length} requests)`);

        for (const req of session.requests) {
            try {
                const cleanHeaders = { ...req.headers };
                delete cleanHeaders['host'];
                delete cleanHeaders['content-length'];
                delete cleanHeaders['connection'];
                delete cleanHeaders['accept-encoding'];

                await axios({
                    method: req.method,
                    url: `${SERVER_URL}/hook/${encodeURIComponent(secureId)}/${req.path}`,
                    headers: cleanHeaders,
                    data: req.body
                });
                await new Promise(r => setTimeout(r, 200));
            } catch (e) { console.error(e); }
        }
        alert("✅ Session Replay Complete!");
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">

            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Film className="text-rose-500" /> Session Recorder
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Record a sequence of requests and replay them instantly for integration testing.
                    </p>
                </div>

                {!isSaving ? (
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg transition-all ${isRecording
                            ? "bg-gray-900 text-white animate-pulse"
                            : "bg-rose-600 hover:bg-rose-700 text-white"
                            }`}
                    >
                        {isRecording ? <Square size={16} fill="currentColor" /> : <Circle size={16} fill="currentColor" />}
                        {isRecording ? "STOP RECORDING" : "START RECORDING"}
                    </button>
                ) : (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-4">
                        <input
                            placeholder="e.g., Checkout Flow"
                            className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                            value={sessionName}
                            onChange={e => setSessionName(e.target.value)}
                        />
                        <button
                            onClick={saveSession}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                        >
                            <Save size={16} /> Save
                        </button>
                        <button
                            onClick={() => setIsSaving(false)}
                            className="text-gray-500 hover:text-gray-700 px-3 font-medium text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {isRecording && (
                <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-rose-600 rounded-full animate-ping" />
                        <span className="font-bold text-rose-800 text-sm">Recording...</span>
                    </div>
                    <span className="font-mono text-rose-700 font-bold text-sm">
                        {recordedRequests.length} Requests Captured
                    </span>
                </div>
            )}

            <div className="grid gap-4">
                {sessions.length === 0 && !isRecording && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <Film size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No saved sessions</p>
                    </div>
                )}

                {sessions.map(session => (
                    <div key={session._id} className="bg-white border border-gray-200 p-5 rounded-xl flex items-center justify-between shadow-sm hover:border-rose-200 transition-colors group">
                        <div>
                            <h3 className="font-bold text-gray-900">{session.name}</h3>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">
                                    {session.requests.length} Requests
                                </span>
                                <span>•</span>
                                <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => playSession(session)}
                                className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition-all"
                            >
                                <Play size={14} fill="currentColor" /> PLAY
                            </button>
                            <button
                                onClick={() => deleteSession(session._id)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}