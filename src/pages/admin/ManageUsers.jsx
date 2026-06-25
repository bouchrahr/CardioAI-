import { useEffect, useState } from 'react';
import api from '../../services/api';

const S = {
  card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)' },
  input: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', outline: 'none', width: '100%' },
  label: { fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontFamily: '"Space Grotesk",sans-serif' },
};

const EMPTY_DOCTOR = { first_name: '', last_name: '', email: '', password: '' };

function AddDoctorModal({ onClose, onSave }) {
  const [form,   setForm]   = useState(EMPTY_DOCTOR);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await api.post('/users/doctor', form);
      onSave();
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Erreur création médecin.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ ...S.card, width: '100%', maxWidth: 460, padding: 32, position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(0,230,118,0.5),transparent)' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Nouveau médecin</h2>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>Créer un compte médecin</p>
        {error && <div style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.2)', borderRadius: 10, padding: '10px 14px', color: '#FF6B8A', fontSize: '0.82rem', marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={S.label}>Prénom</label><input style={S.input} placeholder="Ahmed" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required /></div>
            <div><label style={S.label}>Nom</label><input style={S.input} placeholder="Benali" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required /></div>
          </div>
          <div><label style={S.label}>Email</label><input style={S.input} type="email" placeholder="medecin@hopital.dz" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
          <div><label style={S.label}>Mot de passe</label><input style={S.input} type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, color: 'rgba(255,255,255,0.6)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', cursor: 'pointer' }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ flex: 1, background: 'linear-gradient(180deg,#00C853,#00A040)', border: 'none', borderRadius: 12, padding: 12, color: '#fff', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Création...' : 'Créer le médecin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({ user, onClose, onConfirm, deleting }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ ...S.card, width: '100%', maxWidth: 380, padding: 32, position: 'relative', borderColor: 'rgba(255,51,102,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,51,102,0.5),transparent)' }} />
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#FF3366" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Supprimer l'utilisateur</h2>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 24 }}>
          Supprimer <b style={{ color: '#fff' }}>{user.first_name} {user.last_name}</b> ? Action <b style={{ color: '#FF3366' }}>irréversible</b>.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, color: 'rgba(255,255,255,0.6)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', cursor: 'pointer' }}>Annuler</button>
          <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, background: 'linear-gradient(180deg,#FF3366,#C62828)', border: 'none', borderRadius: 12, padding: 12, color: '#fff', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}>
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManageUsers() {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('all');
  const [showAdd,      setShowAdd]      = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchUsers = async () => {
    try { const r = await api.get('/users/'); setUsers(r.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchUsers();
    } catch {} finally { setDeleting(false); }
  };

  const filtered = users.filter(u => {
    const matchSearch = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleColor = { admin: '#FF3366', doctor: '#00E676', patient: '#4FC3F7' };

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.usr-row:hover{background:rgba(255,255,255,0.03)!important}.act-btn:hover{opacity:1!important}select option{background:#0B1424;color:#fff}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', marginBottom: 4 }}>{users.length} UTILISATEURS</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Gestion Utilisateurs</h1>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ background: 'linear-gradient(180deg,#00C853,#00A040)', border: 'none', borderRadius: 12, padding: '11px 20px', color: '#fff', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,200,83,0.25)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          Nouveau médecin
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, animation: 'fadeUp 0.35s ease', flexWrap: 'wrap' }}>
        <div style={{ ...S.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <input style={{ ...S.input, border: 'none', padding: 0, background: 'transparent' }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all','Tous'],['doctor','Médecins'],['patient','Patients'],['admin','Admins']].map(([val,lbl]) => (
            <button key={val} onClick={() => setRoleFilter(val)} style={{ background: roleFilter === val ? 'rgba(79,195,247,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${roleFilter === val ? 'rgba(79,195,247,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 999, padding: '8px 16px', color: roleFilter === val ? '#4FC3F7' : 'rgba(255,255,255,0.5)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ ...S.card, overflow: 'hidden', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 100px 120px 80px', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['Nom','Email','Rôle','Créé le','Action'].map(h => (
            <span key={h} style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: '"JetBrains Mono",monospace' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>Aucun utilisateur trouvé</div>
        ) : filtered.map((u, i) => {
          const rc = roleColor[u.role] ?? '#4FC3F7';
          return (
            <div key={u.id} className="usr-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 100px 120px 80px', padding: '13px 20px', alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: 'transparent', transition: 'background 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${rc}60,${rc}30)`, border: `1px solid ${rc}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {u.first_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{u.first_name} {u.last_name}</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: '"JetBrains Mono",monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
              <span style={{ color: rc, background: `${rc}15`, border: `1px solid ${rc}30`, borderRadius: 999, padding: '3px 10px', fontSize: '0.65rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace', width: 'fit-content', textTransform: 'capitalize' }}>{u.role}</span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}</span>
              {u.role !== 'admin' ? (
                <button className="act-btn" onClick={() => setDeleteTarget(u)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.2)', color: '#FF3366', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.15s' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>—</span>
              )}
            </div>
          );
        })}
      </div>

      {showAdd    && <AddDoctorModal onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); fetchUsers(); }} />}
      {deleteTarget && <DeleteModal user={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} deleting={deleting} />}
    </div>
  );
}