#!/usr/bin/env python3
"""
CineLUT Generator
Gera arquivos .cube (3D LUT 33x33x33) para cada filme da biblioteca.
Também suporta geração a partir de imagens de referência customizadas.

Uso:
  python3 generate_luts.py                          # gera todos os LUTs predefinidos
  python3 generate_luts.py --image ref.jpg --name meu-filme  # gera a partir de imagem
"""

import os
import sys
import math

LUT_SIZE = 33  # padrão profissional (33x33x33)
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "luts")

# ─────────────────────────────────────────────────────────────────
# Funções de transformação de cor
# ─────────────────────────────────────────────────────────────────

def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))

def apply_scurve(v, strength=1.0):
    """S-curve de contraste suave."""
    v = clamp(v)
    s = v * v * (3.0 - 2.0 * v)  # smoothstep
    return v + (s - v) * strength

def apply_lift_gamma_gain(r, g, b, lift=(0,0,0), gamma=(1,1,1), gain=(1,1,1)):
    """Controle clássico de shadows/midtones/highlights por canal."""
    r = clamp(r * gain[0] + lift[0])
    g = clamp(g * gain[1] + lift[1])
    b = clamp(b * gain[2] + lift[2])
    if gamma[0] > 0: r = clamp(r ** (1.0 / gamma[0]))
    if gamma[1] > 0: g = clamp(g ** (1.0 / gamma[1]))
    if gamma[2] > 0: b = clamp(b ** (1.0 / gamma[2]))
    return r, g, b

def apply_saturation(r, g, b, sat):
    """Ajuste de saturação usando luminância BT.709."""
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    r = clamp(luma + sat * (r - luma))
    g = clamp(luma + sat * (g - luma))
    b = clamp(luma + sat * (b - luma))
    return r, g, b

def apply_temperature(r, g, b, temp):
    """temp > 0 = quente (laranja), temp < 0 = frio (azul)."""
    r = clamp(r + temp * 0.08)
    b = clamp(b - temp * 0.08)
    return r, g, b

def apply_tint(r, g, b, tint):
    """tint > 0 = verde, tint < 0 = magenta."""
    g = clamp(g + tint * 0.06)
    return r, g, b

def color_grade(r, g, b, params):
    """Aplica todos os parâmetros de color grading ao pixel RGB (0–1)."""
    # Temperatura e tint
    r, g, b = apply_temperature(r, g, b, params.get("temperature", 0.0))
    r, g, b = apply_tint(r, g, b, params.get("tint", 0.0))

    # Lift / Gamma / Gain por canal
    lift  = params.get("lift",  (0.0, 0.0, 0.0))
    gamma = params.get("gamma", (1.0, 1.0, 1.0))
    gain  = params.get("gain",  (1.0, 1.0, 1.0))
    r, g, b = apply_lift_gamma_gain(r, g, b, lift, gamma, gain)

    # Saturação
    sat = params.get("saturation", 1.0)
    r, g, b = apply_saturation(r, g, b, sat)

    # Contraste (S-curve)
    contrast = params.get("contrast", 0.0)
    if contrast:
        r = apply_scurve(r, contrast)
        g = apply_scurve(g, contrast)
        b = apply_scurve(b, contrast)

    # Exposure geral
    exp = params.get("exposure", 0.0)
    if exp:
        factor = 2 ** exp
        r, g, b = clamp(r * factor), clamp(g * factor), clamp(b * factor)

    return clamp(r), clamp(g), clamp(b)

# ─────────────────────────────────────────────────────────────────
# Perfis de cor de cada filme
# ─────────────────────────────────────────────────────────────────

