import { useState, useEffect } from 'react';
import './UtilsPanel.css';

// ===== TINY TEXT DATA =====
const SMALL_CAPS = {
  'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ',
  'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ',
  'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ',
  's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x',
  'y': 'ʏ', 'z': 'ᴢ',
};
const SUPERSCRIPT = {
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ',
  'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ',
  'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'q': 'q', 'r': 'ʳ',
  's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ',
  'y': 'ʸ', 'z': 'ᶻ',
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};
const SUBSCRIPT = {
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
  'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
  's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
};
const FULLWIDTH = {};
for (let i = 33; i <= 126; i++) {
  FULLWIDTH[String.fromCharCode(i)] = String.fromCharCode(i + 0xFEE0);
}
FULLWIDTH[' '] = '\u3000';

function convert(text, map) {
  return text.toLowerCase().split('').map(ch => map[ch] || ch).join('');
}
function convertFullwidth(text) {
  return text.split('').map(ch => FULLWIDTH[ch] || ch).join('');
}

// ===== MC COLOR KEY DATA =====
const MC_COLOR_CODES = [
  { code: '0', name: 'Black', color: '#000000' },
  { code: '1', name: 'Dark Blue', color: '#0000AA' },
  { code: '2', name: 'Dark Green', color: '#00AA00' },
  { code: '3', name: 'Dark Aqua', color: '#00AAAA' },
  { code: '4', name: 'Dark Red', color: '#AA0000' },
  { code: '5', name: 'Dark Purple', color: '#AA00AA' },
  { code: '6', name: 'Gold', color: '#FFAA00' },
  { code: '7', name: 'Gray', color: '#AAAAAA' },
  { code: '8', name: 'Dark Gray', color: '#555555' },
  { code: '9', name: 'Blue', color: '#5555FF' },
  { code: 'a', name: 'Green', color: '#55FF55' },
  { code: 'b', name: 'Aqua', color: '#55FFFF' },
  { code: 'c', name: 'Red', color: '#FF5555' },
  { code: 'd', name: 'Light Purple', color: '#FF55FF' },
  { code: 'e', name: 'Yellow', color: '#FFFF55' },
  { code: 'f', name: 'White', color: '#FFFFFF' },
];
const MC_FORMAT_CODES = [
  { code: 'l', name: 'Bold' },
  { code: 'o', name: 'Italic' },
  { code: 'n', name: 'Underline' },
  { code: 'm', name: 'Strikethrough' },
  { code: 'k', name: 'Obfuscated' },
  { code: 'r', name: 'Reset' },
];

// ===== COMING SOON ITEMS =====
const COMING_SOON = [
  'Gradient Generator',
  'MOTD Preview',
  'JSON Text Builder',
  'Scoreboard Formatter',
  'Hologram Text',
  'Sign Editor',
  'Book Formatter',
];

// Load saved state from localStorage
function loadUtilsState() {
  try {
    return JSON.parse(localStorage.getItem('mcstyle_utils') || '{}');
  } catch { return {}; }
}

function saveUtilsState(state) {
  localStorage.setItem('mcstyle_utils', JSON.stringify(state));
}

// ===== COLLAPSIBLE SECTION =====
function UtilSection({ id, title, disabled, savedState, onStateChange, children }) {
  const [expanded, setExpanded] = useState(savedState?.expanded ?? false);

  const toggle = () => {
    if (disabled) return;
    const next = !expanded;
    setExpanded(next);
    onStateChange(id, { ...savedState, expanded: next });
  };

  return (
    <div className={`util-section ${expanded ? 'expanded' : ''} ${disabled ? 'disabled' : ''}`}>
      <button className="util-section-header" onClick={toggle}>
        <span className="util-section-title">{title}</span>
        {disabled ? (
          <span className="util-coming-soon">Coming Soon</span>
        ) : (
          <span className="util-chevron">{expanded ? '−' : '+'}</span>
        )}
      </button>
      {expanded && !disabled && (
        <div className="util-section-body">
          {children}
        </div>
      )}
    </div>
  );
}

