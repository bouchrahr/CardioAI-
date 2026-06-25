import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Tooltip, Avatar, Typography, Divider } from '@mui/material';
import useAuthStore from '../../store/authStore';

// ── Icons SVG inline (pas de dépendance MUI icons) ──
const Icons = {
  dashboard:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  patients:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 11h6M19 8v6"/></svg>,
  analyse:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>,
  history:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  notif:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  twin:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-7-10.5C5 7.5 7.5 5 10 5c1.4 0 2.6.7 3 2 .4-1.3 1.6-2 3-2 2.5 0 5 2.5 5 5.5 0 6-7 10.5-7 10.5z"/><path d="M8 12h2l1-2 2 4 1-2h2"/></svg>,
  manageUsers:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  logs:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  results:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  profile:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  logout:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  collapse:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>,
};

const DOCTOR_NAV = [
  { group: 'Principal', items: [
    { label: 'Tableau de bord',  icon: Icons.dashboard, path: '/doctor/dashboard'     },
    { label: 'Mes Patients',     icon: Icons.patients,  path: '/doctor/patients'       },
  ]},
  { group: 'Clinique', items: [
    { label: 'Nouvelle Analyse', icon: Icons.analyse,   path: '/doctor/new-analysis', hero: true },
    { label: 'Historique',       icon: Icons.history,   path: '/doctor/history'        },
    { label: 'Notifications',    icon: Icons.notif,     path: '/doctor/notifications', badge: true },
  ]},
  { group: 'Avancé', items: [
    { label: 'Digital Twin',     icon: Icons.twin,      path: '/doctor/digital-twin', twin: true },
  ]},
];

const ADMIN_NAV = [
  { group: 'Administration', items: [
    { label: 'Tableau de bord',      icon: Icons.dashboard,   path: '/admin/dashboard' },
    { label: 'Gestion Utilisateurs', icon: Icons.manageUsers, path: '/admin/users'     },
    { label: 'Logs Système',         icon: Icons.logs,        path: '/admin/logs'      },
  ]},
];

const PATIENT_NAV = [
  { group: 'Mon espace', items: [
    { label: 'Tableau de bord', icon: Icons.dashboard, path: '/patient/dashboard' },
    { label: 'Mes Résultats',   icon: Icons.results,   path: '/patient/results'   },
    { label: 'Mon Profil',      icon: Icons.profile,   path: '/patient/profile'   },
  ]},
];

const NAV_BY_ROLE = { doctor: DOCTOR_NAV, admin: ADMIN_NAV, patient: PATIENT_NAV };

// ── Logo SVG (cercle + arc + ECG) ──
function CardiaLogoMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 46 46" fill="none">
      <circle cx="23" cy="23" r="22" fill="#080F1C" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <circle cx="23" cy="23" r="20" fill="none" stroke="url(#gcSide)" strokeWidth="2.2"
        strokeDasharray="82 44" strokeLinecap="round" strokeDashoffset="-10"/>
      <defs>
        <linearGradient id="gcSide" x1="3" y1="3" x2="43" y2="43" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4FC3F7"/>
          <stop offset="100%" stopColor="#1E88E5" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d="M11 23 L16 23 L18.5 18.5 L21 27.5 L23.5 20 L25.5 23 L35 23"
        stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="35" cy="23" r="2.5" fill="#4FC3F7"/>
    </svg>
  );
}

