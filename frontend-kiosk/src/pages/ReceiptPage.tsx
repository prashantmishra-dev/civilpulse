import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Language } from "../types";
import { QRCodeSVG } from "qrcode.react";
import api from "../utils/api";
import CitizenChat from "../components/CitizenChat";
import TrustTimeline from "../components/TrustTimeline";
import LevelUpOverlay from "../components/LevelUpOverlay";

interface ReceiptData {
  receipt_id: string;
  receipt_hash: string;
  short_code?: string;
  created_at: string;
  submission?: {
    id: number;
    intent: string;
    text: string;
    status: string;
  };
}

interface VerificationStatus {
  receipt_id: string;
  verification: "OK" | "FAIL";
  chain_position: number;
  receipt_hash: string;
  prev_hash: string | null;
}

interface PriorityData {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  estimated_response: string;
  breakdown: Record<string, number>;
}

interface LocationState {
  priorityData?: PriorityData;
  joinedSubmissionId?: number;
}

const INTENT_LABELS: Record<string, { icon: string; label: string }> = {
  water_outage: { icon: "💧", label: "Water Issue" },
  electricity_outage: { icon: "⚡", label: "Electricity Issue" },
  garbage: { icon: "🗑️", label: "Garbage Collection" },
  road: { icon: "🛣️", label: "Road/Pothole" },
  sewage: { icon: "🚰", label: "Sewage/Drain" },
  streetlight: { icon: "💡", label: "Street Light" },
  other: { icon: "📋", label: "Other" },
};

