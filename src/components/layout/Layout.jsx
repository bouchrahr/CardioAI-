import { useState } from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import Header  from './Header';

const EXPANDED_W  = 240;
const COLLAPSED_W = 68;

export default function Layout({ children, notifCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const W = collapsed ? COLLAPSED_W : EXPANDED_W;

  return (
    <>
      <style>{`
        html, body, #root { background: #070E1A !important; min-height: 100vh; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #070E1A; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      <Box sx={{ display: 'flex', minHeight: '100vh', background: '#070E1A', position: 'relative' }}>
        {/* Grid background */}
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
          backgroundSize: '56px 56px', opacity: 0.5 }} />
        {/* Glow */}
        <Box sx={{ position: 'fixed', top: 0, right: 0, width: 700, height: 500, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(700px 500px at 100% 0%,rgba(30,136,229,0.10),transparent 70%)' }} />

        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

        <Box component="main" sx={{
          flex: 1,
          ml: `${W}px`,
          transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column',
          minHeight: '100vh', position: 'relative', zIndex: 1,
        }}>
          <Header notifCount={notifCount} sidebarWidth={W} />
          <Box sx={{
            mt: '64px', p: 3, flex: 1,
            animation: 'fadeIn 0.3s ease',
            '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
          }}>
            {children}
          </Box>
        </Box>
      </Box>
    </>
  );
}