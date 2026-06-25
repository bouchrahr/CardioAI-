import { useEffect, useState } from 'react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

const S = {
  card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)' },
  input: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', outline: 'none', width: '100%' },
  label: { fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontFamily: '"Space Grotesk",sans-serif' },
};

export default function MyProfile() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me').then(r => setProfile(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fullName = user?.full_name ?? (user?.first_name ? `${user.first_name} ${user.last_name}` : 'Patient');
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(79,195,247,0.2)', borderTopColor: '#4FC3F7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#fff', maxWidth: 680, margin: '0 auto' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', marginBottom: 4 }}>ESPACE PATIENT</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Mon Profil</h1>
      </div>

      {/* Avatar card */}
      <div style={{ ...S.card, padding: '28px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20, animation: 'fadeUp 0.35s ease' }}>
        <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(79,195,247,0.3),transparent)' }} />
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg,#1E88E5,#4FC3F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0, boxShadow: '0 0 20px rgba(79,195,247,0.25)' }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>{fullName}</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontFamily: '"JetBrains Mono",monospace' }}>{user?.email}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'rgba(79,195,247,0.1)', border: '1px solid rgba(79,195,247,0.2)', borderRadius: 999, padding: '4px 12px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4FC3F7' }} />
            <span style={{ fontSize: '0.72rem', color: '#4FC3F7', fontFamily: '"JetBrains Mono",monospace' }}>Patient</span>
          </div>
        </div>
      </div>

      {/* Info médicale */}
      <div style={{ ...S.card, padding: '24px', marginBottom: 16, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>Informations médicales</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { label: 'Âge',    value: profile?.age    ? `${profile.age} ans`  : '—' },
            { label: 'Sexe',   value: profile?.gender === 'M' ? 'Masculin' : profile?.gender === 'F' ? 'Féminin' : '—' },
            { label: 'Taille', value: profile?.height ? `${profile.height} cm` : '—' },
            { label: 'Poids',  value: profile?.weight ? `${profile.weight} kg` : '—' },
          ].map(f => (
            <div key={f.label}>
              <label style={S.label}>{f.label}</label>
              <div style={{ ...S.input, cursor: 'default', color: f.value === '—' ? 'rgba(255,255,255,0.25)' : '#fff' }}>{f.value}</div>
            </div>
          ))}
        </div>

        {profile?.medical_history && (
          <div style={{ marginTop: 14 }}>
            <label style={S.label}>Antécédents médicaux</label>
            <div style={{ ...S.input, minHeight: 70, cursor: 'default', lineHeight: 1.6, color: 'rgba(255,255,255,0.65)' }}>{profile.medical_history}</div>
          </div>
        )}
      </div>

      {/* Facteurs de risque */}
      <div style={{ ...S.card, padding: '24px', animation: 'fadeUp 0.45s ease' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Facteurs de risque</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Diabète',            value: profile?.has_diabetes         },
            { label: 'Hypertension (HTA)', value: profile?.has_hypertension     },
            { label: 'Maladie vasculaire', value: profile?.has_vascular_disease },
            { label: "Antécédent d'AVC",   value: profile?.previous_stroke      },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: f.value ? 'rgba(255,109,0,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${f.value ? 'rgba(255,109,0,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.value ? '#FF6D00' : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.83rem', color: f.value ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)', flex: 1 }}>{f.label}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: f.value ? '#FF6D00' : 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace' }}>
                {f.value === undefined ? '—' : f.value ? 'Oui' : 'Non'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}