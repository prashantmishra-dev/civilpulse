import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function EmergencyPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<any>(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        // Polling to see if emergency is over
        const interval = setInterval(async () => {
            const res = await api.get('/emergency/status');
            if (!res.data.active) {
                navigate('/');
            }
            setStatus(res.data);
        }, 5000);
        return () => clearInterval(interval);
    }, [navigate]);

    const reportEmergeny = async (type: string) => {
        // Use geolocation if available
        navigator.geolocation.getCurrentPosition(async (pos) => {
            await api.post('/submissions/', {
                intent: 'emergency',
                text: `${type} reported during DISASTER MODE via Kiosk`,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                priority: 'critical'
            });
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 3000);
        }, async () => {
            // Fallback if no geo
            await api.post('/submissions/', {
                intent: 'emergency',
                text: `${type} reported during DISASTER MODE (No GPS)`,
                priority: 'critical'
            });
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 3000);
        });
    };

    if (!status) return <div className="bg-red-900 min-h-screen text-white flex items-center justify-center">Loading Emergency Protocol...</div>;

    return (
        <div className="min-h-screen bg-red-900 text-white p-6 animate-pulse-slow">
            <div className="max-w-4xl mx-auto text-center mt-10">
                <AlertTriangle size={80} className="mx-auto text-yellow-400 mb-6 animate-bounce" />
                <h1 className="text-5xl font-black mb-4 uppercase tracking-wider">
                    {status.type} ALERT DECLARED
                </h1>
                <p className="text-2xl mb-12 bg-red-800/50 p-4 rounded-xl border border-red-500 inline-block">
                    {status.message}
                </p>

                {submitted ? (
                    <div className="bg-green-600 p-8 rounded-2xl animate-scale-in">
                        <CheckCircle size={64} className="mx-auto mb-4" />
                        <h2 className="text-3xl font-bold">Help is on the way!</h2>
                        <p>Stay safe. Authorities have been notified.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-6">
                        <button onClick={() => reportEmergeny('FLOOD / WATER LOGGING')} className="h-40 bg-blue-600 hover:bg-blue-500 rounded-2xl text-2xl font-bold uppercase shadow-xl flex flex-col items-center justify-center gap-2 transition-transform active:scale-95">
                            🌊 Report Flood
                        </button>
                        <button onClick={() => reportEmergeny('ELECTRICAL FIRE')} className="h-40 bg-orange-600 hover:bg-orange-500 rounded-2xl text-2xl font-bold uppercase shadow-xl flex flex-col items-center justify-center gap-2 transition-transform active:scale-95">
                            🔥 Report Fire
                        </button>
                        <button onClick={() => reportEmergeny('MEDICAL EMERGENCY')} className="h-40 bg-rose-600 hover:bg-rose-500 rounded-2xl text-2xl font-bold uppercase shadow-xl flex flex-col items-center justify-center gap-2 transition-transform active:scale-95">
                            🚑 Medical Help
                        </button>
                        <button onClick={() => reportEmergeny('STRUCTURAL COLLAPSE')} className="h-40 bg-slate-600 hover:bg-slate-500 rounded-2xl text-2xl font-bold uppercase shadow-xl flex flex-col items-center justify-center gap-2 transition-transform active:scale-95">
                            🏚️ Building/Road
                        </button>
                    </div>
                )}

                <div className="mt-12 text-white/50 text-sm">
                    System in Critical Mode. All non-emergency features disabled.
                </div>
            </div>
        </div>
    );
}
