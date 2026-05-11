import { useState, useEffect } from "react";
import { Clock, AlertOctagon, Power } from "lucide-react";
import axios from "axios";

interface ChaosProps {
    subdomain: string;
    secureId: string;
    socket: any;
}

export default function Chaos({ secureId, socket }: ChaosProps) {
    const [activeMode, setActiveMode] = useState<'none' | 'slow' | 'flaky'>('none');
    const [delay, setDelay] = useState(1000);
    const [failureRate, setFailureRate] = useState(20);

    useEffect(() => {
        const fetchCurrentChaos = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/chaos/${secureId}`);

                if (res.data) {
                    setActiveMode(res.data.type || 'none');
                    if (res.data.type === 'slow') setDelay(res.data.value);
                    if (res.data.type === 'flaky') setFailureRate(res.data.value);
                }
            } catch (e) {
                console.error("Failed to sync chaos state", e);
            }
        };

        fetchCurrentChaos();
    }, [secureId]);
    const applyChaos = (mode: 'none' | 'slow' | 'flaky', val?: number) => {
        setActiveMode(mode);
        const value = val ?? (mode === 'slow' ? delay : failureRate);

        socket?.emit("update-chaos", {
            subdomain: secureId,
            type: mode,
            value: value
        });
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <AlertOctagon className="text-red-500" /> Chaos Mode
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                    Simulate poor network conditions to test how your app handles latency and server crashes.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">


                <div
                    onClick={() => applyChaos('none')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${activeMode === 'none'
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <Power size={24} className={activeMode === 'none' ? "text-green-600" : "text-gray-400"} />
                        {activeMode === 'none' && <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded">ACTIVE</span>}
                    </div>
                    <h3 className="font-bold text-gray-900">Normal Operation</h3>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                        Requests pass through immediately without interference.
                    </p>
                </div>


                <div
                    onClick={() => applyChaos('slow')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${activeMode === 'slow'
                        ? 'border-amber-500 bg-amber-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <Clock size={24} className={activeMode === 'slow' ? "text-amber-600" : "text-gray-400"} />
                        {activeMode === 'slow' && <span className="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-1 rounded">ACTIVE</span>}
                    </div>
                    <h3 className="font-bold text-gray-900">High Latency</h3>
                    <p className="text-xs text-gray-500 mt-1 mb-4">
                        Add a fixed delay to every request.
                    </p>

                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={delay}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setDelay(val);
                                if (activeMode === 'slow') applyChaos('slow', val);
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                        <span className="text-xs font-bold text-gray-500">ms</span>
                    </div>
                </div>


                <div
                    onClick={() => applyChaos('flaky')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${activeMode === 'flaky'
                        ? 'border-red-500 bg-red-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <AlertOctagon size={24} className={activeMode === 'flaky' ? "text-red-600" : "text-gray-400"} />
                        {activeMode === 'flaky' && <span className="text-xs font-bold text-red-700 bg-red-200 px-2 py-1 rounded">ACTIVE</span>}
                    </div>
                    <h3 className="font-bold text-gray-900">Random Failures</h3>
                    <p className="text-xs text-gray-500 mt-1 mb-4">
                        Randomly return 500 Errors.
                    </p>

                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min="1" max="100"
                            value={failureRate}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setFailureRate(val);
                                if (activeMode === 'flaky') applyChaos('flaky', val);
                            }}
                            className="flex-1 accent-red-500"
                        />
                        <span className="text-xs font-bold text-gray-700 w-10 text-right">{failureRate}%</span>
                    </div>
                </div>

            </div>
        </div>
    );
}