export default function Sidebar({ notifCount = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const role     = user?.role ?? 'doctor';
  const navGroups = NAV_BY_ROLE[role] ?? DOCTOR_NAV;
  const fullName  = user?.full_name ?? (user?.first_name ? `${user.first_name} ${user.last_name}` : 'Utilisateur');
  const initials  = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Box sx={{
      width: 264, minHeight: '100vh',
      background: 'radial-gradient(120% 60% at 50% 0%, rgba(30,136,229,0.10), transparent 55%), linear-gradient(180deg, #0C1B26 0%, #070E1A 100%)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 1200,
      padding: '18px 14px',
    }}>
      <style>{`
        @keyframes blink { 50% { opacity: 0.3; } }
      `}</style>

      {/* ── Logo ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: 1, mb: 3 }}>
        <CardiaLogoMark />
        <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', fontFamily: '"Space Grotesk",sans-serif' }}>
          Cardia<span style={{ color: '#4FC3F7' }}>.</span>
        </Typography>
      </Box>

      {/* ── Nav groups ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        {navGroups.map((group) => (
          <Box key={group.group} sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', px: 1.5, py: 1, fontFamily: '"Space Grotesk",sans-serif' }}>
              {group.group}
            </Typography>

            {group.items.map((item) => {
              const active = location.pathname === item.path;

              if (item.hero) return (
                <Box key={item.path} onClick={() => navigate(item.path)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.8, py: 1.4, my: 0.5, borderRadius: '12px', background: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)', color: '#fff', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 10px 26px -10px rgba(30,136,229,0.5), inset 0 1px 0 rgba(255,255,255,0.2)', transition: 'all 0.16s ease', fontFamily: '"Space Grotesk",sans-serif', '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 14px 32px -10px rgba(30,136,229,0.6)' }, '& svg': { width: 19, height: 19, flexShrink: 0 } }}>
                  {item.icon}
                  {item.label}
                </Box>
              );

              if (item.twin) return (
                <Box key={item.path} onClick={() => navigate(item.path)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.2, my: 0.3, borderRadius: '11px', background: active ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg, rgba(111,98,224,0.16), rgba(30,136,229,0.10))', border: '1px solid rgba(140,160,255,0.18)', color: active ? '#fff' : 'rgba(255,255,255,0.75)', fontSize: '0.88rem', fontWeight: active ? 600 : 500, cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: '"Space Grotesk",sans-serif', '&:hover': { background: 'rgba(255,255,255,0.07)', color: '#fff' }, '& svg': { width: 19, height: 19, flexShrink: 0, color: '#A99BFF' } }}>
                  {item.icon}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', fontFamily: '"JetBrains Mono",monospace', padding: '2px 7px', borderRadius: 5, background: 'linear-gradient(135deg, #8B7DFF, #1E88E5)', color: '#fff' }}>BÊTA</span>
                </Box>
              );

              return (
                <Box key={item.path} onClick={() => navigate(item.path)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1, my: 0.3, borderRadius: '11px', position: 'relative', background: active ? 'rgba(255,255,255,0.07)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.66)', fontSize: '0.88rem', fontWeight: active ? 600 : 500, cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: '"Space Grotesk",sans-serif', '&:hover': { background: 'rgba(255,255,255,0.05)', color: '#fff' }, '& svg': { width: 19, height: 19, flexShrink: 0 } }}>
                  {active && (
                    <Box sx={{ position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: '0 3px 3px 0', background: '#1E88E5', boxShadow: '0 0 12px rgba(30,136,229,0.6)' }} />
                  )}
                  {item.icon}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && notifCount > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', background: '#EF4444', color: '#fff', minWidth: 19, height: 19, padding: '0 5px', borderRadius: 999, display: 'grid', placeItems: 'center' }}>{notifCount}</span>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* ── Divider ── */}
      <Box sx={{ height: 1, background: 'rgba(255,255,255,0.08)', mx: 0.5, my: 1 }} />

      {/* ── User profile ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: 1, py: 1, borderRadius: '11px', background: 'rgba(255,255,255,0.05)', mb: 1 }}>
        <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg,#1E88E5,#4FC3F7)', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
          {initials}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: '#fff', fontSize: '0.82rem', fontWeight: 600, fontFamily: '"Space Grotesk",sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fullName}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', fontFamily: '"Space Grotesk",sans-serif', textTransform: 'capitalize' }}>
            {role}
          </Typography>
        </Box>
      </Box>

      {/* ── Logout ── */}
      <Box onClick={() => { logout(); navigate('/login'); }}
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: '11px', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: '"Space Grotesk",sans-serif', transition: 'all 0.15s', '&:hover': { background: 'rgba(239,68,68,0.08)', color: '#EF4444' }, '& svg': { width: 17, height: 17, flexShrink: 0 } }}>
        {Icons.logout}
        Déconnexion
      </Box>
    </Box>
  );
}