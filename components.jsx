// components.jsx — Cinematic frame placeholders + building blocks

// A "film frame" placeholder. Instead of recreating copyrighted movie stills,
// these are stylized color-grade mood swatches — the way a colorist might
// sketch a look before finding reference. Each has:
//   - a gradient (the grade)
//   - optional film grain
//   - optional vignette
//   - optional letterbox bars
//   - a mono label describing the mood

function CinemaFrame({
  gradient,
  label,
  code,
  bars = false,
  vignette = true,
  grain = true,
  bg = "#1a1a1a",
  children,
  className = "",
  style = {},
}) {
  return (
    <div className={`frame ${className}`} style={{ background: bg, ...style }}>
      <div className="frame-gradient" style={{ background: gradient }} />
      {vignette && <div className="frame-vignette" />}
      {grain && <div className="frame-grain" />}
      {bars && <div className="frame-bars" />}
      {(label || code) && (
        <div className="frame-label">
          <span className="tag">{label}</span>
          {code && <span className="tag">{code}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

// A palette of canned "looks". These are intentionally abstract so we're
// not recreating any specific copyrighted frame — they evoke well-known
// color-grading approaches (teal & orange, pastel, neon noir, desaturated,
// golden hour, etc.)
const LOOKS = {
  tealOrange: {
    gradient:
      "linear-gradient(135deg, #0a2a38 0%, #1a4a5e 35%, #d97543 75%, #f2b278 100%)",
    label: "TEAL × ORANGE",
    code: "LUT · 01",
  },
  desertWarm: {
    gradient:
      "linear-gradient(180deg, #2a1a10 0%, #8b4a1f 40%, #e8a457 75%, #f5d28e 100%)",
    label: "DESERT WARM",
    code: "LUT · 02",
  },
  neonNoir: {
    gradient:
      "linear-gradient(135deg, #0a0020 0%, #2a0048 30%, #8a1a6a 60%, #ff3b82 95%)",
    label: "NEON NOIR",
    code: "LUT · 03",
  },
  pastelSymmetry: {
    gradient:
      "linear-gradient(180deg, #f4c6a0 0%, #e89a6a 35%, #d4746a 65%, #a05a72 100%)",
    label: "PASTEL SYMMETRY",
    code: "LUT · 04",
  },
  bleachBypass: {
    gradient:
      "linear-gradient(180deg, #d8d4c8 0%, #948c7e 40%, #4a4638 80%, #1a1814 100%)",
    label: "BLEACH BYPASS",
    code: "LUT · 05",
  },
  kodakWarm: {
    gradient:
      "linear-gradient(135deg, #1a0e08 0%, #5c3418 40%, #b87a3a 70%, #f0c878 100%)",
    label: "KODAK 5219",
    code: "LUT · 06",
  },
  greenMist: {
    gradient:
      "linear-gradient(180deg, #0a1a12 0%, #1e4028 40%, #5a8458 75%, #a8c098 100%)",
    label: "FOREST MIST",
    code: "LUT · 07",
  },
  cyberRain: {
    gradient:
      "linear-gradient(135deg, #050818 0%, #0a2448 30%, #1a6ab8 60%, #5ac8f0 95%)",
    label: "CYBER RAIN",
    code: "LUT · 08",
  },
  sovietGray: {
    gradient:
      "linear-gradient(180deg, #2a2a2e 0%, #4a4a50 45%, #8a8a8e 80%, #b8b8b8 100%)",
    label: "SILVER HALIDE",
    code: "LUT · 09",
  },
  goldenHour: {
    gradient:
      "linear-gradient(180deg, #1a0608 0%, #6a1a18 30%, #d06a1a 65%, #f5d078 95%)",
    label: "GOLDEN HOUR",
    code: "LUT · 10",
  },
  moonlitBlue: {
    gradient:
      "linear-gradient(180deg, #050818 0%, #0a1e3a 40%, #1a4a7e 75%, #6a8ab8 100%)",
    label: "MOONLIT BLUE",
    code: "LUT · 11",
  },
  crimsonNight: {
    gradient:
      "linear-gradient(135deg, #0a0508 0%, #2a080e 35%, #8a1a2a 70%, #d83a4a 100%)",
    label: "CRIMSON NIGHT",
    code: "LUT · 12",
  },
  flatLog: {
    gradient:
      "linear-gradient(180deg, #2a2824 0%, #484540 50%, #68645c 80%, #807c74 100%)",
    label: "S-LOG · UNGRADED",
    code: "ORIGINAL",
  },
};

// Hook: reveal on scroll via IntersectionObserver
function useReveal(ref, options = {}) {
  React.useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("in");
            io.unobserve(el);
          }
        });
      },
      { threshold: options.threshold ?? 0.15, rootMargin: options.rootMargin ?? "0px 0px -60px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
}

function Reveal({ children, delay = 0, as: Tag = "div", className = "", style = {}, ...rest }) {
  const ref = React.useRef(null);
  useReveal(ref);
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Hook: parallax zoom/translate based on element's scroll position within viewport
function useParallax(ref, { zoom = 0.15, translate = 0, axis = "y" } = {}) {
  React.useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    let raf = null;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress -1 (below) .. 0 (centered) .. 1 (above)
      const center = rect.top + rect.height / 2;
      const progress = (center - vh / 2) / (vh / 2 + rect.height / 2);
      const clamped = Math.max(-1, Math.min(1, progress));
      // distance from center, 0..1
      const dist = Math.abs(clamped);
      // scale max when centered
      const scale = 1 + zoom * (1 - dist);
      const shift = -clamped * translate;
      const target = el.querySelector(".frame-inner") || el;
      if (axis === "y") {
        target.style.transform = `translate3d(0, ${shift}px, 0) scale(${scale})`;
      } else {
        target.style.transform = `translate3d(${shift}px, 0, 0) scale(${scale})`;
      }
      raf = null;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}

// expose
Object.assign(window, { CinemaFrame, LOOKS, Reveal, useReveal, useParallax });
