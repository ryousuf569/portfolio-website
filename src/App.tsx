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
            {Array.from({ length: 6 }).map((_, i) => (
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
            <div style={{ ...s.btn, background: '#c42b3e' }}
              onTouchStart={btnTap(' ')} onMouseDown={btnTap(' ')}>
              <span style={s.btnLabel}>A</span>
            </div>
            <div style={{ ...s.btn, background: '#2b6ec4' }}
              onTouchStart={btnTap('Escape')} onMouseDown={btnTap('Escape')}>
              <span style={s.btnLabel}>B</span>
            </div>
            <div style={{ ...s.btn, background: '#2ba84a' }}
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
   DESKTOP — wide DS layout (original)
   ═══════════════════════════════════════════════════════════ */

const D_DPAD = 'min(18vw, 76px)';
const D_DPAD_ZONE = `calc(${D_DPAD} * 0.4)`;

const desktopStyles: Record<string, React.CSSProperties> = {
  page: {
    width: '100vw', height: '100dvh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0a0a0f', overflow: 'hidden',
  },
  console: {
    width: '96vw', maxWidth: 900, maxHeight: '98dvh',
    background: 'linear-gradient(170deg, #2a2a30 0%, #1a1a20 100%)',
    borderRadius: 'min(24px, 3vw)',
    padding: 'min(1.2vh, 10px) 0',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
    border: '2px solid #333', position: 'relative',
    userSelect: 'none', overflow: 'hidden',
  },
  topBar: {
    width: '100%', display: 'flex', justifyContent: 'center',
    marginBottom: 'min(1vh, 8px)',
  },
  grille: { display: 'flex', gap: 4 },
  grilleSlot: {
    width: 18, height: 3, borderRadius: 1,
    background: '#111', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)',
  },
  bezel: {
    width: '94%', background: '#111', borderRadius: 10,
    padding: 'min(12px, 1.5vw)', position: 'relative',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.04)',
  },
  led: {
    position: 'absolute', top: 6, left: 16,
    width: 6, height: 6, borderRadius: '50%',
    background: '#2d2', boxShadow: '0 0 6px #2d2',
  },
  screenWrap: {
    position: 'relative', width: '100%',
    aspectRatio: '16 / 10', maxHeight: '60dvh',
    overflow: 'hidden', borderRadius: 4,
    imageRendering: 'pixelated',
  },
  iframe: {
    width: '100%', height: '100%', border: 'none', display: 'block',
    background: '#000', imageRendering: 'pixelated' as any,
  },
  scanlines: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
    mixBlendMode: 'multiply' as any, borderRadius: 4,
  },
  controls: {
    width: '94%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: 'min(1.8vh, 14px) min(28px, 4vw) min(0.6vh, 4px)',
  },
  dpad: {
    width: D_DPAD, height: D_DPAD, position: 'relative', touchAction: 'none',
  },
  dpadArm: {
    position: 'absolute', background: '#222', borderRadius: 3,
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)', pointerEvents: 'none' as any,
  },
  dpadV: {
    width: `calc(${D_DPAD} * 0.31)`, height: D_DPAD,
    left: `calc(${D_DPAD} * 0.345)`, top: 0,
  },
  dpadH: {
    width: D_DPAD, height: `calc(${D_DPAD} * 0.31)`,
    left: 0, top: `calc(${D_DPAD} * 0.345)`,
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
    color: '#555', fontSize: 'min(10px, 2.5vw)', lineHeight: 1,
    pointerEvents: 'none' as any,
  },
  buttons: {
    display: 'flex', gap: 'min(12px, 2.5vw)', alignItems: 'center',
  },
  btn: {
    width: 'min(36px, 8vw)', height: 'min(36px, 8vw)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15)',
    cursor: 'pointer', touchAction: 'none',
  },
  btnLabel: {
    color: '#fff', fontSize: 'min(12px, 2.5vw)', fontWeight: 700,
    fontFamily: 'system-ui, sans-serif',
    textShadow: '0 1px 1px rgba(0,0,0,0.4)', pointerEvents: 'none' as any,
  },
  label: { marginTop: 'min(8px, 1vh)', marginBottom: 'min(2px, 0.3vh)' },
  labelText: {
    fontSize: 'min(11px, 2.5vw)', fontWeight: 700, letterSpacing: 3, color: '#555',
    fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase' as any,
  },
  hinge: {
    position: 'absolute', bottom: 0, left: 20, right: 20, height: 3,
    borderRadius: '0 0 4px 4px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
  },
};

