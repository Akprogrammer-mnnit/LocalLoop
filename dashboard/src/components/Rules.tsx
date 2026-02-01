import { useState, useEffect } from "react";
import { Code, Save, Trash2, CheckCircle, Info } from "lucide-react";

interface RulesProps {
    subdomain: string;
    secureId: string;
    socket: any;
}

export default function Rules({ secureId, socket }: RulesProps) {
    const [script, setScript] = useState("");
    const [isSaved, setIsSaved] = useState(false);

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
        if (!script) setScript(template);

        // Listen for updates (in case another tab updates it)
        socket?.on("rules-updated", (newScript: string) => {
            setScript(newScript);
        });

        return () => { socket?.off("rules-updated"); }
    }, []);

    const saveRules = () => {
        socket?.emit("update-rules", {
            subdomain: secureId,
            script: script
        });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const clearRules = () => {
        setScript("");
        saveRules();
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white">

            {/* Toolbar */}
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
                        Reset Template
                    </button>
                    <button
                        onClick={clearRules}
                        className="bg-red-900/30 hover:bg-red-900/50 text-red-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Trash2 size={16} /> Disable
                    </button>
                    <button
                        onClick={saveRules}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-green-900/20 transition-all active:scale-95"
                    >
                        {isSaved ? <CheckCircle size={16} /> : <Save size={16} />}
                        {isSaved ? "Active" : "Apply Rules"}
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex">
                <div className="flex-1 relative">
                    <textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        className="w-full h-full bg-gray-900 text-green-400 font-mono text-sm p-6 resize-none focus:outline-none leading-relaxed"
                        spellCheck="false"
                        placeholder="// Write your javascript here..."
                    />
                </div>

                {/* Sidebar Help */}
                <div className="w-64 bg-gray-950 border-l border-gray-800 p-6 hidden lg:block">
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