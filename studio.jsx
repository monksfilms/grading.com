// studio.jsx — Color grading engine + FCP effects catalog + Studio React component

const { Reveal, useParallax } = window;

// ─────────────────────────────────────────────────────────────────
// Core color math
// ─────────────────────────────────────────────────────────────────

function applyScurve(v, s) {
  v = Math.max(0, Math.min(1, v));
  const smooth = v * v * (3 - 2 * v);
  return v + (smooth - v) * s;
}

function applyLGG(v, lift, gamma, gain) {
  v = Math.max(0, Math.min(1, v * gain + lift));
  return gamma > 0 ? Math.max(0, Math.min(1, Math.pow(v, 1 / gamma))) : v;
}

function colorGradePixel(r, g, b, p) {
  const temp = p.temperature || 0;
  r = Math.max(0, Math.min(1, r + temp * 0.08));
  b = Math.max(0, Math.min(1, b - temp * 0.08));

  const tint = p.tint || 0;
  g = Math.max(0, Math.min(1, g + tint * 0.06));

  const lift  = p.lift  || [0, 0, 0];
  const gamma = p.gamma || [1, 1, 1];
  const gain  = p.gain  || [1, 1, 1];
  r = applyLGG(r, lift[0], gamma[0], gain[0]);
  g = applyLGG(g, lift[1], gamma[1], gain[1]);
  b = applyLGG(b, lift[2], gamma[2], gain[2]);

  const sat = p.saturation !== undefined ? p.saturation : 1;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  r = Math.max(0, Math.min(1, luma + sat * (r - luma)));
  g = Math.max(0, Math.min(1, luma + sat * (g - luma)));
  b = Math.max(0, Math.min(1, luma + sat * (b - luma)));

  const contrast = p.contrast || 0;
  if (contrast) {
    r = applyScurve(r, contrast);
    g = applyScurve(g, contrast);
    b = applyScurve(b, contrast);
  }

  const exp = p.exposure || 0;
  if (exp) {
    const f = Math.pow(2, exp);
    r = Math.max(0, Math.min(1, r * f));
    g = Math.max(0, Math.min(1, g * f));
    b = Math.max(0, Math.min(1, b * f));
  }

  return [r, g, b];
}

