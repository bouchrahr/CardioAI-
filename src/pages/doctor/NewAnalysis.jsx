import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

const S = {
  card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)', position: 'relative', overflow: 'hidden' },
};

// ─── ECG Chart ────────────────────────────────────────────────────────────────
function ECGChart({ data }) {
  const chartData = data?.map((v, i) => ({ t: i, v })) ?? [];
  // Afficher max 500 points pour la perf
  const sampled = chartData.filter((_, i) => i % Math.max(1, Math.floor(chartData.length / 500)) === 0);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={sampled}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="t" hide />
        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} width={30} />
        <Tooltip
          contentStyle={{ background: '#0B1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, fontFamily: '"Space Grotesk",sans-serif', color: '#fff' }}
          formatter={(v) => [v.toFixed(3), 'mV']}
          labelFormatter={() => ''}
        />
        <Line type="monotone" dataKey="v" stroke="#4FC3F7" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Attention Map ────────────────────────────────────────────────────────────
function AttentionMap({ signal, attention }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !signal?.length || !attention?.length) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const step  = W / signal.length;
    const mid   = H / 2;
    const range = Math.max(...signal) - Math.min(...signal) || 1;

    // Draw attention heatmap background
    for (let i = 0; i < attention.length; i++) {
      const x    = (i / attention.length) * W;
      const w    = W / attention.length + 1;
      const alpha = attention[i] * 0.55;
      const r = Math.floor(255 * attention[i]);
      const g = Math.floor(100 * (1 - attention[i]));
      ctx.fillStyle = `rgba(${r},${g},79,${alpha})`;
      ctx.fillRect(x, 0, w, H);
    }

    // Draw ECG signal
    ctx.beginPath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    signal.forEach((v, i) => {
      const x = i * step;
      const y = mid - ((v - Math.min(...signal)) / range - 0.5) * (H * 0.7);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [signal, attention]);

  return (
    <canvas ref={canvasRef} width={800} height={120}
      style={{ width: '100%', height: 120, borderRadius: 8, background: 'rgba(0,0,0,0.2)' }} />
  );
}

// ─── Risk Gauge ───────────────────────────────────────────────────────────────
function RiskGauge({ score }) {
  const pct   = (score / 9) * 100;
  const color = score <= 1 ? '#00E676' : score <= 3 ? '#FFB300' : score <= 5 ? '#FF6D00' : '#FF3366';
  const label = score <= 1 ? 'Faible' : score <= 3 ? 'Modéré' : score <= 5 ? 'Élevé' : 'Critique';

  // SVG arc
  const R  = 52, cx = 64, cy = 64;
  const startAngle = -210, endAngle = 30;
  const totalDeg   = endAngle - startAngle;
  const filledDeg  = (pct / 100) * totalDeg;
  const toRad = (d) => (d * Math.PI) / 180;
  const arcPath = (start, end) => {
    const x1 = cx + R * Math.cos(toRad(start));
    const y1 = cy + R * Math.sin(toRad(start));
    const x2 = cx + R * Math.cos(toRad(end));
    const y2 = cy + R * Math.sin(toRad(end));
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={128} height={100} viewBox="0 0 128 100">
        <path d={arcPath(startAngle, endAngle)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" />
        <path d={arcPath(startAngle, startAngle + filledDeg)} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
        <text x={cx} y={cy + 6} textAnchor="middle" fill="#fff" fontSize="22" fontWeight="700" fontFamily='"Space Grotesk",sans-serif'>{score}</text>
        <text x={cx} y={cy + 20} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily='"Space Grotesk",sans-serif'>/9</text>
      </svg>
      <span style={{ color, fontWeight: 700, fontSize: '0.9rem', fontFamily: '"Space Grotesk",sans-serif',
        background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 999, padding: '4px 14px' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NewAnalysis() {
  const location   = useLocation();
  const fileRef    = useRef(null);

  // Pre-fill from navigation state (from PatientProfile)
  const [patientId,   setPatientId]   = useState(location.state?.patientId ?? '');
  const [patientName, setPatientName] = useState(location.state?.patientName ?? '');
  const [patients,    setPatients]    = useState([]);

  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [step,     setStep]     = useState('upload'); // upload | analyzing | results
  const [progress, setProgress] = useState(0);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  // Load patients list
  useEffect(() => {
    api.get('/patients/').then(r => setPatients(r.data)).catch(() => {});
  }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleAnalyze = async () => {
    if (!file || !patientId) { setError('Sélectionnez un patient et un fichier ECG.'); return; }
    setError(null); setStep('analyzing'); setProgress(0);

    // Fake progress animation
    const interval = setInterval(() => setProgress(p => Math.min(p + 8, 90)), 200);

    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`/ecg/upload/${patientId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => { setResult(res.data); setStep('results'); }, 400);
    } catch (err) {
      clearInterval(interval);
      setError(err.response?.data?.detail ?? 'Erreur lors de l\'analyse.');
      setStep('upload');
    }
  };

  const reset = () => { setStep('upload'); setFile(null); setResult(null); setProgress(0); setError(null); };

  const pred = result?.prediction;

  const classColor = { Normal: '#00E676', AFib: '#FF3366', Other: '#FFB300' };
  const cls = pred?.predicted_class;
  const color = classColor[cls] ?? '#4FC3F7';

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#fff', maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .drop-zone:hover{border-color:rgba(79,195,247,0.4)!important;background:rgba(79,195,247,0.04)!important}
        select option{background:#0B1424;color:#fff}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', marginBottom: 4 }}>ANALYSE IA · ECG</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Nouvelle Analyse</h1>
      </div>

      {/* ── STEP: UPLOAD ── */}
      {step === 'upload' && (
        <div style={{ animation: 'fadeUp 0.35s ease' }}>
          {error && (
            <div style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.25)', borderRadius: 12, padding: '12px 16px', color: '#FF6B8A', fontSize: '0.85rem', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              {error}
            </div>
          )}

          {/* Patient selector */}
          <div style={{ ...S.card, padding: '20px 24px', marginBottom: 16 }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Patient</label>
            <select
              value={patientId}
              onChange={e => { setPatientId(e.target.value); setPatientName(patients.find(p => p.id == e.target.value)?.full_name ?? ''); }}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: patientId ? '#fff' : 'rgba(255,255,255,0.3)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} — {p.age} ans</option>)}
            </select>
          </div>

          {/* Drop zone */}
          <div
            className="drop-zone"
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              ...S.card,
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              border: `1.5px dashed ${dragging ? 'rgba(79,195,247,0.5)' : file ? 'rgba(0,230,118,0.4)' : 'rgba(255,255,255,0.12)'}`,
              background: dragging ? 'rgba(79,195,247,0.04)' : file ? 'rgba(0,230,118,0.03)' : 'rgba(11,20,36,0.8)',
              transition: 'all 0.2s',
              marginBottom: 16,
            }}
          >
            <input ref={fileRef} type="file" accept=".csv,.txt,.dat,.edf" hidden onChange={e => setFile(e.target.files[0])} />

            {file ? (
              <>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#00E676', marginBottom: 4 }}>{file.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>{(file.size / 1024).toFixed(1)} KB · prêt pour l'analyse</div>
                <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{ marginTop: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px', color: 'rgba(255,255,255,0.5)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.78rem', cursor: 'pointer' }}>
                  Changer de fichier
                </button>
              </>
            ) : (
              <>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(79,195,247,0.08)', border: '1px solid rgba(79,195,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#4FC3F7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 6 }}>Déposez votre fichier ECG ici</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>ou cliquez pour parcourir · CSV, TXT, DAT, EDF</div>
              </>
            )}
          </div>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={!file || !patientId}
            style={{
              width: '100%', background: 'linear-gradient(180deg,#2196F3,#1565C0)',
              border: 'none', borderRadius: 14, padding: '15px',
              color: '#fff', fontFamily: '"Space Grotesk",sans-serif', fontSize: '1rem',
              fontWeight: 600, cursor: file && patientId ? 'pointer' : 'not-allowed',
              opacity: file && patientId ? 1 : 0.4,
              boxShadow: '0 8px 24px rgba(30,136,229,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Lancer l'analyse IA
          </button>
        </div>
      )}

      {/* ── STEP: ANALYZING ── */}
      {step === 'analyzing' && (
        <div style={{ ...S.card, padding: '60px 40px', textAlign: 'center', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(79,195,247,0.5),transparent)' }} />

          {/* Spinning ECG icon */}
          <div style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid rgba(79,195,247,0.15)', borderTopColor: '#4FC3F7', animation: 'spin 1s linear infinite', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-6 4 12 2-6h6" stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>Analyse en cours...</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: 28, fontFamily: '"JetBrains Mono",monospace', animation: 'pulse 1.5s ease-in-out infinite' }}>
            {progress < 30 ? 'Lecture du signal ECG...' : progress < 60 ? 'Détection des arythmies...' : progress < 85 ? 'Calcul du score de risque...' : 'Génération du rapport médical...'}
          </div>

          {/* Progress bar */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 999, height: 6, overflow: 'hidden', maxWidth: 320, margin: '0 auto' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#1E88E5,#4FC3F7)', borderRadius: 999, transition: 'width 0.3s ease', boxShadow: '0 0 12px rgba(79,195,247,0.5)' }} />
          </div>
          <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>{progress}%</div>
        </div>
      )}

      {/* ── STEP: RESULTS ── */}
      {step === 'results' && pred && (
        <div style={{ animation: 'fadeUp 0.4s ease' }}>

          {/* Top result banner */}
          <div style={{ ...S.card, padding: '24px 28px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderColor: `${color}30` }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${color}60,transparent)` }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', marginBottom: 8 }}>RÉSULTAT · PATIENT {patientName?.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em' }}>{cls}</span>
                <span style={{ background: `${color}18`, color, border: `1px solid ${color}35`, borderRadius: 999, padding: '6px 16px', fontSize: '0.85rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace' }}>
                  {(pred.confidence * 100).toFixed(1)}% confiance
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={reset} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 18px', color: 'rgba(255,255,255,0.6)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                Nouvelle analyse
              </button>
            </div>
          </div>

          {/* ECG + Attention */}
          <div style={{ ...S.card, padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Signal ECG</div>
            {result?.ecg_signal?.length > 0
              ? <ECGChart data={result.ecg_signal} />
              : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.82rem' }}>Signal non disponible</div>
            }

            {pred.attention_map?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 8 }}>
                  CARTE D'ATTENTION — zones analysées par l'IA
                </div>
                <AttentionMap signal={result.ecg_signal} attention={pred.attention_map} />
              </div>
            )}
          </div>

          {/* Score + probabilities */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, marginBottom: 16 }}>

            {/* Risk gauge */}
            <div style={{ ...S.card, padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Score CHADS</div>
              <RiskGauge score={pred.chadsvasc_score ?? 0} />
              {pred.avc_risk_12m != null && (
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', fontFamily: '"JetBrains Mono",monospace' }}>
                  Risque AVC 12 mois<br/>
                  <span style={{ color: '#FFB300', fontWeight: 600, fontSize: '0.88rem' }}>{pred.avc_risk_12m}%</span>
                </div>
              )}
            </div>

            {/* Class probabilities */}
            <div style={{ ...S.card, padding: '24px' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>Probabilités par classe</div>
              {pred.probabilities && Object.entries(pred.probabilities).map(([cls, prob]) => {
                const c = { Normal: '#00E676', AFib: '#FF3366', Other: '#FFB300' }[cls] ?? '#4FC3F7';
                return (
                  <div key={cls} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>{cls}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: c, fontFamily: '"JetBrains Mono",monospace' }}>{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 999, height: 6 }}>
                      <div style={{ height: '100%', width: `${prob * 100}%`, background: c, borderRadius: 999, boxShadow: `0 0 8px ${c}60`, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LLM Report */}
          {pred.llm_report && (
            <div style={{ ...S.card, padding: '24px', marginBottom: 16 }}>
              <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(79,195,247,0.4),transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(79,195,247,0.1)', border: '1px solid rgba(79,195,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="3" stroke="#4FC3F7" strokeWidth="1.8"/><circle cx="9" cy="12" r="1.2" fill="#4FC3F7"/><circle cx="15" cy="12" r="1.2" fill="#4FC3F7"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Rapport médical</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>généré par IA · LLaMA 3</div>
                </div>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>
                {pred.llm_report}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}