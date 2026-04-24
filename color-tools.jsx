// color-tools.jsx — Professional color grading engine
// Overrides window.StudioSection with full-featured studio

// ─── LUT ENGINE ──────────────────────────────────────────────────────────────

function parseCubeLUT(text) {
  const lines = text.split(/\r?\n/);
  let size = 33;
  const data = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1]);
      continue;
    }
    if (line.startsWith('DOMAIN_') || line.startsWith('LUT_1D') || line.startsWith('TITLE')) continue;
    const parts = line.split(/\s+/);
    if (parts.length === 3) {
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        data.push(r, g, b);
      }
    }
  }
  return { data: new Float32Array(data), size };
}

const _lutCache = {};
async function loadLUT(url) {
  if (_lutCache[url]) return _lutCache[url];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`LUT fetch failed: ${res.status}`);
  const text = await res.text();
  const lut = parseCubeLUT(text);
  _lutCache[url] = lut;
  return lut;
}

function applyLUT3D(imgData, lutData, lutSize) {
  const d = imgData.data;
  const n = lutSize;
  const scale = (n - 1) / 255;

  for (let i = 0; i < d.length; i += 4) {
    const ri = d[i] * scale;
    const gi = d[i + 1] * scale;
    const bi = d[i + 2] * scale;

    const r0 = Math.min(Math.floor(ri), n - 2);
    const g0 = Math.min(Math.floor(gi), n - 2);
    const b0 = Math.min(Math.floor(bi), n - 2);

    const rf = ri - r0;
    const gf = gi - g0;
    const bf = bi - b0;

    // 8 corners: index = (r + g*n + b*n*n) * 3
    function idx(r, g, b) { return (r + g * n + b * n * n) * 3; }

    const i000 = idx(r0,   g0,   b0);
    const i100 = idx(r0+1, g0,   b0);
    const i010 = idx(r0,   g0+1, b0);
    const i110 = idx(r0+1, g0+1, b0);
    const i001 = idx(r0,   g0,   b0+1);
    const i101 = idx(r0+1, g0,   b0+1);
    const i011 = idx(r0,   g0+1, b0+1);
    const i111 = idx(r0+1, g0+1, b0+1);

    for (let c = 0; c < 3; c++) {
      const c000 = lutData[i000 + c];
      const c100 = lutData[i100 + c];
      const c010 = lutData[i010 + c];
      const c110 = lutData[i110 + c];
      const c001 = lutData[i001 + c];
      const c101 = lutData[i101 + c];
      const c011 = lutData[i011 + c];
      const c111 = lutData[i111 + c];

      // Trilinear interpolation
      const c00 = c000 + rf * (c100 - c000);
      const c01 = c001 + rf * (c101 - c001);
      const c10 = c010 + rf * (c110 - c010);
      const c11 = c011 + rf * (c111 - c011);
      const c0  = c00  + gf * (c10  - c00);
      const c1  = c01  + gf * (c11  - c01);
      const out = c0   + bf * (c1   - c0);

      d[i + c] = Math.round(Math.max(0, Math.min(1, out)) * 255);
    }
  }
  return imgData;
}

// ─── CURVE ENGINE ─────────────────────────────────────────────────────────────

const DEFAULT_CURVE = [{ x: 0, y: 0 }, { x: 1, y: 1 }];

function monotoneCubicLUT(points, n = 256) {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const xs = sorted.map(p => p.x);
  const ys = sorted.map(p => p.y);
  const k = xs.length;

  // Compute slopes
  const dx = [], dy = [], m = [];
  for (let i = 0; i < k - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    dy[i] = ys[i + 1] - ys[i];
    m[i] = dy[i] / dx[i];
  }

  // Tangents (Fritsch-Carlson)
  const t = [m[0]];
  for (let i = 1; i < k - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0;
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
    }
  }
  t[k - 1] = m[k - 2];

  // Build LUT
  const lut = new Float32Array(n);
  for (let j = 0; j < n; j++) {
    const x = j / (n - 1);
    if (x <= xs[0]) { lut[j] = ys[0]; continue; }
    if (x >= xs[k - 1]) { lut[j] = ys[k - 1]; continue; }
    // Find segment
    let seg = 0;
    for (let i = 0; i < k - 1; i++) { if (x >= xs[i] && x <= xs[i + 1]) { seg = i; break; } }
    const h = dx[seg];
    const tt = (x - xs[seg]) / h;
    const h00 =  2*tt*tt*tt - 3*tt*tt + 1;
    const h10 =    tt*tt*tt - 2*tt*tt + tt;
    const h01 = -2*tt*tt*tt + 3*tt*tt;
    const h11 =    tt*tt*tt -   tt*tt;
    lut[j] = h00*ys[seg] + h10*h*t[seg] + h01*ys[seg+1] + h11*h*t[seg+1];
  }
  return lut;
}

