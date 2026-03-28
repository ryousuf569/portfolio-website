import { useEffect, useRef, useCallback, useState } from 'react';

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const cb = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, [breakpoint]);
  return mobile;
}

export default function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mobile = useIsMobile();

  const heldKeys = useRef<Set<string>>(new Set());

  const sendKey = useCallback((key: string, type: 'keydown' | 'keyup') => {
    if (type === 'keydown') heldKeys.current.add(key);
    else heldKeys.current.delete(key);
    const iframeWin = iframeRef.current?.contentWindow;
    if (!iframeWin) return;
    iframeWin.dispatchEvent(
      new KeyboardEvent(type, { key, code: key, bubbles: true }),
    );
  }, []);

  const releaseAll = useCallback(() => {
    heldKeys.current.forEach((key) => sendKey(key, 'keyup'));
    heldKeys.current.clear();
  }, [sendKey]);

  useEffect(() => {
    const forward = (e: KeyboardEvent) => {
      const iframeWin = iframeRef.current?.contentWindow;
      if (!iframeWin) return;
      iframeWin.dispatchEvent(
        new KeyboardEvent(e.type, {
          key: e.key,
          code: e.code,
          keyCode: e.keyCode,
          bubbles: true,
        }),
      );
    };
    const onVisChange = () => { if (document.hidden) releaseAll(); };
    window.addEventListener('keydown', forward);
    window.addEventListener('keyup', forward);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.removeEventListener('keydown', forward);
      window.removeEventListener('keyup', forward);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [releaseAll]);

  const dpadDown = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sendKey(key, 'keydown');
  };
  const dpadUp = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sendKey(key, 'keyup');
  };
  const btnTap = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sendKey(key, 'keydown');
    setTimeout(() => sendKey(key, 'keyup'), 80);
  };

  const s = mobile ? mobileStyles : desktopStyles;

  return (
    <div style={s.page}>
      <div style={s.console}>
        {/* Speaker grille */}
        <div style={s.topBar}>
          <div style={s.grille}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={s.grilleSlot} />
            ))}
          </div>
        </div>

        {/* Screen bezel */}
        <div style={s.bezel}>
          <div style={s.led} />
          <div style={s.screenWrap}>
            <iframe
              ref={iframeRef}
              src="/game.html"
              title="Yousuf's Portfolio"
              style={s.iframe}
              tabIndex={0}
            />
            <div style={s.scanlines} />
          </div>
        </div>

        {/* Controls */}
        <div style={s.controls}>
          <div style={s.dpad}>
            <div style={{ ...s.dpadArm, ...s.dpadV }} />
            <div style={{ ...s.dpadArm, ...s.dpadH }} />
            <div style={s.dpadCenter} />
            <div style={s.dpadUp}
              onTouchStart={dpadDown('ArrowUp')} onTouchEnd={dpadUp('ArrowUp')} onTouchCancel={dpadUp('ArrowUp')}
              onMouseDown={dpadDown('ArrowUp')} onMouseUp={dpadUp('ArrowUp')} onMouseLeave={dpadUp('ArrowUp')}>
              <span style={s.dpadArrow}>&#9650;</span>
            </div>
            <div style={s.dpadDownZone}
              onTouchStart={dpadDown('ArrowDown')} onTouchEnd={dpadUp('ArrowDown')} onTouchCancel={dpadUp('ArrowDown')}
              onMouseDown={dpadDown('ArrowDown')} onMouseUp={dpadUp('ArrowDown')} onMouseLeave={dpadUp('ArrowDown')}>
              <span style={s.dpadArrow}>&#9660;</span>
            </div>
            <div style={s.dpadLeft}
              onTouchStart={dpadDown('ArrowLeft')} onTouchEnd={dpadUp('ArrowLeft')} onTouchCancel={dpadUp('ArrowLeft')}
              onMouseDown={dpadDown('ArrowLeft')} onMouseUp={dpadUp('ArrowLeft')} onMouseLeave={dpadUp('ArrowLeft')}>
              <span style={s.dpadArrow}>&#9664;</span>
            </div>
            <div style={s.dpadRight}
              onTouchStart={dpadDown('ArrowRight')} onTouchEnd={dpadUp('ArrowRight')} onTouchCancel={dpadUp('ArrowRight')}
              onMouseDown={dpadDown('ArrowRight')} onMouseUp={dpadUp('ArrowRight')} onMouseLeave={dpadUp('ArrowRight')}>
              <span style={s.dpadArrow}>&#9654;</span>
            </div>
          </div>

          <div style={s.buttons}>
            <div style={{ ...s.btn, ...s.btnA }}
              onTouchStart={btnTap(' ')} onMouseDown={btnTap(' ')}>
              <span style={s.btnLabel}>A</span>
            </div>
            <div style={{ ...s.btn, ...s.btnB }}
              onTouchStart={btnTap('Escape')} onMouseDown={btnTap('Escape')}>
              <span style={s.btnLabel}>B</span>
            </div>
            <div style={{ ...s.btn, ...s.btnC }}
              onTouchStart={btnTap('c')} onMouseDown={btnTap('c')}>
              <span style={s.btnLabel}>C</span>
            </div>
          </div>
        </div>

        <div style={s.label}>
          <span style={s.labelText}>{mobile ? 'PORTFOLIO BOY' : 'PORTFOLIO DS'}</span>
        </div>

        {!mobile && <div style={s.hinge} />}
      </div>
    </div>
  );
}

