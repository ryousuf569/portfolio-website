import { useEffect, useRef, useCallback } from 'react';

export default function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /* ── helper: send a key event into the iframe ── */
  const sendKey = useCallback((key: string, type: 'keydown' | 'keyup') => {
    const iframeWin = iframeRef.current?.contentWindow;
    if (!iframeWin) return;
    iframeWin.dispatchEvent(
      new KeyboardEvent(type, { key, code: key, bubbles: true }),
    );
  }, []);

  /* forward physical keyboard into iframe */
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
    window.addEventListener('keydown', forward);
    window.addEventListener('keyup', forward);
    return () => {
      window.removeEventListener('keydown', forward);
      window.removeEventListener('keyup', forward);
    };
  }, []);

  /* ── touch helpers (d-pad & buttons) ── */
  const dpadDown = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    sendKey(key, 'keydown');
  };
  const dpadUp = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    sendKey(key, 'keyup');
  };
  const btnTap = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    sendKey(key, 'keydown');
    setTimeout(() => sendKey(key, 'keyup'), 80);
  };

  return (
    <div style={styles.page}>
      {/* DS console shell */}
      <div style={styles.console}>
        {/* Top speaker grille */}
        <div style={styles.topBar}>
          <div style={styles.grille}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={styles.grilleSlot} />
            ))}
          </div>
        </div>

        {/* Screen bezel */}
        <div style={styles.bezel}>
          <div style={styles.led} />
          <div style={styles.screenWrap}>
            <iframe
              ref={iframeRef}
              src="/game.html"
              title="Yousuf's Portfolio"
              style={styles.iframe}
              tabIndex={0}
            />
            <div style={styles.scanlines} />
          </div>
        </div>

        {/* Bottom controls area */}
        <div style={styles.controls}>
          {/* D-pad — 4 interactive zones */}
          <div style={styles.dpad}>
            {/* cross shape background */}
            <div style={{ ...styles.dpadArm, ...styles.dpadV }} />
            <div style={{ ...styles.dpadArm, ...styles.dpadH }} />
            {/* touch zones */}
            <div
              style={styles.dpadUp}
              onTouchStart={dpadDown('ArrowUp')}
              onTouchEnd={dpadUp('ArrowUp')}
              onMouseDown={dpadDown('ArrowUp')}
              onMouseUp={dpadUp('ArrowUp')}
              onMouseLeave={dpadUp('ArrowUp')}
            >
              <span style={styles.dpadArrow}>&#9650;</span>
            </div>
            <div
              style={styles.dpadDownZone}
              onTouchStart={dpadDown('ArrowDown')}
              onTouchEnd={dpadUp('ArrowDown')}
              onMouseDown={dpadDown('ArrowDown')}
              onMouseUp={dpadUp('ArrowDown')}
              onMouseLeave={dpadUp('ArrowDown')}
            >
              <span style={styles.dpadArrow}>&#9660;</span>
            </div>
            <div
              style={styles.dpadLeft}
              onTouchStart={dpadDown('ArrowLeft')}
              onTouchEnd={dpadUp('ArrowLeft')}
              onMouseDown={dpadDown('ArrowLeft')}
              onMouseUp={dpadUp('ArrowLeft')}
              onMouseLeave={dpadUp('ArrowLeft')}
            >
              <span style={styles.dpadArrow}>&#9664;</span>
            </div>
            <div
              style={styles.dpadRight}
              onTouchStart={dpadDown('ArrowRight')}
              onTouchEnd={dpadUp('ArrowRight')}
              onMouseDown={dpadDown('ArrowRight')}
              onMouseUp={dpadUp('ArrowRight')}
              onMouseLeave={dpadUp('ArrowRight')}
            >
              <span style={styles.dpadArrow}>&#9654;</span>
            </div>
          </div>

          {/* A = interact (Space), B = close (Escape), C = open link */}
          <div style={styles.buttons}>
            <div
              style={{ ...styles.btn, background: '#c42b3e' }}
              onTouchStart={btnTap(' ')}
              onMouseDown={btnTap(' ')}
            >
              <span style={styles.btnLabel}>A</span>
            </div>
            <div
              style={{ ...styles.btn, background: '#2b6ec4' }}
              onTouchStart={btnTap('Escape')}
              onMouseDown={btnTap('Escape')}
            >
              <span style={styles.btnLabel}>B</span>
            </div>
            <div
              style={{ ...styles.btn, background: '#2ba84a' }}
              onTouchStart={btnTap('c')}
              onMouseDown={btnTap('c')}
            >
              <span style={styles.btnLabel}>C</span>
            </div>
          </div>
        </div>

        {/* Bottom label */}
        <div style={styles.label}>
          <span style={styles.labelText}>PORTFOLIO DS</span>
        </div>

        <div style={styles.hinge} />
      </div>
    </div>
  );
}

/* ── inline styles ── */