function hslToRgb(h, s, l) {
  h /= 360;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

function generateCubeContent(profile, name, size = 33) {
  const lines = [`# grading.com — ${name}`, `LUT_3D_SIZE ${size}`, ''];
  const step = 1 / (size - 1);
  for (let bi = 0; bi < size; bi++) {
    for (let gi = 0; gi < size; gi++) {
      for (let ri = 0; ri < size; ri++) {
        const [ro, go, bo] = colorGradePixel(ri * step, gi * step, bi * step, profile);
        lines.push(`${ro.toFixed(6)} ${go.toFixed(6)} ${bo.toFixed(6)}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}

function downloadCube(content, filename) {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.cube') ? filename : filename + '.cube';
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────
// LUT preview canvas (for film modal)
// ─────────────────────────────────────────────────────────────────

function drawLutPreview(canvas, filmId) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const profile = window.PROFILES[filmId];
  if (!profile) return;

  const rowH = Math.floor(H / 3);

  for (let x = 0; x < W; x++) {
    const t = x / (W - 1);

    const g = Math.round(t * 255);
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(x, 0, 1, rowH);

    const [ro, go, bo] = colorGradePixel(t, t, t, profile);
    ctx.fillStyle = `rgb(${Math.round(ro * 255)},${Math.round(go * 255)},${Math.round(bo * 255)})`;
    ctx.fillRect(x, rowH, 1, rowH);

    const hue = t * 360;
    const [sr, sg, sb] = hslToRgb(hue, 0.7, 0.5);
    const [sr2, sg2, sb2] = colorGradePixel(sr, sg, sb, profile);
    ctx.fillStyle = `rgb(${Math.round(sr2 * 255)},${Math.round(sg2 * 255)},${Math.round(sb2 * 255)})`;
    ctx.fillRect(x, rowH * 2, 1, rowH);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '9px Inter, sans-serif';
  ctx.fillText('ORIGINAL', 6, rowH - 5);
  ctx.fillText('GRADED', 6, rowH * 2 - 5);
  ctx.fillText('ESPECTRO', 6, rowH * 3 - 5);
}

// ─────────────────────────────────────────────────────────────────
// FCP Effects Catalog
// ─────────────────────────────────────────────────────────────────

const FCP_EFFECTS_CATALOG = [
  {
    id: "grain", icon: "🎞", name: "Film Grain",
    fcp: "Efeitos → Estilizar → Ruído (Noise)",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 100, def: 35, unit: "%" },
      { label: "Tamanho", key: "size", min: 0.5, max: 3, def: 1, unit: "x" }
    ],
    note: "Grão de película analógica. Tipo: Gaussiano."
  },
  {
    id: "bloom", icon: "✨", name: "Bloom",
    fcp: "Efeitos → Brilho → Bloom",
    params: [
      { label: "Intensidade", key: "amount", min: 0, max: 100, def: 25, unit: "%" },
      { label: "Raio", key: "radius", min: 0, max: 300, def: 80, unit: "px" },
      { label: "Aquecimento", key: "warmth", min: -1, max: 1, def: 0, unit: "" }
    ],
    note: "Suaviza highlights com halo de luz."
  },
  {
    id: "glow", icon: "💫", name: "Glow",
    fcp: "Efeitos → Brilho → Brilho (Glow)",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 100, def: 20, unit: "%" },
      { label: "Raio", key: "radius", min: 0, max: 100, def: 15, unit: "px" },
      { label: "Limiar", key: "threshold", min: 0, max: 1, def: 0.7, unit: "" }
    ],
    note: "Halos ao redor de fontes de luz."
  },
  {
    id: "vignette", icon: "⬛", name: "Vinheta",
    fcp: "Inspector → Máscara de Forma (oval) → Inverter → Feather",
    params: [
      { label: "Intensidade", key: "amount", min: 0, max: 100, def: 50, unit: "%" },
      { label: "Suavidade", key: "feather", min: 0, max: 100, def: 80, unit: "%" }
    ],
    note: "Shape Mask oval → Inverter → aumente Feather."
  },
  {
    id: "prism", icon: "🌈", name: "Aberração Cromática",
    fcp: "Efeitos → Desfoque → Prisma (Prism)",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 30, def: 3, unit: "px" },
      { label: "Ângulo", key: "angle", min: 0, max: 360, def: 0, unit: "°" }
    ],
    note: "Separa canais RGB — efeito de lente analógica."
  },
  {
    id: "sharpen", icon: "🔲", name: "Nitidez (Sharpen)",
    fcp: "Efeitos → Nitidez → Nitidez",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 100, def: 20, unit: "%" }
    ],
    note: "Use com moderação (10–30%)."
  },
  {
    id: "zoom_blur", icon: "💨", name: "Desfoque de Zoom",
    fcp: "Efeitos → Desfoque → Desfoque de Zoom",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 100, def: 15, unit: "%" }
    ],
    note: "Efeito de movimento/velocidade."
  },
  {
    id: "old_film", icon: "📽", name: "Película Antiga",
    fcp: "Efeitos → Estilizar → Filme Antigo (Old Film)",
    params: [
      { label: "Arranhões", key: "scratches", min: 0, max: 100, def: 25, unit: "%" },
      { label: "Poeira", key: "dust", min: 0, max: 100, def: 20, unit: "%" },
      { label: "Tremido", key: "flicker", min: 0, max: 100, def: 15, unit: "%" }
    ],
    note: "Combine com Film Grain para resultado analógico."
  },
  {
    id: "dazzle", icon: "⚡", name: "Dazzle (Faíscas de Luz)",
    fcp: "Efeitos → Brilho → Dazzle",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 100, def: 30, unit: "%" }
    ],
    note: "Melhor em fontes de luz pontuais e cenas noturnas."
  },
  {
    id: "spot", icon: "🔦", name: "Spot (Foco de Luz)",
    fcp: "Efeitos → Brilho → Spot",
    params: [
      { label: "Feathering", key: "feather", min: 0, max: 100, def: 60, unit: "%" },
      { label: "Contraste", key: "contrast", min: 0, max: 100, def: 50, unit: "%" }
    ],
    note: "Destaca área central — mais teatral que vinheta."
  },
  {
    id: "streaks", icon: "🌠", name: "Streaks (Raios de Luz)",
    fcp: "Efeitos → Brilho → Streaks",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 100, def: 25, unit: "%" },
      { label: "Ângulo", key: "angle", min: 0, max: 360, def: 45, unit: "°" },
      { label: "Espessura", key: "thickness", min: 0, max: 100, def: 20, unit: "%" }
    ],
    note: "Efeito anamórfico ao usar Ângulo 0°."
  },
];

// ─────────────────────────────────────────────────────────────────
// Canvas effects
// ─────────────────────────────────────────────────────────────────

function applyGrainEffect(imgData, amount) {
  const d = imgData.data;
  const strength = (amount / 100) * 55;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * strength;
    d[i]   = Math.max(0, Math.min(255, d[i]   + n));
    d[i+1] = Math.max(0, Math.min(255, d[i+1] + n));
    d[i+2] = Math.max(0, Math.min(255, d[i+2] + n));
  }
}

function applyVignetteEffect(ctx, W, H, amount, feather) {
  const intensity = amount / 100;
  const gradient = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.15,
    W / 2, H / 2, Math.max(W, H) * (0.5 + (100 - feather) / 200)
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${intensity.toFixed(2)})`);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function applyBloomEffect(ctx, W, H, amount, radius, threshold) {
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const octx = off.getContext('2d');

  const srcData = ctx.getImageData(0, 0, W, H);
  const bloomData = octx.createImageData(W, H);
  const src = srcData.data;
  const bld = bloomData.data;
  const th = threshold !== undefined ? threshold * 255 : 0;

  for (let i = 0; i < src.length; i += 4) {
    const lum = 0.2126 * src[i] + 0.7152 * src[i+1] + 0.0722 * src[i+2];
    if (lum >= th) {
      bld[i] = src[i]; bld[i+1] = src[i+1]; bld[i+2] = src[i+2]; bld[i+3] = 255;
    }
  }
  octx.putImageData(bloomData, 0, 0);

  const blurPx = Math.max(1, Math.round(radius));
  octx.filter = `blur(${blurPx}px)`;
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  tmp.getContext('2d').drawImage(off, 0, 0);
  octx.clearRect(0, 0, W, H);
  octx.drawImage(tmp, 0, 0);
  octx.filter = 'none';

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = amount / 100;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}

function applyPrismEffect(imgData, amount) {
  const shift = Math.round(amount);
  if (shift <= 0) return;
  const d = imgData.data;
  const W = imgData.width, H = imgData.height;
  const orig = new Uint8ClampedArray(d);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const rX = Math.min(W - 1, x + shift);
      const ri = (y * W + rX) * 4;
      const bX = Math.max(0, x - shift);
      const bi = (y * W + bX) * 4;
      d[i]   = orig[ri];
      d[i+2] = orig[bi+2];
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Text description → color params
// ─────────────────────────────────────────────────────────────────

function analyzeDescription(text) {
  const t = text.toLowerCase();
  const delta = { temperature: 0, tint: 0, saturation: 0, contrast: 0, exposure: 0,
    lift: [0,0,0], gamma: [1,1,1], gain: [1,1,1] };
  const tags = [];
  const suggestFx = [];

  if (/quente|warm|dourad|laranja|sol\b|verão|sunrise|pôr do sol|por do sol|hora dourada|golden hour/i.test(t)) {
    delta.temperature += 0.3; tags.push({ text: '🟠 Tons quentes', cls: 'tag-warm' });
  }
  if (/frio|cool|azul|gelo|inverno|winter/i.test(t)) {
    delta.temperature -= 0.3; tags.push({ text: '🔵 Tons frios', cls: 'tag-cool' });
  }
  if (/golden hour|hora dourada|pôr do sol|por do sol/i.test(t)) {
    delta.temperature += 0.15; delta.gain = [1.1, 0.98, 0.85];
    suggestFx.push('bloom'); tags.push({ text: '🌅 Golden Hour', cls: 'tag-warm' });
  }
  if (/teal\b/i.test(t)) {
    delta.temperature -= 0.2; delta.tint += 0.3; delta.gain = [1.0, 1.0, 1.1];
    tags.push({ text: '🩵 Teal', cls: 'tag-cool' });
  }
  if (/orange.?teal|teal.?orange|hollywood/i.test(t)) {
    delta.gain = [1.12, 1.0, 0.88]; delta.lift = [0, 0, 0.05];
    delta.temperature += 0.15; delta.tint -= 0.1;
    tags.push({ text: '🎬 Orange & Teal', cls: 'tag-warm' });
  }
  if (/cyberpunk|neon/i.test(t)) {
    delta.tint -= 0.3; delta.saturation += 0.2; delta.contrast += 0.35;
    suggestFx.push('glow'); tags.push({ text: '⚡ Cyberpunk/Neon', cls: 'tag-sat' });
  }
  if (/vintage|retro|anos 70|analogi[ck]/i.test(t)) {
    delta.temperature += 0.2; delta.saturation -= 0.2; delta.lift = [0.02, 0.01, -0.01];
    suggestFx.push('grain'); tags.push({ text: '📼 Vintage/Retro', cls: 'tag-desat' });
  }
  if (/horror|terror|sombrio/i.test(t)) {
    delta.saturation -= 0.2; delta.exposure -= 0.15; delta.contrast += 0.25;
    delta.lift = [-0.01, -0.01, 0.02];
    suggestFx.push('vignette'); tags.push({ text: '🩸 Horror', cls: 'tag-dark' });
  }
  if (/sonhador|dreamy/i.test(t)) {
    delta.exposure += 0.1; delta.contrast -= 0.1;
    suggestFx.push('bloom'); tags.push({ text: '☁️ Sonhador/Dreamy', cls: 'tag-bright' });
  }
  if (/wes anderson|pastel/i.test(t)) {
    delta.temperature += 0.1; delta.saturation -= 0.1; delta.contrast += 0.1;
    tags.push({ text: '🎨 Wes Anderson/Pastel', cls: 'tag-desat' });
  }
  if (/desaturado|desbotado|desbotad/i.test(t)) {
    delta.saturation -= 0.2; tags.push({ text: '🩶 Desaturado', cls: 'tag-desat' });
  }
  if (/vibrante|intenso|saturado/i.test(t)) {
    delta.saturation += 0.2; tags.push({ text: '🔴 Saturado/Vibrante', cls: 'tag-sat' });
  }
  if (/preto e branco|p&b|monocromatico|monocromático|black.?and.?white|b&w/i.test(t)) {
    delta.saturation = -1; tags.push({ text: '⬛ Preto & Branco', cls: 'tag-desat' });
  }
  if (/alto contraste|dramatico|dramático|duro|harsh/i.test(t)) {
    delta.contrast += 0.3; tags.push({ text: '◼ Alto Contraste', cls: 'tag-dark' });
  }
  if (/suave|flat|delicado|soft/i.test(t)) {
    delta.contrast -= 0.15; tags.push({ text: '◽ Suave/Flat', cls: 'tag-bright' });
  }
  if (/escuro|dark\b|sombrio/i.test(t)) {
    delta.exposure -= 0.2; tags.push({ text: '🌑 Escuro', cls: 'tag-dark' });
  }
  if (/claro|bright|luminoso/i.test(t)) {
    delta.exposure += 0.2; tags.push({ text: '☀️ Claro/Luminoso', cls: 'tag-bright' });
  }
  if (/verde\b|green/i.test(t)) {
    delta.tint += 0.3; delta.gain = [delta.gain[0], 1.05, delta.gain[2]];
    tags.push({ text: '🟢 Verde', cls: 'tag-cool' });
  }
  if (/rosa\b|pink|magenta/i.test(t)) {
    delta.tint -= 0.25; delta.gain = [1.05, delta.gain[1], delta.gain[2]];
    tags.push({ text: '🌸 Rosa/Pink', cls: 'tag-warm' });
  }
  if (/grain|grão|película|pelicul|filme antigo|old film|analogi/i.test(t)) {
    if (!suggestFx.includes('grain')) { suggestFx.push('grain'); tags.push({ text: '🎞 Film Grain sugerido', cls: 'tag-fx' }); }
  }
  if (/bloom|halo|halação|halacao/i.test(t)) {
    if (!suggestFx.includes('bloom')) { suggestFx.push('bloom'); tags.push({ text: '✨ Bloom sugerido', cls: 'tag-fx' }); }
  }
  if (/glow|brilho/i.test(t)) {
    if (!suggestFx.includes('glow')) { suggestFx.push('glow'); tags.push({ text: '💫 Glow sugerido', cls: 'tag-fx' }); }
  }
  if (/vinheta|vignette/i.test(t)) {
    if (!suggestFx.includes('vignette')) { suggestFx.push('vignette'); tags.push({ text: '⬛ Vinheta sugerida', cls: 'tag-fx' }); }
  }
  if (/aberração|aberracao|prisma|prism|chromatic/i.test(t)) {
    if (!suggestFx.includes('prism')) { suggestFx.push('prism'); tags.push({ text: '🌈 Aberração Cromática sugerida', cls: 'tag-fx' }); }
  }
  if (/streak|raio de luz|anamorf/i.test(t)) {
    if (!suggestFx.includes('streaks')) { suggestFx.push('streaks'); tags.push({ text: '🌠 Streaks sugerido', cls: 'tag-fx' }); }
  }

  return { delta, tags, suggestFx };
}

// ─────────────────────────────────────────────────────────────────
// Film Detail Modal (React)
// ─────────────────────────────────────────────────────────────────

function FilmModal({ film, onClose }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    if (!film) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [film]);

  React.useEffect(() => {
    if (!film || !canvasRef.current) return;
    requestAnimationFrame(() => drawLutPreview(canvasRef.current, film.id));
  }, [film]);

  if (!film) return null;

  const paletteGrad = `linear-gradient(135deg, ${film.palette[0]}, ${film.palette[2]}, ${film.palette[4] || film.palette[0]})`;
  const effects = film.effects || [];

  function handleDownload() {
    const profile = window.PROFILES[film.id];
    if (!profile) return;
    const content = generateCubeContent(profile, film.title);
    downloadCube(content, film.id);
  }

  return (
    <div className="film-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="film-modal">
        <button className="film-modal-close" onClick={onClose} aria-label="Fechar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Hero still */}
        <div className="film-modal-hero">
          {film.stills && film.stills.length > 0 ? (
            <img src={film.stills[0]} alt={film.title} className="film-modal-still" />
          ) : (
            <div className="film-modal-still-placeholder" style={{ background: paletteGrad }} />
          )}
          <div className="film-modal-hero-overlay" />
          <div className="film-modal-hero-meta">
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <span className="dot" style={{ background: 'var(--accent)' }}></span>
              {film.year} · {film.director} · DP: {film.dp}
            </div>
            <h2 className="film-modal-title">{film.title}</h2>
          </div>
        </div>

        <div className="film-modal-body">
          {/* Left column */}
          <div className="film-modal-left">
            {/* Palette */}
            <div className="film-modal-section">
              <div className="film-modal-section-label">Paleta</div>
              <div className="film-modal-palette">
                {film.palette.map((c, i) => (
                  <div key={i} className="film-modal-swatch" style={{ background: c }} title={c} />
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="film-modal-section">
              <div className="film-modal-section-label">Análise cromática</div>
              <p className="film-modal-desc">{film.description}</p>
            </div>

            {/* FCP Effects */}
            {effects.length > 0 && (
              <div className="film-modal-section">
                <div className="film-modal-section-label">Efeitos recomendados (FCP)</div>
                <div className="film-modal-effects">
                  {effects.map((fx, i) => (
                    <div key={i} className="film-modal-effect-row">
                      <div className="film-modal-effect-name">{fx.name}</div>
                      <div className="film-modal-effect-value">{fx.value}</div>
                      {fx.note && <div className="film-modal-effect-note">{fx.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="film-modal-right">
            {/* LUT Preview */}
            <div className="film-modal-section">
              <div className="film-modal-section-label">Preview do LUT</div>
              <canvas
                ref={canvasRef}
                className="film-modal-lut-canvas"
                width={480}
                height={90}
              />
            </div>

            {/* Actions */}
            <div className="film-modal-actions">
              <button className="btn btn-primary film-modal-download" onClick={handleDownload}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M4 7l4 4 4-4M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Baixar .cube
              </button>
              {film.videoRef && (
                <a href={film.videoRef} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Ver referência
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Custom Grade Studio (React) — full interactive
// ─────────────────────────────────────────────────────────────────

const DEFAULT_PARAMS = {
  temperature: 0, tint: 0, saturation: 1, contrast: 0, exposure: 0,
  lift: [0,0,0], gamma: [1,1,1], gain: [1,1,1],
};

function makeInitialEffects() {
  const effects = {};
  FCP_EFFECTS_CATALOG.forEach(fx => {
    const values = {};
    fx.params.forEach(p => { values[p.key] = p.def; });
    effects[fx.id] = { active: false, values };
  });
  return effects;
}

function StudioSection() {
  // ── State ────────────────────────────────────────────────────
  const [params, setParams] = React.useState({ ...DEFAULT_PARAMS });
  const [effects, setEffects] = React.useState(makeInitialEffects);
  const [view, setView] = React.useState('after');      // before | after | split
  const [splitX, setSplitX] = React.useState(0.5);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [originalImageData, setOriginalImageData] = React.useState(null);
  const [canvasSize, setCanvasSize] = React.useState({ w: 0, h: 0 });
  const [description, setDescription] = React.useState('');
  const [analysisTags, setAnalysisTags] = React.useState([]);
  const [lutName, setLutName] = React.useState('meu-grade');
  const [imageName, setImageName] = React.useState('');
  const [toast, setToast] = React.useState('');

  const canvasRef = React.useRef(null);
  const wrapRef   = React.useRef(null);
  const handleRef = React.useRef(null);
  const dragging  = React.useRef(false);

  // ── Toast ────────────────────────────────────────────────────
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  }

  // ── Canvas rendering ─────────────────────────────────────────
  function renderCanvas(overrideParams, overrideEffects, overrideView, overrideSplitX) {
    const canvas = canvasRef.current;
    if (!canvas || !originalImageData) return;

    const p  = overrideParams   || params;
    const ef = overrideEffects  || effects;
    const vw = overrideView     !== undefined ? overrideView     : view;
    const sx = overrideSplitX   !== undefined ? overrideSplitX   : splitX;

    const ctx = canvas.getContext('2d');
    const W = canvasSize.w, H = canvasSize.h;
    if (!W || !H) return;
    canvas.width = W; canvas.height = H;

    const profile = { ...p };
    const gradedRaw = new ImageData(new Uint8ClampedArray(originalImageData.data), W, H);
    const d = gradedRaw.data;

    for (let i = 0; i < d.length; i += 4) {
      const [ro, go, bo] = colorGradePixel(d[i]/255, d[i+1]/255, d[i+2]/255, profile);
      d[i] = ro*255; d[i+1] = go*255; d[i+2] = bo*255;
    }

    if (ef.grain.active) applyGrainEffect(gradedRaw, ef.grain.values.amount);
    if (ef.prism.active) applyPrismEffect(gradedRaw, ef.prism.values.amount);

    if (vw === 'before') {
      ctx.putImageData(originalImageData, 0, 0);
    } else if (vw === 'after') {
      ctx.putImageData(gradedRaw, 0, 0);
    } else {
      const splitPx = Math.round(sx * W);
      ctx.putImageData(originalImageData, 0, 0, 0, 0, splitPx, H);
      ctx.putImageData(gradedRaw, 0, 0, splitPx, 0, W - splitPx, H);

      ctx.save();
      ctx.strokeStyle = 'rgba(242,240,235,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(splitPx, 0); ctx.lineTo(splitPx, H); ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(8,8,58,20); ctx.fillRect(splitPx+8,8,58,20);
      ctx.fillStyle='#fff'; ctx.font='9px Inter,sans-serif';
      ctx.fillText('ORIGINAL',12,22); ctx.fillText('GRADED',splitPx+12,22);
      ctx.restore();
    }

    if (vw !== 'before') {
      if (ef.vignette.active) applyVignetteEffect(ctx, W, H, ef.vignette.values.amount, ef.vignette.values.feather);
      if (ef.bloom.active)    applyBloomEffect(ctx, W, H, ef.bloom.values.amount, ef.bloom.values.radius*0.1, 0);
      if (ef.glow.active)     applyBloomEffect(ctx, W, H, ef.glow.values.amount, ef.glow.values.radius*0.2, ef.glow.values.threshold);
    }

    // Position split handle
    if (vw === 'split' && handleRef.current && wrapRef.current) {
      positionHandle(sx, W, H);
    }
  }

  function positionHandle(sx, W, H) {
    const handle = handleRef.current;
    const wrap   = wrapRef.current;
    const canvas = canvasRef.current;
    if (!handle || !wrap || !canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const wrapRect   = wrap.getBoundingClientRect();
    const offsetX = (canvasRect.left - wrapRect.left) + sx * canvasRect.width;
    handle.style.left   = offsetX + 'px';
    handle.style.top    = (canvasRect.top - wrapRect.top) + 'px';
    handle.style.height = canvasRect.height + 'px';
  }

  // Re-render whenever dependencies change
  React.useEffect(() => {
    if (imageLoaded) renderCanvas();
  }, [params, effects, view, splitX, imageLoaded, canvasSize]);

  // ── Split drag ────────────────────────────────────────────────
  React.useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    function onDown(e) { dragging.current = true; e.preventDefault(); }
    function onMove(e) {
      if (!dragging.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const newX = Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width));
      setSplitX(newX);
    }
    function onUp() { dragging.current = false; }

    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      handle.removeEventListener('mousedown', onDown);
      handle.removeEventListener('touchstart', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  // ── Image load ────────────────────────────────────────────────
  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const maxW = 900, maxH = 560;
        let W = img.naturalWidth, H = img.naturalHeight;
        if (W > maxW) { H = Math.round(H * maxW / W); W = maxW; }
        if (H > maxH) { W = Math.round(W * maxH / H); H = maxH; }

        const tmp = document.createElement('canvas');
        tmp.width = W; tmp.height = H;
        tmp.getContext('2d').drawImage(img, 0, 0, W, H);
        const imgData = tmp.getContext('2d').getImageData(0, 0, W, H);

        setOriginalImageData(imgData);
        setCanvasSize({ w: W, h: H });
        setImageLoaded(true);
        setImageName(file.name);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ── Analyze description ───────────────────────────────────────
  function handleAnalyze() {
    if (!description.trim()) return;
    const { delta, tags, suggestFx } = analyzeDescription(description);

    const newParams = {
      ...params,
      temperature: Math.max(-1, Math.min(1, delta.temperature)),
      tint:        Math.max(-1, Math.min(1, delta.tint)),
      saturation:  Math.max(0,  Math.min(2, 1 + delta.saturation)),
      contrast:    Math.max(-1, Math.min(1, delta.contrast)),
      exposure:    Math.max(-2, Math.min(2, delta.exposure)),
      lift: delta.lift, gamma: delta.gamma, gain: delta.gain,
    };
    setParams(newParams);
    setAnalysisTags(tags);

    if (suggestFx.length > 0) {
      setEffects(prev => {
        const next = { ...prev };
        suggestFx.forEach(id => {
          if (next[id]) next[id] = { ...next[id], active: true };
        });
        return next;
      });
    }
  }

  // ── Param slider change ───────────────────────────────────────
  function handleParamChange(key, value) {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) }));
  }

  // ── Effect toggle ─────────────────────────────────────────────
  function toggleEffect(id) {
    setEffects(prev => ({
      ...prev,
      [id]: { ...prev[id], active: !prev[id].active }
    }));
  }

  // ── Effect param change ───────────────────────────────────────
  function handleEffectParam(id, key, value) {
    setEffects(prev => ({
      ...prev,
      [id]: { ...prev[id], values: { ...prev[id].values, [key]: parseFloat(value) } }
    }));
  }

  // ── Download LUT ──────────────────────────────────────────────
  function handleDownload() {
    const content = generateCubeContent(params, lutName, 33);
    downloadCube(content, lutName);
    showToast('LUT gerado e baixado! ✓');
  }

  // ── Copy recipe ───────────────────────────────────────────────
  function handleCopyRecipe() {
    const activeEffects = FCP_EFFECTS_CATALOG.filter(fx => effects[fx.id].active);
    const lines = [
      '── RECEITA FCP ──────────────────────────────────',
      '',
      `🎬 LUT: Aplicar LUT → Efeitos de Cor → LUT Personalizado → ${lutName}.cube`,
      '   Intensidade: 100%',
      '',
    ];
    if (activeEffects.length > 0) {
      lines.push('── EFEITOS (aplicar na ordem abaixo) ───────────', '');
      activeEffects.forEach(fx => {
        lines.push(`${fx.icon}  ${fx.name}`, `   FCP: ${fx.fcp}`);
        fx.params.forEach(p => {
          lines.push(`   ${p.label}: ${effects[fx.id].values[p.key]}${p.unit}`);
        });
        if (fx.note) lines.push(`   Nota: ${fx.note}`);
        lines.push('');
      });
    } else {
      lines.push('(Nenhum efeito ativo)');
    }
    lines.push('─────────────────────────────────────────────────', 'Gerado por grading.com');
    const text = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast('Receita copiada! ✓'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta); showToast('Receita copiada! ✓');
    }
  }

  const activeEffects = FCP_EFFECTS_CATALOG.filter(fx => effects[fx.id] && effects[fx.id].active);

  const COLOR_SLIDERS = [
    { key: 'temperature', label: 'Temperatura', min: -1, max: 1, step: 0.01 },
    { key: 'tint',        label: 'Tint',        min: -1, max: 1, step: 0.01 },
    { key: 'saturation',  label: 'Saturação',   min: 0,  max: 2, step: 0.01 },
    { key: 'contrast',    label: 'Contraste',   min: -1, max: 1, step: 0.01 },
    { key: 'exposure',    label: 'Exposição',   min: -2, max: 2, step: 0.01 },
  ];

  return (
    <section className="studio-section" id="studio">
      <div className="studio-section-header">
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
            Exportamos o <code>.cube</code> e a receita completa para o seu editor.
          </p>
        </Reveal>
      </div>

      <Reveal delay={80}>
        <div className="studio-app">
          {/* ── Left: canvas ── */}
          <div className="studio-app-left">
            <div className="studio-canvas-wrap" ref={wrapRef}>
              {!imageLoaded ? (
                <label className="studio-upload-zone">
                  <input
                    type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files[0])}
                  />
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="studio-upload-label">Arraste ou clique para carregar um frame</span>
                  <span className="studio-upload-hint">JPG, PNG, WEBP</span>
                </label>
              ) : (
                <>
                  <canvas ref={canvasRef} className="studio-canvas" />
                  {view === 'split' && (
                    <div ref={handleRef} className="studio-split-handle">
                      <div className="studio-split-knob">↔</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* View tabs + image name */}
            <div className="studio-canvas-footer">
              <div className="studio-tabs">
                {['before','after','split'].map(v => (
                  <button
                    key={v}
                    className={`studio-tab ${view === v ? 'active' : ''}`}
                    onClick={() => setView(v)}
                  >
                    {v === 'before' ? 'Original' : v === 'after' ? 'Graded' : 'Split'}
                  </button>
                ))}
              </div>
              {imageLoaded && (
                <div className="studio-file-info">
                  <span className="studio-file-name">{imageName}</span>
                  <label className="studio-change-btn">
                    Trocar
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => handleFile(e.target.files[0])} />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: controls ── */}
          <div className="studio-app-right">
            {/* Description */}
            <div className="studio-ctrl-section">
              <div className="studio-ctrl-label">Descreva o look</div>
              <textarea
                className="studio-desc-input"
                placeholder="Ex: quente, vintage, com grão e vinheta leve..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAnalyze(); }}
                rows={3}
              />
              <button className="studio-analyze-btn" onClick={handleAnalyze}>
                Analisar look
              </button>
              {analysisTags.length > 0 && (
                <div className="studio-tags">
                  {analysisTags.map((tg, i) => (
                    <span key={i} className={`studio-tag ${tg.cls}`}>{tg.text}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Color sliders */}
            <div className="studio-ctrl-section">
              <div className="studio-ctrl-label">Parâmetros de cor</div>
              {COLOR_SLIDERS.map(s => (
                <div key={s.key} className="studio-slider-row">
                  <div className="studio-slider-head">
                    <span>{s.label}</span>
                    <span className="studio-slider-val">{params[s.key].toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min={s.min} max={s.max} step={s.step}
                    value={params[s.key]}
                    className="studio-range"
                    onChange={e => handleParamChange(s.key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Effects */}
            <div className="studio-ctrl-section">
              <div className="studio-ctrl-label">Efeitos de câmera</div>
              <div className="studio-effects-grid">
                {FCP_EFFECTS_CATALOG.map(fx => (
                  <div
                    key={fx.id}
                    className={`studio-effect-card ${effects[fx.id] && effects[fx.id].active ? 'active' : ''}`}
                  >
                    <div className="studio-effect-header" onClick={() => toggleEffect(fx.id)}>
                      <div className="studio-effect-toggle-dot" />
                      <span className="studio-effect-emoji">{fx.icon}</span>
                      <span className="studio-effect-name">{fx.name}</span>
                    </div>
                    {effects[fx.id] && effects[fx.id].active && (
                      <div className="studio-effect-params">
                        {fx.params.map(p => (
                          <div key={p.key} className="studio-effect-param-row">
                            <div className="studio-effect-param-head">
                              <span>{p.label}</span>
                              <span className="studio-slider-val">
                                {Number.isInteger(effects[fx.id].values[p.key])
                                  ? effects[fx.id].values[p.key]
                                  : effects[fx.id].values[p.key].toFixed(2)}{p.unit}
                              </span>
                            </div>
                            <input
                              type="range" min={p.min} max={p.max}
                              step={p.max <= 1 ? 0.01 : 1}
                              value={effects[fx.id].values[p.key]}
                              className="studio-range"
                              onChange={e => handleEffectParam(fx.id, p.key, e.target.value)}
                            />
                          </div>
                        ))}
                        {fx.note && <div className="studio-effect-note">{fx.note}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* FCP Recipe */}
            {activeEffects.length > 0 && (
              <div className="studio-ctrl-section">
                <div className="studio-ctrl-label">Receita FCP</div>
                <div className="studio-recipe-card">
                  <div className="studio-recipe-lut-path">
                    Aplicar LUT <span style={{color:'var(--accent)'}}>→</span> Efeitos de Cor
                    <span style={{color:'var(--accent)'}}> → </span> LUT Personalizado
                  </div>
                  <div className="studio-recipe-filename">{lutName || 'meu-grade'}.cube · Intensidade 100%</div>
                  {activeEffects.map(fx => (
                    <div key={fx.id} className="studio-recipe-fx-row">
                      <div className="studio-recipe-fx-head">
                        <span>{fx.icon} {fx.name}</span>
                        <span className="studio-recipe-fcp-path">{fx.fcp}</span>
                      </div>
                      <div className="studio-recipe-chips">
                        {fx.params.map(p => (
                          <span key={p.key} className="studio-recipe-chip">
                            {p.label}: {effects[fx.id].values[p.key]}{p.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer: name + buttons */}
            <div className="studio-ctrl-section studio-footer-row">
              <input
                type="text"
                className="studio-name-input"
                placeholder="Nome do LUT (ex: meu-grade)"
                value={lutName}
                onChange={e => setLutName(e.target.value)}
              />
              <div className="studio-action-btns">
                <button className="studio-action-btn studio-copy-btn" onClick={handleCopyRecipe}>
                  Copiar receita
                </button>
                <button className="studio-action-btn studio-download-btn" onClick={handleDownload}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v8M4 7l4 4 4-4M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Baixar .cube
                </button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Toast */}
      {toast && <div className="studio-toast show">{toast}</div>}
    </section>
  );
}

Object.assign(window, {
  FilmModal, StudioSection,
  colorGradePixel, generateCubeContent, downloadCube, drawLutPreview,
  applyGrainEffect, applyVignetteEffect, applyBloomEffect, applyPrismEffect,
  FCP_EFFECTS_CATALOG, analyzeDescription
});
