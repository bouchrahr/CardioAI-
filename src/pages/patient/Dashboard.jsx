import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

const S = {
  card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)', position: 'relative', overflow: 'hidden' },
};

function RiskGauge({ score }) {
  const color = score <= 1 ? '#00E676' : score <= 3 ? '#FFB300' : score <= 5 ? '#FF6D00' : '#FF3366';
  const label = score <= 1 ? 'Faible' : score <= 3 ? 'Modéré' : score <= 5 ? 'Élevé' : 'Critique';
  const R = 44, cx = 54, cy = 54;
  const toRad = d => (d * Math.PI) / 180;
  const startAngle = -210, totalDeg = 240;
  const filledDeg = (score / 9) * totalDeg;
  const arcPath = (start, end) => {
    const x1 = cx + R * Math.cos(toRad(start)), y1 = cy + R * Math.sin(toRad(start));
    const x2 = cx + R * Math.cos(toRad(end)),   y2 = cy + R * Math.sin(toRad(end));
    return `M ${x1} ${y1} A ${R} ${R} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="108" height="80" viewBox="0 0 108 80">
        <path d={arcPath(startAngle, startAngle + totalDeg)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" strokeLinecap="round"/>
        <path d={arcPath(startAngle, startAngle + filledDeg)} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}/>
        <text x={cx} y={cy - 2} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700" fontFamily='"Space Grotesk",sans-serif'>{score}</text>
        <text x={cx} y={cx + 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily='"Space Grotesk",sans-serif'>/9</text>
      </svg>
      <span style={{ color, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 999, padding: '4px 14px', fontSize: '0.78rem', fontWeight: 600, fontFamily: '"Space Grotesk",sans-serif' }}>{label}</span>
    </div>
  );
}

function ClassBadge({ cls }) {
  const map = { Normal: '#00E676', AFib: '#FF3366', Other: '#FFB300' };
  const c = map[cls] ?? '#4FC3F7';
  return <span style={{ color: c, background: `${c}15`, border: `1px solid ${c}30`, borderRadius: 999, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace' }}>{cls}</span>;
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user }  = useAuthStore();
  const [profile,  setProfile]  = useState(null);
  const [lastEcg,  setLastEcg]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [meRes, histRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/history/'),
        ]);
        setProfile(meRes.data);
        if (histRes.data.length > 0) setLastEcg(histRes.data[0]);
      } catch {}
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const fullName = user?.full_name ?? (user?.first_name ? `${user.first_name} ${user.last_name}` : 'Patient');

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(79,195,247,0.2)', borderTopColor: '#4FC3F7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#fff' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', marginBottom: 4 }}>ESPACE PATIENT</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
          Bonjour, {user?.first_name ?? fullName} 👋
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>Voici un résumé de votre état de santé</p>
      </div>

      {/* Last analysis banner */}
      {lastEcg ? (
        <div style={{ ...S.card, padding: '24px 28px', marginBottom: 16, borderColor: 'rgba(79,195,247,0.15)', animation: 'fadeUp 0.35s ease' }}>
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(79,195,247,0.4),transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', marginBottom: 8 }}>DERNIÈRE ANALYSE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <ClassBadge cls={lastEcg.predicted_class} />
                <span style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.5)' }}>
                  Confiance : <b style={{ color: '#fff' }}>{lastEcg.confidence ? `${(lastEcg.confidence * 100).toFixed(0)}%` : '—'}</b>
                </span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>
                  {new Date(lastEcg.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
            <RiskGauge score={lastEcg.chadsvasc_score ?? 0} />
          </div>
        </div>
      ) : (
        <div style={{ ...S.card, padding: '32px', textAlign: 'center', marginBottom: 16, animation: 'fadeUp 0.35s ease' }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>🫀</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>Aucune analyse disponible</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>Votre médecin n'a pas encore effectué d'analyse ECG</div>
        </div>
      )}

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16, animation: 'fadeUp 0.4s ease' }}>
        {[
          { label: 'Âge', value: profile?.age ?? '—', unit: 'ans', color: '#4FC3F7' },
          { label: 'Poids', value: profile?.weight ?? '—', unit: 'kg', color: '#00E676' },
          { label: 'Taille', value: profile?.height ?? '—', unit: 'cm', color: '#FFB300' },
        ].map(c => (
          <div key={c.label} style={{ ...S.card, padding: '18px 20px' }}>
            <div style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg,transparent,${c.color}40,transparent)` }} />
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {c.value}<span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>{c.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Medical history */}
      {profile?.medical_history && (
        <div style={{ ...S.card, padding: '20px 24px', marginBottom: 16, animation: 'fadeUp 0.42s ease' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Antécédents médicaux</div>
          <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>{profile.medical_history}</p>
        </div>
      )}

      {/* Risk factors */}
      <div style={{ ...S.card, padding: '20px 24px', animation: 'fadeUp 0.45s ease' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Facteurs de risque</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {[
            { label: 'Diabète',           value: profile?.has_diabetes         },
            { label: 'Hypertension',      value: profile?.has_hypertension     },
            { label: 'Maladie vasculaire',value: profile?.has_vascular_disease },
            { label: "Antécédent d'AVC",  value: profile?.previous_stroke      },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: f.value ? 'rgba(255,109,0,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${f.value ? 'rgba(255,109,0,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.value ? '#FF6D00' : 'rgba(255,255,255,0.15)', boxShadow: f.value ? '0 0 6px rgba(255,109,0,0.5)' : 'none', flexShrink: 0 }} />
              <span style={{ fontSize: '0.83rem', color: f.value ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)' }}>{f.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600, color: f.value ? '#FF6D00' : 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace' }}>
                {f.value ? 'Oui' : 'Non'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}