// ===== TINY TEXT UTILITY =====
function TinyTextUtil({ savedState, onStateChange }) {
  const [input, setInput] = useState(savedState?.input || '');
  const [copiedId, setCopiedId] = useState(null);

  const handleInput = (val) => {
    setInput(val);
    onStateChange({ ...savedState, input: val });
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    }).catch(() => {});
  };

  const results = [
    { id: 'smallcaps', label: 'Small Caps', text: convert(input, SMALL_CAPS) },
    { id: 'superscript', label: 'Superscript', text: convert(input, SUPERSCRIPT) },
    { id: 'subscript', label: 'Subscript', text: convert(input, SUBSCRIPT) },
  ];

  return (
    <div className="util-content">
      <input
        type="text"
        className="util-input"
        value={input}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="Type text... e.g. owner"
      />
      {input && results.map(r => (
        <div key={r.id} className="util-result">
          <span className="util-result-label">{r.label}</span>
          <div className="util-result-row">
            <span className="util-result-text">{r.text}</span>
            <button className="util-copy-btn" onClick={() => copyText(r.text, r.id)}>
              {copiedId === r.id ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== OTHER TEXT GENERATORS =====
function TextGenUtil({ savedState, onStateChange }) {
  const [input, setInput] = useState(savedState?.input || '');
  const [copiedId, setCopiedId] = useState(null);

  const handleInput = (val) => {
    setInput(val);
    onStateChange({ ...savedState, input: val });
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    }).catch(() => {});
  };

  const reversed = input.split('').reverse().join('');
  const fullwidth = convertFullwidth(input);
  const spaced = input.split('').join(' ');

  const results = [
    { id: 'fullwidth', label: 'Fullwidth', text: fullwidth },
    { id: 'reversed', label: 'Reversed', text: reversed },
    { id: 'spaced', label: 'Spaced Out', text: spaced },
  ];

  return (
    <div className="util-content">
      <input
        type="text"
        className="util-input"
        value={input}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="Type text..."
      />
      {input && results.map(r => (
        <div key={r.id} className="util-result">
          <span className="util-result-label">{r.label}</span>
          <div className="util-result-row">
            <span className="util-result-text">{r.text}</span>
            <button className="util-copy-btn" onClick={() => copyText(r.text, r.id)}>
              {copiedId === r.id ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== MC COLOR KEY =====
function ColorKeyUtil() {
  const [copiedCode, setCopiedCode] = useState(null);

  const copy = (text, code) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1200);
    }).catch(() => {});
  };

  return (
    <div className="util-content">
      <div className="color-key-section">
        <span className="util-result-label">Colors</span>
        <div className="color-key-grid">
          {MC_COLOR_CODES.map(({ code, name, color }) => (
            <button
              key={code}
              className={`color-key-item ${copiedCode === code ? 'copied' : ''}`}
              onClick={() => copy(`&${code}`, code)}
              title={`&${code} - ${name}`}
            >
              <span className="color-key-swatch" style={{ backgroundColor: color }} />
              <span className="color-key-code">&amp;{code}</span>
              <span className="color-key-name">{name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="color-key-section">
        <span className="util-result-label">Formatting</span>
        <div className="color-key-formats">
          {MC_FORMAT_CODES.map(({ code, name }) => (
            <button
              key={code}
              className={`color-key-fmt ${copiedCode === `f${code}` ? 'copied' : ''}`}
              onClick={() => copy(`&${code}`, `f${code}`)}
            >
              <span className="color-key-code">&amp;{code}</span>
              <span className="color-key-name">{name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== MAIN PANEL =====
export default function UtilsPanel({ onToggle }) {
  const [open, setOpen] = useState(false);
  const [utilsState, setUtilsState] = useState(loadUtilsState);

  const toggle = (val) => {
    const next = typeof val === 'boolean' ? val : !open;
    setOpen(next);
    if (onToggle) onToggle(next);
  };

  const updateSection = (id, data) => {
    setUtilsState(prev => {
      const next = { ...prev, [id]: data };
      saveUtilsState(next);
      return next;
    });
  };

  return (
    <>
      {/* Floating button - bottom right */}
      <button
        className={`utils-bubble ${open ? 'hide' : ''}`}
        onClick={() => toggle(true)}
        title="Utilities"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </button>

      {/* Overlay */}
      {open && <div className="utils-overlay" onClick={() => toggle(false)} />}

      {/* Panel */}
      <div className={`utils-panel ${open ? 'open' : ''}`}>
        <div className="utils-header">
          <h2>Utilities</h2>
          <button className="utils-close" onClick={() => toggle(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="utils-list">
          <UtilSection
            id="colorkey"
            title="Minecraft Color Key"
            savedState={utilsState.colorkey}
            onStateChange={updateSection}
          >
            <ColorKeyUtil />
          </UtilSection>

          <UtilSection
            id="tinytext"
            title="Tiny Text Generator"
            savedState={utilsState.tinytext}
            onStateChange={updateSection}
          >
            <TinyTextUtil
              savedState={utilsState.tinytext}
              onStateChange={(data) => updateSection('tinytext', { ...data, expanded: true })}
            />
          </UtilSection>

          <UtilSection
            id="textgen"
            title="Text Generators"
            savedState={utilsState.textgen}
            onStateChange={updateSection}
          >
            <TextGenUtil
              savedState={utilsState.textgen}
              onStateChange={(data) => updateSection('textgen', { ...data, expanded: true })}
            />
          </UtilSection>

          {COMING_SOON.map((name) => (
            <UtilSection
              key={name}
              id={name}
              title={name}
              disabled
              savedState={{}}
              onStateChange={() => {}}
            />
          ))}
        </div>
      </div>
    </>
  );
}