/* ── shared helpers ── */

const noSelect: React.CSSProperties = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  touchAction: 'none',
} as any;

/* ═══════════════════════════════════════════════════════════
   DESKTOP — wide DS layout
   Deep indigo shell with warm amber accents, sculpted plastic
   ═══════════════════════════════════════════════════════════ */

const D_DPAD = 'min(18vw, 80px)';
const D_DPAD_ZONE = `calc(${D_DPAD} * 0.4)`;

const desktopStyles: Record<string, React.CSSProperties> = {
  page: {
    width: '100vw', height: '100dvh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 40%, #0f1018 0%, #060608 100%)',
    overflow: 'hidden',
  },
  console: {
    width: '96vw', maxWidth: 920, maxHeight: '98dvh',
    background: 'linear-gradient(168deg, #2c3052 0%, #1e2240 40%, #171a30 100%)',
    borderRadius: 'min(28px, 3vw)',
    padding: 'min(1.4vh, 12px) 0',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: `
      0 2px 0 0 rgba(255,255,255,0.08) inset,
      0 -1px 0 0 rgba(0,0,0,0.4) inset,
      0 12px 40px rgba(0,0,0,0.7),
      0 2px 8px rgba(0,0,0,0.5)
    `,
    border: '1.5px solid rgba(255,255,255,0.06)',
    position: 'relative',
    userSelect: 'none', overflow: 'hidden',
  },
  topBar: {
    width: '100%', display: 'flex', justifyContent: 'center',
    marginBottom: 'min(1vh, 8px)',
    padding: '0 min(3vw, 28px)',
  },
  grille: { display: 'flex', gap: 5, alignItems: 'center' },
  grilleSlot: {
    width: 20, height: 2.5, borderRadius: 2,
    background: 'linear-gradient(180deg, #0d0f1a 0%, #181c30 100%)',
    boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.8), 0 0.5px 0 rgba(255,255,255,0.04)',
  },
  bezel: {
    width: '93%',
    background: 'linear-gradient(180deg, #0a0c16 0%, #0e1020 50%, #0a0c16 100%)',
    borderRadius: 'min(14px, 1.5vw)',
    padding: 'min(14px, 1.8vw)',
    position: 'relative',
    boxShadow: `
      inset 0 3px 10px rgba(0,0,0,0.9),
      inset 0 -1px 4px rgba(0,0,0,0.5),
      0 1px 0 rgba(255,255,255,0.05)
    `,
    border: '1px solid rgba(0,0,0,0.4)',
  },
  led: {
    position: 'absolute', top: 8, left: 18,
    width: 7, height: 7, borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #5eff5e, #1aaa1a 60%, #0a6e0a)',
    boxShadow: '0 0 8px rgba(50,220,50,0.6), 0 0 3px rgba(50,220,50,0.9), inset 0 -1px 1px rgba(0,0,0,0.3)',
  },
  screenWrap: {
    position: 'relative', width: '100%',
    aspectRatio: '16 / 10', maxHeight: '60dvh',
    overflow: 'hidden', borderRadius: 6,
    imageRendering: 'pixelated',
    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)',
    border: '1px solid rgba(0,0,0,0.6)',
  },
  iframe: {
    width: '100%', height: '100%', border: 'none', display: 'block',
    background: '#000', imageRendering: 'pixelated' as any,
  },
  scanlines: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
    mixBlendMode: 'multiply' as any, borderRadius: 6,
  },
  controls: {
    width: '93%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: 'min(2vh, 16px) min(28px, 4vw) min(0.6vh, 4px)',
  },
  dpad: {
    width: D_DPAD, height: D_DPAD, position: 'relative', touchAction: 'none',
  },
  dpadArm: {
    position: 'absolute',
    background: 'linear-gradient(180deg, #1a1e38 0%, #141830 50%, #10132a 100%)',
    borderRadius: 4,
    boxShadow: `
      inset 0 1px 2px rgba(0,0,0,0.6),
      inset 0 -1px 1px rgba(255,255,255,0.03),
      0 1px 3px rgba(0,0,0,0.4)
    `,
    pointerEvents: 'none' as any,
  },
  dpadV: {
    width: `calc(${D_DPAD} * 0.33)`, height: D_DPAD,
    left: `calc(${D_DPAD} * 0.335)`, top: 0,
  },
  dpadH: {
    width: D_DPAD, height: `calc(${D_DPAD} * 0.33)`,
    left: 0, top: `calc(${D_DPAD} * 0.335)`,
  },
  dpadCenter: {
    position: 'absolute',
    width: `calc(${D_DPAD} * 0.2)`, height: `calc(${D_DPAD} * 0.2)`,
    left: `calc(${D_DPAD} * 0.4)`, top: `calc(${D_DPAD} * 0.4)`,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 40% 40%, #222850, #181c38)',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
    pointerEvents: 'none' as any,
    zIndex: 1,
  },
  dpadUp: {
    position: 'absolute' as any,
    width: D_DPAD_ZONE, height: D_DPAD_ZONE,
    left: `calc(${D_DPAD} / 2 - ${D_DPAD_ZONE} / 2)`, top: 0,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
    touchAction: 'none',
  },
  dpadDownZone: {
    position: 'absolute' as any,
    width: D_DPAD_ZONE, height: D_DPAD_ZONE,
    left: `calc(${D_DPAD} / 2 - ${D_DPAD_ZONE} / 2)`, bottom: 0,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
    touchAction: 'none',
  },
  dpadLeft: {
    position: 'absolute' as any,
    width: D_DPAD_ZONE, height: D_DPAD_ZONE,
    left: 0, top: `calc(${D_DPAD} / 2 - ${D_DPAD_ZONE} / 2)`,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
    touchAction: 'none',
  },
  dpadRight: {
    position: 'absolute' as any,
    width: D_DPAD_ZONE, height: D_DPAD_ZONE,
    right: 0, top: `calc(${D_DPAD} / 2 - ${D_DPAD_ZONE} / 2)`,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
    touchAction: 'none',
  },
  dpadArrow: {
    color: 'rgba(120,130,180,0.5)', fontSize: 'min(10px, 2.5vw)', lineHeight: 1,
    pointerEvents: 'none' as any,
    textShadow: '0 1px 1px rgba(0,0,0,0.4)',
  },
  buttons: {
    display: 'flex', gap: 'min(14px, 2.8vw)', alignItems: 'center',
  },
  btn: {
    width: 'min(40px, 8.5vw)', height: 'min(40px, 8.5vw)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', touchAction: 'none',
    border: '1px solid rgba(0,0,0,0.3)',
    transition: 'transform 0.06s ease',
  },
  btnA: {
    background: 'radial-gradient(circle at 38% 32%, #e84a60, #c42b3e 50%, #9a1e30)',
    boxShadow: `
      0 3px 6px rgba(0,0,0,0.5),
      0 1px 2px rgba(0,0,0,0.3),
      inset 0 2px 3px rgba(255,255,255,0.25),
      inset 0 -2px 4px rgba(0,0,0,0.3)
    `,
  },
  btnB: {
    background: 'radial-gradient(circle at 38% 32%, #4a88e8, #2b5ec4 50%, #1e3e9a)',
    boxShadow: `
      0 3px 6px rgba(0,0,0,0.5),
      0 1px 2px rgba(0,0,0,0.3),
      inset 0 2px 3px rgba(255,255,255,0.25),
      inset 0 -2px 4px rgba(0,0,0,0.3)
    `,
  },
  btnC: {
    background: 'radial-gradient(circle at 38% 32%, #4ae870, #2ba84a 50%, #1e8a38)',
    boxShadow: `
      0 3px 6px rgba(0,0,0,0.5),
      0 1px 2px rgba(0,0,0,0.3),
      inset 0 2px 3px rgba(255,255,255,0.25),
      inset 0 -2px 4px rgba(0,0,0,0.3)
    `,
  },
  btnLabel: {
    color: '#fff', fontSize: 'min(13px, 2.6vw)', fontWeight: 800,
    fontFamily: "'Fredoka', 'Nunito', system-ui, sans-serif",
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    pointerEvents: 'none' as any,
    letterSpacing: 0.5,
  },
  label: {
    marginTop: 'min(8px, 1vh)', marginBottom: 'min(4px, 0.5vh)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  labelText: {
    fontSize: 'min(12px, 2.5vw)', fontWeight: 700, letterSpacing: 4, color: 'rgba(160,170,210,0.35)',
    fontFamily: "'Fredoka', 'Nunito', system-ui, sans-serif",
    textTransform: 'uppercase' as any,
    textShadow: '0 -1px 0 rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.03)',
  },
  hinge: {
    position: 'absolute', bottom: 0, left: 'min(30px, 4vw)', right: 'min(30px, 4vw)', height: 4,
    borderRadius: '0 0 6px 6px',
    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 80%, transparent 100%)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
  },
};

