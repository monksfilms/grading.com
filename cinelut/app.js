/* ─────────────────────────────────────────────────────────────────
   CineLUT — Lógica principal
   ───────────────────────────────────────────────────────────────── */

// Stills salvos por filme (localStorage)
let savedStills = JSON.parse(localStorage.getItem('cinelut_stills') || '{}');
let currentFilm = null;
let currentCategory = 'all';

// ─────────────────────────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  return [r, g, b];
}

function saveStills() {
  localStorage.setItem('cinelut_stills', JSON.stringify(savedStills));
}

// ─────────────────────────────────────────────────────────────────
// Grid de filmes
// ─────────────────────────────────────────────────────────────────

function renderGrid(cat = 'all') {
  currentCategory = cat;
  const grid = document.getElementById('filmsGrid');
  const films = cat === 'all' ? FILMS : FILMS.filter(f => f.category === cat);

  grid.innerHTML = '';
  films.forEach((film, i) => {
    const stills = savedStills[film.id] || film.stills || [];
    const card = document.createElement('div');
    card.className = 'film-card';
    card.style.animationDelay = `${i * 30}ms`;

    // Gradient de placeholder baseado na paleta
    const gradColors = film.palette.slice(0,3).join(', ');
    const gradient = `linear-gradient(135deg, ${film.palette[0]}, ${film.palette[2]}, ${film.palette[4] || film.palette[0]})`;

    const stillEl = stills.length > 0
      ? `<img class="card-still" src="${stills[0]}" alt="${film.title}" loading="lazy" />`
      : `<div class="card-still-placeholder" style="--gradient:${gradient}"><span>SEM STILL</span></div>`;

    card.innerHTML = `
      <div class="card-palette">${film.palette.map(c => `<span style="background:${c}"></span>`).join('')}</div>
      ${stillEl}
      <div class="card-overlay"><span class="card-overlay-text">Ver LUT</span></div>
      <div class="card-info">
        <div class="card-year-dir">
          <span>${film.year}</span>
          <span class="dot">·</span>
          <span>${film.director}</span>
        </div>
        <h2 class="card-title">${film.title}</h2>
        <p class="card-desc">${film.description}</p>
      </div>
      <div class="card-footer">
        <span class="card-lut-badge">LUT DISPONÍVEL</span>
        <span class="card-dp">${film.dp}</span>
      </div>
    `;

    card.addEventListener('click', () => openModal(film));
    grid.appendChild(card);
  });

  // Atualiza contagens
  document.getElementById('count-all').textContent = FILMS.length;
  document.getElementById('count-wes-anderson').textContent = FILMS.filter(f=>f.category==='wes-anderson').length;
  document.getElementById('count-outros').textContent = FILMS.filter(f=>f.category==='outros').length;
}

// ─────────────────────────────────────────────────────────────────
// Preview do LUT no canvas
// ─────────────────────────────────────────────────────────────────

function applyScurve(v, s) {
  v = Math.max(0, Math.min(1, v));
  const smooth = v * v * (3 - 2 * v);
  return v + (smooth - v) * s;
}

function applyLGG(v, lift, gamma, gain) {
  v = Math.max(0, Math.min(1, v * gain + lift));
  return gamma > 0 ? Math.max(0, Math.min(1, Math.pow(v, 1/gamma))) : v;
}

function colorGradePixel(r, g, b, p) {
  // Temperatura
  const temp = p.temperature || 0;
  r = Math.max(0, Math.min(1, r + temp * 0.08));
  b = Math.max(0, Math.min(1, b - temp * 0.08));

  // Tint
  const tint = p.tint || 0;
  g = Math.max(0, Math.min(1, g + tint * 0.06));

  // Lift/Gamma/Gain
  const lift  = p.lift  || [0,0,0];
  const gamma = p.gamma || [1,1,1];
  const gain  = p.gain  || [1,1,1];
  r = applyLGG(r, lift[0], gamma[0], gain[0]);
  g = applyLGG(g, lift[1], gamma[1], gain[1]);
  b = applyLGG(b, lift[2], gamma[2], gain[2]);

  // Saturação
  const sat = p.saturation !== undefined ? p.saturation : 1;
  const luma = 0.2126*r + 0.7152*g + 0.0722*b;
  r = Math.max(0, Math.min(1, luma + sat*(r - luma)));
  g = Math.max(0, Math.min(1, luma + sat*(g - luma)));
  b = Math.max(0, Math.min(1, luma + sat*(b - luma)));

  // Contraste
  const contrast = p.contrast || 0;
  if (contrast) {
    r = applyScurve(r, contrast);
    g = applyScurve(g, contrast);
    b = applyScurve(b, contrast);
  }

  // Exposure
  const exp = p.exposure || 0;
  if (exp) {
    const f = Math.pow(2, exp);
    r = Math.max(0, Math.min(1, r*f));
    g = Math.max(0, Math.min(1, g*f));
    b = Math.max(0, Math.min(1, b*f));
  }

  return [r, g, b];
}