function applyCurves(imgData, allLUT, rLUT, gLUT, bLUT) {
  const d = imgData.data;
  const n = allLUT.length - 1;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = d[i + c];
      const t = v / 255;
      const idx = Math.round(t * n);
      const channel = [rLUT, gLUT, bLUT][c];
      // Apply all-channel curve first, then per-channel
      let out = allLUT[idx];
      // Map output through per-channel curve
      const idx2 = Math.round(Math.max(0, Math.min(1, out)) * n);
      out = channel[idx2];
      d[i + c] = Math.round(Math.max(0, Math.min(1, out)) * 255);
    }
  }
  return imgData;
}

// ─── WHEEL → PROFILE ──────────────────────────────────────────────────────────

function buildProfileFromWheels(wheels, sliders) {
  const S = 0.12;
  // wheel: { x, y, lum }  x=warm(+)/cool(-), y=up=green/down=magenta
  function ws(w) {
    return [
      w.lum * S + w.x * S,          // R: warm=+R, lum=+R
      w.lum * S - w.y * S * 0.7,    // G: green=+G (y up=green so -y for magenta pull)
      w.lum * S - w.x * S           // B: cool=+B
    ];
  }
  const ls = ws(wheels.lift);
  const gs = ws(wheels.gamma);
  const gns = ws(wheels.gain);

  return {
    temperature: sliders.temp || 0,
    tint: sliders.tint || 0,
    saturation: sliders.sat !== undefined ? sliders.sat : 1,
    contrast: sliders.contrast !== undefined ? sliders.contrast : 0,
    exposure: sliders.exposure !== undefined ? sliders.exposure : 0,
    lift:  [ls[0],  ls[1],  ls[2]],
    gamma: [1 + gs[0]  * 0.5, 1 + gs[1]  * 0.5, 1 + gs[2]  * 0.5],
    gain:  [1 + gns[0] * 0.4, 1 + gns[1] * 0.4, 1 + gns[2] * 0.4],
  };
}

// ─── PROFESSIONAL PRESETS ─────────────────────────────────────────────────────

