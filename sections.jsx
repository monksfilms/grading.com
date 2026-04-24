// sections.jsx — Hero, What, LUTs, Studio, Compat, CTA, Footer

const { CinemaFrame, LOOKS, Reveal, useParallax } = window;

// ——— NAV ———
function Nav() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <a href="#" className="nav-brand">
        <span className="mark"></span>
        <span>grading<span style={{ color: "var(--accent)" }}>.</span>com</span>
      </a>
      <div className="nav-links">
        <a href="#luts">LUTs</a>
        <a href="#studio">Studio</a>
        <a href="#compat">Compatibilidade</a>
        <a href="#sobre">Sobre</a>
      </div>
      <a href="#luts" className="nav-cta">Explorar biblioteca</a>
    </nav>
  );
}

// ——— HERO ———
function Hero() {
  const heroFrames = [
    LOOKS.tealOrange,
    LOOKS.kodakWarm,
    LOOKS.neonNoir,
    LOOKS.pastelSymmetry,
    LOOKS.moonlitBlue,
  ];
  const stripRef = React.useRef(null);
  useParallax(stripRef, { zoom: 0, translate: 60 });

  return (
    <section className="hero">
      <div className="hero-glow" />
      <div className="hero-copy">
        <Reveal>
          <div className="eyebrow">
            <span className="dot"></span>
            Biblioteca de Color Grading · v3.2
          </div>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="display hero-title">
            O cinema <span className="accent">começa</span><br />
            na cor.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="hero-sub">
            Centenas de LUTs inspirados em filmes icônicos. Estúdio de grade personalizado.
            Receitas prontas para Final Cut, Resolve e Premiere. Tudo em um só lugar.
          </p>
        </Reveal>
        <Reveal delay={220}>
          <div className="hero-ctas">
            <a href="#luts" className="btn btn-primary">
              Ver biblioteca
              <svg className="arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="#studio" className="btn btn-ghost">Abrir Studio</a>
          </div>
        </Reveal>
      </div>
      <div className="hero-strip" ref={stripRef}>
        {heroFrames.map((look, i) => (
          <CinemaFrame
            key={i}
            gradient={look.gradient}
            label={look.label}
            code={look.code}
            bars
          />
        ))}
      </div>
    </section>
  );
}