FILM_PROFILES = {
    "bottle-rocket": {
        "temperature": 0.3,
        "tint": -0.1,
        "saturation": 0.85,
        "contrast": 0.2,
        "lift":  (0.01, 0.005, -0.01),
        "gamma": (1.05, 1.0,   0.95),
        "gain":  (1.05, 1.0,   0.90),
        "title": "Bottle Rocket (1996)"
    },
    "rushmore": {
        "temperature": 0.2,
        "tint": -0.15,
        "saturation": 0.9,
        "contrast": 0.4,
        "lift":  (0.02, 0.0,  -0.02),
        "gamma": (1.05, 0.98,  0.92),
        "gain":  (1.08, 1.0,   0.88),
        "title": "Rushmore (1998)"
    },
    "royal-tenenbaums": {
        "temperature": 0.15,
        "tint": 0.0,
        "saturation": 0.82,
        "contrast": 0.3,
        "lift":  (0.01, 0.005, 0.02),
        "gamma": (1.02, 1.0,   1.05),
        "gain":  (1.03, 1.0,   0.95),
        "title": "The Royal Tenenbaums (2001)"
    },
    "life-aquatic": {
        "temperature": -0.3,
        "tint": 0.1,
        "saturation": 0.9,
        "contrast": 0.25,
        "lift":  (-0.01, 0.01,  0.03),
        "gamma": (0.95,  1.0,   1.08),
        "gain":  (0.92,  1.0,   1.12),
        "title": "The Life Aquatic (2004)"
    },
    "darjeeling-limited": {
        "temperature": 0.5,
        "tint": -0.2,
        "saturation": 1.1,
        "contrast": 0.35,
        "lift":  (0.03,  0.0,  -0.03),
        "gamma": (1.08,  1.0,   0.88),
        "gain":  (1.12,  1.02,  0.85),
        "title": "The Darjeeling Limited (2007)"
    },
    "fantastic-mr-fox": {
        "temperature": 0.55,
        "tint": -0.1,
        "saturation": 1.05,
        "contrast": 0.2,
        "lift":  (0.02,  0.01, -0.02),
        "gamma": (1.1,   1.02,  0.9),
        "gain":  (1.15,  1.05,  0.82),
        "title": "Fantastic Mr. Fox (2009)"
    },
    "moonrise-kingdom": {
        "temperature": 0.35,
        "tint": 0.15,
        "saturation": 1.0,
        "contrast": 0.15,
        "exposure": 0.15,
        "lift":  (0.03,  0.03,  0.0),
        "gamma": (1.05,  1.08,  0.95),
        "gain":  (1.05,  1.08,  0.88),
        "title": "Moonrise Kingdom (2012)"
    },
    "grand-budapest-hotel": {
        "temperature": 0.1,
        "tint": -0.4,
        "saturation": 1.05,
        "contrast": 0.45,
        "lift":  (0.02,  -0.01,  0.02),
        "gamma": (1.05,   0.92,  1.05),
        "gain":  (1.1,    0.88,  1.0),
        "title": "The Grand Budapest Hotel (2014)"
    },
    "isle-of-dogs": {
        "temperature": 0.1,
        "tint": 0.05,
        "saturation": 0.6,
        "contrast": 0.1,
        "lift":  (0.02,  0.015, 0.005),
        "gamma": (1.02,  1.0,   0.98),
        "gain":  (1.02,  1.0,   0.95),
        "title": "Isle of Dogs (2018)"
    },
    "french-dispatch": {
        "temperature": 0.05,
        "tint": 0.0,
        "saturation": 0.75,
        "contrast": 0.3,
        "exposure": 0.05,
        "lift":  (0.015, 0.01,  0.005),
        "gamma": (1.02,  1.0,   0.98),
        "gain":  (1.03,  1.0,   0.95),
        "title": "The French Dispatch (2021)"
    },
    "asteroid-city": {
        "temperature": 0.6,
        "tint": -0.05,
        "saturation": 0.95,
        "contrast": 0.2,
        "exposure": 0.1,
        "lift":  (0.03,  0.02,  -0.01),
        "gamma": (1.08,  1.05,   0.92),
        "gain":  (1.12,  1.05,   0.88),
        "title": "Asteroid City (2023)"
    },
    "joker": {
        "temperature": -0.1,
        "tint": 0.35,
        "saturation": 0.75,
        "contrast": 0.55,
        "lift":  (-0.02,  0.02, -0.02),
        "gamma": ( 0.92,  1.05,  0.92),
        "gain":  ( 0.9,   1.08,  0.88),
        "title": "Joker (2019)"
    },
    "blade-runner": {
        "temperature": 0.4,
        "tint": -0.1,
        "saturation": 0.8,
        "contrast": 0.6,
        "lift":  ( 0.02,  0.0,  -0.03),
        "gamma": ( 1.1,   0.95,  0.88),
        "gain":  ( 1.15,  0.95,  0.75),
        "title": "Blade Runner (1982)"
    },
    "blade-runner-2049": {
        "temperature": 0.45,
        "tint": -0.05,
        "saturation": 0.72,
        "contrast": 0.5,
        "lift":  ( 0.02,  0.01, -0.02),
        "gamma": ( 1.08,  1.0,   0.9),
        "gain":  ( 1.12,  1.0,   0.82),
        "title": "Blade Runner 2049 (2017)"
    },

    # ── O FAROL (2019) ─────────────────────────────────────────────
    # Fotografia de Jarin Blaschke em P&B ortocromático.
    # Emula película ortocromática do início do século XX:
    #   - Desaturação total (P&B)
    #   - Leve cast azul-verde frio (ortocromático rejeitava vermelho)
    #   - Contraste extremo com blacks esmagados e highlights queimadas
    #   - Lift levemente azulado nos shadows (look de prata de filme antigo)
    #   - Gamma comprimido nos meios-tons para dar peso dramático
    # Obs: grão, glow e vinheta são efeitos separados no FCP (ver app)
    "o-farol": {
        "temperature": -0.25,        # Frio — ortocromático rejeita vermelho/quente
        "tint":        -0.1,         # Leve magenta out → puxar para verde-cinza
        "saturation":   0.0,         # P&B total
        "contrast":     0.75,        # Contraste brutal, característico do filme
        "exposure":    -0.05,        # Levemente subexposto — sombras densas
        "lift":  (-0.02, -0.02,  0.01),  # Shadows: pretos profundos com leve azul
        "gamma": ( 0.88,  0.88,  0.92),  # Meios-tons comprimidos e frios
        "gain":  ( 1.05,  1.05,  1.08),  # Highlights: quase queimadas, toque azulado
        "title": "O Farol (2019)"
    },
}