const PROFESSIONAL_PRESETS = [
  // ── Cinema ──
  {
    id: 'bleach-bypass',
    name: 'Bleach Bypass',
    category: 'Cinema',
    icon: '🎞',
    desc: 'Alto contraste, dessaturado, sombras frias',
    wheels: {
      lift:  { x: -0.18, y:  0.05, lum: -0.12 },
      gamma: { x:  0.0,  y:  0.0,  lum:  0.0  },
      gain:  { x:  0.1,  y: -0.05, lum:  0.08 },
    },
    params: { temp: -8, tint: 2, sat: 0.55, contrast: 0.35, exposure: -0.1 },
  },
  {
    id: 'teal-orange',
    name: 'Teal & Orange',
    category: 'Cinema',
    icon: '🎬',
    desc: 'Look Hollywood clássico: sombras teal, altas luzes laranja',
    wheels: {
      lift:  { x: -0.35, y:  0.10, lum: -0.05 },
      gamma: { x:  0.0,  y:  0.0,  lum:  0.0  },
      gain:  { x:  0.40, y: -0.15, lum:  0.05 },
    },
    params: { temp: 6, tint: -3, sat: 1.15, contrast: 0.15, exposure: 0 },
  },
  {
    id: 'day-for-night',
    name: 'Day for Night',
    category: 'Cinema',
    icon: '🌙',
    desc: 'Simula noite filmada de dia: azul frio, subexposto',
    wheels: {
      lift:  { x: -0.4,  y:  0.0,  lum: -0.25 },
      gamma: { x: -0.2,  y:  0.0,  lum: -0.15 },
      gain:  { x: -0.1,  y:  0.0,  lum: -0.05 },
    },
    params: { temp: -22, tint: 0, sat: 0.75, contrast: 0.2, exposure: -0.6 },
  },
  {
    id: 'french-new-wave',
    name: 'Nouvelle Vague',
    category: 'Cinema',
    icon: '🇫🇷',
    desc: 'Inspirado no cinema francês dos anos 60: tons pastel frios',
    wheels: {
      lift:  { x: -0.08, y: -0.05, lum:  0.05 },
      gamma: { x: -0.05, y: -0.02, lum:  0.02 },
      gain:  { x:  0.0,  y:  0.0,  lum:  0.0  },
    },
    params: { temp: -12, tint: 5, sat: 0.80, contrast: -0.10, exposure: 0.1 },
  },

  // ── Film Stock ──
  {
    id: 'kodak-vision3',
    name: 'Kodak Vision 3',
    category: 'Film Stock',
    icon: '🎥',
    desc: 'Emulsão 500T — sombras azuis, meios-tons neutros, altas quentes',
    wheels: {
      lift:  { x: -0.15, y:  0.0,  lum: -0.08 },
      gamma: { x:  0.02, y:  0.0,  lum:  0.02 },
      gain:  { x:  0.12, y: -0.05, lum:  0.04 },
    },
    params: { temp: 4, tint: 2, sat: 1.05, contrast: 0.10, exposure: 0 },
  },
  {
    id: 'fuji-eterna',
    name: 'Fuji Eterna',
    category: 'Film Stock',
    icon: '🌿',
    desc: 'Saturação equilibrada, verdes levemente dourados, tom suave',
    wheels: {
      lift:  { x:  0.0,  y: -0.10, lum: -0.03 },
      gamma: { x:  0.05, y: -0.05, lum:  0.0  },
      gain:  { x:  0.08, y: -0.05, lum:  0.04 },
    },
    params: { temp: 8, tint: -6, sat: 1.10, contrast: 0.08, exposure: 0.05 },
  },
  {
    id: 'agfa-vista',
    name: 'Agfa Vista 400',
    category: 'Film Stock',
    icon: '🌸',
    desc: 'Tons quentes pastel, ligeiro fade, vibe nostálgico',
    wheels: {
      lift:  { x:  0.12, y: -0.08, lum:  0.12 },
      gamma: { x:  0.08, y: -0.04, lum:  0.05 },
      gain:  { x:  0.0,  y:  0.0,  lum:  0.0  },
    },
    params: { temp: 16, tint: -4, sat: 0.88, contrast: -0.15, exposure: 0.15 },
  },

  // ── Mood ──
  {
    id: 'moonlit',
    name: 'Luar',
    category: 'Mood',
    icon: '🌕',
    desc: 'Noite azul-prateada, atmosfera etérea',
    wheels: {
      lift:  { x: -0.20, y:  0.0,  lum: -0.10 },
      gamma: { x: -0.08, y:  0.0,  lum:  0.0  },
      gain:  { x: -0.05, y:  0.0,  lum:  0.05 },
    },
    params: { temp: -18, tint: 0, sat: 0.70, contrast: 0.20, exposure: -0.2 },
  },
  {
    id: 'golden-hour',
    name: 'Hora Dourada',
    category: 'Mood',
    icon: '🌅',
    desc: 'Pôr do sol intenso: altas laranja-ouro, sombras cobre',
    wheels: {
      lift:  { x:  0.20, y: -0.10, lum:  0.0  },
      gamma: { x:  0.15, y: -0.08, lum:  0.05 },
      gain:  { x:  0.25, y: -0.12, lum:  0.08 },
    },
    params: { temp: 24, tint: -5, sat: 1.20, contrast: 0.12, exposure: 0.05 },
  },
  {
    id: 'neon-noir',
    name: 'Neon Noir',
    category: 'Mood',
    icon: '🌆',
    desc: 'Cyberpunk urbano: sombras profundas, pops de néon magenta/ciano',
    wheels: {
      lift:  { x: -0.30, y:  0.20, lum: -0.20 },
      gamma: { x:  0.05, y:  0.05, lum: -0.05 },
      gain:  { x:  0.0,  y:  0.15, lum:  0.05 },
    },
    params: { temp: -10, tint: 12, sat: 1.30, contrast: 0.40, exposure: -0.15 },
  },
  {
    id: 'apocalypse',
    name: 'Pós-Apocalipse',
    category: 'Mood',
    icon: '🌋',
    desc: 'Desolado e árido — verdes suprimidos, amarelo-ferrugem dominante',
    wheels: {
      lift:  { x:  0.15, y:  0.08, lum: -0.08 },
      gamma: { x:  0.10, y:  0.06, lum:  0.0  },
      gain:  { x:  0.08, y:  0.04, lum:  0.05 },
    },
    params: { temp: 20, tint: 8, sat: 0.80, contrast: 0.25, exposure: -0.05 },
  },

  // ── Analog / Vintage ──
  {
    id: 'super8',
    name: 'Super 8',
    category: 'Analog',
    icon: '📽',
    desc: 'Filme doméstico dos anos 70: grão, fade, bege-amarelado',
    wheels: {
      lift:  { x:  0.20, y: -0.05, lum:  0.18 },
      gamma: { x:  0.12, y: -0.03, lum:  0.10 },
      gain:  { x:  0.05, y:  0.0,  lum:  0.0  },
    },
    params: { temp: 18, tint: -3, sat: 0.72, contrast: -0.12, exposure: 0.12 },
  },
  {
    id: 'vhs',
    name: 'VHS',
    category: 'Analog',
    icon: '📼',
    desc: 'Fita magnética degradada: cores sangradas, contraste baixo',
    wheels: {
      lift:  { x:  0.05, y: -0.05, lum:  0.10 },
      gamma: { x:  0.02, y: -0.02, lum:  0.05 },
      gain:  { x:  0.0,  y:  0.0,  lum:  0.0  },
    },
    params: { temp: 5, tint: -4, sat: 0.85, contrast: -0.20, exposure: 0.08 },
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    category: 'Analog',
    icon: '📷',
    desc: 'Instantânea vintage: azul-esverdeado nas sombras, fade suave',
    wheels: {
      lift:  { x: -0.05, y: -0.12, lum:  0.15 },
      gamma: { x: -0.02, y: -0.06, lum:  0.08 },
      gain:  { x:  0.0,  y:  0.0,  lum:  0.0  },
    },
    params: { temp: -6, tint: -8, sat: 0.82, contrast: -0.08, exposure: 0.15 },
  },

  // ── Digital / Modern ──
  {
    id: 'clean-log',
    name: 'Clean Look',
    category: 'Digital',
    icon: '✨',
    desc: 'Moderno e limpo: neutro, levemente elevado, sem cast',
    wheels: {
      lift:  { x:  0.0, y:  0.0, lum:  0.0  },
      gamma: { x:  0.0, y:  0.0, lum:  0.0  },
      gain:  { x:  0.0, y:  0.0, lum:  0.02 },
    },
    params: { temp: 0, tint: 0, sat: 1.05, contrast: 0.05, exposure: 0.05 },
  },
  {
    id: 'hypebeast',
    name: 'Hypebeast',
    category: 'Digital',
    icon: '🔥',
    desc: 'Altas luzes queimadas, sombras ciano, saturação agressiva',
    wheels: {
      lift:  { x: -0.25, y:  0.0,  lum: -0.05 },
      gamma: { x:  0.0,  y:  0.0,  lum:  0.05 },
      gain:  { x:  0.15, y: -0.10, lum:  0.15 },
    },
    params: { temp: 8, tint: -5, sat: 1.35, contrast: 0.30, exposure: 0.10 },
  },

  // ── P&B ──
  {
    id: 'pb-cinema',
    name: 'P&B Cinema',
    category: 'P&B',
    icon: '⚫',
    desc: 'Preto e branco de alto contraste — estilo Bergman/Kubrick',
    wheels: {
      lift:  { x:  0.0, y:  0.0, lum: -0.08 },
      gamma: { x:  0.0, y:  0.0, lum:  0.0  },
      gain:  { x:  0.0, y:  0.0, lum:  0.05 },
    },
    params: { temp: 0, tint: 0, sat: 0, contrast: 0.30, exposure: 0 },
  },
  {
    id: 'pb-warm',
    name: 'P&B Quente',
    category: 'P&B',
    icon: '🤎',
    desc: 'Sépia suave, tom antigo como foto de jornal dos anos 40',
    wheels: {
      lift:  { x:  0.08, y: -0.02, lum: -0.05 },
      gamma: { x:  0.05, y: -0.01, lum:  0.02 },
      gain:  { x:  0.0,  y:  0.0,  lum:  0.0  },
    },
    params: { temp: 15, tint: 0, sat: 0.08, contrast: 0.10, exposure: 0 },
  },
  {
    id: 'pb-cool',
    name: 'P&B Frio',
    category: 'P&B',
    icon: '🩶',
    desc: 'Tom azul-aço, moderno — como fotografia editorial contemporânea',
    wheels: {
      lift:  { x: -0.08, y:  0.0, lum: -0.05 },
      gamma: { x: -0.04, y:  0.0, lum:  0.0  },
      gain:  { x:  0.0,  y:  0.0, lum:  0.03 },
    },
    params: { temp: -12, tint: 0, sat: 0.05, contrast: 0.25, exposure: 0.05 },
  },
];

