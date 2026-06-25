import { useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Badge, Avatar, Box, Menu, MenuItem, Divider } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const PAGE_TITLES = {
  '/doctor/dashboard':     { title: 'Tableau de bord',       sub: 'Vue d\'ensemble de votre activité'    },
  '/doctor/patients':      { title: 'Mes Patients',           sub: 'Gestion de vos patients'              },
  '/doctor/new-analysis':  { title: 'Nouvelle Analyse',       sub: 'Analyse ECG par intelligence artificielle' },
  '/doctor/history':       { title: 'Historique',             sub: 'Toutes vos analyses passées'          },
  '/doctor/notifications': { title: 'Notifications',          sub: 'Alertes et événements cliniques'      },
  '/doctor/digital-twin':  { title: 'Digital Twin',           sub: 'Jumeau numérique cardiaque'           },
  '/admin/dashboard':      { title: 'Administration',         sub: 'Vue globale de la plateforme'         },
  '/admin/users':          { title: 'Gestion Utilisateurs',   sub: 'Médecins et patients'                 },
  '/admin/logs':           { title: 'Logs Système',           sub: 'Activité de la plateforme'            },
  '/patient/dashboard':    { title: 'Mon Tableau de bord',    sub: 'Votre état de santé'                  },
  '/patient/results':      { title: 'Mes Résultats',          sub: 'Historique de vos analyses'           },
  '/patient/profile':      { title: 'Mon Profil',             sub: 'Vos informations médicales'           },
};

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
);

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

export default function Header({ notifCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState(null);

  const page     = PAGE_TITLES[location.pathname] ?? { title: 'Cardia', sub: '' };
  const fullName = user?.full_name ?? (user?.first_name ? `${user.first_name} ${user.last_name}` : 'Utilisateur');
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <AppBar position="fixed" elevation={0} sx={{
      left: 264, width: 'calc(100% - 264px)',
      bgcolor: '#FFFFFF',
      borderBottom: '1px solid #E5E7EB',
      zIndex: 1100,
    }}>
      <Toolbar sx={{ height: 64, minHeight: '64px !important', px: 3, gap: 2 }}>

        {/* Title */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: '#111827', fontWeight: 700, fontSize: '1rem', fontFamily: '"Space Grotesk",sans-serif', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {page.title}
          </Typography>
          <Typography sx={{ color: '#9CA3AF', fontSize: '0.72rem', fontFamily: '"Space Grotesk",sans-serif' }}>
            {page.sub}
          </Typography>
        </Box>

        {/* Bell */}
        <IconButton size="small" sx={{ bgcolor: '#F3F4F6', borderRadius: '10px', width: 38, height: 38, color: '#6B7280', '&:hover': { bgcolor: '#E5E7EB' } }}>
          <Badge badgeContent={notifCount} sx={{ '& .MuiBadge-badge': { bgcolor: '#EF4444', color: '#fff', fontSize: '0.6rem', minWidth: 16, height: 16 } }}>
            <BellIcon />
          </Badge>
        </IconButton>

        <Box sx={{ width: 1, height: 28, bgcolor: '#E5E7EB' }} />

        {/* User button */}
        <Box onClick={e => setAnchorEl(e.currentTarget)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1.5, py: 0.8, borderRadius: '10px', border: '1px solid #E5E7EB', bgcolor: '#F9FAFB', '&:hover': { bgcolor: '#F3F4F6' }, transition: 'all 0.15s', flexShrink: 0 }}>
          <Avatar sx={{ width: 30, height: 30, background: 'linear-gradient(135deg,#1E88E5,#4FC3F7)', fontSize: '0.75rem', fontWeight: 700 }}>
            {initials}
          </Avatar>
          <Box>
            <Typography sx={{ color: '#111827', fontSize: '0.82rem', fontWeight: 600, fontFamily: '"Space Grotesk",sans-serif', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              {fullName}
              <span style={{ color: '#9CA3AF', fontSize: '0.68rem', fontWeight: 400, marginLeft: 5, textTransform: 'capitalize' }}>· {user?.role}</span>
            </Typography>
          </Box>
          <Box sx={{ color: '#9CA3AF' }}><ChevronIcon /></Box>
        </Box>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ elevation: 4, sx: { mt: 1, borderRadius: '12px', minWidth: 210, border: '1px solid #E5E7EB' } }}>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', fontFamily: '"Space Grotesk",sans-serif' }}>{fullName}</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: '"Space Grotesk",sans-serif' }}>{user?.email}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { logout(); navigate('/login'); setAnchorEl(null); }}
            sx={{ color: '#EF4444', gap: 1.5, fontSize: '0.83rem', fontFamily: '"Space Grotesk",sans-serif', m: 0.5, borderRadius: '8px', '&:hover': { bgcolor: '#FEF2F2' } }}>
            <LogoutIcon /> Déconnexion
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}