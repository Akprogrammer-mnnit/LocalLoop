import { useState, useEffect } from "react";
import axios from "axios";
import { Code, Save, Trash2, CheckCircle, Info, Loader2 } from "lucide-react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

interface RulesProps {
    subdomain: string;
    secureId: string;
    socket: any;
}

export default function Rules({ secureId, socket }: RulesProps) {
    const [script, setScript] = useState("");
    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [logs, setLogs] = useState<{ message: string, timestamp: number }[]>([]);
    const template = `// Available variables: method, path, headers, body, query
// Example: Add a header
headers['x-custom-token'] = '12345';    

// Example: Modify body on specific path
if (path === 'api/login') {
  body.email = 'admin@example.com';
}

// Example: Log traffic
log('Request to ' + path);`;

    useEffect(() => {
        const fetchCurrentRules = async () => {
            try {
                const res = await axios.get(`${SERVER_URL}/api/rules/${encodeURIComponent(secureId)}`);


                if (res.data && res.data.script !== undefined) {
                    setScript(res.data.script);
                } else {
                    setScript(template);
                }
            } catch (e) {
                console.error("Failed to fetch rules", e);
                setScript(template);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCurrentRules();

        socket?.on("rules-updated", (newScript: string) => {
            setScript(newScript);
        });

        socket?.on("script-log", (newLog: { message: string, timestamp: number }) => {
            console.log(`[SCRIPT LOG] ${newLog.message}`);
            setLogs(prev => [newLog, ...prev].slice(0, 50));

        });
        return () => {
            socket?.off("rules-updated");
            socket?.off("script-log");
        }
    }, [secureId]);

    const saveRules = (scriptToSave: string) => {
        socket?.emit("update-rules", {
            subdomain: secureId,
            script: scriptToSave
        });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const clearRules = () => {
        setScript("");
        saveRules("");
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
                <Loader2 className="text-cyan-400 animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950">
                <div className="flex items-center gap-3">
                    <Code className="text-cyan-400" />
                    <div>
                        <h2 className="text-lg font-bold">Traffic Rules (Middleware)</h2>
                        <p className="text-xs text-gray-400">Write JavaScript to modify requests on the fly.</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setScript(template)}
                        className="text-xs text-gray-500 hover:text-white px-3 py-2 transition-colors"
                    >
                        Load Template
                    </button>
                    <button
                        onClick={clearRules}
                        className="bg-red-900/30 hover:bg-red-900/50 text-red-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Trash2 size={16} /> Disable
                    </button>
                    <button
                        onClick={() => saveRules(script)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-900/20 transition-all active:scale-95"
                    >
                        {isSaved ? <CheckCircle size={16} /> : <Save size={16} />}
                        {isSaved ? "Active" : "Apply Rules"}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex">
                <div className="flex-1 relative">
                    <textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        className="w-full h-full bg-gray-900 text-green-400 font-mono text-sm p-6 resize-none focus:outline-none leading-relaxed"
                        spellCheck="false"
                        placeholder="// Write your javascript here... Leave empty to disable rules."
                    />
                    <div className="absolute bottom-2 right-4 text-xs text-gray-500">
                        {logs.length > 0 && (
                            <div className="mb-1 flex items-center gap-1 text-cyan-400">
                                <Info size={12} />
                                <span>Script Logs</span>
                            </div>
                        )}
                        {logs.map((log, index) => (
                            <div key={index} className="text-gray-400">
                                [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                            </div>
                        ))}
                    </div>

                </div>

                <div className="w-64 bg-gray-950 border-l border-gray-800 p-6 hidden lg:block overflow-y-auto">
                    <div className="flex items-center gap-2 mb-4 text-cyan-400">
                        <Info size={16} />
                        <span className="font-bold text-sm">Documentation</span>
                    </div>
                    <div className="space-y-6 text-xs text-gray-400 leading-relaxed">
                        <div>
                            <strong className="text-gray-200 block mb-1">headers</strong>
                            <p>Object containing request headers. Modify directly.</p>
                            <code className="block bg-gray-900 p-2 rounded mt-1 text-gray-500">headers['auth'] = '123'</code>
                        </div>
                        <div>
                            <strong className="text-gray-200 block mb-1">body</strong>
                            <p>JSON body of the request.</p>
                            <code className="block bg-gray-900 p-2 rounded mt-1 text-gray-500">body.price = 0</code>
                        </div>
                        <div>
                            <strong className="text-gray-200 block mb-1">path</strong>
                            <p>The URL path (string).</p>
                        </div>
                        <div>
                            <strong className="text-gray-200 block mb-1">method</strong>
                            <p>GET, POST, etc.</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}