// Perfis JS espelhando o Python
const PROFILES = {
  "bottle-rocket":        { temperature:0.3,  tint:-0.1,  saturation:0.85, contrast:0.2,  lift:[0.01,0.005,-0.01], gamma:[1.05,1.0,0.95],  gain:[1.05,1.0,0.90] },
  "rushmore":             { temperature:0.2,  tint:-0.15, saturation:0.9,  contrast:0.4,  lift:[0.02,0.0,-0.02],   gamma:[1.05,0.98,0.92], gain:[1.08,1.0,0.88] },
  "royal-tenenbaums":     { temperature:0.15, tint:0.0,   saturation:0.82, contrast:0.3,  lift:[0.01,0.005,0.02],  gamma:[1.02,1.0,1.05],  gain:[1.03,1.0,0.95] },
  "life-aquatic":         { temperature:-0.3, tint:0.1,   saturation:0.9,  contrast:0.25, lift:[-0.01,0.01,0.03],  gamma:[0.95,1.0,1.08],  gain:[0.92,1.0,1.12] },
  "darjeeling-limited":   { temperature:0.5,  tint:-0.2,  saturation:1.1,  contrast:0.35, lift:[0.03,0.0,-0.03],   gamma:[1.08,1.0,0.88],  gain:[1.12,1.02,0.85] },
  "fantastic-mr-fox":     { temperature:0.55, tint:-0.1,  saturation:1.05, contrast:0.2,  lift:[0.02,0.01,-0.02],  gamma:[1.1,1.02,0.9],   gain:[1.15,1.05,0.82] },
  "moonrise-kingdom":     { temperature:0.35, tint:0.15,  saturation:1.0,  contrast:0.15, lift:[0.03,0.03,0.0],    gamma:[1.05,1.08,0.95], gain:[1.05,1.08,0.88], exposure:0.15 },
  "grand-budapest-hotel": { temperature:0.1,  tint:-0.4,  saturation:1.05, contrast:0.45, lift:[0.02,-0.01,0.02],  gamma:[1.05,0.92,1.05], gain:[1.1,0.88,1.0] },
  "isle-of-dogs":         { temperature:0.1,  tint:0.05,  saturation:0.6,  contrast:0.1,  lift:[0.02,0.015,0.005], gamma:[1.02,1.0,0.98],  gain:[1.02,1.0,0.95] },
  "french-dispatch":      { temperature:0.05, tint:0.0,   saturation:0.75, contrast:0.3,  lift:[0.015,0.01,0.005], gamma:[1.02,1.0,0.98],  gain:[1.03,1.0,0.95], exposure:0.05 },
  "asteroid-city":        { temperature:0.6,  tint:-0.05, saturation:0.95, contrast:0.2,  lift:[0.03,0.02,-0.01],  gamma:[1.08,1.05,0.92], gain:[1.12,1.05,0.88], exposure:0.1 },
  "joker":                { temperature:-0.1, tint:0.35,  saturation:0.75, contrast:0.55, lift:[-0.02,0.02,-0.02], gamma:[0.92,1.05,0.92], gain:[0.9,1.08,0.88] },
  "blade-runner":         { temperature:0.4,  tint:-0.1,  saturation:0.8,  contrast:0.6,  lift:[0.02,0.0,-0.03],   gamma:[1.1,0.95,0.88],  gain:[1.15,0.95,0.75] },
  "blade-runner-2049":    { temperature:0.45, tint:-0.05, saturation:0.72, contrast:0.5,  lift:[0.02,0.01,-0.02],  gamma:[1.08,1.0,0.9],   gain:[1.12,1.0,0.82] },
  "o-farol":              { temperature:-0.25, tint:-0.1, saturation:0.0,  contrast:0.75, lift:[-0.02,-0.02,0.01], gamma:[0.88,0.88,0.92], gain:[1.05,1.05,1.08], exposure:-0.05 },
};

function drawLutPreview(canvas, filmId) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const profile = PROFILES[filmId];
  if (!profile) return;

  // Linha 1: gradiente horizontal neutro (preto → branco)
  // Linha 2: gradiente neutro com LUT aplicado
  // Linha 3: espectro de cores com LUT aplicado
  const rowH = Math.floor(H / 3);

  for (let x = 0; x < W; x++) {
    const t = x / (W - 1);

    // Linha 1 — original (cinza)
    const g = Math.round(t * 255);
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(x, 0, 1, rowH);

    // Linha 2 — cinza + LUT
    const [ro, go, bo] = colorGradePixel(t, t, t, profile);
    ctx.fillStyle = `rgb(${Math.round(ro*255)},${Math.round(go*255)},${Math.round(bo*255)})`;
    ctx.fillRect(x, rowH, 1, rowH);

    // Linha 3 — espectro de cores + LUT
    const hue = t * 360;
    const [sr, sg, sb] = hslToRgb(hue, 0.7, 0.5);
    const [sr2, sg2, sb2] = colorGradePixel(sr, sg, sb, profile);
    ctx.fillStyle = `rgb(${Math.round(sr2*255)},${Math.round(sg2*255)},${Math.round(sb2*255)})`;
    ctx.fillRect(x, rowH * 2, 1, rowH);
  }

  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('ORIGINAL', 8, rowH - 6);
  ctx.fillText('GRADED', 8, rowH*2 - 6);
  ctx.fillText('ESPECTRO GRADED', 8, rowH*3 - 6);
}

function hslToRgb(h, s, l) {
  h /= 360;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q-p)*6*t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q-p)*(2/3-t)*6;
      return p;
    };
    const q = l < 0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l - q;
    r = hue2rgb(p, q, h+1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h-1/3);
  }
  return [r, g, b];
}

// ─────────────────────────────────────────────────────────────────
// Modal de filme
// ─────────────────────────────────────────────────────────────────

const EFFECT_ICONS = {
  "Noise":    "🎞",
  "Grain":    "🎞",
  "Glow":     "✨",
  "Vignette": "⬛",
  "Sharpen":  "🔲",
  "Crop":     "✂️",
  "Blur":     "🌫",
  "default":  "⚙️"
};

