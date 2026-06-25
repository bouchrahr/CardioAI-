import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const S = {
  card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)' },
  input: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontFamily: '"Space Grotesk", sans-serif', fontSize: '0.88rem', outline: 'none', width: '100%' },
  label: { fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontFamily: '"Space Grotesk", sans-serif' },
};

const EMPTY = {
  first_name: '', last_name: '', age: '', gender: 'M',
  height: '', weight: '', email: '', password: '',
  medical_history: '',
  has_diabetes: false, has_hypertension: false,
  has_vascular_disease: false, previous_stroke: false,
};

function Checkbox({ label, checked, onChange }) {
  return (
    <div onClick={onChange} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: checked ? 'rgba(79,195,247,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${checked ? 'rgba(79,195,247,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
      <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${checked ? '#4FC3F7' : 'rgba(255,255,255,0.2)'}`, background: checked ? '#4FC3F7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
        {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span style={{ fontSize: '0.85rem', color: checked ? '#fff' : 'rgba(255,255,255,0.55)' }}>{label}</span>
    </div>
  );
}

// ─── Patient Form Modal ───────────────────────────────────────────────────────
function PatientModal({ initial, onClose, onSave }) {
  const [form,   setForm]   = useState(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);
  const isEdit = !!initial?.id;

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const t = (field) => ()  => setForm(p => ({ ...p, [field]: !p[field] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload = {
        ...form,
        age:    parseInt(form.age),
        height: form.height ? parseFloat(form.height) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
      };
      if (isEdit) {
        await api.put(`/patients/${initial.id}`, payload);
      } else {
        await api.post('/patients/', payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Erreur.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ ...S.card, width: '100%', maxWidth: 520, padding: 32, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(79,195,247,0.5),transparent)' }} />

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>
          {isEdit ? 'Modifier le patient' : 'Nouveau patient'}
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
          {isEdit ? `Modification de ${initial.first_name} ${initial.last_name}` : 'Remplissez les informations du patient'}
        </p>

        {error && <div style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.2)', borderRadius: 10, padding: '10px 14px', color: '#FF6B8A', fontSize: '0.82rem', marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={S.label}>Prénom</label><input style={S.input} placeholder="Amira" value={form.first_name} onChange={f('first_name')} required /></div>
            <div><label style={S.label}>Nom</label><input style={S.input} placeholder="Boudiaf" value={form.last_name} onChange={f('last_name')} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={S.label}>Âge</label><input style={S.input} type="number" placeholder="65" min="0" max="120" value={form.age} onChange={f('age')} required /></div>
            <div>
              <label style={S.label}>Sexe</label>
              <select style={{ ...S.input, cursor: 'pointer' }} value={form.gender} onChange={f('gender')}>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={S.label}>Taille (cm)</label><input style={S.input} type="number" placeholder="170" value={form.height} onChange={f('height')} /></div>
            <div><label style={S.label}>Poids (kg)</label><input style={S.input} type="number" placeholder="70" value={form.weight} onChange={f('weight')} /></div>
          </div>
          <div><label style={S.label}>Email</label><input style={S.input} type="email" placeholder="patient@exemple.com" value={form.email} onChange={f('email')} required={!isEdit} /></div>
          {!isEdit && <div><label style={S.label}>Mot de passe</label><input style={S.input} type="password" placeholder="••••••••" value={form.password} onChange={f('password')} required /></div>}
          <div><label style={S.label}>Antécédents</label><textarea style={{ ...S.input, minHeight: 70, resize: 'vertical' }} placeholder="Notes médicales..." value={form.medical_history} onChange={f('medical_history')} /></div>

          <div>
            <label style={{ ...S.label, marginBottom: 10 }}>Facteurs de risque</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Checkbox label="Diabète"              checked={form.has_diabetes}         onChange={t('has_diabetes')} />
              <Checkbox label="Hypertension (HTA)"   checked={form.has_hypertension}     onChange={t('has_hypertension')} />
              <Checkbox label="Maladie vasculaire"    checked={form.has_vascular_disease} onChange={t('has_vascular_disease')} />
              <Checkbox label="Antécédent d'AVC"      checked={form.previous_stroke}      onChange={t('previous_stroke')} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, color: 'rgba(255,255,255,0.6)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', cursor: 'pointer' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, background: 'linear-gradient(180deg,#2196F3,#1565C0)', border: 'none', borderRadius: 12, padding: 12, color: '#fff', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ patient, onClose, onConfirm, deleting }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ ...S.card, width: '100%', maxWidth: 400, padding: 32, position: 'relative', borderColor: 'rgba(255,51,102,0.2)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,51,102,0.5),transparent)' }} />

        {/* Icon */}
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#FF3366" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="#FF3366" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>

        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Supprimer le patient</h2>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 24 }}>
          Vous allez supprimer <b style={{ color: '#fff' }}>{patient.first_name} {patient.last_name}</b>. Cette action est <b style={{ color: '#FF3366' }}>irréversible</b> — toutes les analyses associées seront supprimées.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, color: 'rgba(255,255,255,0.6)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={deleting}
            style={{ flex: 1, background: 'linear-gradient(180deg,#FF3366,#C62828)', border: 'none', borderRadius: 12, padding: 12, color: '#fff', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Patients() {
  const navigate = useNavigate();
  const [patients,    setPatients]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [addModal,    setAddModal]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null); // patient object
  const [deleteTarget,setDeleteTarget]= useState(null); // patient object
  const [deleting,    setDeleting]    = useState(false);

  const fetchPatients = async () => {
    try { const r = await api.get('/patients/'); setPatients(r.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchPatients(); }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/patients/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchPatients();
    } catch {} finally { setDeleting(false); }
  };

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: '"Space Grotesk", sans-serif', color: '#fff' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .pat-row:hover{background:rgba(255,255,255,0.03)!important}
        .act-btn:hover{opacity:1!important}
        select option{background:#0B1424;color:#fff}
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', marginBottom: 4 }}>{patients.length} PATIENT{patients.length !== 1 ? 'S' : ''}</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Mes Patients</h1>
        </div>
        <button onClick={() => setAddModal(true)}
          style={{ background: 'linear-gradient(180deg,#2196F3,#1565C0)', border: 'none', borderRadius: 12, padding: '11px 20px', color: '#fff', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(30,136,229,0.3)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          Nouveau patient
        </button>
      </div>

      {/* Search */}
      <div style={{ ...S.card, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeUp 0.35s ease' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        <input style={{ ...S.input, border: 'none', padding: 0, background: 'transparent' }} placeholder="Rechercher un patient..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}>×</button>}
      </div>

      {/* Table */}
      <div style={{ ...S.card, overflow: 'hidden', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 70px 75px 75px 75px 75px 110px', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['Nom','Âge','Sexe','Diabète','HTA','Vasc.','AVC','Actions'].map(h => (
            <span key={h} style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: '"JetBrains Mono",monospace' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
            {search ? 'Aucun résultat' : 'Aucun patient — ajoutez-en un !'}
          </div>
        ) : filtered.map((p, i) => (
          <div key={p.id} className="pat-row"
            style={{ display: 'grid', gridTemplateColumns: '2fr 70px 70px 75px 75px 75px 75px 110px', padding: '13px 20px', alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: 'transparent', transition: 'background 0.15s', cursor: 'pointer' }}
            onClick={() => navigate(`/doctor/patients/${p.id}`)}>

            {/* Nom */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#1E88E5,#4FC3F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                {p.first_name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>{p.email}</div>
              </div>
            </div>

            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{p.age}</span>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{p.gender}</span>
            {['has_diabetes','has_hypertension','has_vascular_disease','previous_stroke'].map(field => (
              <span key={field} style={{ fontSize: '0.75rem', fontWeight: 600, color: p[field] ? '#FF6D00' : 'rgba(255,255,255,0.2)' }}>
                {p[field] ? 'Oui' : '—'}
              </span>
            ))}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
              {/* Edit */}
              <button className="act-btn" onClick={() => setEditTarget(p)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(79,195,247,0.08)', border: '1px solid rgba(79,195,247,0.2)', color: '#4FC3F7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.15s' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
              {/* Delete */}
              <button className="act-btn" onClick={() => setDeleteTarget(p)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.2)', color: '#FF3366', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.15s' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add modal */}
      {addModal && (
        <PatientModal
          onClose={() => setAddModal(false)}
          onSave={() => { setAddModal(false); fetchPatients(); }}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <PatientModal
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={() => { setEditTarget(null); fetchPatients(); }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteModal
          patient={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}