/* ═══════════════════════════════════════════════════════════
   MOBILE — vertical Game Boy layout
   Same deep indigo shell, chunky satisfying feel
   ═══════════════════════════════════════════════════════════ */

const M_DPAD = '22vw';
const M_DPAD_ZONE = `calc(${M_DPAD} * 0.42)`;

const mobileStyles: Record<string, React.CSSProperties> = {
  page: {
    width: '100vw', height: '100dvh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 30%, #0f1018 0%, #060608 100%)',
    overflow: 'hidden',
    ...noSelect,
  },
  console: {
    width: '100vw', height: '100dvh',
    background: 'linear-gradient(172deg, #2c3052 0%, #1e2240 35%, #171a30 100%)',
    borderRadius: 0,
    padding: '1.8vh 0 1.2vh',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
    ...noSelect,
  },
  topBar: {
    width: '100%', display: 'flex', justifyContent: 'center',
    marginBottom: '1vh',
  },
  grille: { display: 'flex', gap: 5, alignItems: 'center' },
  grilleSlot: {
    width: 18, height: 2.5, borderRadius: 2,
    background: 'linear-gradient(180deg, #0d0f1a 0%, #181c30 100%)',
    boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.8), 0 0.5px 0 rgba(255,255,255,0.04)',
  },
  bezel: {
    width: '93%',
    background: 'linear-gradient(180deg, #0a0c16 0%, #0e1020 50%, #0a0c16 100%)',
    borderRadius: '3vw',
    padding: '3vw', position: 'relative',
    boxShadow: `
      inset 0 3px 10px rgba(0,0,0,0.9),
      inset 0 -1px 4px rgba(0,0,0,0.5),
      0 1px 0 rgba(255,255,255,0.05)
    `,
    border: '1px solid rgba(0,0,0,0.4)',
    flex: '1 1 auto', minHeight: 0,
    display: 'flex', flexDirection: 'column',
  },
  led: {
    position: 'absolute', top: '2vw', left: '4.5vw',
    width: 6, height: 6, borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #5eff5e, #1aaa1a 60%, #0a6e0a)',
    boxShadow: '0 0 8px rgba(50,220,50,0.6), 0 0 3px rgba(50,220,50,0.9), inset 0 -1px 1px rgba(0,0,0,0.3)',
  },
  screenWrap: {
    position: 'relative', width: '100%',
    flex: '1 1 auto', minHeight: 0,
    overflow: 'hidden', borderRadius: '1.5vw',
    boxShadow: 'inset 0 0 16px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)',
    border: '1px solid rgba(0,0,0,0.5)',
  },
  iframe: {
    width: '100%', height: '100%', border: 'none', display: 'block',
    background: '#000',
  },
  scanlines: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
    mixBlendMode: 'multiply' as any, borderRadius: '1.5vw',
  },
  controls: {
    width: '93%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '2.8vh 3vw 0.8vh',
    flexShrink: 0,
    ...noSelect,
  },
  dpad: {
    width: M_DPAD, height: M_DPAD, position: 'relative',
    ...noSelect,
  },
  dpadArm: {
    position: 'absolute',
    background: 'linear-gradient(180deg, #1a1e38 0%, #141830 50%, #10132a 100%)',
    borderRadius: 4,
    boxShadow: `
      inset 0 1px 2px rgba(0,0,0,0.6),
      inset 0 -1px 1px rgba(255,255,255,0.03),
      0 1px 3px rgba(0,0,0,0.4)
    `,
    pointerEvents: 'none' as any,
  },
  dpadV: {
    width: `calc(${M_DPAD} * 0.33)`, height: M_DPAD,
    left: `calc(${M_DPAD} * 0.335)`, top: 0,
  },
  dpadH: {
    width: M_DPAD, height: `calc(${M_DPAD} * 0.33)`,
    left: 0, top: `calc(${M_DPAD} * 0.335)`,
  },
  dpadCenter: {
    position: 'absolute',
    width: `calc(${M_DPAD} * 0.2)`, height: `calc(${M_DPAD} * 0.2)`,
    left: `calc(${M_DPAD} * 0.4)`, top: `calc(${M_DPAD} * 0.4)`,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 40% 40%, #222850, #181c38)',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
    pointerEvents: 'none' as any,
    zIndex: 1,
  },
  dpadUp: {
    position: 'absolute' as any,
    width: M_DPAD_ZONE, height: M_DPAD_ZONE,
    left: `calc(${M_DPAD} / 2 - ${M_DPAD_ZONE} / 2)`, top: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
    ...noSelect,
  },
  dpadDownZone: {
    position: 'absolute' as any,
    width: M_DPAD_ZONE, height: M_DPAD_ZONE,
    left: `calc(${M_DPAD} / 2 - ${M_DPAD_ZONE} / 2)`, bottom: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
    ...noSelect,
  },
  dpadLeft: {
    position: 'absolute' as any,
    width: M_DPAD_ZONE, height: M_DPAD_ZONE,
    left: 0, top: `calc(${M_DPAD} / 2 - ${M_DPAD_ZONE} / 2)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
    ...noSelect,
  },
  dpadRight: {
    position: 'absolute' as any,
    width: M_DPAD_ZONE, height: M_DPAD_ZONE,
    right: 0, top: `calc(${M_DPAD} / 2 - ${M_DPAD_ZONE} / 2)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
    ...noSelect,
  },
  dpadArrow: {
    color: 'rgba(120,130,180,0.5)', fontSize: '3.2vw', lineHeight: 1,
    pointerEvents: 'none' as any,
    textShadow: '0 1px 1px rgba(0,0,0,0.4)',
    ...noSelect,
  },
  buttons: {
    display: 'flex', gap: '3.5vw', alignItems: 'center',
    ...noSelect,
  },
  btn: {
    width: '11vw', height: '11vw', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(0,0,0,0.3)',
    ...noSelect,
  },
  btnA: {
    background: 'radial-gradient(circle at 38% 32%, #e84a60, #c42b3e 50%, #9a1e30)',
    boxShadow: `
      0 3px 6px rgba(0,0,0,0.5),
      0 1px 2px rgba(0,0,0,0.3),
      inset 0 2px 3px rgba(255,255,255,0.25),
      inset 0 -2px 4px rgba(0,0,0,0.3)
    `,
  },
  btnB: {
    background: 'radial-gradient(circle at 38% 32%, #4a88e8, #2b5ec4 50%, #1e3e9a)',
    boxShadow: `
      0 3px 6px rgba(0,0,0,0.5),
      0 1px 2px rgba(0,0,0,0.3),
      inset 0 2px 3px rgba(255,255,255,0.25),
      inset 0 -2px 4px rgba(0,0,0,0.3)
    `,
  },
  btnC: {
    background: 'radial-gradient(circle at 38% 32%, #4ae870, #2ba84a 50%, #1e8a38)',
    boxShadow: `
      0 3px 6px rgba(0,0,0,0.5),
      0 1px 2px rgba(0,0,0,0.3),
      inset 0 2px 3px rgba(255,255,255,0.25),
      inset 0 -2px 4px rgba(0,0,0,0.3)
    `,
  },
  btnLabel: {
    color: '#fff', fontSize: '3.5vw', fontWeight: 800,
    fontFamily: "'Fredoka', 'Nunito', system-ui, sans-serif",
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    pointerEvents: 'none' as any,
    letterSpacing: 0.5,
    ...noSelect,
  },
  label: { marginTop: '0.6vh', marginBottom: '0.6vh', flexShrink: 0 },
  labelText: {
    fontSize: '3vw', fontWeight: 700, letterSpacing: 4, color: 'rgba(160,170,210,0.35)',
    fontFamily: "'Fredoka', 'Nunito', system-ui, sans-serif",
    textTransform: 'uppercase' as any,
    textShadow: '0 -1px 0 rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.03)',
    ...noSelect,
  },
  hinge: {},
};
