import { useEffect, useState } from 'react';
import api from '../../services/api';

const S = {
  card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)', position: 'relative', overflow: 'hidden' },
};

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ ...S.card, padding: '22px 24px', flex: 1 }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle,${color}20,transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color }}>
        {icon}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1, marginBottom: 4 }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace' }}>{sub}</div>}
      <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 1, background: `linear-gradient(90deg,transparent,${color}50,transparent)` }} />
    </div>
  );
}

export default function AdminDashboard() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/').then(r => setUsers(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const doctors  = users.filter(u => u.role === 'doctor');
  const patients = users.filter(u => u.role === 'patient');

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#fff' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, animation: 'fadeUp 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2ED573', boxShadow: '0 0 8px rgba(46,213,115,0.7)' }} />
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>ADMINISTRATION · CARDIA</span>
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>Administration</h1>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>Vue globale de la plateforme</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(79,195,247,0.2)', borderTopColor: '#4FC3F7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', animation: 'fadeUp 0.35s ease' }}>
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
              label="Total utilisateurs" value={users.length} sub="sur la plateforme" color="#4FC3F7"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
              label="Médecins" value={doctors.length} sub="comptes actifs" color="#00E676"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 11h6M19 8v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
              label="Patients" value={patients.length} sub="enregistrés" color="#FFB300"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
              label="Admins" value={users.filter(u => u.role === 'admin').length} sub="accès total" color="#FF3366"
            />
          </div>

          {/* Users list */}
          <div style={{ ...S.card, padding: '24px', animation: 'fadeUp 0.4s ease' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: 4 }}>Utilisateurs récents</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 18 }}>{users.length} comptes actifs</div>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
              {['Nom', 'Email', 'Rôle', 'Créé le'].map(h => (
                <span key={h} style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: '"JetBrains Mono",monospace' }}>{h}</span>
              ))}
            </div>

            {users.slice(0, 10).map((u, i) => {
              const roleColor = { admin: '#FF3366', doctor: '#00E676', patient: '#4FC3F7' }[u.role] ?? '#4FC3F7';
              return (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', padding: '12px 14px', alignItems: 'center', borderBottom: i < Math.min(users.length, 10) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${roleColor}60,${roleColor}30)`, border: `1px solid ${roleColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {u.first_name?.charAt(0)?.toUpperCase() ?? 'U'}
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{u.first_name} {u.last_name}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"JetBrains Mono",monospace', fontSize: '0.7rem' }}>{u.email}</span>
                  <span style={{ color: roleColor, background: `${roleColor}15`, border: `1px solid ${roleColor}30`, borderRadius: 999, padding: '3px 10px', fontSize: '0.65rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace', width: 'fit-content', textTransform: 'capitalize' }}>{u.role}</span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}