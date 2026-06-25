import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';

// ── Shared card style ──
const card = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 18, padding: '22px', boxShadow: '0 1px 2px rgba(16,35,28,0.04), 0 6px 20px -12px rgba(16,35,28,0.1)' };

const PIE_COLORS = { Normal: '#1E88E5', AFib: '#F0594C', Other: '#6F62E0' };

function StatCard({ icon, label, value, sub, color, light }) {
  return (
    <div style={{ ...card, flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -24, right: -24, width: 100, height: 100, borderRadius: '50%', background: light, pointerEvents: 'none' }} />
      <div style={{ width: 40, height: 40, borderRadius: 12, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', fontFamily: '"Space Grotesk",sans-serif', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 2, fontFamily: '"Space Grotesk",sans-serif' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: '"JetBrains Mono",monospace' }}>{sub}</div>}
      <div style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, background: `linear-gradient(90deg,transparent,${color}50,transparent)`, borderRadius: 1 }} />
    </div>
  );
}

function SeverityBadge({ level }) {
  const map = {
    Critique:  { bg: '#FDECEA', color: '#C0362B' },
    Urgent:    { bg: '#FCF1DF', color: '#B35800' },
    Attention: { bg: '#FEFCE8', color: '#854D0E' },
  };
  const s = map[level] ?? map['Attention'];
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 999, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace', whiteSpace: 'nowrap' }}>
      {level}
    </span>
  );
}

const LightTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 3, fontFamily: '"Space Grotesk",sans-serif' }}>{label}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E88E5', fontFamily: '"Space Grotesk",sans-serif' }}>{payload[0].value} analyses</div>
    </div>
  );
};