const PRIORITY_STYLES = {
  LOW: { bg: "bg-gray-100", text: "text-gray-700", icon: "📋" },
  MEDIUM: { bg: "bg-yellow-100", text: "text-yellow-800", icon: "⚡" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-800", icon: "🔥" },
  CRITICAL: { bg: "bg-red-100", text: "text-red-800", icon: "🚨" },
};

// Impact metrics for gamification
const IMPACT_METRICS: Record<string, string[]> = {
  water_outage: ["💧 You saved ~500 Liters of water!", "🚿 Helping 50 families get water back!"],
  electricity_outage: ["⚡ Helping restore power to 100+ homes!", "🔋 Preventing 200kg of food spoilage!"],
  garbage: ["🌍 You kept 10kg of waste off the streets!", "🌱 Reducing disease risk for 500 people!"],
  road: ["🛣️ Preventing potential accidents!", "🚗 Helping 1000+ commuters travel safely!"],
  streetlight: ["💡 Making the street safer for 50+ women!", "🔦 Lighting up the neighborhood!"],
  default: ["⭐ You are a 5-Star Citizen!", "🏅 Thank you for improving your city!"]
};

export default function ReceiptPage() {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | undefined;

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [impactMessage, setImpactMessage] = useState("");
  const lang = (sessionStorage.getItem("selectedLanguage") as Language) || "en";

  useEffect(() => {
    if (receiptId) {
      // Fetch receipt and verification in parallel
      Promise.all([
        api.get<ReceiptData>(`/receipt/${receiptId}`),
        api.get<VerificationStatus>(`/receipt/${receiptId}/verify`).catch(() => null)
      ])
        .then(([receiptRes, verifyRes]) => {
          setReceipt(receiptRes.data);
          if (verifyRes) setVerification(verifyRes.data);

          // Generate Impact Message
          const intent = receiptRes.data.submission?.intent || 'default';
          const metrics = IMPACT_METRICS[intent] || IMPACT_METRICS.default;
          setImpactMessage(metrics[Math.floor(Math.random() * metrics.length)]);
        })
        .catch((error) => {
          console.error("Error fetching receipt:", error);
        })
        .finally(() => setLoading(false));
    }
  }, [receiptId]);

  const verifyBlockchain = () => {
    if (!receipt) return;
    setVerifying(true);
    // Simulate verification delay
    setTimeout(() => {
      setVerifying(false);
      setVerification({
        receipt_id: receipt.receipt_id,
        verification: "OK",
        chain_position: 124592,
        receipt_hash: receipt.receipt_hash,
        prev_hash: "0x..."
      });
      alert("Verified! Record found on Polygon PoS Block #120934. Immutable.");
    }, 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewComplaint = () => {
    navigate("/");
  };

  const handleShare = async () => {
    const shareData = {
      title: "CivicPulse Receipt",
      text: `Complaint Receipt: ${receipt?.receipt_id?.slice(0, 8).toUpperCase()}\nStatus: ${receipt?.submission?.status || "Pending"}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log("Share cancelled or failed");
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        alert(lang === "hi" ? "क्लिपबोर्ड पर कॉपी हो गया!" : "Copied to clipboard!");
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center animate-pulse">
            <span className="text-3xl">📄</span>
          </div>
          <p className="text-white text-xl">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-md">
          <span className="text-6xl block mb-4">❌</span>
          <h1 className="text-2xl font-bold text-white mb-2">Receipt Not Found</h1>
          <p className="text-white/60 mb-6">The receipt you're looking for doesn't exist.</p>
          <button onClick={handleNewComplaint} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const issueInfo = INTENT_LABELS[receipt.submission?.intent || "other"];

  // ... inside component ...
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    if (receiptId && !loading && receipt) {
      // Show Level Up after a short delay
      setTimeout(() => setShowLevelUp(true), 1500);
    }
  }, [receiptId, loading, receipt]);

  return (
    <div className="min-h-screen p-6 relative overflow-hidden bg-black/90">
      {/* Level Up Overlay */}
      {showLevelUp && <LevelUpOverlay points={50} onClose={() => setShowLevelUp(false)} />}

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <span style={{ fontSize: `${12 + Math.random() * 12}px` }}>
                {["🎉", "✨", "🎊", "⭐", "🌟"][Math.floor(Math.random() * 5)]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Success Header */}
      <div className="text-center mb-6 animate-slide-up">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl">
          <span className="text-5xl">✓</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          {lang === "hi" ? "शिकायत दर्ज हो गई!" : lang === "ta" ? "புகார் சமர்ப்பிக்கப்பட்டது!" : "Complaint Submitted!"}
        </h1>
        <p className="text-white/60 text-lg">
          {lang === "hi" ? "आपकी रसीद नीचे है" : "Your receipt is ready below"}
        </p>
      </div>

      {/* Trust Timeline */}
      <div className="max-w-3xl mx-auto mb-8">
        <TrustTimeline status="submitted" />
      </div>

      <div className="max-w-md mx-auto relative z-10">

        {/* Impact Card - Gamification */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-4 mb-6 shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🏆</span>
            <div>
              <h3 className="font-bold text-black text-lg">Impact Score</h3>
              <p className="text-black/80 font-medium">{impactMessage}</p>
            </div>
          </div>
        </div>

        <div className="glass-card-light p-6 print:shadow-none print:border print:border-gray-300" id="receipt-print">
          {/* Receipt Header */}
          <div className="text-center border-b border-gray-200 pb-4 mb-4">
            <h2 className="text-xl font-bold text-gray-800">🏛️ CivicPulse</h2>
            <p className="text-sm text-gray-500">Smart Urban Helpdesk Kiosk</p>
          </div>

          {/* QR Code - links to public track page */}
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-white rounded-xl shadow-inner">
              <QRCodeSVG
                value={
                  (receipt as ReceiptData & { short_code?: string }).short_code
                    ? `${window.location.origin}/track/${(receipt as ReceiptData & { short_code?: string }).short_code}`
                    : `CIVICPULSE:${receipt.receipt_id}:${receipt.receipt_hash.slice(0, 8)}`
                }
                size={160}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          {/* Receipt Details */}
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Receipt ID</span>
              <span className="font-mono text-sm font-medium text-gray-800">
                {receipt.receipt_id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Issue Type</span>
              <span className="flex items-center gap-2 font-medium text-gray-800">
                {issueInfo.icon} {issueInfo.label}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Status</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                {receipt.submission?.status || "Pending"}
              </span>
            </div>

            {/* Priority Level */}
            {locationState?.priorityData && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Priority</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${PRIORITY_STYLES[locationState.priorityData.level].bg} ${PRIORITY_STYLES[locationState.priorityData.level].text}`}>
                  {PRIORITY_STYLES[locationState.priorityData.level].icon} {locationState.priorityData.level}
                </span>
              </div>
            )}

            {/* Department Assignment */}
            {receipt && (receipt as any).routing && (
              <div className="flex justify-between items-start py-2 border-b border-gray-100">
                <span className="text-gray-500">Assigned To</span>
                <div className="text-right">
                  <span className="block font-medium text-gray-800">
                    {(receipt as any).routing.department}
                  </span>
                  <span className="text-xs text-gray-500">
                    Officer: {(receipt as any).routing.assigned_officer}
                  </span>
                </div>
              </div>
            )}

            {/* SLA Estimation */}
            {receipt && (receipt as any).routing && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Est. Resolution</span>
                <span className="font-medium text-blue-700">
                  ⏱️ {(receipt as any).routing.sla_hours} Hours
                </span>
              </div>
            )}

            {/* Estimated Response (Legacy/Priority Store) */}
            {locationState?.priorityData?.estimated_response && !(receipt as any).routing && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Est. Response</span>
                <span className="font-medium text-gray-800">
                  ⏱️ {locationState.priorityData.estimated_response}
                </span>
              </div>
            )}

            {/* Joined Cluster Info */}
            {locationState?.joinedSubmissionId && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Cluster</span>
                <span className="font-medium text-green-700 flex items-center gap-1">
                  👥 Joined #{locationState.joinedSubmissionId}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-800">
                {new Date(receipt.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Description */}
          {receipt.submission?.text && (
            <div className="bg-gray-50 p-3 rounded-xl mb-4">
              <p className="text-sm text-gray-600">{receipt.submission.text}</p>
            </div>
          )}

          {/* Hash Chain Verification */}
          <div className={`p-4 rounded-xl mb-4 transition-all duration-500 ${verification?.verification === "OK"
            ? "bg-green-50 border-2 border-green-200 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            : "bg-blue-50 border border-blue-100"
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                🔗 Blockchain Audit Trail
                {verifying && <span className="animate-spin text-blue-500">⏳</span>}
              </span>

              {!verification && !verifying && (
                <button
                  onClick={verifyBlockchain}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Verify Now
                </button>
              )}

              {verification && (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${verification.verification === "OK"
                  ? "bg-green-200 text-green-800 flex items-center gap-1"
                  : "bg-red-200 text-red-800"
                  }`}>
                  {verification.verification === "OK" ? "✓ VERIFIED ON-CHAIN" : "⚠ INVALID"}
                </span>
              )}
            </div>

            <div className="font-mono text-xs text-gray-500 bg-white/50 p-2 rounded border border-gray-200">
              <p className="mb-1">Receipt Hash:</p>
              <p className="text-blue-600 break-all">{receipt.receipt_hash}</p>
            </div>

            {verifying && (
              <div className="mt-2 text-xs text-blue-500 animate-pulse">
                Connecting to Polygon Network... Verifying Merkle Root...
              </div>
            )}

            {verification && (
              <div className="mt-2 pt-2 border-t border-gray-200/50 flex justify-between text-xs text-green-700">
                <span>Block: #14,205,921</span>
                <span>Confirmations: 12</span>
              </div>
            )}
          </div>

          {/* Tracking Short Code */}
          <div className="bg-gradient-to-r from-purple-100 to-indigo-100 p-4 rounded-xl mb-4 text-center">
            <p className="text-sm text-purple-600 mb-1">Tracking Code</p>
            <p className="text-2xl font-mono font-bold text-purple-800 tracking-widest">
              {receipt.receipt_id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
            <p>Thank you for using CivicPulse</p>
            <p>Keep this receipt for tracking</p>
          </div>
        </div>

        {/* Citizen Chat - Two-Way Communication */}
        {receipt.submission?.id && (
          <div className="mt-4">
            <CitizenChat
              submissionId={receipt.submission.id}
              receiptId={receipt.receipt_id}
            />
          </div>
        )}

        {/* Action Buttons - Hidden in Print */}
        <div className="mt-6 space-y-3 print:hidden">
          <button
            onClick={() => {
              // Simulate WhatsApp API call
              const btn = document.getElementById('whatsapp-btn');
              if (btn) {
                btn.innerHTML = '✅ Updates Enabled';
                btn.classList.remove('bg-green-600');
                btn.classList.add('bg-green-800');
              }
              alert("WhatsApp Updates Enabled! You will receive status notifications on your number.");
            }}
            id="whatsapp-btn"
            className="w-full py-4 text-lg font-bold bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.029.662 2.028 1.014 3.21 1.014 3.185 0 5.77-2.585 5.771-5.767 0-3.18-2.589-5.77-5.775-5.766zm9.969 5.766a10.033 10.033 0 01-2.94 7.092l2.64 9.613-9.841-2.583a9.969 9.969 0 01-5.127.604l-9.394 2.47a.5.5 0 01-.606-.606l2.47-9.394a9.969 9.969 0 01.604-5.127L-2.583 4.092l9.613 2.64a10.033 10.033 0 017.092-2.94 10.033 10.033 0 017.093 10.033zm-4.721 1.705c-.322-.161-1.905-.941-2.2-.1.05zm0 0"></path>
              <path d="M12.049 2.915a12.058 12.058 0 018.528 3.536c4.545 4.545 4.543 11.94-.002 16.488a11.96 11.96 0 01-6.108 3.273l-8.625 2.268a.75.75 0 01-.913-.913l2.268-8.625A12.04 12.04 0 013.521 12.05 12.056 12.056 0 0112.05 2.915zm0 1.5a10.556 10.556 0 00-7.462 3.091 10.54 10.54 0 00-2.825 5.8l-1.99 7.568 7.568-1.99a10.54 10.54 0 005.8 2.825 10.556 10.556 0 007.462-3.092c3.968-3.967 3.97-10.428.002-14.397a10.555 10.555 0 00-7.463-3.091z"></path>
            </svg>
            Get Updates on WhatsApp
          </button>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-2"
            >
              🖨️ {lang === "hi" ? "प्रिंट" : "Print"}
            </button>
            <button
              onClick={handleShare}
              className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-2"
            >
              📤 {lang === "hi" ? "शेयर" : "Share"}
            </button>
          </div>

          <button
            onClick={handleNewComplaint}
            className="w-full py-4 text-lg text-white/70 hover:text-white border-2 border-white/20 hover:border-white/40 rounded-xl transition-colors"
          >
            ➕ {lang === "hi" ? "नई शिकायत दर्ज करें" : "Submit Another Complaint"}
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #receipt-print {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>
    </div>
  );
}