const DPAD = 'min(18vw, 76px)';
const DPAD_ZONE = `calc(${DPAD} * 0.4)`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: '100vw',
    height: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
    overflow: 'hidden',
  },

  console: {
    width: '96vw',
    maxWidth: 900,
    maxHeight: '98dvh',
    background: 'linear-gradient(170deg, #2a2a30 0%, #1a1a20 100%)',
    borderRadius: 'min(24px, 3vw)',
    padding: 'min(1.2vh, 10px) 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow:
      '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
    border: '2px solid #333',
    position: 'relative',
    userSelect: 'none',
    overflow: 'hidden',
  },

  /* top speaker grille */
  topBar: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 'min(1vh, 8px)',
  },
  grille: {
    display: 'flex',
    gap: 4,
  },
  grilleSlot: {
    width: 18,
    height: 3,
    borderRadius: 1,
    background: '#111',
    boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)',
  },

  /* screen bezel */
  bezel: {
    width: '94%',
    background: '#111',
    borderRadius: 10,
    padding: 'min(12px, 1.5vw)',
    position: 'relative',
    boxShadow:
      'inset 0 2px 8px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.04)',
  },

  led: {
    position: 'absolute',
    top: 6,
    left: 16,
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#2d2',
    boxShadow: '0 0 6px #2d2',
  },

  screenWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 10',
    maxHeight: '60dvh',
    overflow: 'hidden',
    borderRadius: 4,
    imageRendering: 'pixelated',
  },

  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
    background: '#000',
    imageRendering: 'pixelated' as any,
  },

  /* scanline overlay */
  scanlines: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage:
      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
    mixBlendMode: 'multiply' as any,
    borderRadius: 4,
  },

  /* bottom controls */
  controls: {
    width: '94%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'min(1.8vh, 14px) min(28px, 4vw) min(0.6vh, 4px)',
  },

  /* D-pad */
  dpad: {
    width: DPAD,
    height: DPAD,
    position: 'relative',
    touchAction: 'none',
  },
  dpadArm: {
    position: 'absolute',
    background: '#222',
    borderRadius: 3,
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
    pointerEvents: 'none' as any,
  },
  dpadV: {
    width: `calc(${DPAD} * 0.31)`,
    height: DPAD,
    left: `calc(${DPAD} * 0.345)`,
    top: 0,
  },
  dpadH: {
    width: DPAD,
    height: `calc(${DPAD} * 0.31)`,
    left: 0,
    top: `calc(${DPAD} * 0.345)`,
  },
  /* d-pad touch zones — positioned over each arm end */
  dpadUp: {
    position: 'absolute' as any,
    width: DPAD_ZONE,
    height: DPAD_ZONE,
    left: `calc(${DPAD} / 2 - ${DPAD_ZONE} / 2)`,
    top: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    touchAction: 'none',
  },
  dpadDownZone: {
    position: 'absolute' as any,
    width: DPAD_ZONE,
    height: DPAD_ZONE,
    left: `calc(${DPAD} / 2 - ${DPAD_ZONE} / 2)`,
    bottom: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    touchAction: 'none',
  },
  dpadLeft: {
    position: 'absolute' as any,
    width: DPAD_ZONE,
    height: DPAD_ZONE,
    left: 0,
    top: `calc(${DPAD} / 2 - ${DPAD_ZONE} / 2)`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    touchAction: 'none',
  },
  dpadRight: {
    position: 'absolute' as any,
    width: DPAD_ZONE,
    height: DPAD_ZONE,
    right: 0,
    top: `calc(${DPAD} / 2 - ${DPAD_ZONE} / 2)`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    touchAction: 'none',
  },
  dpadArrow: {
    color: '#555',
    fontSize: 'min(10px, 2.5vw)',
    lineHeight: 1,
    pointerEvents: 'none' as any,
  },

  /* A/B buttons */
  buttons: {
    display: 'flex',
    gap: 'min(12px, 2.5vw)',
    alignItems: 'center',
  },
  btn: {
    width: 'min(36px, 8vw)',
    height: 'min(36px, 8vw)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow:
      '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15)',
    cursor: 'pointer',
    touchAction: 'none',
  },
  btnLabel: {
    color: '#fff',
    fontSize: 'min(12px, 2.5vw)',
    fontWeight: 700,
    fontFamily: 'system-ui, sans-serif',
    textShadow: '0 1px 1px rgba(0,0,0,0.4)',
    pointerEvents: 'none' as any,
  },

  /* label */
  label: {
    marginTop: 'min(8px, 1vh)',
    marginBottom: 'min(2px, 0.3vh)',
  },
  labelText: {
    fontSize: 'min(11px, 2.5vw)',
    fontWeight: 700,
    letterSpacing: 3,
    color: '#555',
    fontFamily: 'system-ui, sans-serif',
    textTransform: 'uppercase' as any,
  },

  /* hinge line */
  hinge: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    borderRadius: '0 0 4px 4px',
    background:
      'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
  },
};