// ——— WHAT IS GRADING.COM ———
function What() {
  const visualRef = React.useRef(null);
  useParallax(visualRef, { zoom: 0.08, translate: 40 });

  return (
    <section className="what" id="sobre">
      <div className="what-grid">
        <div className="what-copy">
          <Reveal>
            <div className="eyebrow"><span className="dot"></span>O que é grading.com</div>
          </Reveal>
          <Reveal delay={80} as="h2" className="display">
            Uma ponte entre <span className="accent" style={{ fontStyle: "italic", fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, color: "var(--accent)" }}>o seu frame</span> e o cinema.
          </Reveal>
          <Reveal delay={140}>
            <p>
              Catalogamos, analisamos e reconstruímos as paletas dos filmes mais marcantes
              da história. Cada look vira um LUT `.cube` pronto para usar, acompanhado
              da receita completa de efeitos para reproduzir o visual no seu editor.
            </p>
            <p>
              É como ter o colorista na sua timeline — sem o dayrate.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="what-stats">
              <div className="what-stat">
                <div className="n">420+</div>
                <div className="l">LUTs<br/>catalogados</div>
              </div>
              <div className="what-stat">
                <div className="n">3</div>
                <div className="l">Editores<br/>compatíveis</div>
              </div>
              <div className="what-stat">
                <div className="n">∞</div>
                <div className="l">Looks<br/>personalizados</div>
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal delay={100}>
          <div className="what-visual" ref={visualRef}>
            <CinemaFrame
              gradient={LOOKS.flatLog.gradient}
              bg="#2a2824"
              label={null}
              code={null}
              className="slice"
              style={{ clipPath: "inset(0 50% 0 0)" }}
            />
            <CinemaFrame
              gradient={LOOKS.tealOrange.gradient}
              bg="#1a1a1a"
              label={null}
              code={null}
              className="slice"
              style={{ clipPath: "inset(0 0 0 50%)" }}
            />
            <div className="split-label" style={{ left: 16 }}>ORIGINAL</div>
            <div className="split-label" style={{ right: 16 }}>GRADED</div>
            <div className="split-handle" style={{ left: "50%" }}></div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ——— LUTS GRID ———
function LutCard({ look, title, director, density }) {
  const ref = React.useRef(null);
  useParallax(ref, { zoom: 0.14, translate: 0 });
  return (
    <Reveal>
      <div className="lut-card" ref={ref}>
        <div className="frame-inner">
          <CinemaFrame
            gradient={look.gradient}
            label={null}
            code={null}
            bars={density !== "compact"}
            style={{ position: "absolute", inset: 0 }}
          />
        </div>
        <div className="overlay"></div>
        <div className="lut-card-meta">
          <div>
            <h3>{title}</h3>
            <div className="sub">{director}</div>
          </div>
          <span className="pill">{look.code}</span>
        </div>
      </div>
    </Reveal>
  );
}

function Luts({ density }) {
  const [filter, setFilter] = React.useState("Todos");
  const filters = ["Todos", "Cinema clássico", "Contemporâneo", "Ação", "Drama", "Neon"];

  // Original category labels — generic color-grading archetypes, not tied
  // to any specific copyrighted work.
  const cards = [
    { look: LOOKS.tealOrange, title: "Bay Orange", director: "Ação · Blockbuster", cat: "Ação" },
    { look: LOOKS.pastelSymmetry, title: "Pastel Symmetry", director: "Drama · Simetria", cat: "Drama" },
    { look: LOOKS.neonNoir, title: "Neon Noir", director: "Thriller · Neon", cat: "Neon" },
    { look: LOOKS.desertWarm, title: "Desert Warm", director: "Western · Épico", cat: "Cinema clássico" },
    { look: LOOKS.kodakWarm, title: "Kodak 5219", director: "Film stock · 35mm", cat: "Cinema clássico" },
    { look: LOOKS.cyberRain, title: "Cyber Rain", director: "Sci-fi · Distópico", cat: "Neon" },
    { look: LOOKS.bleachBypass, title: "Bleach Bypass", director: "Guerra · Realismo", cat: "Drama" },
    { look: LOOKS.moonlitBlue, title: "Moonlit Blue", director: "Noturno · Intimista", cat: "Drama" },
    { look: LOOKS.crimsonNight, title: "Crimson Night", director: "Terror · Psicológico", cat: "Contemporâneo" },
    { look: LOOKS.goldenHour, title: "Golden Hour", director: "Drama · Romance", cat: "Contemporâneo" },
    { look: LOOKS.greenMist, title: "Forest Mist", director: "Fantasia · Épica", cat: "Cinema clássico" },
    { look: LOOKS.sovietGray, title: "Silver Halide", director: "Preto & branco", cat: "Cinema clássico" },
  ];

  const shown = filter === "Todos" ? cards : cards.filter((c) => c.cat === filter);

  return (
    <section className="luts" id="luts">
      <div className="section-head center">
        <Reveal>
          <div className="eyebrow"><span className="dot"></span>Biblioteca</div>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="display section-title">
            Doze <span className="accent">atmosferas</span>.<br />
            Infinitos filmes.
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="section-lede">
            Cada LUT vem com stills de referência, paleta extraída e a receita
            completa de efeitos para replicar o look no seu editor.
          </p>
        </Reveal>
      </div>

      <Reveal>
        <div className="luts-filters">
          {filters.map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="luts-grid" style={density === "compact" ? { gap: 16 } : density === "comfy" ? { gap: 48 } : undefined}>
        {shown.map((c, i) => (
          <LutCard key={c.title} look={c.look} title={c.title} director={c.director} density={density} />
        ))}
      </div>

      <div className="luts-footer">
        <Reveal>
          <a className="btn btn-ghost" href="#">Ver todos os 420 LUTs →</a>
        </Reveal>
      </div>
    </section>
  );
}

// ——— STUDIO ———
function Studio() {
  const previewRef = React.useRef(null);
  useParallax(previewRef, { zoom: 0.06, translate: 30 });

  const sliders = [
    { lbl: "Temperatura", val: "+12", fill: 62 },
    { lbl: "Tint", val: "-04", fill: 46 },
    { lbl: "Saturação", val: "1.18", fill: 72 },
    { lbl: "Contraste", val: "+0.22", fill: 68 },
    { lbl: "Exposição", val: "-0.15", fill: 42 },
  ];

  return (
    <section className="studio" id="studio">
      <div className="studio-header">
        <div>
          <Reveal>
            <div className="eyebrow"><span className="dot"></span>LUT Studio</div>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="display section-title">
              Crie o seu próprio <span className="accent">look.</span>
            </h2>
          </Reveal>
        </div>
        <Reveal delay={140}>
          <p className="section-lede" style={{ maxWidth: 380, textAlign: "right" }}>
            Suba um frame, descreva o visual com palavras, ajuste com sliders.
            Exportamos o `.cube` e a receita completa para o seu editor.
          </p>
        </Reveal>
      </div>

      <Reveal delay={100}>
        <div className="studio-demo">
          <div className="studio-preview" ref={previewRef}>
            <div className="studio-preview-label">GRADED · SPLIT VIEW</div>
            <div className="studio-preview-dots">
              <span></span><span></span><span></span>
            </div>
            <div className="studio-preview-frame" style={{ clipPath: "inset(0 50% 0 0)" }}>
              <CinemaFrame
                gradient={LOOKS.flatLog.gradient}
                bg="#2a2824"
                label={null}
                code={null}
                style={{ position: "absolute", inset: 0 }}
              />
            </div>
            <div className="studio-preview-frame" style={{ clipPath: "inset(0 0 0 50%)" }}>
              <CinemaFrame
                gradient={LOOKS.tealOrange.gradient}
                label={null}
                code={null}
                style={{ position: "absolute", inset: 0 }}
              />
            </div>
            <div className="studio-preview-split" style={{ left: "50%" }}></div>
          </div>

          <aside className="studio-sidebar">
            <div>
              <h4>Parâmetros de cor</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
                {sliders.map((s) => (
                  <div className="ctrl" key={s.lbl}>
                    <div className="ctrl-head">
                      <span className="lbl">{s.lbl}</span>
                      <span className="val">{s.val}</span>
                    </div>
                    <div className="ctrl-bar">
                      <div className="fill" style={{ width: `${s.fill}%` }}></div>
                      <div className="knob" style={{ left: `${s.fill}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="studio-recipe">
              <h4 style={{ marginBottom: 10 }}>Receita FCP</h4>
              <div className="path">
                Aplicar LUT <span className="arrow">→</span> Efeitos de Cor <span className="arrow">→</span> LUT Personalizado
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-mute)", marginTop: 8 }}>
                meu-grade.cube · Intensidade 100%
              </div>
              <button className="studio-btn">
                Baixar .cube
              </button>
            </div>
          </aside>
        </div>
      </Reveal>
    </section>
  );
}

// ——— COMPAT ———
function Compat() {
  return (
    <section className="compat" id="compat">
      <Reveal>
        <div className="compat-title">Compatível com os principais editores</div>
      </Reveal>
      <Reveal delay={80}>
        <div className="compat-row">
          <span className="logo">Final Cut Pro</span>
          <span className="logo">DaVinci Resolve</span>
          <span className="logo">Premiere Pro</span>
          <span className="logo">After Effects</span>
          <span className="logo">CapCut</span>
        </div>
      </Reveal>
    </section>
  );
}

// ——— CTA ———
function Cta() {
  return (
    <section className="cta">
      <div className="cta-glow" />
      <Reveal>
        <div className="eyebrow" style={{ position: "relative" }}><span className="dot"></span>Comece agora</div>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="display cta-title">
          Seu próximo<br />
          <span className="accent" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>filme</span> começa aqui.
        </h2>
      </Reveal>
      <Reveal delay={140}>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", position: "relative" }}>
          <a className="btn btn-primary" href="#luts">Explorar biblioteca</a>
          <a className="btn btn-ghost" href="#studio">Abrir Studio</a>
        </div>
      </Reveal>
    </section>
  );
}

// ——— FOOTER ———
function Footer() {
  return (
    <footer className="footer">
      <div>© 2026 grading.com · Biblioteca de Color Grading</div>
      <div className="footer-links">
        <a href="#">Licença</a>
        <a href="#">Docs</a>
        <a href="#">Blog</a>
        <a href="#">Contato</a>
      </div>
    </footer>
  );
}

Object.assign(window, { Nav, Hero, What, Luts, Studio, Compat, Cta, Footer });