export default function DoctorDashboard() {
  const [stats,   setStats]   = useState(null);
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [s, n] = await Promise.all([api.get('/history/stats'), api.get('/notifications/')]);
        setStats(s.data);
        setNotifs(n.data.slice(0, 5));
      } catch {}
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ width: 32, height: 32, border: '2.5px solid #E5E7EB', borderTopColor: '#1E88E5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const lineData = stats?.analyses_per_day ?? [];
  const pieData  = stats?.class_distribution
    ? Object.entries(stats.class_distribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#111827' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.18)' }} />
          <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>SYSTÈME ACTIF</span>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#111827', margin: 0 }}>Vue d'ensemble</h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap', animation: 'fadeUp 0.32s ease' }}>
        <StatCard
          icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 11h6M19 8v6"/></svg>}
          label="Total Patients" value={stats?.total_patients ?? 0} sub="patients enregistrés" color="#1E88E5" light="#EFF6FF"
        />
        <StatCard
          icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>}
          label="Analyses aujourd'hui" value={stats?.analyses_today ?? 0} sub="depuis minuit" color="#059669" light="#ECFDF5"
        />
        <StatCard
          icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 21s-7-4.5-7-10.5C5 7.5 7.5 5 10 5c1.4 0 2.6.7 3 2 .4-1.3 1.6-2 3-2 2.5 0 5 2.5 5 5.5 0 6-7 10.5-7 10.5z"/></svg>}
          label="AFib détectées" value={stats?.afib_count ?? 0} sub={`sur ${stats?.total_analyses ?? 0} analyses`} color="#F0594C" light="#FEF2F2"
        />
        <StatCard
          icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>}
          label="Alertes critiques" value={stats?.critical_alerts ?? 0} sub="non traitées" color="#EFA23B" light="#FFFBEB"
        />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, marginBottom: 20, animation: 'fadeUp 0.36s ease' }}>

        {/* Line chart */}
        <div style={{ ...card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#111827', marginBottom: 2 }}>Analyses — 7 derniers jours</div>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: '"JetBrains Mono",monospace' }}>activité hebdomadaire</div>
            </div>
            <span style={{ background: '#EFF6FF', color: '#1E88E5', borderRadius: 999, padding: '4px 12px', fontSize: '0.7rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace' }}>7J</span>
          </div>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={lineData}>
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1E88E5"/>
                    <stop offset="100%" stopColor="#4FC3F7"/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: '"Space Grotesk",sans-serif', fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: '"Space Grotesk",sans-serif', fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip content={<LightTooltip />} />
                <Line type="monotone" dataKey="count" stroke="url(#lg)" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#1E88E5', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#1E88E5', stroke: '#BFDBFE', strokeWidth: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D1D5DB', fontSize: '0.85rem' }}>Aucune donnée</div>
          )}
        </div>

        {/* Pie chart */}
        <div style={{ ...card }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#111827', marginBottom: 2 }}>Distribution</div>
          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: '"JetBrains Mono",monospace', marginBottom: 14 }}>Normal · AFib · Autre</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="42%" innerRadius={58} outerRadius={82} paddingAngle={4} dataKey="value">
                  {pieData.map(entry => <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? '#1E88E5'} />)}
                </Pie>
                <Legend iconType="circle" iconSize={7}
                  formatter={v => <span style={{ fontSize: 11, fontFamily: '"Space Grotesk",sans-serif', color: '#6B7280' }}>{v}</span>} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12, fontFamily: '"Space Grotesk",sans-serif' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D1D5DB', fontSize: '0.85rem' }}>Aucune donnée</div>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, animation: 'fadeUp 0.4s ease' }}>

        {/* Recent alerts */}
        <div style={{ ...card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#111827' }}>Alertes récentes</div>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: '"JetBrains Mono",monospace', marginTop: 2 }}>Événements nécessitant une revue</div>
            </div>
            {notifs.filter(n => !n.is_read).length > 0 && (
              <span style={{ background: '#FEF2F2', color: '#C0362B', borderRadius: 999, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace' }}>
                {notifs.filter(n => !n.is_read).length} non lues
              </span>
            )}
          </div>

          {notifs.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#D1D5DB', fontSize: '0.85rem' }}>Aucune alerte ✅</div>
          ) : notifs.map((n, i) => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < notifs.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: n.is_read ? '#F3F4F6' : '#EFF6FF', border: `1px solid ${n.is_read ? '#E5E7EB' : '#BFDBFE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: n.is_read ? '#6B7280' : '#1E88E5', flexShrink: 0 }}>
                {n.patient_name?.charAt(0)?.toUpperCase() ?? 'P'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', marginBottom: 2 }}>{n.patient_name ?? 'Patient'}</div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <SeverityBadge level={n.severity} />
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontFamily: '"JetBrains Mono",monospace' }}>{new Date(n.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Stats summary */}
        <div style={{ ...card }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#111827', marginBottom: 2 }}>Résumé clinique</div>
          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: '"JetBrains Mono",monospace', marginBottom: 18 }}>statistiques globales</div>

          {[
            { label: 'Total analyses',     value: stats?.total_analyses ?? 0,  color: '#1E88E5', pct: 100 },
            { label: 'Rythme normal',      value: (stats?.total_analyses ?? 0) - (stats?.afib_count ?? 0), color: '#059669', pct: stats?.total_analyses ? Math.round(((stats.total_analyses - stats.afib_count) / stats.total_analyses) * 100) : 0 },
            { label: 'AFib détectées',     value: stats?.afib_count ?? 0,       color: '#F0594C', pct: stats?.total_analyses ? Math.round((stats.afib_count / stats.total_analyses) * 100) : 0 },
            { label: 'Alertes critiques',  value: stats?.critical_alerts ?? 0,  color: '#EFA23B', pct: stats?.total_analyses ? Math.round((stats.critical_alerts / stats.total_analyses) * 100) : 0 },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.82rem', color: '#374151' }}>{item.label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: item.color, fontFamily: '"JetBrains Mono",monospace' }}>{item.value}</span>
              </div>
              <div style={{ background: '#F3F4F6', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: 999, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}