// ─── COLOR WHEEL COMPONENT ────────────────────────────────────────────────────

function ColorWheel({ label, value, onChange, size = 120 }) {
  const discRef = React.useRef(null);
  const valueRef = React.useRef(value);
  React.useEffect(() => { valueRef.current = value; }, [value]);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const radius = size / 2;
  // puck pos from -1..1 to px within disc
  const puckX = clamp(value.x, -1, 1) * radius * 0.82 + radius;
  const puckY = -clamp(value.y, -1, 1) * radius * 0.82 + radius;

  function handlePan(e) {
    e.preventDefault();
    const rect = discRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const r  = rect.width / 2;

    function move(ev) {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      let dx = (clientX - cx) / r;
      let dy = -(clientY - cy) / r;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1) { dx /= len; dy /= len; }
      dx = Math.round(dx * 1000) / 1000;
      dy = Math.round(dy * 1000) / 1000;
      onChange({ ...valueRef.current, x: dx, y: dy });
    }
    function up() {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    }
    window.addEventListener('mousemove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    move(e);
  }

  return (
    <div className="cw-wrap">
      <div className="cw-label">{label}</div>
      <div
        className="cw-disc"
        ref={discRef}
        style={{ width: size, height: size }}
        onMouseDown={handlePan}
        onTouchStart={handlePan}
      >
        {/* hue ring */}
        <div className="cw-ring" />
        {/* grey center */}
        <div className="cw-center" />
        {/* puck */}
        <div
          className="cw-puck"
          style={{ left: puckX - 7, top: puckY - 7 }}
        />
      </div>
      {/* Luminance slider */}
      <div className="cw-lum-row">
        <span className="cw-lum-icon">☀</span>
        <input
          type="range" min="-1" max="1" step="0.01"
          value={value.lum}
          className="cw-lum-slider"
          onChange={e => onChange({ ...value, lum: parseFloat(e.target.value) })}
        />
        <span className="cw-lum-val">{value.lum >= 0 ? '+' : ''}{(value.lum * 100).toFixed(0)}</span>
      </div>
      <button
        className="cw-reset"
        onClick={() => onChange({ x: 0, y: 0, lum: 0 })}
      >↺ Reset</button>
    </div>
  );
}

// ─── CURVE EDITOR ────────────────────────────────────────────────────────────

