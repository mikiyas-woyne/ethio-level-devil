export default function App() {
  return (
    <div className="app-shell">
      {/* TOP CONTROL BAR (Settings Dropdown) */}
      <div id="topbar">
        <button id="btn-settings" className="ic-btn" aria-label="Settings" title="Settings / ቅንብሮች">
          <span id="ic-settings">⚙️</span>
        </button>
        <div id="settings-dropdown" className="settings-dropdown hidden">
          <button id="btn-char" className="sd-item" aria-label="Toggle character" title="Toggle Character">
            <span id="ic-char">🧑🏽</span>
            <span id="pic-char-label">ባህሪ (Character)</span>
          </button>
          <button id="btn-counter" className="sd-item active" aria-label="Toggle death counter" title="Toggle Ge'ez Death Counter">
            <span id="ic-counter">፩</span>
            <span>ግዕዝ ቆጣሪ (Counter)</span>
          </button>
          <button id="btn-theme" className="sd-item" aria-label="Toggle theme" title="Toggle Light/Dark Theme">
            <span id="ic-theme">🌙</span>
            <span>ገጽታ (Theme)</span>
          </button>
          <button id="btn-mute" className="sd-item" aria-label="Toggle sound" title="Toggle Sound">
            <span id="ic-mute">🔊</span>
            <span>ድምፅ (Sound)</span>
          </button>
          <button id="btn-fs" className="sd-item" aria-label="Toggle fullscreen" title="Toggle Fullscreen">
            <span id="ic-fs">⛶</span>
            <span>ሙሉ ስክሪን (Full)</span>
          </button>
        </div>
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
            <div className="pause-badge">ቃርያ · ETHIO DEVIL</div>
            <h2 className="pause-title">ጨዋታው ቆሟል</h2>
            <p className="pause-title-sub">GAME PAUSED</p>
            <p id="pause-level-info" className="pause-sub">LEVEL 1: NOTHING TO SEE HERE</p>

            {/* Death Stats Card inside Pause Menu */}
            <div className="pause-stats-card">
              <div className="pause-stat-geez">
                <span className="geez-label">የሞት ብዛት</span>
                <span id="pause-geez-deaths" className="geez-numeral">0</span>
              </div>
              <div className="pause-stat-total">
                <span className="skull">&#9760;</span>
                <span id="pause-level-deaths">0</span> LEVEL DEATHS / <span id="pause-total-deaths">0</span> TOTAL
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pause-actions">
              <button id="pause-resume-btn" className="pause-action-btn primary">
                ▶ ቀጥል (RESUME)
              </button>
              <button id="pause-restart-btn" className="pause-action-btn secondary">
                ↻ እንደገና ጀምር (RESTART)
              </button>
              <button id="pause-skip-btn" className="pause-action-btn skip disabled" disabled title="Requires >10 deaths on this level">
                <span className="skip-btn-label">⏭ ደረጃውን ይለፉ (SKIP LEVEL)</span>
                <span id="pause-skip-counter" className="skip-counter">(0/10 deaths)</span>
              </button>
              <button id="pause-menu-btn" className="pause-action-btn danger">
                ☰ ዋና ማውጫ (MAIN MENU)
              </button>
            </div>

            {/* Settings & Options inside Pause Menu */}
            <div className="pause-settings-title">ቅንብሮች (SETTINGS)</div>
            <div className="pause-settings-grid">
              <button id="pbtn-char" className="p-setting-btn" title="Toggle Character">
                <span id="pic-char">🧑🏽 ባህሪ</span>
              </button>
              <button id="pbtn-counter" className="p-setting-btn" title="Toggle Ge'ez Death Display">
                <span id="pic-counter">🇪🇹 ግዕዝ ቆጣሪ</span>
              </button>
              <button id="pbtn-theme" className="p-setting-btn" title="Toggle Light/Dark Theme">
                <span id="pic-theme">🌙 ገጽታ</span>
              </button>
              <button id="pbtn-mute" className="p-setting-btn" title="Toggle Sound">
                <span id="pic-mute">🔊 ድምፅ</span>
              </button>
              <button id="pbtn-fs" className="p-setting-btn" title="Toggle Fullscreen">
                <span id="pic-fs">⛶ ሙሉ ስክሪን</span>
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
            <p className="subtitle">60 unpredictable levels · 60 አዝናኝና አስደናቂ ደረጃዎች</p>
            <div className="culture-route" aria-label="Ethiopian places featured in the game">
              <span>SIMIEN</span><i></i><span>AXUM</span><i></i><span>LALIBELA</span><i></i><span>GONDAR</span><i></i><span>HARAR</span><i></i><span>TANA</span>
            </div>

            <button id="play-btn">ጉዞ ይጀምሩ · START JOURNEY</button>
            <div className="grid-heading">
              <span>60 LEVEL CAMPAIGN</span>
              <span className="grid-heading-amharic">የ60 ደረጃዎች ጉዞ</span>
            </div>
            <div id="level-grid"></div>
            <p className="menu-deaths">
              የሞት ብዛት · TOTAL DEATHS: <span id="menu-deaths">0</span>
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
              እንኳን ደስ አለዎት!<br />YOU CONQUERED ETHIO LEVEL DEVIL
            </h1>
            <p className="end-sub">የ60ዎቹንም ደረጃዎች በድል አጠናቅቀዋል · VICTORY ACROSS ETHIOPIA</p>
            <p className="end-stats">
              የሞት ብዛት: <span id="end-deaths">0</span> times. <span id="end-roast"></span>
            </p>
            <button id="end-menu-btn">ወደ ዋና ማውጫ · BACK TO MENU</button>
          </div>
        </div>
      </div>

      {/* TOUCH CONTROLS (mobile only) */}
      <div id="touch-controls" className="hidden">
        <div className="tc-group tc-move">
          <button id="tc-left" className="tc-btn" aria-label="Move left">
            <svg viewBox="0 0 24 24" width="36" height="36">
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
            <svg viewBox="0 0 24 24" width="36" height="36">
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
          <button id="tc-jump" className="tc-btn tc-jump" aria-label="Jump">
            <svg viewBox="0 0 24 24" width="44" height="44">
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