/* ═══════════════════════════════════════════════════════════
   MOBILE — vertical Game Boy layout
   ═══════════════════════════════════════════════════════════ */

const M_DPAD = '22vw';
const M_DPAD_ZONE = `calc(${M_DPAD} * 0.42)`;

const mobileStyles: Record<string, React.CSSProperties> = {
  page: {
    width: '100vw', height: '100dvh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0a0a0f', overflow: 'hidden',
    ...noSelect,
  },
  console: {
    width: '100vw', height: '100dvh',
    background: 'linear-gradient(170deg, #2a2a30 0%, #1a1a20 100%)',
    borderRadius: 0,
    padding: '1.5vh 0 1vh',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
    ...noSelect,
  },
  topBar: {
    width: '100%', display: 'flex', justifyContent: 'center',
    marginBottom: '0.8vh',
  },
  grille: { display: 'flex', gap: 4 },
  grilleSlot: {
    width: 16, height: 2, borderRadius: 1,
    background: '#111', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)',
  },
  bezel: {
    width: '94%', background: '#111', borderRadius: '2.5vw',
    padding: '2.5vw', position: 'relative',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
    flex: '1 1 auto', minHeight: 0,
    display: 'flex', flexDirection: 'column',
  },
  led: {
    position: 'absolute', top: '1.5vw', left: '3.5vw',
    width: 5, height: 5, borderRadius: '50%',
    background: '#2d2', boxShadow: '0 0 6px #2d2',
  },
  screenWrap: {
    position: 'relative', width: '100%',
    flex: '1 1 auto', minHeight: 0,
    overflow: 'hidden', borderRadius: '1vw',
  },
  iframe: {
    width: '100%', height: '100%', border: 'none', display: 'block',
    background: '#000',
  },
  scanlines: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
    mixBlendMode: 'multiply' as any, borderRadius: '1vw',
  },
  controls: {
    width: '94%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '2.5vh 3vw 0.5vh',
    flexShrink: 0,
    ...noSelect,
  },
  dpad: {
    width: M_DPAD, height: M_DPAD, position: 'relative',
    ...noSelect,
  },
  dpadArm: {
    position: 'absolute', background: '#222', borderRadius: 3,
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)', pointerEvents: 'none' as any,
  },
  dpadV: {
    width: `calc(${M_DPAD} * 0.31)`, height: M_DPAD,
    left: `calc(${M_DPAD} * 0.345)`, top: 0,
  },
  dpadH: {
    width: M_DPAD, height: `calc(${M_DPAD} * 0.31)`,
    left: 0, top: `calc(${M_DPAD} * 0.345)`,
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
    color: '#555', fontSize: '3vw', lineHeight: 1,
    pointerEvents: 'none' as any, ...noSelect,
  },
  buttons: {
    display: 'flex', gap: '3vw', alignItems: 'center',
    ...noSelect,
  },
  btn: {
    width: '10vw', height: '10vw', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15)',
    ...noSelect,
  },
  btnLabel: {
    color: '#fff', fontSize: '3.2vw', fontWeight: 700,
    fontFamily: 'system-ui, sans-serif',
    textShadow: '0 1px 1px rgba(0,0,0,0.4)', pointerEvents: 'none' as any,
    ...noSelect,
  },
  label: { marginTop: '0.5vh', marginBottom: '0.5vh', flexShrink: 0 },
  labelText: {
    fontSize: '2.8vw', fontWeight: 700, letterSpacing: 3, color: '#555',
    fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase' as any,
    ...noSelect,
  },
  hinge: {},
};
