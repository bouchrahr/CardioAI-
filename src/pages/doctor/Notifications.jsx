import { useEffect, useState } from 'react';
import api from '../../services/api';

const S = {
  card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)' },
};

function SeverityBadge({ level }) {
  const map = {
    Critique:  { bg: 'rgba(255,51,102,0.12)',  color: '#FF3366',  border: 'rgba(255,51,102,0.25)'  },
    Urgent:    { bg: 'rgba(255,109,0,0.12)',   color: '#FF6D00',  border: 'rgba(255,109,0,0.25)'   },
    Attention: { bg: 'rgba(255,179,0,0.12)',   color: '#FFB300',  border: 'rgba(255,179,0,0.25)'   },
  };
  const s = map[level] ?? map['Attention'];
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 999, padding: '3px 10px', fontSize: '0.65rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace' }}>{level}</span>;
}

export default function Notifications() {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  const fetchNotifs = async () => {
    try { const r = await api.get('/notifications/'); setNotifs(r.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifs(); }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const filtered = filter === 'all' ? notifs : filter === 'unread' ? notifs.filter(n => !n.is_read) : notifs.filter(n => n.severity === filter);
  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>ALERTES</div>
            {unreadCount > 0 && <span style={{ background: 'rgba(255,51,102,0.15)', color: '#FF3366', border: '1px solid rgba(255,51,102,0.25)', borderRadius: 999, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace' }}>{unreadCount} non lues</span>}
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ background: 'rgba(79,195,247,0.08)', border: '1px solid rgba(79,195,247,0.2)', borderRadius: 10, padding: '9px 16px', color: '#4FC3F7', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.82rem', cursor: 'pointer' }}>
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, animation: 'fadeUp 0.35s ease' }}>
        {[['all','Toutes'], ['unread','Non lues'], ['Critique','Critique'], ['Urgent','Urgent'], ['Attention','Attention']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            background: filter === val ? 'rgba(79,195,247,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${filter === val ? 'rgba(79,195,247,0.35)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 999, padding: '7px 14px',
            color: filter === val ? '#4FC3F7' : 'rgba(255,255,255,0.5)',
            fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
          }}>{lbl}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ ...S.card, overflow: 'hidden', animation: 'fadeUp 0.4s ease' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>Aucune notification</div>
          </div>
        ) : filtered.map((n, i) => (
          <div key={n.id} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
            borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            background: n.is_read ? 'transparent' : 'rgba(30,136,229,0.04)',
            transition: 'background 0.15s',
          }}>
            {/* Unread dot */}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'transparent' : '#4FC3F7', boxShadow: n.is_read ? 'none' : '0 0 6px rgba(79,195,247,0.6)', flexShrink: 0 }} />

            {/* Avatar */}
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1E88E5,#4FC3F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}>
              {n.patient_name?.charAt(0)?.toUpperCase() ?? 'P'}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: n.is_read ? 400 : 600, marginBottom: 3 }}>{n.patient_name ?? 'Patient'}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <SeverityBadge level={n.severity} />
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace' }}>{new Date(n.created_at).toLocaleDateString('fr-FR')}</span>
            </div>

            {/* Mark read btn */}
            {!n.is_read && (
              <button onClick={() => markRead(n.id)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', color: 'rgba(255,255,255,0.4)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.72rem', cursor: 'pointer', flexShrink: 0 }}>
                Lu ✓
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}