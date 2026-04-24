// sections.jsx — Hero, What, LUTs (real film library), Studio, Compat, CTA, Footer

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
      <a href="#studio" className="nav-cta">Abrir Studio</a>
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
            Biblioteca de Color Grading · 15 filmes icônicos
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
            LUTs inspirados em filmes icônicos. Estúdio de grade personalizado.
            Receitas prontas para Final Cut, Resolve e Premiere.
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
              da história. Cada look vira um LUT <code>.cube</code> pronto para usar, acompanhado
              da receita completa de efeitos para reproduzir o visual no seu editor.
            </p>
            <p>
              É como ter o colorista na sua timeline — sem o dayrate.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="what-stats">
              <div className="what-stat">
                <div className="n">15</div>
                <div className="l">Filmes<br/>catalogados</div>
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

// ——— FILM CARD (real data) ———
function FilmCard({ film, onClick, density }) {
  const ref = React.useRef(null);
  useParallax(ref, { zoom: 0.12, translate: 0 });

  const paletteGrad = `linear-gradient(135deg, ${film.palette[0]}, ${film.palette[2]}, ${film.palette[4] || film.palette[0]})`;

  // Category label
  const catLabel = film.category === 'wes-anderson' ? 'Wes Anderson' : film.director;

  return (
    <Reveal>
      <div className="lut-card" ref={ref} onClick={() => onClick(film)} style={{ cursor: 'pointer' }}>
        <div className="frame-inner">
          {film.stills && film.stills.length > 0 ? (
            <img
              src={film.stills[0]}
              alt={film.title}
              className="lut-card-still"
              loading="lazy"
            />
          ) : (
            <div className="lut-card-gradient" style={{ background: paletteGrad }} />
          )}
        </div>
        <div className="overlay" />
        <div className="lut-card-palette">
          {film.palette.map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </div>
        <div className="lut-card-meta">
          <div>
            <h3>{film.title}</h3>
            <div className="sub">{film.year} · {catLabel}</div>
          </div>
          <span className="pill">.cube</span>
        </div>
      </div>
    </Reveal>
  );
}

// ——— LUTS GRID (real film library) ———
function Luts({ density }) {
  const [filter, setFilter] = React.useState("Todos");
  const [selectedFilm, setSelectedFilm] = React.useState(null);

  const filters = ["Todos", "Wes Anderson", "Outros"];

  const films = window.FILMS || [];

  const shown = filter === "Todos" ? films
    : filter === "Wes Anderson" ? films.filter(f => f.category === 'wes-anderson')
    : films.filter(f => f.category === 'outros');

  return (
    <section className="luts" id="luts">
      <div className="section-head center">
        <Reveal>
          <div className="eyebrow"><span className="dot"></span>Biblioteca de filmes</div>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="display section-title">
            Quinze <span className="accent">atmosferas</span>.<br />
            Um LUT para cada.
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="section-lede">
            Cada LUT vem com still de referência, paleta extraída e receita
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

      <div
        className="luts-grid"
        style={
          density === "compact" ? { gap: 16 }
          : density === "comfy" ? { gap: 48 }
          : undefined
        }
      >
        {shown.map((film) => (
          <FilmCard
            key={film.id}
            film={film}
            onClick={setSelectedFilm}
            density={density}
          />
        ))}
      </div>

      <div className="luts-footer">
        <Reveal>
          <a className="btn btn-ghost" href="#studio">Criar look personalizado no Studio →</a>
        </Reveal>
      </div>

      {/* Film detail modal */}
      {selectedFilm && (
        <window.FilmModal film={selectedFilm} onClose={() => setSelectedFilm(null)} />
      )}
    </section>
  );
}

// ——— STUDIO (real interactive) ———
function Studio() {
  return <window.StudioSection />;
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