function getEffectIcon(name) {
  for (const [key, icon] of Object.entries(EFFECT_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return EFFECT_ICONS.default;
}

function renderEffects(film) {
  const section = document.getElementById('effectsSection');
  const list = document.getElementById('modalEffects');
  const effects = film.effects || [];

  if (!effects.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  list.innerHTML = effects.map(fx => `
    <div class="effect-row">
      <div class="effect-icon">${getEffectIcon(fx.name)}</div>
      <div class="effect-body">
        <div class="effect-name">${fx.name}</div>
        <div class="effect-param">${fx.param}</div>
        ${fx.note ? `<div class="effect-note">${fx.note}</div>` : ''}
      </div>
      <div class="effect-value">${fx.value}</div>
    </div>
  `).join('');
}

function openModal(film) {
  currentFilm = film;
  const overlay = document.getElementById('modalOverlay');

  document.getElementById('modalYear').textContent = film.year;
  document.getElementById('modalDirector').textContent = film.director;
  document.getElementById('modalDp').textContent = `DP: ${film.dp}`;
  document.getElementById('modalTitle').textContent = film.title;
  document.getElementById('modalDescription').textContent = film.description;

  // Paleta
  const paletteEl = document.getElementById('modalPalette');
  paletteEl.innerHTML = film.palette.map(c => `<span style="background:${c}" title="${c}"></span>`).join('');

  // Stills
  renderStills(film);

  // Vídeo ref
  const videoEl = document.getElementById('modalVideoRef');
  videoEl.href = film.videoRef || '#';
  videoEl.textContent = '';
  videoEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Ver trailer / referência`;

  // Efeitos recomendados
  renderEffects(film);

  // Download
  const dlEl = document.getElementById('modalDownload');
  dlEl.href = film.lut;
  dlEl.download = `${film.id}.cube`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Preview do LUT
  requestAnimationFrame(() => {
    const canvas = document.getElementById('lutPreviewCanvas');
    drawLutPreview(canvas, film.id);
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  currentFilm = null;
}

function renderStills(film) {
  const stills = savedStills[film.id] || [];
  const grid = document.getElementById('modalStills');
  grid.innerHTML = '';
  stills.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = film.title;
    grid.appendChild(img);
  });
}

// Adicionar stills via upload
document.getElementById('addStillInput').addEventListener('change', function(e) {
  if (!currentFilm) return;
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      if (!savedStills[currentFilm.id]) savedStills[currentFilm.id] = [];
      savedStills[currentFilm.id].push(ev.target.result);
      saveStills();
      renderStills(currentFilm);
      renderGrid(currentCategory); // atualiza o card
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
});

// ─────────────────────────────────────────────────────────────────
// LUT customizado a partir de imagem (no browser)
// ─────────────────────────────────────────────────────────────────

function analyzeImage(imgEl) {
  const canvas = document.getElementById('uploadCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgEl.naturalWidth || imgEl.width;
  canvas.height = imgEl.naturalHeight || imgEl.height;
  ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

  // Amostra de pixels (máximo 10.000 para performance)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const step = Math.max(1, Math.floor(data.length / (4 * 10000)));
  let rSum=0, gSum=0, bSum=0, count=0;

  for (let i=0; i<data.length; i += 4*step) {
    rSum += data[i]/255;
    gSum += data[i+1]/255;
    bSum += data[i+2]/255;
    count++;
  }

  const rAvg = rSum/count, gAvg = gSum/count, bAvg = bSum/count;
  const avgAll = (rAvg+gAvg+bAvg)/3;
  const dev = Math.sqrt(((rAvg-avgAll)**2+(gAvg-avgAll)**2+(bAvg-avgAll)**2));

  const temperature = Math.max(-1, Math.min(1, (rAvg-bAvg)*2));
  const tint = Math.max(-1, Math.min(1, (gAvg - (rAvg+bAvg)/2)*3));
  const saturation = Math.max(0.4, Math.min(1.6, 0.6 + dev*4));

  return {
    temperature,
    tint,
    saturation,
    contrast: 0.3,
    lift:  [rAvg*0.05, gAvg*0.05, bAvg*0.05],
    gamma: [0.9+rAvg*0.2, 0.9+gAvg*0.2, 0.9+bAvg*0.2],
    gain:  [0.85+rAvg*0.3, 0.85+gAvg*0.3, 0.85+bAvg*0.3],
    _raw: { rAvg, gAvg, bAvg }
  };
}

function extractPalette(imgEl, n=5) {
  // Coleta amostras de cores representativas de forma simples
  const canvas = document.getElementById('uploadCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 50; canvas.height = 50;
  ctx.drawImage(imgEl, 0, 0, 50, 50);
  const data = ctx.getImageData(0,0,50,50).data;

  // Divide a imagem em n faixas horizontais e pega a cor média de cada uma
  const colors = [];
  const faixaH = Math.floor(50/n);
  for (let fi=0; fi<n; fi++) {
    let r=0,g=0,b=0,c=0;
    for (let y=fi*faixaH; y<(fi+1)*faixaH && y<50; y++) {
      for (let x=0; x<50; x++) {
        const i=(y*50+x)*4;
        r+=data[i]; g+=data[i+1]; b+=data[i+2]; c++;
      }
    }
    const toHex = v => Math.round(v/c).toString(16).padStart(2,'0');
    colors.push(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
  }
  return colors;
}

function generateCubeContent(profile, name, size=33) {
  const lines = [`# CineLUT — ${name}`, `LUT_3D_SIZE ${size}`, ''];
  const step = 1/(size-1);
  for (let bi=0; bi<size; bi++) {
    for (let gi=0; gi<size; gi++) {
      for (let ri=0; ri<size; ri++) {
        const [ro,go,bo] = colorGradePixel(ri*step, gi*step, bi*step, profile);
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
  a.download = filename.endsWith('.cube') ? filename : filename+'.cube';
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────
// Modal de upload
// ─────────────────────────────────────────────────────────────────

let customProfile = null;

function openUploadModal() {
  document.getElementById('uploadOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeUploadModal() {
  document.getElementById('uploadOverlay').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('uploadFooter').style.display = 'none';
  document.getElementById('uploadZone').style.display = '';
  document.getElementById('uploadImg').src = '';
  customProfile = null;
}

function handleUploadFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = document.getElementById('uploadImg');
    img.onload = () => {
      customProfile = analyzeImage(img);
      const palette = extractPalette(img);

      // Paleta
      const paletteEl = document.getElementById('uploadPalette');
      paletteEl.innerHTML = palette.map(c => `<span style="background:${c}"></span>`).join('');

      document.getElementById('uploadPreview').style.display = '';
      document.getElementById('uploadFooter').style.display = 'flex';
      document.getElementById('uploadZone').style.display = 'none';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// Upload via input
document.getElementById('uploadInput').addEventListener('change', function(e) {
  handleUploadFile(e.target.files[0]);
});

// Drag and drop
const uploadZone = document.getElementById('uploadZone');
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  handleUploadFile(e.dataTransfer.files[0]);
});
uploadZone.addEventListener('click', () => document.getElementById('uploadInput').click());

// Gerar e baixar LUT customizado
document.getElementById('btnGenerateCustom').addEventListener('click', () => {
  if (!customProfile) return;
  const name = document.getElementById('uploadName').value.trim() || 'custom-lut';
  const content = generateCubeContent(customProfile, name);
  downloadCube(content, name);
});

// ─────────────────────────────────────────────────────────────────
// Event listeners globais
// ─────────────────────────────────────────────────────────────────

// Fechar modais
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

document.getElementById('uploadClose').addEventListener('click', closeUploadModal);
document.getElementById('uploadOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeUploadModal(); });

// ESC fecha modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeUploadModal(); }
});

// Botão de upload no header
document.getElementById('btnUpload').addEventListener('click', openUploadModal);

// Filtros de categoria
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGrid(btn.dataset.cat);
  });
});

// ─────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────

renderGrid('all');


/* ═══════════════════════════════════════════════════════════════════
   CUSTOM GRADE STUDIO
   All studio code lives below this line. Does not modify anything
   above — only appends new state and event listeners.
   ═══════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────
// FCP Effects Catalog
// ─────────────────────────────────────────────────────────────────

const FCP_EFFECTS_CATALOG = [
  {
    id: "grain",
    icon: "🎞",
    name: "Film Grain",
    fcp: "Efeitos → Estilizar → Ruído (Noise)",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 100, def: 35, unit: "%" },
      { label: "Tamanho",    key: "size",   min: 0.5, max: 3, def: 1,  unit: "x" }
    ],
    note: "Grão de película analógica. Tipo: Gaussiano."
  },
  {
    id: "bloom",
    icon: "✨",
    name: "Bloom",
    fcp: "Efeitos → Brilho → Bloom",
    params: [
      { label: "Intensidade", key: "amount",  min: 0, max: 100, def: 25, unit: "%" },
      { label: "Raio",        key: "radius",  min: 0, max: 300, def: 80, unit: "px" },
      { label: "Aquecimento", key: "warmth",  min: -1, max: 1,  def: 0,  unit: "" }
    ],
    note: "Suaviza highlights com halo de luz. Ideal para look cinematográfico."
  },
  {
    id: "glow",
    icon: "💫",
    name: "Glow",
    fcp: "Efeitos → Brilho → Brilho (Glow)",
    params: [
      { label: "Quantidade", key: "amount",    min: 0, max: 100, def: 20,  unit: "%" },
      { label: "Raio",       key: "radius",    min: 0, max: 100, def: 15,  unit: "px" },
      { label: "Limiar",     key: "threshold", min: 0, max: 1,   def: 0.7, unit: "" }
    ],
    note: "Halos ao redor de fontes de luz. Use threshold alto (0.6–0.8) para seletividade."
  },
  {
    id: "vignette",
    icon: "⬛",
    name: "Vinheta",
    fcp: "Inspector → Máscara de Forma (oval) → Inverter → Feather + Opacidade",
    params: [
      { label: "Intensidade", key: "amount",  min: 0, max: 100, def: 50, unit: "%" },
      { label: "Suavidade",   key: "feather", min: 0, max: 100, def: 80, unit: "%" }
    ],
    note: "No FCP: Shape Mask oval → Inverter → aumente Feather → reduza opacidade da máscara."
  },
  {
    id: "prism",
    icon: "🌈",
    name: "Aberração Cromática",
    fcp: "Efeitos → Desfoque → Prisma (Prism)",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 30,  def: 3, unit: "px" },
      { label: "Ângulo",     key: "angle",  min: 0, max: 360, def: 0, unit: "°" }
    ],
    note: "Separa canais RGB — efeito de lente analógica ou câmera de filme."
  },
  {
    id: "sharpen",
    icon: "🔲",
    name: "Nitidez (Sharpen)",
    fcp: "Efeitos → Nitidez → Nitidez",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 100, def: 20, unit: "%" }
    ],
    note: "Use com moderação (10–30%). Acima de 40% cria artefatos."
  },
  {
    id: "zoom_blur",
    icon: "💨",
    name: "Desfoque de Zoom",
    fcp: "Efeitos → Desfoque → Desfoque de Zoom",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 100, def: 15, unit: "%" }
    ],
    note: "Efeito de movimento/velocidade. Bom para transições ou cenas de ação."
  },
  {
    id: "old_film",
    icon: "📽",
    name: "Película Antiga",
    fcp: "Efeitos → Estilizar → Filme Antigo (Old Film)",
    params: [
      { label: "Arranhões", key: "scratches", min: 0, max: 100, def: 25, unit: "%" },
      { label: "Poeira",    key: "dust",      min: 0, max: 100, def: 20, unit: "%" },
      { label: "Tremido",   key: "flicker",   min: 0, max: 100, def: 15, unit: "%" }
    ],
    note: "Arranhões, poeira e tremido de película. Combine com Film Grain para resultado analógico completo."
  },
  {
    id: "dazzle",
    icon: "⚡",
    name: "Dazzle (Faíscas de Luz)",
    fcp: "Efeitos → Brilho → Dazzle",
    params: [
      { label: "Quantidade", key: "amount", min: 0, max: 100, def: 30, unit: "%" }
    ],
    note: "Funciona melhor em fontes de luz pontuais e cenas noturnas."
  },
  {
    id: "spot",
    icon: "🔦",
    name: "Spot (Foco de Luz)",
    fcp: "Efeitos → Brilho → Spot",
    params: [
      { label: "Feathering", key: "feather",  min: 0, max: 100, def: 60, unit: "%" },
      { label: "Contraste",  key: "contrast", min: 0, max: 100, def: 50, unit: "%" }
    ],
    note: "Destaca área central escurecendo as bordas. Diferente da vinheta — mais teatral."
  },
  {
    id: "streaks",
    icon: "🌠",
    name: "Streaks (Raios de Luz)",
    fcp: "Efeitos → Brilho → Streaks",
    params: [
      { label: "Quantidade",  key: "amount",    min: 0, max: 100, def: 25, unit: "%" },
      { label: "Ângulo",      key: "angle",     min: 0, max: 360, def: 45, unit: "°" },
      { label: "Espessura",   key: "thickness", min: 0, max: 100, def: 20, unit: "%" }
    ],
    note: "Raios de luz a partir de fontes brilhantes. Efeito anamórfico ao usar Ângulo 0°."
  },
];

// ─────────────────────────────────────────────────────────────────
// Studio state
// ─────────────────────────────────────────────────────────────────

const studioState = {
  // Color grading params (mirrors the profile format used by colorGradePixel)
  params: {
    temperature: 0,
    tint: 0,
    saturation: 1,
    contrast: 0,
    exposure: 0,
    lift:  [0, 0, 0],
    gamma: [1, 1, 1],
    gain:  [1, 1, 1],
  },
  // Effects: { [effectId]: { active: bool, values: { paramKey: value } } }
  effects: {},
  // Canvas / view
  view: 'after',         // 'before' | 'after' | 'split'
  splitX: 0.5,           // 0–1 fraction for split handle position
  imageLoaded: false,
  originalImageData: null,
  canvasW: 0,
  canvasH: 0,
};

// Seed all effect states from catalog defaults
FCP_EFFECTS_CATALOG.forEach(fx => {
  const values = {};
  fx.params.forEach(p => { values[p.key] = p.def; });
  studioState.effects[fx.id] = { active: false, values };
});

// ─────────────────────────────────────────────────────────────────
// Text parser: Portuguese keywords → color params
// ─────────────────────────────────────────────────────────────────

function analyzeDescription(text) {
  const t = text.toLowerCase();
  const delta = {
    temperature: 0,
    tint: 0,
    saturation: 0,    // additive offset from 0
    contrast: 0,
    exposure: 0,
    lift:  [0, 0, 0],
    gamma: [1, 1, 1],
    gain:  [1, 1, 1],
  };

  // Tags for UI feedback: { text, cls }
  const tags = [];
  // Effects to auto-enable: effectId[]
  const suggestFx = [];

  // ── Temperature ──────────────────────────────────────────────
  if (/quente|warm|dourad|laranja|sol\b|verão|sunrise|pôr do sol|por do sol|hora dourada|golden hour/i.test(t)) {
    delta.temperature += 0.3;
    tags.push({ text: '🟠 Tons quentes', cls: 'tag-warm' });
  }
  if (/frio|cool|azul|gelo|inverno|winter/i.test(t)) {
    delta.temperature -= 0.3;
    tags.push({ text: '🔵 Tons frios', cls: 'tag-cool' });
  }

  // ── Look-specific presets ─────────────────────────────────────
  if (/golden hour|hora dourada|pôr do sol|por do sol/i.test(t)) {
    delta.temperature += 0.15; // stacks with warm above
    delta.gain = [1.1, 0.98, 0.85];
    suggestFx.push('bloom');
    tags.push({ text: '🌅 Golden Hour', cls: 'tag-warm' });
  }

  if (/teal\b/i.test(t)) {
    delta.temperature -= 0.2;
    delta.tint += 0.3;
    delta.gain = [1.0, 1.0, 1.1];
    tags.push({ text: '🩵 Teal', cls: 'tag-cool' });
  }

  if (/orange.?teal|teal.?orange|hollywood/i.test(t)) {
    delta.gain = [1.12, 1.0, 0.88];
    delta.lift = [0, 0, 0.05];
    delta.temperature += 0.15;
    delta.tint -= 0.1;
    tags.push({ text: '🎬 Orange & Teal', cls: 'tag-warm' });
  }

  if (/cyberpunk|neon/i.test(t)) {
    delta.tint -= 0.3;
    delta.saturation += 0.2;
    delta.contrast += 0.35;
    suggestFx.push('glow');
    tags.push({ text: '⚡ Cyberpunk/Neon', cls: 'tag-sat' });
  }

  if (/vintage|retro|anos 70|analogi[ck]/i.test(t)) {
    delta.temperature += 0.2;
    delta.saturation -= 0.2;
    delta.lift = [0.02, 0.01, -0.01];
    suggestFx.push('grain');
    tags.push({ text: '📼 Vintage/Retro', cls: 'tag-desat' });
  }

  if (/horror|terror|sombrio/i.test(t)) {
    delta.saturation -= 0.2;
    delta.exposure -= 0.15;
    delta.contrast += 0.25;
    delta.lift = [-0.01, -0.01, 0.02];
    suggestFx.push('vignette');
    tags.push({ text: '🩸 Horror', cls: 'tag-dark' });
  }

  if (/sonhador|dreamy/i.test(t)) {
    delta.exposure += 0.1;
    delta.contrast -= 0.1;
    suggestFx.push('bloom');
    tags.push({ text: '☁️ Sonhador/Dreamy', cls: 'tag-bright' });
  }

  if (/wes anderson|pastel/i.test(t)) {
    delta.temperature += 0.1;
    delta.saturation -= 0.1;
    delta.contrast += 0.1;
    tags.push({ text: '🎨 Wes Anderson/Pastel', cls: 'tag-desat' });
  }

  // ── Saturation ───────────────────────────────────────────────
  if (/desaturado|desbotado|pastel|desbotad/i.test(t)) {
    delta.saturation -= 0.2;
    tags.push({ text: '🩶 Desaturado', cls: 'tag-desat' });
  }
  if (/vibrante|intenso|saturado/i.test(t)) {
    delta.saturation += 0.2;
    tags.push({ text: '🔴 Saturado/Vibrante', cls: 'tag-sat' });
  }
  if (/preto e branco|p&b|monocromatico|monocromático|black.?and.?white|b&w/i.test(t)) {
    // force saturation to 0 (absolute)
    delta.saturation = -1; // will be applied as offset from 1, making it 0
    tags.push({ text: '⬛ Preto & Branco', cls: 'tag-desat' });
  }

  // ── Contrast ─────────────────────────────────────────────────
  if (/alto contraste|dramatico|dramático|duro|harsh/i.test(t)) {
    delta.contrast += 0.3;
    tags.push({ text: '◼ Alto Contraste', cls: 'tag-dark' });
  }
  if (/suave|flat|delicado|soft/i.test(t)) {
    delta.contrast -= 0.15;
    tags.push({ text: '◽ Suave/Flat', cls: 'tag-bright' });
  }

  // ── Exposure ─────────────────────────────────────────────────
  if (/escuro|dark\b|sombrio/i.test(t)) {
    delta.exposure -= 0.2;
    tags.push({ text: '🌑 Escuro', cls: 'tag-dark' });
  }
  if (/claro|bright|luminoso/i.test(t)) {
    delta.exposure += 0.2;
    tags.push({ text: '☀️ Claro/Luminoso', cls: 'tag-bright' });
  }

  // ── Hue accents ──────────────────────────────────────────────
  if (/verde\b|green/i.test(t)) {
    delta.tint += 0.3;
    delta.gain = [delta.gain[0], 1.05, delta.gain[2]];
    tags.push({ text: '🟢 Verde', cls: 'tag-cool' });
  }
  if (/rosa\b|pink|magenta/i.test(t)) {
    delta.tint -= 0.25;
    delta.gain = [1.05, delta.gain[1], delta.gain[2]];
    tags.push({ text: '🌸 Rosa/Pink', cls: 'tag-warm' });
  }

  // ── Tint overrides ───────────────────────────────────────────
  if (/verde|teal|bloom|gelo|glow/i.test(t) && suggestFx.length === 0) {
    // already handled above
  }

  // ── Effect suggestions ────────────────────────────────────────
  if (/grain|grão|película|pelicul|película|filme antigo|old film|analogi/i.test(t)) {
    if (!suggestFx.includes('grain')) suggestFx.push('grain');
    tags.push({ text: '🎞 Film Grain sugerido', cls: 'tag-fx' });
  }
  if (/bloom|halo|halação|halacao/i.test(t)) {
    if (!suggestFx.includes('bloom')) suggestFx.push('bloom');
    tags.push({ text: '✨ Bloom sugerido', cls: 'tag-fx' });
  }
  if (/glow|brilho/i.test(t)) {
    if (!suggestFx.includes('glow')) suggestFx.push('glow');
    tags.push({ text: '💫 Glow sugerido', cls: 'tag-fx' });
  }
  if (/vinheta|vignette/i.test(t)) {
    if (!suggestFx.includes('vignette')) suggestFx.push('vignette');
    tags.push({ text: '⬛ Vinheta sugerida', cls: 'tag-fx' });
  }
  if (/aberração|aberracao|prisma|prism|chromatic/i.test(t)) {
    if (!suggestFx.includes('prism')) suggestFx.push('prism');
    tags.push({ text: '🌈 Aberração Cromática sugerida', cls: 'tag-fx' });
  }
  if (/nítido|nitid|sharp/i.test(t)) {
    if (!suggestFx.includes('sharpen')) suggestFx.push('sharpen');
    tags.push({ text: '🔲 Sharpen sugerido', cls: 'tag-fx' });
  }
  if (/streak|raio de luz|anamorf/i.test(t)) {
    if (!suggestFx.includes('streaks')) suggestFx.push('streaks');
    tags.push({ text: '🌠 Streaks sugerido', cls: 'tag-fx' });
  }

  return { delta, tags, suggestFx };
}

// ─────────────────────────────────────────────────────────────────
// Canvas rendering — color grade + effects
// ─────────────────────────────────────────────────────────────────

/**
 * Builds a color-grade profile object from the current studioState.params,
 * compatible with the existing colorGradePixel() function.
 */
function buildStudioProfile() {
  const p = studioState.params;
  return {
    temperature: p.temperature,
    tint:        p.tint,
    saturation:  p.saturation,
    contrast:    p.contrast,
    exposure:    p.exposure,
    lift:        p.lift,
    gamma:       p.gamma,
    gain:        p.gain,
  };
}

/**
 * Apply film grain noise to ImageData in-place.
 * @param {ImageData} imgData
 * @param {number} amount  0–100
 * @param {number} size    0.5–3 (unused in canvas impl, visual only)
 */
function applyGrainEffect(imgData, amount, size) {
  const d = imgData.data;
  const strength = (amount / 100) * 55;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * strength;
    d[i]   = Math.max(0, Math.min(255, d[i]   + n));
    d[i+1] = Math.max(0, Math.min(255, d[i+1] + n));
    d[i+2] = Math.max(0, Math.min(255, d[i+2] + n));
  }
}

/**
 * Apply radial vignette darkening overlay.
 * Works by compositing a radial gradient onto an offscreen canvas.
 */
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

/**
 * Apply bloom/glow by blurring bright pixels and compositing with 'screen'.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {number} amount     0–100 bloom intensity
 * @param {number} radius     blur radius in px
 * @param {number} threshold  0–1, brightness threshold (glow only)
 */
function applyBloomEffect(ctx, W, H, amount, radius, threshold) {
  // Draw current canvas into an offscreen canvas
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const octx = off.getContext('2d');

  // Extract pixels above threshold
  const srcData = ctx.getImageData(0, 0, W, H);
  const bloomData = octx.createImageData(W, H);
  const src = srcData.data;
  const bld = bloomData.data;
  const th = threshold !== undefined ? threshold * 255 : 0; // 0 means include all

  for (let i = 0; i < src.length; i += 4) {
    const lum = 0.2126 * src[i] + 0.7152 * src[i+1] + 0.0722 * src[i+2];
    if (lum >= th) {
      bld[i]   = src[i];
      bld[i+1] = src[i+1];
      bld[i+2] = src[i+2];
      bld[i+3] = 255;
    }
  }
  octx.putImageData(bloomData, 0, 0);

  // Blur the offscreen
  const blurPx = Math.max(1, Math.round(radius));
  octx.filter = `blur(${blurPx}px)`;
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  tmp.getContext('2d').drawImage(off, 0, 0);
  octx.clearRect(0, 0, W, H);
  octx.drawImage(tmp, 0, 0);
  octx.filter = 'none';

  // Composite
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = amount / 100;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}

/**
 * Apply chromatic aberration by shifting R channel left, B channel right.
 */
function applyPrismEffect(imgData, amount) {
  const shift = Math.round(amount);
  if (shift <= 0) return;
  const d = imgData.data;
  const W = imgData.width;
  const H = imgData.height;

  const orig = new Uint8ClampedArray(d);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // Shift red channel left
      const rX = Math.min(W - 1, x + shift);
      const ri = (y * W + rX) * 4;
      // Shift blue channel right
      const bX = Math.max(0, x - shift);
      const bi = (y * W + bX) * 4;
      d[i]   = orig[ri];   // R from right-shifted source
      d[i+2] = orig[bi+2]; // B from left-shifted source
    }
  }
}

