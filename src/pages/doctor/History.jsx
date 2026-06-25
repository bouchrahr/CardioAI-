import { useEffect, useState } from 'react';
import api from '../../services/api';

const S = {
  card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)' },
};

function ClassBadge({ cls }) {
  const map = { Normal: '#00E676', AFib: '#FF3366', Other: '#FFB300' };
  const c = map[cls] ?? '#4FC3F7';
  return <span style={{ color: c, background: `${c}15`, border: `1px solid ${c}30`, borderRadius: 999, padding: '3px 10px', fontSize: '0.65rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace' }}>{cls}</span>;
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/history/').then(r => setHistory(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? history : history.filter(h => h.predicted_class === filter);

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} .hist-row:hover{background:rgba(255,255,255,0.04)!important;cursor:pointer}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', marginBottom: 4 }}>{history.length} ANALYSES</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Historique</h1>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, animation: 'fadeUp 0.35s ease' }}>
        {[['all','Toutes'], ['Normal','Normal'], ['AFib','AFib'], ['Other','Autre']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            background: filter === val ? 'rgba(79,195,247,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${filter === val ? 'rgba(79,195,247,0.35)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 999, padding: '7px 16px',
            color: filter === val ? '#4FC3F7' : 'rgba(255,255,255,0.5)',
            fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.82rem', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>{lbl}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ ...S.card, overflow: 'hidden', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px 100px 100px 80px', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['Date', 'Patient', 'Classe', 'Confiance', 'Score', 'Risque'].map(h => (
            <span key={h} style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>Aucune analyse trouvée</div>
        ) : filtered.map((h, i) => (
          <div key={h.id} className="hist-row" onClick={() => setSelected(h)} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px 100px 100px 80px', padding: '13px 20px', alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: 'transparent', transition: 'background 0.15s' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: '"JetBrains Mono",monospace' }}>{new Date(h.created_at).toLocaleDateString('fr-FR')}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{h.patient_name ?? '—'}</span>
            <ClassBadge cls={h.predicted_class} />
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>{h.confidence ? `${(h.confidence * 100).toFixed(0)}%` : '—'}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4FC3F7' }}>{h.chadsvasc_score ?? '—'}/9</span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{h.risk_level ?? '—'}</span>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setSelected(null)}>
          <div style={{ ...S.card, width: '100%', maxWidth: 560, padding: 32, position: 'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(79,195,247,0.5),transparent)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{selected.patient_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontFamily: '"JetBrains Mono",monospace' }}>{new Date(selected.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
              <ClassBadge cls={selected.predicted_class} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[['Confiance', selected.confidence ? `${(selected.confidence*100).toFixed(0)}%` : '—'], ['Score CHADS', `${selected.chadsvasc_score}/9`], ['Risque', selected.risk_level ?? '—']].map(([l,v]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 6 }}>{l}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4FC3F7' }}>{v}</div>
                </div>
              ))}
            </div>
            {selected.llm_report && (
              <div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Rapport médical</div>
                <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0, maxHeight: 200, overflowY: 'auto' }}>{selected.llm_report}</p>
              </div>
            )}
            <button onClick={() => setSelected(null)} style={{ marginTop: 20, width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.88rem', cursor: 'pointer' }}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}