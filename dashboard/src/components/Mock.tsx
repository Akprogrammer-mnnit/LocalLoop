import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, Save, Zap } from "lucide-react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

interface MockRoute {
    _id?: string;
    method: string;
    path: string;
    status: number;
    body: string;
}

interface MocksProps {
    subdomain: string;
    secureId: string;
}

export default function Mocks({ secureId }: MocksProps) {
    const [mocks, setMocks] = useState<MockRoute[]>([]);
    const [isAdding, setIsAdding] = useState(false);

    const [newMethod, setNewMethod] = useState("GET");
    const [newPath, setNewPath] = useState("");
    const [newStatus, setNewStatus] = useState(200);
    const [newBody, setNewBody] = useState('{\n  "message": "Hello World"\n}');

    useEffect(() => {
        axios.get(`${SERVER_URL}/api/mocks/${encodeURIComponent(secureId)}`)
            .then(res => setMocks(res.data))
            .catch(err => console.error(err));
    }, [secureId]);

    const handleAddMock = async () => {
        try {
            JSON.parse(newBody);

            const newMockData = {
                subdomain: secureId,
                method: newMethod,
                path: newPath.startsWith("/") ? newPath : `/${newPath}`,
                status: newStatus,
                body: newBody
            };

            const res = await axios.post(`${SERVER_URL}/api/mocks`, newMockData);

            setMocks(prev => {
                const filtered = prev.filter(m => !(m.path === newMockData.path && m.method === newMockData.method));
                return [...filtered, res.data];
            });

            setIsAdding(false);
            resetForm();

        } catch (e) {
            alert("Invalid JSON Body or Server Error");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`${SERVER_URL}/api/mocks/${id}`);
            setMocks(mocks.filter(m => m._id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setNewPath("");
        setNewBody('{\n  "message": "Hello World"\n}');
        setNewStatus(200);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Zap className="text-purple-600" fill="currentColor" /> Mock Responses
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Define static responses for specific routes to intercept requests.
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all"
                >
                    <Plus size={18} /> New Mock
                </button>
            </div>

            <div className="grid gap-4 flex-1 overflow-y-auto content-start">
                {mocks.length === 0 && !isAdding && (
                    <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <Zap size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No active mocks</p>
                    </div>
                )}

                {isAdding && (
                    <div className="bg-white border border-purple-200 shadow-md rounded-xl p-6 mb-4 ring-4 ring-purple-50/50">
                        <div className="flex gap-4 mb-4">
                            <select
                                value={newMethod}
                                onChange={e => setNewMethod(e.target.value)}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-bold text-sm"
                            >
                                {["GET", "POST", "PUT", "DELETE", "PATCH"].map(m => <option key={m}>{m}</option>)}
                            </select>
                            <input
                                type="text"
                                placeholder="/api/users/123"
                                value={newPath}
                                onChange={e => setNewPath(e.target.value)}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <input
                                type="number"
                                placeholder="200"
                                value={newStatus}
                                onChange={e => setNewStatus(Number(e.target.value))}
                                className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm"
                            />
                        </div>

                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Response Body (JSON)</label>
                        <textarea
                            value={newBody}
                            onChange={e => setNewBody(e.target.value)}
                            className="w-full h-32 bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg resize-none mb-4"
                            spellCheck="false"
                        />

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-gray-700 font-medium text-sm">Cancel</button>
                            <button onClick={handleAddMock} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm">
                                <Save size={16} /> Save Mock
                            </button>
                        </div>
                    </div>
                )}

                {mocks.map(mock => (
                    <div key={mock._id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between group hover:border-purple-300 transition-colors shadow-sm">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <span className={`px-2 py-1 text-xs font-bold rounded border ${mock.method === 'GET' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    mock.method === 'POST' ? 'bg-green-50 text-green-700 border-green-200' :
                                        'bg-gray-100 text-gray-600 border-gray-200'
                                }`}>
                                {mock.method}
                            </span>
                            <span className="font-mono text-sm font-medium text-gray-700 truncate">{mock.path}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${mock.status >= 200 && mock.status < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {mock.status}
                            </span>
                        </div>
                        <button
                            onClick={() => handleDelete(mock._id!)}
                            className="text-gray-300 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}