/**
 * Apply a full grade + effects pass and draw result onto the studio canvas.
 * Respects studioState.view (before / after / split).
 */
function renderStudioCanvas() {
  const canvas = document.getElementById('studioCanvas');
  if (!studioState.imageLoaded || !studioState.originalImageData) return;

  const ctx = canvas.getContext('2d');
  const W = studioState.canvasW;
  const H = studioState.canvasH;
  canvas.width = W;
  canvas.height = H;

  const profile = buildStudioProfile();
  const origData = studioState.originalImageData;
  const effects = studioState.effects;

  // ── 1. Build graded ImageData ────────────────────────────────
  const gradedRaw = new ImageData(new Uint8ClampedArray(origData.data), W, H);
  const d = gradedRaw.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]   / 255;
    const g = d[i+1] / 255;
    const b = d[i+2] / 255;
    const [ro, go, bo] = colorGradePixel(r, g, b, profile);
    d[i]   = Math.round(ro * 255);
    d[i+1] = Math.round(go * 255);
    d[i+2] = Math.round(bo * 255);
  }

  // ── 2. Apply pixel-level effects (grain, prism) ──────────────
  if (effects.grain.active) {
    applyGrainEffect(gradedRaw, effects.grain.values.amount, effects.grain.values.size);
  }
  if (effects.prism.active) {
    applyPrismEffect(gradedRaw, effects.prism.values.amount);
  }

  // ── 3. Draw base (before / after / split) ───────────────────
  if (studioState.view === 'before') {
    ctx.putImageData(origData, 0, 0);

  } else if (studioState.view === 'after') {
    ctx.putImageData(gradedRaw, 0, 0);

  } else {
    // Split view
    const splitPx = Math.round(studioState.splitX * W);
    // Original on left
    ctx.putImageData(origData, 0, 0, 0, 0, splitPx, H);
    // Graded on right
    ctx.putImageData(gradedRaw, 0, 0, splitPx, 0, W - splitPx, H);

    // Thin divider line
    ctx.save();
    ctx.strokeStyle = 'rgba(212,168,74,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(splitPx, 0);
    ctx.lineTo(splitPx, H);
    ctx.stroke();
    ctx.restore();

    // Labels
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(8, 8, 58, 20);
    ctx.fillRect(splitPx + 8, 8, 58, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('ORIGINAL', 12, 22);
    ctx.fillText('GRADED', splitPx + 12, 22);
    ctx.restore();
  }

  // ── 4. Canvas-level composite effects ────────────────────────
  // (these are drawn over the already-composited result)
  if (studioState.view !== 'before') {
    if (effects.vignette.active) {
      applyVignetteEffect(ctx, W, H, effects.vignette.values.amount, effects.vignette.values.feather);
    }
    if (effects.bloom.active) {
      applyBloomEffect(ctx, W, H, effects.bloom.values.amount, effects.bloom.values.radius * 0.1, 0);
    }
    if (effects.glow.active) {
      applyBloomEffect(ctx, W, H, effects.glow.values.amount, effects.glow.values.radius * 0.2, effects.glow.values.threshold);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// FCP Recipe panel — build & render
// ─────────────────────────────────────────────────────────────────

function buildRecipeText(lutName) {
  const lines = [];
  lines.push('── RECEITA FCP ──────────────────────────────────');
  lines.push('');
  lines.push(`🎬 LUT: Aplicar LUT → Efeitos de Cor → LUT Personalizado → ${lutName}.cube`);
  lines.push('   Intensidade: 100%');
  lines.push('');

  const activeEffects = FCP_EFFECTS_CATALOG.filter(fx => studioState.effects[fx.id].active);
  if (activeEffects.length > 0) {
    lines.push('── EFEITOS (aplicar na ordem abaixo) ───────────');
    lines.push('');
    activeEffects.forEach(fx => {
      lines.push(`${fx.icon}  ${fx.name}`);
      lines.push(`   FCP: ${fx.fcp}`);
      fx.params.forEach(p => {
        const val = studioState.effects[fx.id].values[p.key];
        lines.push(`   ${p.label}: ${val}${p.unit}`);
      });
      if (fx.note) lines.push(`   Nota: ${fx.note}`);
      lines.push('');
    });
  } else {
    lines.push('(Nenhum efeito ativo)');
  }

  lines.push('─────────────────────────────────────────────────');
  lines.push('Gerado por CineLUT Custom Grade Studio');
  return lines.join('\n');
}

function renderRecipePanel() {
  const container = document.getElementById('studioRecipeEffects');
  const lutName = (document.getElementById('studioLutName').value.trim() || 'meu-grade');
  document.getElementById('recipeFileName').textContent = `${lutName}.cube`;

  const activeEffects = FCP_EFFECTS_CATALOG.filter(fx => studioState.effects[fx.id].active);

  if (activeEffects.length === 0) {
    container.innerHTML = '<p class="studio-recipe-empty">Ative efeitos acima para ver a receita completa.</p>';
    return;
  }

  container.innerHTML = activeEffects.map(fx => {
    const vals = studioState.effects[fx.id].values;
    const paramChips = fx.params.map(p =>
      `<span class="studio-recipe-fx-param-chip">${p.label}: ${vals[p.key]}${p.unit}</span>`
    ).join('');

    return `
      <div class="studio-recipe-fx-row">
        <div class="studio-recipe-fx-icon">${fx.icon}</div>
        <div class="studio-recipe-fx-body">
          <div class="studio-recipe-fx-name">${fx.name}</div>
          <div class="studio-recipe-fx-fcp">${fx.fcp}</div>
          <div class="studio-recipe-fx-params">${paramChips}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────
// Effect cards — DOM generation
// ─────────────────────────────────────────────────────────────────

function renderEffectCards() {
  const grid = document.getElementById('studioEffectsGrid');
  grid.innerHTML = '';

  FCP_EFFECTS_CATALOG.forEach(fx => {
    const card = document.createElement('div');
    card.className = 'studio-effect-card';
    card.id = `fx-card-${fx.id}`;

    // Param sliders HTML
    const paramsHTML = fx.params.map(p => {
      const val = studioState.effects[fx.id].values[p.key];
      return `
        <div class="studio-effect-param-row">
          <div class="studio-effect-param-header">
            <span class="studio-effect-param-label">${p.label}</span>
            <span class="studio-effect-param-value" id="fxval-${fx.id}-${p.key}">${val}${p.unit}</span>
          </div>
          <input
            type="range"
            class="studio-effect-range"
            id="fxsl-${fx.id}-${p.key}"
            min="${p.min}"
            max="${p.max}"
            step="${p.max <= 1 ? 0.01 : 1}"
            value="${val}"
            data-fx="${fx.id}"
            data-param="${p.key}"
            data-unit="${p.unit}"
          />
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <div class="studio-effect-header" data-fx="${fx.id}">
        <div class="studio-effect-toggle"></div>
        <span class="studio-effect-emoji">${fx.icon}</span>
        <span class="studio-effect-name">${fx.name}</span>
        <span class="studio-effect-note-badge">${fx.note}</span>
      </div>
      <div class="studio-effect-params">
        ${paramsHTML}
      </div>
    `;

    grid.appendChild(card);

    // Toggle on header click
    card.querySelector('.studio-effect-header').addEventListener('click', () => {
      const active = !studioState.effects[fx.id].active;
      studioState.effects[fx.id].active = active;
      card.classList.toggle('active', active);
      renderRecipePanel();
      renderStudioCanvas();
    });

    // Param slider events
    card.querySelectorAll('.studio-effect-range').forEach(input => {
      input.addEventListener('input', () => {
        const fxId = input.dataset.fx;
        const paramKey = input.dataset.param;
        const unit = input.dataset.unit;
        const val = parseFloat(input.value);
        studioState.effects[fxId].values[paramKey] = val;

        // Display value
        const display = document.getElementById(`fxval-${fxId}-${paramKey}`);
        if (display) {
          const dispVal = Number.isInteger(val) ? val : (unit === '%' || Math.abs(val) >= 1 ? Math.round(val) : val.toFixed(2));
          display.textContent = `${dispVal}${unit}`;
        }

        renderRecipePanel();
        renderStudioCanvas();
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// Color slider sync
// ─────────────────────────────────────────────────────────────────

const COLOR_SLIDERS = [
  { id: 'temperature', display: 'val-temperature', decimals: 2 },
  { id: 'tint',        display: 'val-tint',        decimals: 2 },
  { id: 'saturation',  display: 'val-saturation',  decimals: 2 },
  { id: 'contrast',    display: 'val-contrast',    decimals: 2 },
  { id: 'exposure',    display: 'val-exposure',    decimals: 2 },
];

function syncSlidersToState() {
  COLOR_SLIDERS.forEach(({ id, display, decimals }) => {
    const slider = document.getElementById(`sl-${id}`);
    const val = studioState.params[id];
    slider.value = val;
    document.getElementById(display).textContent = val.toFixed(decimals);
  });
}

function initColorSliders() {
  COLOR_SLIDERS.forEach(({ id, display, decimals }) => {
    const slider = document.getElementById(`sl-${id}`);
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      studioState.params[id] = val;
      document.getElementById(display).textContent = val.toFixed(decimals);
      renderStudioCanvas();
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// Image upload handling
// ─────────────────────────────────────────────────────────────────

function loadStudioImage(file) {
  if (!file || !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      // Fit to a sensible canvas size (max 900×600)
      const maxW = 900, maxH = 600;
      let W = img.naturalWidth;
      let H = img.naturalHeight;
      if (W > maxW) { H = Math.round(H * maxW / W); W = maxW; }
      if (H > maxH) { W = Math.round(W * maxH / H); H = maxH; }

      const canvas = document.getElementById('studioCanvas');
      canvas.width  = W;
      canvas.height = H;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);

      studioState.originalImageData = ctx.getImageData(0, 0, W, H);
      studioState.canvasW = W;
      studioState.canvasH = H;
      studioState.imageLoaded = true;

      // Show canvas, hide prompt
      canvas.style.display = 'block';
      document.getElementById('studioUploadPrompt').style.display = 'none';
      document.getElementById('studioSplitHandle').style.display =
        studioState.view === 'split' ? 'block' : 'none';
      document.getElementById('studioChangeRow').style.display = 'flex';
      document.getElementById('studioImageName').textContent = file.name;

      renderStudioCanvas();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ─────────────────────────────────────────────────────────────────
// Analyze description → update sliders + effects
// ─────────────────────────────────────────────────────────────────

function runAnalysis() {
  const text = document.getElementById('studioDescInput').value.trim();
  if (!text) return;

  const { delta, tags, suggestFx } = analyzeDescription(text);

  // Apply deltas clamped to slider ranges
  studioState.params.temperature = Math.max(-1,  Math.min(1,  delta.temperature));
  studioState.params.tint        = Math.max(-1,  Math.min(1,  delta.tint));
  studioState.params.saturation  = Math.max(0,   Math.min(2,  1 + delta.saturation));
  studioState.params.contrast    = Math.max(-1,  Math.min(1,  delta.contrast));
  studioState.params.exposure    = Math.max(-2,  Math.min(2,  delta.exposure));
  studioState.params.lift  = delta.lift;
  studioState.params.gamma = delta.gamma;
  studioState.params.gain  = delta.gain;

  syncSlidersToState();

  // Enable suggested effects
  suggestFx.forEach(fxId => {
    studioState.effects[fxId].active = true;
    const card = document.getElementById(`fx-card-${fxId}`);
    if (card) card.classList.add('active');
  });

  // Show analysis tags
  const tagsEl = document.getElementById('studioAnalysisTags');
  if (tags.length > 0) {
    tagsEl.innerHTML = tags.map(tg =>
      `<span class="studio-tag ${tg.cls}">${tg.text}</span>`
    ).join('');
    tagsEl.style.display = 'flex';
  } else {
    tagsEl.style.display = 'none';
  }

  renderRecipePanel();
  renderStudioCanvas();
}

// ─────────────────────────────────────────────────────────────────
// Split handle dragging
// ─────────────────────────────────────────────────────────────────

function initSplitHandle() {
  const handle = document.getElementById('studioSplitHandle');
  const wrap   = document.getElementById('studioCanvasWrap');
  let dragging = false;

  function positionHandle() {
    const canvas = document.getElementById('studioCanvas');
    const rect = canvas.getBoundingClientRect();
    // Position handle relative to studioCanvasWrap
    const wrapRect = wrap.getBoundingClientRect();
    const offsetX = rect.left - wrapRect.left + studioState.splitX * rect.width;
    handle.style.left = offsetX + 'px';
    handle.style.top = (rect.top - wrapRect.top) + 'px';
    handle.style.height = rect.height + 'px';
  }

  handle.addEventListener('mousedown', e => {
    dragging = true;
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const canvas = document.getElementById('studioCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    studioState.splitX = Math.max(0.02, Math.min(0.98, x / rect.width));
    positionHandle();
    renderStudioCanvas();
  });

  window.addEventListener('mouseup', () => { dragging = false; });

  // Touch support
  handle.addEventListener('touchstart', e => { dragging = true; e.preventDefault(); }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (!dragging) return;
    const canvas = document.getElementById('studioCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    studioState.splitX = Math.max(0.02, Math.min(0.98, x / rect.width));
    positionHandle();
    renderStudioCanvas();
  }, { passive: true });
  window.addEventListener('touchend', () => { dragging = false; });

  return positionHandle;
}

// ─────────────────────────────────────────────────────────────────
// Toast notification
// ─────────────────────────────────────────────────────────────────

let studioToastEl = null;

function showStudioToast(msg) {
  if (!studioToastEl) {
    studioToastEl = document.createElement('div');
    studioToastEl.className = 'studio-toast';
    document.body.appendChild(studioToastEl);
  }
  studioToastEl.textContent = msg;
  studioToastEl.classList.add('show');
  setTimeout(() => studioToastEl.classList.remove('show'), 2200);
}

// ─────────────────────────────────────────────────────────────────
// Studio modal open / close
// ─────────────────────────────────────────────────────────────────

function openStudio() {
  document.getElementById('studioOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeStudio() {
  document.getElementById('studioOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ─────────────────────────────────────────────────────────────────
// Studio initialization
// ─────────────────────────────────────────────────────────────────

(function initStudio() {
  // Render effect cards
  renderEffectCards();

  // Init color slider listeners
  initColorSliders();

  // Init split handle
  const positionHandle = initSplitHandle();

  // ── View tabs ──────────────────────────────────────────────
  document.querySelectorAll('.studio-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.studio-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      studioState.view = tab.dataset.view;

      const handle = document.getElementById('studioSplitHandle');
      handle.style.display = (studioState.view === 'split' && studioState.imageLoaded) ? 'block' : 'none';

      if (studioState.view === 'split' && studioState.imageLoaded) {
        positionHandle();
      }
      renderStudioCanvas();
    });
  });

  // ── Image upload ───────────────────────────────────────────
  document.getElementById('studioImageInput').addEventListener('change', function(e) {
    loadStudioImage(e.target.files[0]);
    // Reset input so same file can be re-selected
    e.target.value = '';
  });

  // ── Analyze button ─────────────────────────────────────────
  document.getElementById('studioAnalyzeBtn').addEventListener('click', runAnalysis);

  // Allow Enter+Ctrl to trigger analysis from textarea
  document.getElementById('studioDescInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runAnalysis();
  });

  // ── Copy recipe ────────────────────────────────────────────
  document.getElementById('studioCopyRecipe').addEventListener('click', () => {
    const lutName = document.getElementById('studioLutName').value.trim() || 'meu-grade';
    const text = buildRecipeText(lutName);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showStudioToast('Receita copiada!'));
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showStudioToast('Receita copiada!');
    }
  });

  // ── Download LUT ───────────────────────────────────────────
  document.getElementById('studioDownloadLut').addEventListener('click', () => {
    const profile = buildStudioProfile();
    const name = document.getElementById('studioLutName').value.trim() || 'meu-grade';
    const content = generateCubeContent(profile, name, 33);
    downloadCube(content, name);
    showStudioToast('LUT gerado e baixado!');
  });

  // ── LUT name → update recipe filename in real-time ─────────
  document.getElementById('studioLutName').addEventListener('input', () => {
    const name = document.getElementById('studioLutName').value.trim() || 'meu-grade';
    document.getElementById('recipeFileName').textContent = `${name}.cube`;
  });

  // ── Studio button in header ────────────────────────────────
  document.getElementById('btnStudio').addEventListener('click', openStudio);

  // ── Close button ───────────────────────────────────────────
  document.getElementById('studioClose').addEventListener('click', closeStudio);

  // ── Click backdrop to close ────────────────────────────────
  document.getElementById('studioOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeStudio();
  });

  // ── ESC key (piggybacks on existing global listener) ───────
  // The existing listener already calls closeModal() and closeUploadModal();
  // we need to also close the studio. Patch by adding another listener:
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeStudio();
  });

  // ── Initial recipe render ──────────────────────────────────
  renderRecipePanel();
})();