function CurveEditor({ channel, points, onChange }) {
  const canvasRef = React.useRef(null);
  const SIZE = 200;
  const PAD  = 16;
  const INNER = SIZE - PAD * 2;
  const dragIdx = React.useRef(null);

  const channelColors = {
    all: 'rgba(255,255,255,0.9)',
    r:   'rgba(255, 90, 90, 0.95)',
    g:   'rgba(80, 220, 100, 0.95)',
    b:   'rgba(80, 150, 255, 0.95)',
  };
  const color = channelColors[channel] || channelColors.all;

  // Draw curve on canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Background
    ctx.fillStyle = 'rgba(10,10,10,0.95)';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const pos = PAD + (INNER * i) / 4;
      ctx.beginPath(); ctx.moveTo(PAD, pos); ctx.lineTo(SIZE - PAD, pos); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pos, PAD); ctx.lineTo(pos, SIZE - PAD); ctx.stroke();
    }

    // Diagonal reference
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD, SIZE - PAD);
    ctx.lineTo(SIZE - PAD, PAD);
    ctx.stroke();
    ctx.setLineDash([]);

    // Compute LUT and draw curve
    const lut = monotoneCubicLUT(points);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    for (let px = 0; px <= INNER; px++) {
      const t = px / INNER;
      const idx = Math.round(t * (lut.length - 1));
      const vy = lut[idx];
      const cx = PAD + px;
      const cy = SIZE - PAD - vy * INNER;
      if (px === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Control points
    const sorted = [...points].sort((a, b) => a.x - b.x);
    for (const p of sorted) {
      const cx = PAD + p.x * INNER;
      const cy = SIZE - PAD - p.y * INNER;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [points, channel]);

  function ptFromEvent(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const px = Math.max(0, Math.min(INNER, clientX - rect.left - PAD));
    const py = Math.max(0, Math.min(INNER, clientY - rect.top  - PAD));
    return { x: px / INNER, y: 1 - py / INNER };
  }

  function nearestPt(pt) {
    let best = -1, bestD = 0.04;
    points.forEach((p, i) => {
      const d = Math.hypot(p.x - pt.x, p.y - pt.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function onMouseDown(e) {
    e.preventDefault();
    const pt = ptFromEvent(e);
    const idx = nearestPt(pt);
    if (idx >= 0) {
      dragIdx.current = idx;
    } else {
      // Add new point (never remove anchors at 0,1)
      const newPts = [...points, { x: Math.round(pt.x * 1000) / 1000, y: Math.round(pt.y * 1000) / 1000 }];
      dragIdx.current = newPts.length - 1;
      onChange(newPts);
      return;
    }

    function move(ev) {
      const p = ptFromEvent(ev);
      const newPts = points.map((pt2, i) => {
        if (i !== dragIdx.current) return pt2;
        // Anchors at edges: only move y
        if (pt2.x === 0) return { x: 0, y: Math.round(p.y * 1000) / 1000 };
        if (pt2.x === 1) return { x: 1, y: Math.round(p.y * 1000) / 1000 };
        return { x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 };
      });
      onChange(newPts);
    }
    function up() {
      dragIdx.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function onDoubleClick(e) {
    const pt = ptFromEvent(e);
    const idx = nearestPt(pt);
    // Don't remove anchors
    if (idx >= 0 && points[idx].x !== 0 && points[idx].x !== 1) {
      onChange(points.filter((_, i) => i !== idx));
    }
  }

  const channelLabels = { all: 'Todos', r: 'R', g: 'G', b: 'B' };

  return (
    <div className="curve-editor">
      <div className="curve-label">{channelLabels[channel] || channel}</div>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="curve-canvas"
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
        onDoubleClick={onDoubleClick}
        style={{ cursor: 'crosshair' }}
      />
      <button
        className="curve-reset"
        onClick={() => onChange(DEFAULT_CURVE)}
      >↺</button>
    </div>
  );
}

// ─── STUDIO SECTION (full professional) ──────────────────────────────────────

const SLOG3_LUT_URL = 'luts/Slog3-S-Gamut3.Cine_To_s709_V200.cube';

const NEUTRAL_WHEEL = { x: 0, y: 0, lum: 0 };
const NEUTRAL_WHEELS = { lift: { ...NEUTRAL_WHEEL }, gamma: { ...NEUTRAL_WHEEL }, gain: { ...NEUTRAL_WHEEL } };
const NEUTRAL_SLIDERS = { temp: 0, tint: 0, sat: 1, contrast: 0, exposure: 0 };
const NEUTRAL_CURVES = {
  all: [...DEFAULT_CURVE],
  r:   [...DEFAULT_CURVE],
  g:   [...DEFAULT_CURVE],
  b:   [...DEFAULT_CURVE],
};

function StudioSection() {
  const { Reveal } = window;

  // Image state
  const [imgSrc, setImgSrc] = React.useState(null);
  const [originalData, setOriginalData] = React.useState(null);
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);

  // Log conversion
  const [logEnabled, setLogEnabled] = React.useState(false);
  const [logLUT, setLogLUT] = React.useState(null);
  const [logLoading, setLogLoading] = React.useState(false);

  // Color controls
  const [wheels, setWheels] = React.useState(NEUTRAL_WHEELS);
  const [sliders, setSliders] = React.useState(NEUTRAL_SLIDERS);
  const [curves, setCurves] = React.useState(NEUTRAL_CURVES);

  // Pixel effects (from studio.jsx)
  const [grain, setGrain] = React.useState(0);
  const [prism, setPrism] = React.useState(0);
  const [vignette, setVignette] = React.useState(0);
  const [bloom, setBloom] = React.useState(false);

  // View
  const [viewMode, setViewMode] = React.useState('after'); // 'before'|'after'|'split'
  const [activeTab, setActiveTab] = React.useState('wheels'); // wheels|curves|basic|effects
  const [curveChannel, setCurveChannel] = React.useState('all');

  // Preset
  const [activePreset, setActivePreset] = React.useState(null);
  const [presetCategory, setPresetCategory] = React.useState('Todos');

  // Canvas refs
  const canvasRef = React.useRef(null);
  const splitRef = React.useRef(null);
  const [splitPos, setSplitPos] = React.useState(50); // percent
  const renderReqRef = React.useRef(null);

  // Toast
  const [toast, setToast] = React.useState(null);
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // ── Image upload ──
  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setImgSrc(url);
  }

  React.useEffect(() => {
    if (!imgSrc) return;
    const img = new Image();
    img.onload = () => {
      const offscreen = document.createElement('canvas');
      const maxW = 1920, maxH = 1080;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
      offscreen.width = w; offscreen.height = h;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      setOriginalData(ctx.getImageData(0, 0, w, h));
    };
    img.src = imgSrc;
  }, [imgSrc]);

  // ── Log LUT load ──
  async function toggleLog() {
    if (logEnabled) { setLogEnabled(false); return; }
    if (logLUT) { setLogEnabled(true); return; }
    setLogLoading(true);
    try {
      const lut = await loadLUT(SLOG3_LUT_URL);
      setLogLUT(lut);
      setLogEnabled(true);
      showToast('S-Log3 → Rec.709 ativado');
    } catch (e) {
      showToast('Erro ao carregar LUT de conversão');
    }
    setLogLoading(false);
  }

  // ── Render pipeline ──
  React.useEffect(() => {
    if (!originalData || !canvasRef.current) return;
    if (renderReqRef.current) cancelAnimationFrame(renderReqRef.current);
    renderReqRef.current = requestAnimationFrame(() => renderFrame());
  }, [originalData, logEnabled, logLUT, wheels, sliders, curves, grain, prism, vignette, bloom, viewMode, splitPos]);

  function renderFrame() {
    if (!originalData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const { width, height } = originalData;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Clone original
    const workData = new ImageData(new Uint8ClampedArray(originalData.data), width, height);

    // 2. Log → Rec.709
    if (logEnabled && logLUT) {
      applyLUT3D(workData, logLUT.data, logLUT.size);
    }

    // 3. Color wheels + basic sliders → profile → per-pixel grade
    const profile = buildProfileFromWheels(wheels, sliders);
    const d = workData.data;
    const { colorGradePixel } = window;
    if (colorGradePixel) {
      for (let i = 0; i < d.length; i += 4) {
        const [nr, ng, nb] = colorGradePixel(d[i], d[i+1], d[i+2], profile);
        d[i] = nr; d[i+1] = ng; d[i+2] = nb;
      }
    }

    // 4. Curves
    const allLUT = monotoneCubicLUT(curves.all);
    const rLUT   = monotoneCubicLUT(curves.r);
    const gLUT   = monotoneCubicLUT(curves.g);
    const bLUT   = monotoneCubicLUT(curves.b);
    applyCurves(workData, allLUT, rLUT, gLUT, bLUT);

    // 5. Grain (amount is 0-1, function expects 0-100)
    if (grain > 0 && window.applyGrainEffect) {
      window.applyGrainEffect(workData, grain * 100);
    }

    // 6. Prism (amount is 0-1, function expects pixel shift)
    if (prism > 0 && window.applyPrismEffect) {
      window.applyPrismEffect(workData, Math.round(prism * 12));
    }

    // ── Draw to canvas ──
    if (viewMode === 'before') {
      ctx.putImageData(originalData, 0, 0);
    } else if (viewMode === 'after') {
      ctx.putImageData(workData, 0, 0);
    } else {
      // Split view
      const splitX = Math.round(width * splitPos / 100);
      // Draw full "after" then clip "before" on left
      ctx.putImageData(workData, 0, 0);
      const beforeData = new ImageData(new Uint8ClampedArray(originalData.data), width, height);
      ctx.putImageData(beforeData, 0, 0, 0, 0, splitX, height);
      // Split line
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, height);
      ctx.stroke();
      // Labels
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(8, 8, 80, 24);
      ctx.fillRect(splitX + 8, 8, 80, 24);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('ORIGINAL', 16, 25);
      ctx.fillText('GRADED', splitX + 16, 25);
    }

    // 7. Canvas effects (compositing — need ctx + dimensions)
    if (vignette > 0 && window.applyVignetteEffect) {
      window.applyVignetteEffect(ctx, width, height, vignette * 100, 30);
    }
    if (bloom && window.applyBloomEffect) {
      window.applyBloomEffect(ctx, width, height, 60, 8, 0);
    }
  }

  // ── Split drag ──
  function onSplitDrag(e) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    function move(ev) {
      const rect = canvas.getBoundingClientRect();
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
      setSplitPos(pct);
    }
    function up() {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  }

  // ── Preset apply ──
  function applyPreset(preset) {
    setActivePreset(preset.id);
    setWheels({ ...preset.wheels });
    setSliders({ ...preset.params });
    setCurves(NEUTRAL_CURVES);
    showToast(`"${preset.name}" aplicado`);
  }

  // ── Reset all ──
  function resetAll() {
    setWheels(NEUTRAL_WHEELS);
    setSliders(NEUTRAL_SLIDERS);
    setCurves(NEUTRAL_CURVES);
    setGrain(0);
    setPrism(0);
    setVignette(0);
    setBloom(false);
    setLogEnabled(false);
    setActivePreset(null);
    showToast('Reset completo');
  }

  // ── Export .cube ──
  function exportCube() {
    if (!window.generateCubeContent || !window.downloadCube) return;
    const profile = buildProfileFromWheels(wheels, sliders);
    const content = window.generateCubeContent(profile, 'grading-custom', 17);
    window.downloadCube(content, 'grading-custom.cube');
    showToast('.cube exportado com sucesso!');
  }

  // ── Preset categories ──
  const allCategories = ['Todos', ...Array.from(new Set(PROFESSIONAL_PRESETS.map(p => p.category)))];
  const visiblePresets = presetCategory === 'Todos'
    ? PROFESSIONAL_PRESETS
    : PROFESSIONAL_PRESETS.filter(p => p.category === presetCategory);

  // ── Drag & drop upload ──
  function onDrop(e) {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  // ── Slider helper ──
  function Slider({ label, min, max, step, value, onChange, unit = '' }) {
    return (
      <div className="ct-slider-row">
        <span className="ct-slider-label">{label}</span>
        <input
          type="range" min={min} max={max} step={step}
          value={value}
          className="studio-range ct-range"
          onChange={e => onChange(parseFloat(e.target.value))}
        />
        <span className="ct-slider-val">{value >= 0 && min < 0 ? '+' : ''}{typeof value === 'number' ? value.toFixed(step < 0.1 ? 2 : 1) : value}{unit}</span>
      </div>
    );
  }

  return (
    <section className="studio-section" id="studio">
      <div className="section-head center" style={{ marginBottom: '2.5rem' }}>
        <Reveal>
          <div className="eyebrow"><span className="dot" />Studio de Cor</div>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="display section-title">
            Grade <span className="accent">profissional</span><br />
            diretamente no browser.
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="section-lede">
            Rodas de cor, curvas Bézier, conversão Log → Rec.709 e presets cinematográficos.
            Exporte em .cube para usar em qualquer editor.
          </p>
        </Reveal>
      </div>

      <div className="ct-app">
        {/* ── LEFT: Canvas ── */}
        <div className="ct-canvas-col">
          {/* Log conversion toolbar */}
          <div className="ct-toolbar">
            <button
              className={`ct-log-btn ${logEnabled ? 'active' : ''}`}
              onClick={toggleLog}
              disabled={logLoading}
            >
              {logLoading ? '⏳ Carregando LUT…' : logEnabled ? '✓ S-Log3 → Rec.709' : '⟳ Ativar Log → Rec.709'}
            </button>
            <div className="ct-view-tabs">
              {['before', 'split', 'after'].map(v => (
                <button
                  key={v}
                  className={`ct-view-tab ${viewMode === v ? 'active' : ''}`}
                  onClick={() => setViewMode(v)}
                >
                  {v === 'before' ? 'Antes' : v === 'after' ? 'Depois' : 'Dividido'}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas / upload zone */}
          <div
            className={`ct-canvas-wrap ${!imgSrc ? 'ct-upload' : ''} ${isDraggingFile ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDraggingFile(true); }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={onDrop}
          >
            {!imgSrc ? (
              <label className="ct-upload-label">
                <div className="ct-upload-icon">🎞</div>
                <div className="ct-upload-title">Arraste uma imagem ou clique para carregar</div>
                <div className="ct-upload-sub">JPG, PNG, WEBP — até 20MP</div>
                <input
                  type="file" accept="image/*" hidden
                  onChange={e => handleFile(e.target.files[0])}
                />
              </label>
            ) : (
              <div className="ct-canvas-inner" style={{ position: 'relative' }}>
                <canvas ref={canvasRef} className="ct-canvas" />
                {viewMode === 'split' && (
                  <div
                    className="ct-split-handle"
                    style={{ left: `${splitPos}%` }}
                    onMouseDown={onSplitDrag}
                    onTouchStart={onSplitDrag}
                  >
                    <div className="ct-split-knob">⇔</div>
                  </div>
                )}
                <label className="ct-reupload" title="Trocar imagem">
                  📁
                  <input type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files[0])} />
                </label>
              </div>
            )}
          </div>

          {/* Export / reset */}
          <div className="ct-actions">
            <button className="btn btn-primary ct-export" onClick={exportCube} disabled={!originalData}>
              ↓ Exportar .cube
            </button>
            <button className="btn btn-ghost ct-reset" onClick={resetAll}>
              ↺ Reset
            </button>
          </div>
        </div>

        {/* ── RIGHT: Controls ── */}
        <div className="ct-controls-col">
          {/* Tab nav */}
          <div className="ct-tabs">
            {[
              { id: 'wheels',  label: 'Rodas'   },
              { id: 'curves',  label: 'Curvas'  },
              { id: 'basic',   label: 'Básico'  },
              { id: 'effects', label: 'Efeitos' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`ct-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── WHEELS TAB ── */}
          {activeTab === 'wheels' && (
            <div className="ct-panel ct-wheels-panel">
              <div className="ct-wheels-row">
                {['lift', 'gamma', 'gain'].map(w => (
                  <ColorWheel
                    key={w}
                    label={w.charAt(0).toUpperCase() + w.slice(1)}
                    value={wheels[w]}
                    onChange={v => setWheels(prev => ({ ...prev, [w]: v }))}
                    size={110}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── CURVES TAB ── */}
          {activeTab === 'curves' && (
            <div className="ct-panel ct-curves-panel">
              <div className="ct-curve-channels">
                {['all', 'r', 'g', 'b'].map(ch => (
                  <button
                    key={ch}
                    className={`ct-ch-btn ct-ch-${ch} ${curveChannel === ch ? 'active' : ''}`}
                    onClick={() => setCurveChannel(ch)}
                  >
                    {ch === 'all' ? '◎' : ch.toUpperCase()}
                  </button>
                ))}
              </div>
              <CurveEditor
                channel={curveChannel}
                points={curves[curveChannel]}
                onChange={pts => setCurves(prev => ({ ...prev, [curveChannel]: pts }))}
              />
              <button
                className="btn btn-ghost ct-curves-reset-all"
                onClick={() => setCurves(NEUTRAL_CURVES)}
              >
                Resetar todas as curvas
              </button>
            </div>
          )}

          {/* ── BASIC TAB ── */}
          {activeTab === 'basic' && (
            <div className="ct-panel ct-basic-panel">
              <div className="ct-section-label">Exposição</div>
              <Slider label="Exposição"  min={-2}   max={2}   step={0.01} value={sliders.exposure}  onChange={v => setSliders(s => ({ ...s, exposure: v }))} unit=" EV" />
              <Slider label="Contraste"  min={-1}   max={1}   step={0.01} value={sliders.contrast}  onChange={v => setSliders(s => ({ ...s, contrast: v }))} />
              <div className="ct-section-label" style={{ marginTop: 16 }}>Cor</div>
              <Slider label="Temperatura" min={-50} max={50}  step={1}    value={sliders.temp}      onChange={v => setSliders(s => ({ ...s, temp: v }))} />
              <Slider label="Matiz"       min={-50} max={50}  step={1}    value={sliders.tint}      onChange={v => setSliders(s => ({ ...s, tint: v }))} />
              <Slider label="Saturação"   min={0}   max={2}   step={0.01} value={sliders.sat}       onChange={v => setSliders(s => ({ ...s, sat: v }))} />
            </div>
          )}

          {/* ── EFFECTS TAB ── */}
          {activeTab === 'effects' && (
            <div className="ct-panel ct-effects-panel">
              <div className="ct-section-label">Grain &amp; Aberração</div>
              <Slider label="Grão"          min={0} max={1}   step={0.01} value={grain}   onChange={setGrain} />
              <Slider label="Aberr. Cromo." min={0} max={1}   step={0.01} value={prism}   onChange={setPrism} />
              <div className="ct-section-label" style={{ marginTop: 16 }}>Canvas</div>
              <Slider label="Vinheta"       min={0} max={1}   step={0.01} value={vignette} onChange={setVignette} />
              <div className="ct-toggle-row">
                <span>Bloom / Glow</span>
                <button
                  className={`ct-toggle ${bloom ? 'active' : ''}`}
                  onClick={() => setBloom(b => !b)}
                >
                  {bloom ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PRESETS ── */}
      <div className="ct-presets">
        <div className="ct-presets-head">
          <h3 className="ct-presets-title">Presets Profissionais</h3>
          <div className="ct-preset-cats">
            {allCategories.map(cat => (
              <button
                key={cat}
                className={`ct-preset-cat ${presetCategory === cat ? 'active' : ''}`}
                onClick={() => setPresetCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="ct-presets-grid">
          {visiblePresets.map(preset => (
            <button
              key={preset.id}
              className={`ct-preset-card ${activePreset === preset.id ? 'active' : ''}`}
              onClick={() => applyPreset(preset)}
            >
              <div className="ct-preset-icon">{preset.icon}</div>
              <div className="ct-preset-name">{preset.name}</div>
              <div className="ct-preset-cat-label">{preset.category}</div>
              <div className="ct-preset-desc">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="studio-toast visible">{toast}</div>}
    </section>
  );
}

// Override window.StudioSection
Object.assign(window, {
  StudioSection,
  ColorWheel,
  CurveEditor,
  PROFESSIONAL_PRESETS,
  parseCubeLUT,
  loadLUT,
  applyLUT3D,
  monotoneCubicLUT,
  applyCurves,
  buildProfileFromWheels,
});
