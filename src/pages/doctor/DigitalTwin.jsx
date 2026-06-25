import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import api from '../../services/api';

const S = {
  card: { background: 'rgba(11,20,36,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, backdropFilter: 'blur(12px)', position: 'relative', overflow: 'hidden' },
};

// ─── ECG Live Component ───────────────────────────────────────────────────────
function ECGLive({ bpm = 72, anomaly = false }) {
  const canvasRef = useRef(null);
  const dataRef   = useRef([]);
  const animRef   = useRef(null);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const color = anomaly ? '#FF3366' : '#4FC3F7';

    // Generate ECG waveform point
    const ecgPoint = (t) => {
      const cycle = (t % 1);
      if (cycle < 0.1)  return Math.sin(cycle * Math.PI * 10) * 0.15;
      if (cycle < 0.15) return -0.1;
      if (cycle < 0.18) return 0.9;   // R peak
      if (cycle < 0.22) return -0.3;  // S wave
      if (cycle < 0.35) return Math.sin((cycle - 0.25) * Math.PI * 5) * (anomaly ? 0.35 : 0.2);
      return 0;
    };

    const speed = bpm / 60 * 0.008;

    const draw = () => {
      tRef.current += speed;
      dataRef.current.push(ecgPoint(tRef.current));
      if (dataRef.current.length > W) dataRef.current.shift();

      ctx.clearRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // ECG line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      dataRef.current.forEach((v, i) => {
        const x = i;
        const y = H / 2 - v * H * 0.4;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Glow dot at end
      const last = dataRef.current[dataRef.current.length - 1] ?? 0;
      const dotX = dataRef.current.length - 1;
      const dotY = H / 2 - last * H * 0.4;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowBlur = 12;
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [bpm, anomaly]);

  return (
    <canvas ref={canvasRef} width={600} height={100}
      style={{ width: '100%', height: 100, borderRadius: 8 }} />
  );
}

// ─── 3D Heart Component ───────────────────────────────────────────────────────
function Heart3D({ riskLevel = 'Normal', bpm = 72 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth, H = mount.clientHeight;

    // Scene
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    camera.position.set(0, 0, 4);

    // Heart color by risk
    const heartColor = { Normal: 0xFF4477, AFib: 0xFF1133, Other: 0xFF8800 }[riskLevel] ?? 0xFF4477;
    const glowColor  = { Normal: 0xFF3366, AFib: 0xFF0022, Other: 0xFF6600 }[riskLevel] ?? 0xFF3366;

    // Build heart shape using parametric approach
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0.5);
    heartShape.bezierCurveTo(-0.05, 0.6,  -0.3, 0.8,  -0.5, 0.6);
    heartShape.bezierCurveTo(-0.8,  0.4,  -0.8, 0.0,  -0.5,-0.3);
    heartShape.bezierCurveTo(-0.3, -0.5,   0.0,-0.8,   0.0,-1.0);
    heartShape.bezierCurveTo( 0.0, -0.8,   0.3,-0.5,   0.5,-0.3);
    heartShape.bezierCurveTo( 0.8,  0.0,   0.8, 0.4,   0.5, 0.6);
    heartShape.bezierCurveTo( 0.3,  0.8,   0.05,0.6,   0.0, 0.5);

    const extrudeSettings = { depth: 0.4, bevelEnabled: true, bevelSegments: 8, steps: 2, bevelSize: 0.1, bevelThickness: 0.1 };
    const heartGeo  = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    heartGeo.center();

    // Main heart mesh
    const heartMat  = new THREE.MeshPhongMaterial({
      color: heartColor, emissive: glowColor, emissiveIntensity: 0.3,
      shininess: 80, transparent: true, opacity: 0.95,
    });
    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.rotation.x = Math.PI;
    scene.add(heart);

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({ color: glowColor, wireframe: true, transparent: true, opacity: 0.08 });
    const wire    = new THREE.Mesh(heartGeo, wireMat);
    wire.rotation.x = Math.PI;
    scene.add(wire);

    // Glow sphere
    const glowGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.04, side: THREE.BackSide });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowSphere);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0xFF6688, 2, 10);
    pointLight1.position.set(2, 2, 2);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x4488FF, 1, 10);
    pointLight2.position.set(-2, -1, 1);
    scene.add(pointLight2);

    // Particles around heart
    const particleCount = 80;
    const particleGeo   = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: glowColor, size: 0.025, transparent: true, opacity: 0.5 });
    const particles   = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Animation
    let t = 0;
    const beatInterval = 60 / bpm;
    let lastBeat = 0;

    const animate = () => {
      t += 0.016;
      const animId = requestAnimationFrame(animate);

      // Heartbeat scale animation
      const timeSinceBeat = (t - lastBeat) % beatInterval;
      if (timeSinceBeat > beatInterval) lastBeat = t;

      let scale = 1;
      if (timeSinceBeat < 0.1)       scale = 1 + timeSinceBeat * 0.8;
      else if (timeSinceBeat < 0.18) scale = 1.08 - (timeSinceBeat - 0.1) * 0.5;
      else if (timeSinceBeat < 0.28) scale = 1.04 + (timeSinceBeat - 0.18) * 0.3;
      else if (timeSinceBeat < 0.38) scale = 1.07 - (timeSinceBeat - 0.28) * 0.7;
      else scale = 1;

      heart.scale.setScalar(scale);
      wire.scale.setScalar(scale * 1.02);

      // Emissive pulse
      heartMat.emissiveIntensity = 0.25 + (scale - 1) * 3;

      // Slow rotation
      heart.rotation.y += 0.004;
      wire.rotation.y   += 0.004;

      // Particles rotation
      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0005;

      // Glow pulse
      glowMat.opacity = 0.03 + (scale - 1) * 0.3;

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const W2 = mount.clientWidth, H2 = mount.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [riskLevel, bpm]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DigitalTwin() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [patient, setPatient] = useState(null);
  const [lastEcg, setLastEcg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bpm,     setBpm]     = useState(72);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [p, h] = await Promise.all([
          api.get(`/patients/${id}`),
          api.get(`/history/?patient_id=${id}`),
        ]);
        setPatient(p.data);
        if (h.data.length > 0) {
          setLastEcg(h.data[0]);
          // Simulate BPM from confidence (mock)
          setBpm(60 + Math.floor(Math.random() * 40));
        }
      } catch {}
      finally { setLoading(false); }
    };
    fetchAll();
  }, [id]);

  // Simulated vitals (will be replaced by real WebSocket data)
  const [vitals, setVitals] = useState({ spo2: 98, bp: '120/80', temp: 37.2 });
  useEffect(() => {
    const interval = setInterval(() => {
      setBpm(prev => Math.max(55, Math.min(110, prev + Math.floor(Math.random() * 5 - 2))));
      setVitals(v => ({
        spo2: Math.max(94, Math.min(100, v.spo2 + (Math.random() > 0.7 ? 1 : -1) * Math.random())),
        bp: v.bp, temp: +(v.temp + (Math.random() - 0.5) * 0.05).toFixed(1),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const cls       = lastEcg?.predicted_class ?? 'Normal';
  const riskScore = lastEcg?.chadsvasc_score ?? 0;
  const riskColor = riskScore <= 1 ? '#00E676' : riskScore <= 3 ? '#FFB300' : riskScore <= 5 ? '#FF6D00' : '#FF3366';
  const clsColor  = { Normal: '#00E676', AFib: '#FF3366', Other: '#FFB300' }[cls] ?? '#4FC3F7';

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ width: 36, height: 36, border: '2px solid rgba(79,195,247,0.2)', borderTopColor: '#4FC3F7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: '"Space Grotesk",sans-serif', color: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{50%{opacity:0.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div>
          <button onClick={() => navigate(`/doctor/patients/${id}`)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontFamily: '"Space Grotesk",sans-serif', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Retour au profil
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2ED573', boxShadow: '0 0 8px rgba(46,213,115,0.7)', animation: 'blink 1.5s infinite' }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>JUMEAU NUMÉRIQUE · TEMPS RÉEL</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
            Digital Twin — {patient ? `Patient #${patient.id}` : '...'}
          </h1>
        </div>

        {/* Status badge */}
        <div style={{ ...S.card, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8, borderColor: `${clsColor}25` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: clsColor, boxShadow: `0 0 8px ${clsColor}`, animation: 'blink 1.5s infinite' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: clsColor, fontFamily: '"JetBrains Mono",monospace' }}>{cls}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16, animation: 'fadeUp 0.35s ease' }}>

        {/* 3D Heart */}
        <div style={{ ...S.card, padding: 0, minHeight: 420, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Cœur 3D · Jumeau Numérique</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginTop: 2 }}>battement synchronisé · {bpm} BPM</div>
            </div>
            <span style={{ background: 'rgba(255,51,102,0.1)', color: '#FF3366', border: '1px solid rgba(255,51,102,0.2)', borderRadius: 999, padding: '4px 12px', fontSize: '0.7rem', fontFamily: '"JetBrains Mono",monospace', fontWeight: 600 }}>
              ♥ {bpm} BPM
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 360 }}>
            <Heart3D riskLevel={cls} bpm={bpm} />
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Vitals */}
          <div style={{ ...S.card, padding: '20px' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Constantes vitales</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Rythme cardiaque', value: `${bpm}`, unit: 'BPM', color: '#FF3366', icon: '♥' },
                { label: 'Saturation O₂',    value: vitals.spo2.toFixed(1), unit: '%',   color: '#4FC3F7', icon: '○' },
                { label: 'Pression',          value: vitals.bp,              unit: 'mmHg', color: '#1E88E5', icon: '▲' },
                { label: 'Température',       value: String(vitals.temp),    unit: '°C',   color: '#FFB300', icon: '◆' },
              ].map(v => (
                <div key={v.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: v.color, fontSize: '1rem', width: 20, textAlign: 'center' }}>{v.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>{v.label}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: v.color, letterSpacing: '-0.02em' }}>
                      {v.value}<span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: 3 }}>{v.unit}</span>
                    </div>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: v.color, boxShadow: `0 0 6px ${v.color}`, animation: 'blink 1.5s infinite' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Risk score */}
          <div style={{ ...S.card, padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Score de risque CHADS</div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: riskColor, letterSpacing: '-0.04em', lineHeight: 1 }}>{riskScore}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>/9</div>
            <div style={{ display: 'inline-block', background: `${riskColor}18`, color: riskColor, border: `1px solid ${riskColor}35`, borderRadius: 999, padding: '5px 16px', fontSize: '0.78rem', fontWeight: 600 }}>
              {riskScore <= 1 ? 'Faible' : riskScore <= 3 ? 'Modéré' : riskScore <= 5 ? 'Élevé' : 'Critique'}
            </div>
          </div>
        </div>
      </div>

      {/* ECG Live */}
      <div style={{ ...S.card, padding: '22px', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Signal ECG · Temps réel</div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginTop: 2 }}>simulation basée sur les données patient</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: cls === 'AFib' ? 'rgba(255,51,102,0.1)' : 'rgba(0,230,118,0.08)', border: `1px solid ${clsColor}30`, borderRadius: 999, padding: '5px 14px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: clsColor, animation: 'blink 0.8s infinite' }} />
            <span style={{ fontSize: '0.7rem', color: clsColor, fontFamily: '"JetBrains Mono",monospace', fontWeight: 600 }}>
              {cls === 'AFib' ? 'ARYTHMIE DÉTECTÉE' : 'RYTHME NORMAL'}
            </span>
          </div>
        </div>
        <ECGLive bpm={bpm} anomaly={cls === 'AFib'} />
      </div>

      {/* Future features banner */}
      <div style={{ ...S.card, padding: '18px 22px', marginTop: 16, borderColor: 'rgba(255,179,0,0.15)', background: 'rgba(255,179,0,0.04)', animation: 'fadeUp 0.45s ease', display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="#FFB300" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(255,179,0,0.15)"/></svg>
        <div>
          <span style={{ fontSize: '0.82rem', color: 'rgba(255,179,0,0.9)', fontWeight: 600 }}>Phase 2 à venir </span>
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>— Connexion WebSocket MySignals en temps réel · Prédiction d'évolution · Export rapport 3D</span>
        </div>
      </div>
    </div>
  );
}