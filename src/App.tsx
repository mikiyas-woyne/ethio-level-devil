import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Check if script already exists to avoid duplicate script injection
    let script = document.getElementById('level-devil-game-script') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'level-devil-game-script';
      script.src = '/game.js';
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      // Cleanup script on unmount if necessary
    };
  }, []);

  return (
    <div className="app-shell">
      {/* TOP CONTROL BAR (always visible) */}
      <div id="topbar">
        <button id="btn-char" className="ic-btn" aria-label="Toggle character" title="Toggle Character">
          <span id="ic-char"></span>
        </button>
        <button id="btn-counter" className="ic-btn active" aria-label="Toggle death counter" title="Toggle Ge'ez Death Counter">
          <span id="ic-counter"></span>
        </button>
        <button id="btn-theme" className="ic-btn" aria-label="Toggle theme">
          <span id="ic-theme"></span>
        </button>
        <button id="btn-mute" className="ic-btn" aria-label="Toggle sound">
          <span id="ic-mute"></span>
        </button>
        <button id="btn-fs" className="ic-btn" aria-label="Toggle fullscreen">
          <span id="ic-fs"></span>
        </button>
      </div>

      <div id="stage">
        <canvas id="game" width={960} height={540}></canvas>

        {/* HUD */}
        <div id="hud" className="hidden">
          <div className="hud-left">
            <span id="hud-levelnum" className="pill">
              1
            </span>
            <span id="hud-levelname">NOTHING TO SEE HERE</span>
          </div>
          <div className="hud-right">
            <button id="btn-pause" className="pause-btn" aria-label="Pause game" title="Pause Game (ESC / P)">
              <span className="pause-icon">⏸</span>
              <span className="pause-text">PAUSE</span>
            </button>
          </div>
        </div>

        {/* PAUSE MENU MODAL */}
        <div id="pause-menu" className="hidden">
          <div className="menu-inner pause-inner">
            <div className="pause-badge">ቃርያ</div>
            <h2 className="pause-title">GAME PAUSED</h2>
            <p id="pause-level-info" className="pause-sub">LEVEL 1: NOTHING TO SEE HERE</p>

            {/* Death Stats Card inside Pause Menu */}
            <div className="pause-stats-card">
              <div className="pause-stat-geez">
                <span className="geez-label">የሞት ብዛት</span>
                <span id="pause-geez-deaths" className="geez-numeral">0</span>
              </div>
              <div className="pause-stat-total">
                <span className="skull">&#9760;</span>
                <span id="pause-total-deaths">0</span> TOTAL DEATHS
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pause-actions">
              <button id="pause-resume-btn" className="pause-action-btn primary">
                ▶ RESUME
              </button>
              <button id="pause-restart-btn" className="pause-action-btn secondary">
                ↻ RESTART LEVEL
              </button>
              <button id="pause-menu-btn" className="pause-action-btn danger">
                ☰ MAIN MENU
              </button>
            </div>

            {/* Settings & Options inside Pause Menu */}
            <div className="pause-settings-title">SETTINGS & OPTIONS</div>
            <div className="pause-settings-grid">
              <button id="pbtn-char" className="p-setting-btn" title="Toggle Character">
                <span id="pic-char">🧑🏽 Character</span>
              </button>
              <button id="pbtn-counter" className="p-setting-btn" title="Toggle Ge'ez Death Display">
                <span id="pic-counter">🇪🇹 Ge'ez Counter</span>
              </button>
              <button id="pbtn-theme" className="p-setting-btn" title="Toggle Light/Dark Theme">
                <span id="pic-theme">🌙 Theme</span>
              </button>
              <button id="pbtn-mute" className="p-setting-btn" title="Toggle Sound">
                <span id="pic-mute">🔊 Sound</span>
              </button>
              <button id="pbtn-fs" className="p-setting-btn" title="Toggle Fullscreen">
                <span id="pic-fs">⛶ Fullscreen</span>
              </button>
            </div>
          </div>
        </div>

        {/* MENU */}
        <div id="menu">
          <div className="menu-inner">
            <div className="brand-mark" aria-hidden="true">
              <span className="brand-mark-center">✦</span>
            </div>
            <h1 className="title">
              <span className="title-amharic">ቃርያ</span>
              <span className="title-english">ETHIO LEVEL DEVIL</span>
            </h1>
            <p className="subtitle">60 unpredictable levels · one Ethiopian journey</p>
            <div className="culture-route" aria-label="Ethiopian places featured in the game">
              <span>SIMIEN</span><i></i><span>AXUM</span><i></i><span>LALIBELA</span><i></i><span>GONDAR</span><i></i><span>HARAR</span><i></i><span>TANA</span>
            </div>

            <button id="play-btn">START JOURNEY</button>
            <div className="grid-heading">
              <span>60 LEVEL CAMPAIGN</span>
              <span className="grid-heading-amharic">ኢትዮጵያ</span>
            </div>
            <div id="level-grid"></div>
            <p className="menu-deaths">
              የሞት ብዛት · total deaths: <span id="menu-deaths">0</span>
            </p>
            <p className="controls-hint">
              &larr; &rarr; / A D move &nbsp;&middot;&nbsp; &uarr; / W / SPACE jump &nbsp;&middot;&nbsp; T theme
            </p>
          </div>
        </div>

        {/* END SCREEN */}
        <div id="end-screen" className="hidden">
          <div className="menu-inner">
            <h1 className="end-title">
              YOU CONQUERED<br />ETHIO LEVEL DEVIL
            </h1>
            <p className="end-sub">እንኳን ደስ አለዎት · victory across Ethiopia.</p>
            <p className="end-stats">
              you died <span id="end-deaths">0</span> times. <span id="end-roast"></span>
            </p>
            <button id="end-menu-btn">BACK TO MENU</button>
          </div>
        </div>
      </div>

      {/* TOUCH CONTROLS (mobile only) */}
      <div id="touch-controls" className="hidden">
        <div className="tc-group tc-move">
          <button id="tc-left" className="tc-btn" aria-label="Move left">
            <svg viewBox="0 0 24 24" width="30" height="30">
              <path
                d="M15 5 L7 12 L15 19"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button id="tc-right" className="tc-btn" aria-label="Move right">
            <svg viewBox="0 0 24 24" width="30" height="30">
              <path
                d="M9 5 L17 12 L9 19"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="tc-group tc-actions">
          <button id="tc-restart" className="tc-btn tc-small" aria-label="Restart level">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                d="M4 12 a8 8 0 1 1 2.4 5.7 M4 12 V6 M4 12 H10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button id="tc-jump" className="tc-btn tc-jump" aria-label="Jump">
            <svg viewBox="0 0 24 24" width="34" height="34">
              <path
                d="M5 15 L12 7 L19 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* portrait rotate hint */}
      <div id="rotate-hint">↻ rotate your phone for a bigger view</div>
    </div>
  );
}