# ─────────────────────────────────────────────────────────────────
# Geração do .cube
# ─────────────────────────────────────────────────────────────────

def generate_cube(film_id, params, size=LUT_SIZE):
    """Gera o conteúdo de um arquivo .cube 3D."""
    lines = []
    lines.append(f"# CineLUT — {params.get('title', film_id)}")
    lines.append(f"# Gerado por generate_luts.py")
    lines.append(f"LUT_3D_SIZE {size}")
    lines.append("")

    step = 1.0 / (size - 1)

    for b_i in range(size):
        for g_i in range(size):
            for r_i in range(size):
                r = r_i * step
                g = g_i * step
                b = b_i * step
                ro, go, bo = color_grade(r, g, b, params)
                lines.append(f"{ro:.6f} {go:.6f} {bo:.6f}")

    return "\n".join(lines) + "\n"


def write_cube(film_id, params):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, f"{film_id}.cube")
    content = generate_cube(film_id, params)
    with open(path, "w") as f:
        f.write(content)
    print(f"  ✓ {params.get('title', film_id)}  →  {path}")


# ─────────────────────────────────────────────────────────────────
# Geração a partir de imagem de referência
# ─────────────────────────────────────────────────────────────────

def lut_from_image(image_path, film_id):
    """
    Analisa os canais RGB de uma imagem e gera parâmetros de LUT.
    Requer: pip3 install Pillow
    """
    try:
        from PIL import Image
        import struct
    except ImportError:
        print("Instale o Pillow primeiro:  pip3 install Pillow")
        sys.exit(1)

    img = Image.open(image_path).convert("RGB")
    img.thumbnail((400, 400))

    pixels = list(img.getdata())
    n = len(pixels)

    r_avg = sum(p[0] for p in pixels) / n / 255
    g_avg = sum(p[1] for p in pixels) / n / 255
    b_avg = sum(p[2] for p in pixels) / n / 255

    # Estimativa de temperatura baseada em diferença R-B
    temp = (r_avg - b_avg) * 2.0
    # Estimativa de tint baseada em green vs média R+B
    tint = (g_avg - (r_avg + b_avg) / 2) * 3.0
    # Saturação baseada no desvio dos canais
    avg_all = (r_avg + g_avg + b_avg) / 3
    deviation = math.sqrt(
        (r_avg - avg_all)**2 +
        (g_avg - avg_all)**2 +
        (b_avg - avg_all)**2
    )
    sat = 0.6 + deviation * 4.0  # normalizado heurístico

    params = {
        "title": film_id,
        "temperature": clamp(temp, -1.0, 1.0),
        "tint": clamp(tint, -1.0, 1.0),
        "saturation": clamp(sat, 0.4, 1.6),
        "contrast": 0.3,
        "lift":  (r_avg * 0.05, g_avg * 0.05, b_avg * 0.05),
        "gamma": (0.9 + r_avg * 0.2, 0.9 + g_avg * 0.2, 0.9 + b_avg * 0.2),
        "gain":  (0.85 + r_avg * 0.3, 0.85 + g_avg * 0.3, 0.85 + b_avg * 0.3),
    }

    print(f"\n  Imagem analisada: {image_path}")
    print(f"  Média RGB: R={r_avg:.3f} G={g_avg:.3f} B={b_avg:.3f}")
    print(f"  Temperatura estimada: {params['temperature']:.3f}")
    print(f"  Tint estimado: {params['tint']:.3f}")
    print(f"  Saturação estimada: {params['saturation']:.3f}")

    write_cube(film_id, params)


# ─────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if "--image" in sys.argv:
        # Modo imagem de referência
        idx = sys.argv.index("--image")
        if idx + 1 >= len(sys.argv):
            print("Uso: python3 generate_luts.py --image ref.jpg --name meu-filme")
            sys.exit(1)
        image_path = sys.argv[idx + 1]

        name_idx = sys.argv.index("--name") if "--name" in sys.argv else -1
        film_id = sys.argv[name_idx + 1] if name_idx >= 0 else "custom"

        lut_from_image(image_path, film_id)

    else:
        # Gera todos os LUTs predefinidos
        print(f"\n🎬 CineLUT Generator — {len(FILM_PROFILES)} filmes\n")
        for film_id, params in FILM_PROFILES.items():
            write_cube(film_id, params)
        print(f"\n✅ {len(FILM_PROFILES)} LUTs gerados em ./{OUTPUT_DIR}/\n")
