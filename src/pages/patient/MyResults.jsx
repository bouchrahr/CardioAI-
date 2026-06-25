import { useEffect, useState } from 'react';
import api from '../../services/api';

const S = { card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)' } };

function ClassBadge({ cls }) {
  const map = { Normal: '#00E676', AFib: '#FF3366', Other: '#FFB300' };
  const c = map[cls] ?? '#4FC3F7';
  return <span style={{ color: c, background: `${c}15`, border: `1px solid ${c}30`, borderRadius: 999, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 600, fontFamily: '"JetBrains Mono",monospace' }}>{cls}</span>;
}

export default function MyResults() {
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/history/').then(r => setResults(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.res-row:hover{background:rgba(255,255,255,0.04)!important;cursor:pointer}`}</style>

      <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', marginBottom: 4 }}>{results.length} ANALYSES</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Mes Résultats</h1>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>Historique de vos analyses cardiaques</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(79,195,247,0.2)', borderTopColor: '#4FC3F7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : results.length === 0 ? (
        <div style={{ ...S.card, padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🫀</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 6 }}>Aucun résultat</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>Votre médecin n'a pas encore effectué d'analyse</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'fadeUp 0.35s ease' }}>
          {results.map((r, i) => (
            <div key={r.id} className="res-row" onClick={() => setSelected(r)}
              style={{ ...S.card, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.15s', flexWrap: 'wrap' }}>
              {/* Date */}
              <div style={{ minWidth: 90 }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 3 }}>DATE</div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"JetBrains Mono",monospace' }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
              </div>

              {/* Class */}
              <div style={{ minWidth: 90 }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 6 }}>RÉSULTAT</div>
                <ClassBadge cls={r.predicted_class} />
              </div>

              {/* Confidence */}
              <div style={{ minWidth: 90 }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 3 }}>CONFIANCE</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#4FC3F7' }}>{r.confidence ? `${(r.confidence * 100).toFixed(0)}%` : '—'}</div>
              </div>

              {/* CHADS score */}
              <div style={{ minWidth: 90 }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 3 }}>SCORE</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFB300' }}>{r.chadsvasc_score ?? '—'}/9</div>
              </div>

              {/* Report preview */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 3 }}>RAPPORT</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.llm_report ? r.llm_report.slice(0, 80) + '...' : 'Rapport non disponible'}
                </div>
              </div>

              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setSelected(null)}>
          <div style={{ ...S.card, width: '100%', maxWidth: 560, padding: 32, position: 'relative', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(79,195,247,0.5),transparent)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 6 }}>{new Date(selected.created_at).toLocaleDateString('fr-FR')}</div>
                <ClassBadge cls={selected.predicted_class} />
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[['Confiance', selected.confidence ? `${(selected.confidence*100).toFixed(0)}%` : '—'], ['Score CHADS', `${selected.chadsvasc_score}/9`], ['Risque AVC', selected.avc_risk_12m ? `${selected.avc_risk_12m}%` : '—']].map(([l,v]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 6 }}>{l}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4FC3F7' }}>{v}</div>
                </div>
              ))}
            </div>

            {selected.llm_report && (
              <div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Rapport médical</div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{selected.llm_report}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}