import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Key, Link as LinkIcon, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import { ReceiptVerifyResponse } from '../types'; // Ensure types are updated

export default function VerifyPage() {
    const { shortCode } = useParams();
    const navigate = useNavigate();
    const [inputCode, setInputCode] = useState(shortCode || '');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ReceiptVerifyResponse | null>(null);
    // const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (shortCode) {
            handleVerify(shortCode);
        }
    }, [shortCode]);

    const handleVerify = async (code: string) => {
        setLoading(true);
        // setError(null);
        setResult(null);
        try {
            const res = await api.get<ReceiptVerifyResponse>(`/receipt/verify-shortcode/${code}`);
            setResult(res.data);
        } catch (err) {
            console.error(err);
            // setError("Invalid code or verification failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 mb-6 border border-blue-400/30">
                        <ShieldCheck className="w-10 h-10 text-blue-400" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Public Verification Portal
                    </h1>
                    <p className="text-white/60 text-lg">
                        Verify the integrity and timestamp of any CivicPulse submission using its unique short code.
                    </p>
                </div>

                {/* Search Box */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-2 flex items-center gap-2 mb-12 max-w-lg mx-auto">
                    <div className="pl-4 text-white/40">
                        <Key className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        placeholder="ENTER SHORT CODE (e.g., CP-A1B2)"
                        className="bg-transparent border-none outline-none text-white text-lg font-mono placeholder-white/20 flex-1 p-2 uppercase tracking-wider"
                        onKeyDown={(e) => e.key === 'Enter' && handleVerify(inputCode)}
                    />
                    <button
                        onClick={() => handleVerify(inputCode)}
                        disabled={!inputCode.trim() || loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                        {loading ? 'Verifying...' : 'Verify'}
                    </button>
                </div>

                {/* Result Card */}
                {result && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className={`rounded-2xl border-2 overflow-hidden ${result.verified ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'
                            }`}>
                            <div className={`p-6 border-b ${result.verified ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'
                                } flex items-center justify-between`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${result.verified ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {result.verified ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h2 className={`text-xl font-bold ${result.verified ? 'text-green-400' : 'text-red-400'}`}>
                                            {result.verified ? 'Integrity Verified' : 'Verification Failed'}
                                        </h2>
                                        <p className="text-white/60 text-sm">Hash Chain Validated</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-white/40 uppercase mb-1">Status</div>
                                    <div className={`font-mono font-bold ${result.verified ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.verification}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-black/20 p-4 rounded-xl">
                                        <div className="text-xs text-white/40 mb-1">Receipt ID</div>
                                        <div className="font-mono text-sm text-white/90 break-all">{result.receipt_id}</div>
                                    </div>
                                    <div className="bg-black/20 p-4 rounded-xl">
                                        <div className="text-xs text-white/40 mb-1">Chain Position</div>
                                        <div className="font-mono text-xl text-blue-400">
                                            Block #{result.chain_position} <span className="text-white/40 text-sm">of {result.chain_length}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-white/40 mb-2 flex items-center gap-2">
                                        <LinkIcon className="w-3 h-3" />
                                        Cryptographic Hash
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-xl font-mono text-xs text-yellow-500 break-all border border-white/5">
                                        {result.receipt_hash}
                                    </div>
                                </div>

                                {result.prev_hash && (
                                    <div>
                                        <div className="text-xs text-white/40 mb-2 flex items-center gap-2">
                                            <LinkIcon className="w-3 h-3" />
                                            Previous Block Hash
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-xl font-mono text-xs text-white/30 break-all border border-white/5">
                                            {result.prev_hash}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Link */}
                <div className="mt-12 text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="text-white/40 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Back to Kiosk Home
                    </button>
                </div>
            </div>
        </div>
    );
}
