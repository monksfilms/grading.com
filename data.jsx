// data.jsx — Film library + color profiles

const FILMS = [
  // ── WES ANDERSON ──────────────────────────────────────────────────
  {
    id: "bottle-rocket",
    title: "Bottle Rocket",
    year: 1996,
    director: "Wes Anderson",
    dp: "Robert Yeoman",
    category: "wes-anderson",
    palette: ["#C9A87C", "#7B9E8A", "#D4C4A0", "#8B7355", "#B5C4B1"],
    description: "Paleta terrosa e quente, o início do universo visual de Wes Anderson. Tons de bege, verde musgo e âmbar.",
    lut: "luts/bottle-rocket.cube",
    stills: ["stills/bottle-rocket/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=JJPQ-NnjZR0"
  },
  {
    id: "rushmore",
    title: "Rushmore",
    year: 1998,
    director: "Wes Anderson",
    dp: "Robert Yeoman",
    category: "wes-anderson",
    palette: ["#8B3A3A", "#C4A882", "#4A6741", "#D4B896", "#6B5B45"],
    description: "Outono americano. Bordô, dourado e verde escuro com contraste elevado e negros densos.",
    lut: "luts/rushmore.cube",
    stills: ["stills/rushmore/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=6ZVdXXG3KN8"
  },
  {
    id: "royal-tenenbaums",
    title: "The Royal Tenenbaums",
    year: 2001,
    director: "Wes Anderson",
    dp: "Robert Yeoman",
    category: "wes-anderson",
    palette: ["#C8B89A", "#8B7355", "#4A4A6A", "#D4C4A0", "#7A9B7A"],
    description: "Nostálgico e melancólico. Tons sépia, verde-oliva desbotado e toques de púrpura nos shadows.",
    lut: "luts/royal-tenenbaums.cube",
    stills: ["stills/royal-tenenbaums/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=caMgokYWboU"
  },
  {
    id: "life-aquatic",
    title: "The Life Aquatic",
    year: 2004,
    director: "Wes Anderson",
    dp: "Robert Yeoman",
    category: "wes-anderson",
    palette: ["#2E6E8E", "#5BA3BF", "#C4D4DC", "#E8C87A", "#3A5F6A"],
    description: "Azul oceânico. Dominância de azul-petróleo e teal, com toques de amarelo âmbar nas highlights.",
    lut: "luts/life-aquatic.cube",
    stills: ["stills/life-aquatic/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=yh401Rmkq0o"
  },
  {
    id: "darjeeling-limited",
    title: "The Darjeeling Limited",
    year: 2007,
    director: "Wes Anderson",
    dp: "Robert Yeoman",
    category: "wes-anderson",
    palette: ["#C4622A", "#E8A84A", "#8B3A1E", "#D4A870", "#4A3020"],
    description: "India vibrante. Laranja, vermelho e ouro intensos. Os shadows puxam para marrom-avermelhado.",
    lut: "luts/darjeeling-limited.cube",
    stills: ["stills/darjeeling-limited/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=B2R7O2IlndM"
  },
  {
    id: "fantastic-mr-fox",
    title: "Fantastic Mr. Fox",
    year: 2009,
    director: "Wes Anderson",
    dp: "Tristan Oliver",
    category: "wes-anderson",
    palette: ["#D4882A", "#8B5E1A", "#C8A84A", "#4A3A1A", "#E8C46A"],
    description: "Outono dourado stop-motion. Ambar, laranja queimado e marrom rico com texturas granuladas.",
    lut: "luts/fantastic-mr-fox.cube",
    stills: ["stills/fantastic-mr-fox/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=K_BzxFkkImI"
  },
  {
    id: "moonrise-kingdom",
    title: "Moonrise Kingdom",
    year: 2012,
    director: "Wes Anderson",
    dp: "Robert Yeoman",
    category: "wes-anderson",
    palette: ["#D4A84A", "#8BAA6A", "#E8C87A", "#5A7A4A", "#C8904A"],
    description: "Verão dourado da infância. Amarelo-esverdeado, verde floresta e âmbar quente. Negros levantados.",
    lut: "luts/moonrise-kingdom.cube",
    stills: ["stills/moonrise-kingdom/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=7N8wkVA4_8s"
  },
  {
    id: "grand-budapest-hotel",
    title: "The Grand Budapest Hotel",
    year: 2014,
    director: "Wes Anderson",
    dp: "Robert Yeoman",
    category: "wes-anderson",
    palette: ["#C4688A", "#E8A0B8", "#8B2A4A", "#D4B4C4", "#5A2A3A"],
    description: "Rosa europeu intenso. Tons de rosa, magenta e vermelho com shadows púrpura. O mais icônico de WA.",
    lut: "luts/grand-budapest-hotel.cube",
    stills: ["stills/grand-budapest-hotel/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=1Fg5iWmQjwk"
  },
  {
    id: "isle-of-dogs",
    title: "Isle of Dogs",
    year: 2018,
    director: "Wes Anderson",
    dp: "Tristan Oliver",
    category: "wes-anderson",
    palette: ["#B4A890", "#8A8070", "#C8C0A8", "#6A6050", "#D4CDB8"],
    description: "Cinza desbotado japonês. Desaturado, poeirento, com warm cast sutil. Estética de papel envelhecido.",
    lut: "luts/isle-of-dogs.cube",
    stills: ["stills/isle-of-dogs/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=fx1-RXrKKBk"
  },
  {
    id: "french-dispatch",
    title: "The French Dispatch",
    year: 2021,
    director: "Wes Anderson",
    dp: "Robert Yeoman",
    category: "wes-anderson",
    palette: ["#E8DCC8", "#C4AA88", "#8A7A60", "#D4C8A8", "#6A5A40"],
    description: "Pastel editorial francês. Tons creme, bege e caramelo com toques de cor saturada.",
    lut: "luts/french-dispatch.cube",
    stills: ["stills/french-dispatch/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=TcPk2p0Zaw4"
  },
  {
    id: "asteroid-city",
    title: "Asteroid City",
    year: 2023,
    director: "Wes Anderson",
    dp: "Robert Yeoman",
    category: "wes-anderson",
    palette: ["#E8B86A", "#C8844A", "#D4C890", "#8A6A3A", "#E4D4A0"],
    description: "Deserto americano dos anos 50. Laranja-areia intenso, céu azul contrastante, pastéis desbotados.",
    lut: "luts/asteroid-city.cube",
    stills: ["stills/asteroid-city/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=8MGBWw9Ra4Q"
  },

  // ── OUTROS DIRETORES ─────────────────────────────────────────────
  {
    id: "joker",
    title: "Joker",
    year: 2019,
    director: "Todd Phillips",
    dp: "Lawrence Sher",
    category: "outros",
    palette: ["#6A7A3A", "#4A5A2A", "#C8C090", "#8A9A50", "#2A3A1A"],
    description: "Verde urbano podre. Yellow-green cast nos shadows, alto contraste, desaturado com skin tones doentes.",
    lut: "luts/joker.cube",
    stills: ["stills/joker/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=zAGVQLHvwOY"
  },
  {
    id: "blade-runner",
    title: "Blade Runner",
    year: 1982,
    director: "Ridley Scott",
    dp: "Jordan Cronenweth",
    category: "outros",
    palette: ["#C87A2A", "#8A4A1A", "#2A3A5A", "#E8A040", "#1A2A4A"],
    description: "Noir retrofuturista. Laranja âmbar nas shadows, azul profundo nas highlights, contraste extremo.",
    lut: "luts/blade-runner.cube",
    stills: ["stills/blade-runner/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=eogpIG53Cis"
  },
  {
    id: "blade-runner-2049",
    title: "Blade Runner 2049",
    year: 2017,
    director: "Denis Villeneuve",
    dp: "Roger Deakins",
    category: "outros",
    palette: ["#E8A040", "#C47820", "#4A6080", "#8A5A30", "#2A3A50"],
    description: "Deakins em deserto distópico. Laranja-ouro dominante, desaturado, azul frio nos interiores.",
    lut: "luts/blade-runner-2049.cube",
    stills: ["stills/blade-runner-2049/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=gCcx85zbxz4",
    effects: [
      { name: "Noise (Film Grain)", app: "FCP", param: "Amount", value: "20%", note: "Grão sutil de 35mm" },
      { name: "Glow", app: "FCP", param: "Amount / Radius", value: "0.25 / 18px", note: "Halação suave nas luzes de neon" },
      { name: "Vignette", app: "FCP", param: "Intensity / Falloff", value: "40% / Soft", note: "Vinheta leve nas bordas" }
    ]
  },
  {
    id: "o-farol",
    title: "O Farol",
    year: 2019,
    director: "Robert Eggers",
    dp: "Jarin Blaschke",
    category: "outros",
    palette: ["#1A1A1A", "#3A3A3A", "#6A6A6A", "#A8A8A0", "#E8E0D0"],
    description: "P&B ortocromático brutal. Emula película de 1890 com ortocromático, grão pesado, halos de luz e vinheta forte.",
    lut: "luts/o-farol.cube",
    stills: ["stills/o-farol/thumb.jpg"],
    videoRef: "https://www.youtube.com/watch?v=Hyag7lR8CPA",
    effects: [
      { name: "Noise (Film Grain)", app: "FCP", param: "Amount / Size", value: "85% / 1.1", note: "Grão pesado de película 35mm pushed. Tipo: Preto e Branco" },
      { name: "Glow", app: "FCP", param: "Amount / Radius / Threshold", value: "0.45 / 24px / 0.72", note: "Halos de glow ao redor das luzes — especialmente o farol" },
      { name: "Vignette", app: "FCP", param: "Intensity / Falloff", value: "65% / Soft", note: "Vinheta forte nas bordas, característica de câmeras do início do século XX" },
      { name: "Sharpen", app: "FCP", param: "Amount", value: "15%", note: "Levíssimo, só para dar textura à película" },
      { name: "Crop (Aspect Ratio)", app: "FCP", param: "Custom", value: "1.19:1 (ex: 1434×1202)", note: "O filme foi rodado em formato quase quadrado" }
    ]
  }
];

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

Object.assign(window, { FILMS, PROFILES });
