import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const S = {
  card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)' },
};

function RiskBadge({ level }) {
  const map = {
    Faible:   { color: '#00E676', border: 'rgba(0,230,118,0.25)',  bg: 'rgba(0,230,118,0.12)'  },
    Modéré:   { color: '#FFB300', border: 'rgba(255,179,0,0.25)',  bg: 'rgba(255,179,0,0.12)'  },
    Élevé:    { color: '#FF6D00', border: 'rgba(255,109,0,0.25)',  bg: 'rgba(255,109,0,0.12)'  },
    Critique: { color: '#FF3366', border: 'rgba(255,51,102,0.25)', bg: 'rgba(255,51,102,0.12)' },
  };
  const s = map[level] ?? map['Faible'];
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 999, padding: '4px 12px', fontSize: '0.72rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace' }}>{level ?? '—'}</span>;
}

function ClassBadge({ cls }) {
  const map = { Normal: '#00E676', AFib: '#FF3366', Other: '#FFB300' };
  const color = map[cls] ?? '#4FC3F7';
  return <span style={{ color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 999, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace' }}>{cls}</span>;
}

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient,  setPatient]  = useState(null);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [p, h] = await Promise.all([
          api.get(`/patients/${id}`),
          api.get(`/history/?patient_id=${id}`),
        ]);
        setPatient(p.data);
        setHistory(h.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div style={{ width: 32, height: 32, border: '2px solid rgba(79,195,247,0.2)', borderTopColor: '#4FC3F7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  if (!patient) return <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: '"Space Grotesk",sans-serif', padding: 20 }}>Patient introuvable.</div>;

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Back */}
      <button onClick={() => navigate('/doctor/patients')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Retour aux patients
      </button>

      {/* Patient info */}
      <div style={{ ...S.card, padding: '28px', marginBottom: 16, animation: 'fadeUp 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#1E88E5,#4FC3F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700 }}>
            {patient.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0, marginBottom: 4 }}>{patient.full_name}</h1>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{patient.age} ans · {patient.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
              <RiskBadge level={patient.risk_level} />
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/doctor/new-analysis', { state: { patientId: id, patientName: patient.full_name } })}
          style={{ background: 'linear-gradient(180deg,#2196F3,#1565C0)', border: 'none', borderRadius: 12, padding: '11px 20px', color: '#fff', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 24px rgba(30,136,229,0.3)' }}
        >
          + Nouvelle analyse
        </button>
      </div>
      <button
  onClick={() => navigate(`/doctor/patients/${id}/twin`)}
  style={{ background: 'rgba(79,195,247,0.1)', border: '1px solid rgba(79,195,247,0.25)', borderRadius: 12, padding: '11px 20px', color: '#4FC3F7', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}
>
  🫀 Digital Twin
</button>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16, animation: 'fadeUp 0.35s ease' }}>
        {[
          { label: 'Analyses totales', value: history.length },
          { label: 'Score de risque', value: patient.chadsvasc_score != null ? `${patient.chadsvasc_score}/9` : '—' },
          { label: 'Dernière analyse', value: patient.last_analysis ? new Date(patient.last_analysis).toLocaleDateString('fr-FR') : '—' },
        ].map(c => (
          <div key={c.label} style={{ ...S.card, padding: '20px 24px' }}>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Antécédents */}
      {patient.medical_history && (
        <div style={{ ...S.card, padding: '20px 24px', marginBottom: 16, animation: 'fadeUp 0.38s ease' }}>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Antécédents médicaux</div>
          <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>{patient.medical_history}</p>
        </div>
      )}

      {/* Historique analyses */}
      <div style={{ ...S.card, overflow: 'hidden', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Historique des analyses</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginTop: 2 }}>{history.length} analyse{history.length !== 1 ? 's' : ''}</div>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>Aucune analyse pour ce patient</div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 100px 100px 80px', padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Date', 'Résultat', 'Classe', 'Confiance', 'Score'].map(h => (
                <span key={h} style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            {history.map((h, i) => (
              <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 100px 100px 80px', padding: '14px 24px', alignItems: 'center', borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s' }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: '"JetBrains Mono",monospace' }}>{new Date(h.created_at).toLocaleDateString('fr-FR')}</span>
                <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{h.llm_report?.slice(0, 60) ?? '—'}...</span>
                <ClassBadge cls={h.predicted_class} />
                <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>{h.confidence ? `${(h.confidence * 100).toFixed(0)}%` : '—'}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4FC3F7' }}>{h.chadsvasc_score ?? '—'}/9</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}