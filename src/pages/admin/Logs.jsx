import { useEffect, useState } from 'react';
import api from '../../services/api';

const S = {
  card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)' },
};

const MOCK_LOGS = [
  { id: 1, action: 'LOGIN',           user: 'doctor@cardioai.com',  role: 'doctor',  details: 'Connexion réussie',                    created_at: new Date().toISOString() },
  { id: 2, action: 'ECG_UPLOAD',      user: 'doctor@cardioai.com',  role: 'doctor',  details: 'Analyse ECG patient #4',               created_at: new Date(Date.now()-3600000).toISOString() },
  { id: 3, action: 'PATIENT_CREATED', user: 'doctor@cardioai.com',  role: 'doctor',  details: 'Nouveau patient créé',                 created_at: new Date(Date.now()-7200000).toISOString() },
  { id: 4, action: 'LOGIN',           user: 'admin@cardioai.com',   role: 'admin',   details: 'Connexion admin',                      created_at: new Date(Date.now()-10800000).toISOString() },
  { id: 5, action: 'USER_DELETED',    user: 'admin@cardioai.com',   role: 'admin',   details: 'Utilisateur supprimé',                 created_at: new Date(Date.now()-14400000).toISOString() },
  { id: 6, action: 'LOGOUT',          user: 'doctor@cardioai.com',  role: 'doctor',  details: 'Déconnexion',                          created_at: new Date(Date.now()-18000000).toISOString() },
  { id: 7, action: 'LOGIN',           user: 'fatima@cardioai.com',  role: 'patient', details: 'Connexion patient',                    created_at: new Date(Date.now()-21600000).toISOString() },
  { id: 8, action: 'REPORT_VIEWED',   user: 'fatima@cardioai.com',  role: 'patient', details: 'Consultation résultats analyse #2',    created_at: new Date(Date.now()-25200000).toISOString() },
];

const ACTION_STYLE = {
  LOGIN:           { color: '#00E676', bg: 'rgba(0,230,118,0.12)',  border: 'rgba(0,230,118,0.25)'  },
  LOGOUT:          { color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)' },
  ECG_UPLOAD:      { color: '#4FC3F7', bg: 'rgba(79,195,247,0.12)', border: 'rgba(79,195,247,0.25)' },
  PATIENT_CREATED: { color: '#FFB300', bg: 'rgba(255,179,0,0.12)',  border: 'rgba(255,179,0,0.25)'  },
  USER_DELETED:    { color: '#FF3366', bg: 'rgba(255,51,102,0.12)', border: 'rgba(255,51,102,0.25)' },
  REPORT_VIEWED:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)',border: 'rgba(167,139,250,0.25)'},
};

function ActionBadge({ action }) {
  const s = ACTION_STYLE[action] ?? { color: '#4FC3F7', bg: 'rgba(79,195,247,0.12)', border: 'rgba(79,195,247,0.25)' };
  return <span style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 999, padding: '3px 10px', fontSize: '0.65rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace', whiteSpace: 'nowrap' }}>{action}</span>;
}

export default function Logs() {
  const [logs,    setLogs]    = useState(MOCK_LOGS);
  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');

  const filtered = logs.filter(l => {
    const matchFilter = filter === 'all' || l.action === filter;
    const matchSearch = l.user.toLowerCase().includes(search.toLowerCase()) || l.details.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const actions = [...new Set(logs.map(l => l.action))];

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', marginBottom: 4 }}>{logs.length} ÉVÉNEMENTS</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Logs Système</h1>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>Activité de la plateforme</p>
      </div>

      {/* Info banner */}
      <div style={{ ...S.card, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, borderColor: 'rgba(255,179,0,0.2)', background: 'rgba(255,179,0,0.05)', animation: 'fadeUp 0.32s ease' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#FFB300" strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke="#FFB300" strokeWidth="2" strokeLinecap="round"/></svg>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,179,0,0.8)' }}>Données de démonstration — les vrais logs seront disponibles une fois l'endpoint backend créé.</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, animation: 'fadeUp 0.35s ease', flexWrap: 'wrap' }}>
        <div style={{ ...S.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <input style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', width: '100%' }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} style={{ background: filter === 'all' ? 'rgba(79,195,247,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${filter === 'all' ? 'rgba(79,195,247,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 999, padding: '7px 14px', color: filter === 'all' ? '#4FC3F7' : 'rgba(255,255,255,0.5)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.8rem', cursor: 'pointer' }}>Tous</button>
          {actions.map(a => (
            <button key={a} onClick={() => setFilter(a)} style={{ background: filter === a ? 'rgba(79,195,247,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${filter === a ? 'rgba(79,195,247,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 999, padding: '7px 14px', color: filter === a ? '#4FC3F7' : 'rgba(255,255,255,0.5)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.8rem', cursor: 'pointer' }}>{a}</button>
          ))}
        </div>
      </div>

      {/* Logs list */}
      <div style={{ ...S.card, overflow: 'hidden', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px 100px 140px', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['Action','Détails','Utilisateur','Rôle','Date'].map(h => (
            <span key={h} style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: '"JetBrains Mono",monospace' }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>Aucun log trouvé</div>
        ) : filtered.map((l, i) => (
          <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px 100px 140px', padding: '13px 20px', alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s' }}>
            <ActionBadge action={l.action} />
            <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.65)', paddingRight: 12 }}>{l.details}</span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: '"JetBrains Mono",monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.user.split('@')[0]}</span>
            <span style={{ fontSize: '0.72rem', color: { admin: '#FF3366', doctor: '#00E676', patient: '#4FC3F7' }[l.role] ?? '#4FC3F7', fontFamily: '"JetBrains Mono",monospace', textTransform: 'capitalize' }}>{l.role}</span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace' }}>
              {new Date(l.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}