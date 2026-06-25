import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CardiaLogo from '../components/CardiaLogo';

export default function LandingPage() {
  const navigate = useNavigate();
  const navRef   = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      if (!navRef.current) return;
      if (window.scrollY > 24) navRef.current.classList.add('scrolled');
      else navRef.current.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const idx = [...e.target.parentElement.children].indexOf(e.target);
          e.target.style.transitionDelay = idx * 80 + 'ms';
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.feature').forEach((el) => io.observe(el));

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        :root {
          --bg:#070E1A; --bg-2:#0B1424;
          --ink:#FFFFFF; --ink-dim:rgba(255,255,255,0.62); --ink-faint:rgba(255,255,255,0.42);
          --line:rgba(255,255,255,0.08); --line-2:rgba(255,255,255,0.14);
          --blue:#1E88E5; --blue-2:#4FC3F7; --pulse:#FF3366;
          --glass:#101A2C; --glass-hi:#142036;
        }
        *{box-sizing:border-box;margin:0;padding:0}
        .lp{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh}
        a{color:inherit;text-decoration:none} button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit}

        .lp-bg{position:fixed;inset:0;background:
          radial-gradient(900px 600px at 78% 18%,rgba(30,136,229,0.20),transparent 60%),
          radial-gradient(700px 500px at 10% 90%,rgba(79,195,247,0.10),transparent 60%),
          linear-gradient(180deg,#050A14 0%,#070E1A 50%,#060C18 100%);z-index:-2}
        .lp-grid{position:fixed;inset:0;background-image:
          linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),
          linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);
          background-size:56px 56px;pointer-events:none;z-index:-1;opacity:.6}

        /* NAV */
        .nav-wrap{position:fixed;top:18px;left:0;right:0;z-index:50;display:flex;justify-content:center;pointer-events:none}
        .nav{pointer-events:auto;display:flex;align-items:center;gap:28px;padding:10px 12px 10px 18px;
          background:rgba(16,26,44,0.78);border:1px solid var(--line-2);border-radius:999px;
          box-shadow:0 12px 40px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.05);
          transition:background .35s,border-color .35s,box-shadow .35s}
        .nav.scrolled{background:rgba(7,14,26,0.92);border-color:rgba(255,255,255,0.18);
          box-shadow:0 18px 50px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.07),0 0 0 1px rgba(30,136,229,0.12)}
        .nav-links{display:flex;gap:6px;align-items:center}
        .nav-links a{font-size:14px;color:var(--ink-dim);padding:8px 14px;border-radius:999px;transition:color .2s,background .2s}
        .nav-links a:hover{color:var(--ink);background:rgba(255,255,255,0.05)}
        .cta-small{display:inline-flex;align-items:center;gap:8px;
          background:linear-gradient(180deg,#2196F3,#1565C0);color:#fff;
          padding:9px 16px;border-radius:999px;font-size:13px;font-weight:500;
          box-shadow:0 8px 20px rgba(30,136,229,0.35),inset 0 1px 0 rgba(255,255,255,0.25)}
        .cta-small:hover{filter:brightness(1.08)}

        /* LAYOUT */
        .lp-main{position:relative;z-index:1}
        .container{max-width:1320px;margin:0 auto;padding:0 40px}

        /* HERO */
        .hero{padding:140px 0 80px}
        .hero-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:56px;align-items:center}
        .eyebrow{display:inline-flex;align-items:center;gap:10px;padding:7px 14px 7px 10px;
          border:1px solid var(--line-2);border-radius:999px;background:rgba(20,32,54,0.7);
          font-size:12.5px;color:var(--ink-dim);letter-spacing:0.02em}
        .eyebrow .dot{width:8px;height:8px;border-radius:50%;background:#2ED573;
          box-shadow:0 0 0 4px rgba(46,213,115,0.18),0 0 14px rgba(46,213,115,0.7);
          animation:blink 1.6s ease-in-out infinite}
        @keyframes blink{50%{opacity:.35}}
        h1.headline{font-size:clamp(40px,5.4vw,76px);line-height:1.02;letter-spacing:-0.025em;font-weight:500;margin:22px 0 18px;text-wrap:balance}
        h1.headline .accent{background:linear-gradient(180deg,#A6D8FF 0%,#1E88E5 60%,#0D47A1 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:700}
        h1.headline .thin{font-weight:300;color:rgba(255,255,255,0.92)}
        .sub{font-size:19px;line-height:1.55;color:var(--ink-dim);max-width:560px;margin-bottom:32px}
        .sub b{color:var(--ink);font-weight:500}
        .cta-row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
        .btn{display:inline-flex;align-items:center;gap:10px;padding:14px 22px;border-radius:12px;font-size:15px;font-weight:500;transition:transform .15s,box-shadow .25s}
        .btn-primary{background:linear-gradient(180deg,#2196F3,#1565C0);color:#fff;box-shadow:0 14px 40px rgba(30,136,229,0.45),inset 0 1px 0 rgba(255,255,255,0.25)}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 18px 50px rgba(30,136,229,0.6)}
        .btn-ghost{background:rgba(20,32,54,0.6);color:var(--ink-dim);border:1px solid var(--line-2)}
        .btn-ghost:hover{color:var(--ink);border-color:rgba(255,255,255,0.22)}

        /* HEART */
        .right-col{position:relative;display:flex;justify-content:center;align-items:center;min-height:480px}
        .heart-card{width:200px;height:200px;border-radius:50%;
          background:radial-gradient(circle at 35% 35%,rgba(255,100,130,0.18),transparent 60%),rgba(16,26,44,0.85);
          border:1px solid rgba(255,100,130,0.2);display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 60px rgba(255,51,102,0.15),0 0 120px rgba(255,51,102,0.08);
          animation:heartPulse 1.2s ease-in-out infinite;position:relative;z-index:2}
        .heart-card svg{width:100px;height:100px;filter:drop-shadow(0 0 12px rgba(255,100,130,0.5))}
        @keyframes heartPulse{
          0%,100%{transform:scale(1);box-shadow:0 0 60px rgba(255,51,102,0.15)}
          14%{transform:scale(1.06);box-shadow:0 0 80px rgba(255,51,102,0.3)}
          28%{transform:scale(1)}
          42%{transform:scale(1.04);box-shadow:0 0 70px rgba(255,51,102,0.25)}
        }
        .pulse-ring{position:absolute;border-radius:50%;border:1px solid rgba(255,51,102,0.2);animation:ringOut 2s ease-out infinite}
        .pulse-ring:nth-child(1){width:240px;height:240px;animation-delay:0s}
        .pulse-ring:nth-child(2){width:290px;height:290px;animation-delay:0.4s}
        .pulse-ring:nth-child(3){width:340px;height:340px;animation-delay:0.8s}
        @keyframes ringOut{0%{opacity:.6;transform:scale(0.85)}100%{opacity:0;transform:scale(1.1)}}
        .bpm-tag{position:absolute;top:16%;left:58%;background:rgba(16,26,44,0.9);border:1px solid rgba(255,255,255,0.1);
          border-radius:999px;padding:7px 14px;font-size:12px;color:var(--ink-dim);
          display:flex;align-items:center;gap:8px;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.3)}
        .pip{width:7px;height:7px;border-radius:50%;background:#2ED573;box-shadow:0 0 0 3px rgba(46,213,115,0.2);animation:blink 1.6s infinite}
        .vital{position:absolute;background:rgba(16,26,44,0.88);border:1px solid rgba(255,255,255,0.09);
          border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:12px;
          box-shadow:0 12px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.06);
          animation:floatY 4s ease-in-out infinite;min-width:160px}
        .vital .ico{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .vital .vlabel{font-size:11px;color:var(--ink-faint);margin-bottom:2px}
        .vital .vval{font-size:18px;font-weight:600;line-height:1}
        .vital .vval span{font-size:11px;font-weight:400;color:var(--ink-dim);margin-left:3px}
        .v-hr{top:8%;left:-18%;animation-delay:0s}
        .v-hr .ico{background:rgba(255,51,102,0.15);color:#FF5577}
        .v-hr .vval{color:#FF5577}
        .v-spo2{top:35%;right:-22%;animation-delay:0.8s}
        .v-spo2 .ico{background:rgba(79,195,247,0.15);color:#4FC3F7}
        .v-spo2 .vval{color:#4FC3F7}
        .v-bp{bottom:30%;left:-20%;animation-delay:1.4s}
        .v-bp .ico{background:rgba(30,136,229,0.15);color:#1E88E5}
        .v-bp .vval{color:#1E88E5}
        .v-temp{bottom:8%;right:-18%;animation-delay:2s}
        .v-temp .ico{background:rgba(255,179,0,0.15);color:#FFB300}
        .v-temp .vval{color:#FFB300}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}

        /* FEATURES */
        .section{padding:96px 0}
        .section-head{text-align:center;max-width:640px;margin:0 auto 64px}
        .section-head h2{font-size:clamp(28px,3.5vw,46px);font-weight:500;letter-spacing:-0.02em;margin:16px 0}
        .section-head h2 .accent{background:linear-gradient(180deg,#A6D8FF,#1E88E5 60%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:700}
        .section-head p{font-size:17px;color:var(--ink-dim);line-height:1.6}
        .features{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .feature{background:var(--glass);border:1px solid var(--line);border-radius:16px;padding:28px;
          opacity:0;transform:translateY(20px);transition:border-color .25s,box-shadow .25s}
        .feature.in{opacity:1;transform:translateY(0);transition:opacity .5s ease,transform .5s ease,border-color .25s,box-shadow .25s}
        .feature:hover{border-color:rgba(30,136,229,0.35);transform:translateY(-3px);box-shadow:0 16px 40px rgba(0,0,0,0.3)}
        .f-ico{width:44px;height:44px;border-radius:11px;background:rgba(30,136,229,0.12);border:1px solid rgba(30,136,229,0.2);
          display:flex;align-items:center;justify-content:center;color:#4FC3F7;margin-bottom:16px}
        .f-ico svg{width:22px;height:22px}
        .feature h3{font-size:16px;font-weight:600;margin-bottom:10px;letter-spacing:-0.01em}
        .feature p{font-size:14px;color:var(--ink-dim);line-height:1.6;margin-bottom:16px}
        .tag{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;
          font-family:'JetBrains Mono',monospace;letter-spacing:0.06em;color:var(--ink-faint);
          padding:5px 10px;background:rgba(255,255,255,0.04);border:1px solid var(--line);border-radius:999px}
        .tag .d{width:6px;height:6px;border-radius:50%;background:#2ED573;box-shadow:0 0 6px rgba(46,213,115,0.5)}

        /* FOOTER */
        footer{border-top:1px solid var(--line);padding:28px 0}
        .foot-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .foot-links{display:flex;gap:24px}
        .foot-links a{font-size:13px;color:var(--ink-faint);transition:color .2s}
        .foot-links a:hover{color:var(--ink)}

        @media(max-width:900px){.hero-grid{grid-template-columns:1fr}.right-col{display:none}.features{grid-template-columns:1fr 1fr}.container{padding:0 20px}}
        @media(max-width:600px){.features{grid-template-columns:1fr}}
      `}</style>

      <div className="lp">
        <div className="lp-bg" />
        <div className="lp-grid" />

        {/* NAV */}
        <div className="nav-wrap">
          <nav className="nav" ref={navRef}>
            <CardiaLogo size="sm" />
            <div className="nav-links">
              <a href="#hero">Accueil</a>
              <a href="#features">Fonctionnalités</a>
              <a href="#footer">Contact</a>
            </div>
            <button className="cta-small" onClick={() => navigate('/login')}>
              Se connecter →
            </button>
          </nav>
        </div>

        <main className="lp-main">
          {/* HERO */}
          <section className="hero" id="hero">
            <div className="container">
              <div className="hero-grid">
                <div>
                  <span className="eyebrow">
                    <span className="dot" />
                    Système actif · Analyse en temps réel
                  </span>
                  <h1 className="headline">
                    <span className="thin">Votre cœur,</span><br/>
                    <span className="accent">surveillé</span><br/>
                    <span className="thin">intelligemment.</span>
                  </h1>
                  <p className="sub">
                    Cardia analyse votre <b>signal cardiaque</b> en temps réel, détecte les irrégularités
                    et génère un <b>rapport médical complet</b> — en quelques secondes.
                  </p>
                  <div className="cta-row">
                    <button className="btn btn-primary" onClick={() => navigate('/login')}>
                      Accéder à mon espace →
                    </button>
                    <a className="btn btn-ghost" href="#features">En savoir plus</a>
                  </div>
                </div>

                {/* Heart */}
                <div className="right-col">
                  <div className="pulse-ring" />
                  <div className="pulse-ring" />
                  <div className="pulse-ring" />
                  <div className="heart-card">
                    <svg viewBox="0 0 100 100" fill="none">
                      <defs>
                        <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5577"/>
                          <stop offset="60%" stopColor="#E62E5C"/>
                          <stop offset="100%" stopColor="#9B1D3F"/>
                        </linearGradient>
                        <radialGradient id="hgHi" cx="0.35" cy="0.3" r="0.55">
                          <stop offset="0%" stopColor="#FFB3C2" stopOpacity="0.8"/>
                          <stop offset="100%" stopColor="#FF5577" stopOpacity="0"/>
                        </radialGradient>
                      </defs>
                      <path d="M50 86 C 14 60, 6 38, 22 22 C 32 12, 44 14, 50 26 C 56 14, 68 12, 78 22 C 94 38, 86 60, 50 86 Z"
                        fill="url(#hg)" stroke="#FF8FA3" strokeWidth="0.8"/>
                      <path d="M50 86 C 14 60, 6 38, 22 22 C 32 12, 44 14, 50 26 C 56 14, 68 12, 78 22 C 94 38, 86 60, 50 86 Z"
                        fill="url(#hgHi)"/>
                      <path d="M16 50 L30 50 L34 44 L40 60 L44 38 L48 56 L52 50 L84 50"
                        stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
                    </svg>
                  </div>
                  <div className="bpm-tag"><span className="pip"/> 72 BPM · Normal</div>

                  <div className="vital v-hr">
                    <div className="ico"><svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-4.5-7-10.5C5 7.5 7.5 5 10 5c1.4 0 2.6.7 3 2 .4-1.3 1.6-2 3-2 2.5 0 5 2.5 5 5.5 0 6-7 10.5-7 10.5z" fill="currentColor"/></svg></div>
                    <div><div className="vlabel">Rythme cardiaque</div><div className="vval">72<span>BPM</span></div></div>
                  </div>
                  <div className="vital v-spo2">
                    <div className="ico"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3s-6 7-6 12a6 6 0 1012 0c0-5-6-12-6-12z" stroke="currentColor" strokeWidth="1.8" fill="rgba(79,195,247,0.18)"/></svg></div>
                    <div><div className="vlabel">Saturation O₂</div><div className="vval">98<span>%</span></div></div>
                  </div>
                  <div className="vital v-bp">
                    <div className="ico"><svg viewBox="0 0 24 24" fill="none"><path d="M6 4h12v6a6 6 0 11-12 0V4z" stroke="currentColor" strokeWidth="1.6"/><path d="M12 16v4M10 20h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
                    <div><div className="vlabel">Pression</div><div className="vval">120/80<span>mmHg</span></div></div>
                  </div>
                  <div className="vital v-temp">
                    <div className="ico"><svg viewBox="0 0 24 24" fill="none"><path d="M10 14V5a2 2 0 114 0v9a4 4 0 11-4 0z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="17" r="1.6" fill="currentColor"/></svg></div>
                    <div><div className="vlabel">Température</div><div className="vval">37.2<span>°C</span></div></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FEATURES */}
          <section className="section" id="features">
            <div className="container">
              <div className="section-head">
                <span className="eyebrow"><span style={{fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.16em"}}>01 — PLATEFORME</span></span>
                <h2>Une plateforme <span className="accent">complète</span>,<br/>du capteur au rapport.</h2>
                <p>De la mesure du signal cardiaque jusqu'au rapport médical — six modules pensés pour simplifier le suivi des patients.</p>
              </div>
              <div className="features">
                {[
                  { icon: <svg viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Analyse du signal cardiaque", desc: "Le signal est lu automatiquement depuis le capteur et analysé par notre système d'IA — le médecin reçoit le résultat en quelques secondes.", tag: "Analyse automatique" },
                  { icon: <svg viewBox="0 0 24 24" fill="none"><path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><rect x="7" y="11" width="3" height="6" fill="currentColor" opacity=".5"/><rect x="12" y="8" width="3" height="9" fill="currentColor" opacity=".8"/><rect x="17" y="13" width="3" height="4" fill="currentColor"/></svg>, title: "Niveau de risque", desc: "Un score de risque est calculé automatiquement pour chaque patient, avec une indication claire : faible, modéré, élevé ou critique.", tag: "Score 0–9" },
                  { icon: <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><path d="M12 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>, title: "Rapport médical automatique", desc: "Un rapport clair et structuré est généré après chaque analyse — le médecin peut le consulter, le modifier et le partager avec le patient.", tag: "Rapport en français" },
                  { icon: <svg viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(123,196,255,0.15)"/></svg>, title: "Résultats en temps réel", desc: "Dès que le capteur détecte un signal anormal, le médecin reçoit une alerte immédiate — même s'il n'est pas devant l'écran.", tag: "Alerte instantanée" },
                  { icon: <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="15" r="1.2" fill="currentColor"/></svg>, title: "Données sécurisées", desc: "Les données médicales de chaque patient sont protégées et accessibles uniquement par le médecin autorisé.", tag: "Accès sécurisé" },
                  { icon: <svg viewBox="0 0 24 24" fill="none"><circle cx="8" cy="9" r="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="17" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.8"/><path d="M3 20c0-3 2.5-5 5-5s5 2 5 5M13 20c0-2 2-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>, title: "Espace Médecin & Patient", desc: "Le médecin gère ses patients et consulte les analyses. Le patient accède à ses résultats depuis son propre espace personnel.", tag: "Médecin · Patient" },
                ].map((f, i) => (
                  <article className="feature" key={i}>
                    <div className="f-ico">{f.icon}</div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                    <span className="tag"><span className="d"/>{f.tag}</span>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer id="footer">
            <div className="container foot-row">
              <CardiaLogo size="sm" />
              <div className="foot-links">
                <a href="#">À propos</a>
                <a href="#">Confidentialité</a>
                <a href="#">Contact</a>
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em",fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>
                © 2026 CARDIA · v1.0.0
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}