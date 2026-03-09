import { useState, useEffect, useRef, useCallback } from 'react';
import { parseMCText, MC_COLORS, MC_COLOR_NAMES } from './mcParser';
import ColorPicker from './ColorPicker';
import CommunityPanel from './CommunityPanel';
import UtilsPanel from './UtilsPanel';
import './App.css';

const OBFUSCATED_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

function mcShadowColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r / 4)}, ${Math.floor(g / 4)}, ${Math.floor(b / 4)})`;
}

function ObfuscatedChar({ children }) {
  const [char, setChar] = useState(children);
  useEffect(() => {
    const interval = setInterval(() => {
      setChar(OBFUSCATED_CHARS[Math.floor(Math.random() * OBFUSCATED_CHARS.length)]);
    }, 50);
    return () => clearInterval(interval);
  }, []);
  return <span>{char}</span>;
}

function MCPreview({ text }) {
  const spans = parseMCText(text);
  return (
    <div className="mc-preview">
      {spans.map((span, i) => {
        const shadow = mcShadowColor(span.color);
        const textShadow = span.bold
          ? `2px 2px 0 ${shadow}, 1px 0 0 currentColor`
          : `2px 2px 0 ${shadow}`;
        const style = {
          color: span.color,
          textShadow,
          fontStyle: span.italic ? 'italic' : 'normal',
          textDecoration: [
            span.underline ? 'underline' : '',
            span.strikethrough ? 'line-through' : '',
          ].filter(Boolean).join(' ') || 'none',
        };
        if (span.obfuscated) {
          return (
            <span key={i} style={style}>
              {span.text.split('').map((c, j) => (
                <ObfuscatedChar key={j}>{c}</ObfuscatedChar>
              ))}
            </span>
          );
        }
        return <span key={i} style={style}>{span.text}</span>;
      })}
    </div>
  );
}

const FORMAT_CODES = [
  { code: 'l', label: 'Bold', className: 'fmt-bold' },
  { code: 'o', label: 'Italic', className: 'fmt-italic' },
  { code: 'n', label: 'Underline', className: 'fmt-underline' },
  { code: 'm', label: 'Strike', className: 'fmt-strike' },
  { code: 'k', label: 'Magic', className: 'fmt-magic' },
];

let tabCounter = 1;

const DEFAULT_RAW = '<#FFFFFF>[Rank]</#FFFFFF> &f';

function createTab(name, rawText) {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    name: name || `Tab ${tabCounter++}`,
    mode: 'raw',
    rawText: rawText || DEFAULT_RAW,
    prefix: '[Rank]',
    useGradient: false,
    gradientStart: '#67FB00',
    gradientEnd: '#35FFED',
    singleColor: '#FFFFFF',
    activeFormats: [],
    nameSuffix: '&f',
    styledChatEnabled: false,
    chatColorMode: 'first',
    chatCustomColor: '#FF0000',
    saved: false,
  };
}

const PREVIEW_NAME = 'Steve';

function App() {
  const [tabs, setTabs] = useState(() => [createTab()]);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [utilsOpen, setUtilsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const tab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateTab = useCallback((updates) => {
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, ...updates } : t
    ));
  }, [activeTabId]);

  const addTab = (name, rawText) => {
    const newTab = createTab(name, rawText);
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const [showSavePrompt, setShowSavePrompt] = useState(null); // tab id to close

  const closeTab = (id) => {
    if (tabs.length <= 1) return;
    const t = tabs.find(t => t.id === id);
    // If tab has been modified from default and not saved, prompt
    if (t && !t.saved && t.rawText !== DEFAULT_RAW) {
      setShowSavePrompt(id);
      return;
    }
    doCloseTab(id);
  };

  const doCloseTab = (id) => {
    const idx = tabs.findIndex(t => t.id === id);
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[Math.min(idx, newTabs.length - 1)].id);
    }
    setShowSavePrompt(null);
  };

  // Called from CommunityPanel "Modify" button
  const handleModify = (formatString, label) => {
    addTab(label || 'Modified', formatString);
  };

  // Save to local history then close
  const saveAndClose = () => {
    const t = tabs.find(t => t.id === showSavePrompt);
    if (t) {
      const fs = t.mode === 'raw' ? t.rawText : currentFormatString;
      const history = JSON.parse(localStorage.getItem('mcstyle_history') || '[]');
      const entry = {
        id: Date.now().toString(),
        formatString: fs.trim(),
        label: t.name,
        date: new Date().toLocaleDateString(),
      };
      localStorage.setItem('mcstyle_history', JSON.stringify([entry, ...history].slice(0, 50)));
    }
    doCloseTab(showSavePrompt);
  };

  // Derived values from current tab
  const { mode, rawText, prefix, useGradient, gradientStart, gradientEnd, singleColor, activeFormats, nameSuffix, styledChatEnabled, chatColorMode, chatCustomColor } = tab;

  const builderOutput = (() => {
    let result = '';
    if (useGradient) {
      result += `<${gradientStart}>`;
      activeFormats.forEach(code => { result += `&${code}`; });
      result += prefix;
      result += `</${gradientEnd}>`;
    } else {
      result += `<${singleColor}>`;
      activeFormats.forEach(code => { result += `&${code}`; });
      result += prefix;
    }
    result += ` ${nameSuffix}`;
    return result;
  })();

  const chatColor = chatColorMode === 'first'
    ? (useGradient ? gradientStart : singleColor)
    : chatColorMode === 'last'
      ? (useGradient ? gradientEnd : singleColor)
      : chatCustomColor;

  const styledChatOutput = (() => {
    let result = `<${chatColor}>`;
    activeFormats.forEach(code => { result += `&${code}`; });
    result += prefix;
    return result;
  })();

  const currentFormatString = mode === 'raw' ? rawText : builderOutput;
  const previewText = currentFormatString + PREVIEW_NAME;
  const styledChatPreviewText = styledChatOutput + ` ${nameSuffix}` + PREVIEW_NAME;

  const toggleFormat = (code) => {
    updateTab({
      activeFormats: activeFormats.includes(code)
        ? activeFormats.filter(c => c !== code)
        : [...activeFormats, code]
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentFormatString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const insertAtCursor = (text) => {
    if (mode !== 'raw' || !textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText = rawText.slice(0, start) + text + rawText.slice(end);
    updateTab({ rawText: newText });
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + text.length;
      ta.focus();
    }, 0);
  };

  return (
    <>
    <div className={`app ${communityOpen ? 'community-open' : ''} ${utilsOpen ? 'utils-open' : ''}`}>
      <header className="header">
        <h1>Minecraft Username Styler</h1>
        <p className="subtitle">LuckPerms &amp; TAB Prefix Editor</p>
      </header>

      {/* Project Tabs */}
      <div className="project-tabs">
        {tabs.map(t => (
          <div
            key={t.id}
            className={`project-tab ${t.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTabId(t.id)}
          >
            <span className="project-tab-name">{t.name}</span>
            {tabs.length > 1 && (
              <button
                className="project-tab-close"
                onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
              >
                &times;
              </button>
            )}
          </div>
        ))}
        <button className="project-tab-add" onClick={() => addTab()}>+</button>
      </div>

      <div className="page-layout">
        <div className="main-container">

          {/* ===== SECTION 1: LuckPerms + TAB ===== */}
          <div className="plugin-section">
            <div className="section-title">LuckPerms + TAB</div>

            <div className="preview-section">
              <div className="mc-preview-container">
                <div className="mc-tab-header">
                  <span className="tab-label">TAB</span>
                </div>
                <MCPreview text={previewText} />
              </div>
              <div className="mc-preview-container chat-preview">
                <div className="mc-tab-header">
                  <span className="tab-label">CHAT</span>
                </div>
                <div className="chat-line">
                  <MCPreview text={previewText} />
                  <span className="chat-message" style={{ color: '#FFFFFF' }}>: Hello, World!</span>
                </div>
              </div>
            </div>

            <div className="mode-tabs">
              <button
                className={`mode-tab ${mode === 'builder' ? 'active' : ''}`}
                onClick={() => updateTab({ mode: 'builder' })}
              >
                Builder
              </button>
              <button
                className={`mode-tab ${mode === 'raw' ? 'active' : ''}`}
                onClick={() => updateTab({ mode: 'raw' })}
              >
                Raw Editor
              </button>
            </div>

            <div className="editor-section">
              {mode === 'raw' ? (
                <div className="raw-editor">
                  <div className="quick-buttons">
                    <div className="button-group">
                      <span className="group-label">Colors:</span>
                      {Object.entries(MC_COLORS).map(([code, color]) => (
                        <button
                          key={code}
                          className="mc-color-btn"
                          style={{ backgroundColor: color, color: parseInt(code, 16) < 8 ? '#fff' : '#000' }}
                          title={`&${code} - ${MC_COLOR_NAMES[code]}`}
                          onClick={() => insertAtCursor(`&${code}`)}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                    <div className="button-group">
                      <span className="group-label">Format:</span>
                      {FORMAT_CODES.map(({ code, label }) => (
                        <button
                          key={code}
                          className="mc-fmt-btn"
                          title={`&${code} - ${label}`}
                          onClick={() => insertAtCursor(`&${code}`)}
                        >
                          &amp;{code}
                        </button>
                      ))}
                      <button
                        className="mc-fmt-btn reset-btn"
                        title="&r - Reset"
                        onClick={() => insertAtCursor('&r')}
                      >
                        &amp;r
                      </button>
                    </div>
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="raw-textarea"
                    value={rawText}
                    onChange={(e) => updateTab({ rawText: e.target.value })}
                    placeholder="Enter MC formatted text... e.g. <#67FB00>&l[ᴏᴡɴᴇʀ]</#35FFED> &f"
                    rows={3}
                  />
                </div>
              ) : (
                <div className="builder">
                  <div className="builder-row">
                    <div className="builder-field">
                      <label>Prefix Text</label>
                      <input
                        type="text"
                        value={prefix}
                        onChange={(e) => updateTab({ prefix: e.target.value })}
                        placeholder="[ᴏᴡɴᴇʀ]"
                      />
                    </div>
                  </div>

                  <div className="builder-row">
                    <div className="builder-field">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={useGradient}
                          onChange={(e) => updateTab({ useGradient: e.target.checked })}
                        />
                        Use Gradient
                      </label>
                    </div>
                  </div>

                  {useGradient ? (
                    <div className="builder-row gradient-row">
                      <ColorPicker
                        label="Start Color"
                        value={gradientStart}
                        onChange={(v) => updateTab({ gradientStart: v })}
                      />
                      <div className="gradient-preview" style={{
                        background: `linear-gradient(to right, ${gradientStart}, ${gradientEnd})`
                      }} />
                      <ColorPicker
                        label="End Color"
                        value={gradientEnd}
                        onChange={(v) => updateTab({ gradientEnd: v })}
                      />
                    </div>
                  ) : (
                    <div className="builder-row">
                      <ColorPicker
                        label="Prefix Color"
                        value={singleColor}
                        onChange={(v) => updateTab({ singleColor: v })}
                      />
                    </div>
                  )}

                  <div className="builder-row">
                    <div className="builder-field">
                      <label>Name Color Suffix</label>
                      <input
                        type="text"
                        value={nameSuffix}
                        onChange={(e) => updateTab({ nameSuffix: e.target.value })}
                        placeholder="&f"
                        className="name-suffix-input"
                      />
                      <span className="field-hint">Color code applied before the username (e.g. &amp;f for white)</span>
                    </div>
                  </div>

                  <div className="builder-row">
                    <div className="builder-field">
                      <label>Formatting</label>
                      <div className="format-toggles">
                        {FORMAT_CODES.map(({ code, label, className }) => (
                          <button
                            key={code}
                            className={`fmt-toggle ${className} ${activeFormats.includes(code) ? 'active' : ''}`}
                            onClick={() => toggleFormat(code)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="output-section">
              <div className="section-header">
                Output
                <button className="copy-btn" onClick={copyToClipboard}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="output-box">
                <code>{currentFormatString}</code>
              </div>
              <div className="output-hint">
                <code className="command-hint">
                  /lp user &lt;player&gt; meta setprefix 900 &quot;{currentFormatString}&quot;
                </code>
              </div>
            </div>
          </div>

          {/* ===== SECTION 2: Styled Chat ===== */}
          <div className="plugin-section styled-chat-section">
            <div className="section-title">
              Styled Chat
              {!styledChatEnabled && (
                <button className="enable-btn" onClick={() => updateTab({ styledChatEnabled: true })}>
                  Enable
                </button>
              )}
              {styledChatEnabled && (
                <button className="disable-btn" onClick={() => updateTab({ styledChatEnabled: false })}>
                  Disable
                </button>
              )}
            </div>

            {!styledChatEnabled && (
              <p className="section-disabled-hint">Single-color prefix for Styled Chat plugin (no gradient support)</p>
            )}

            {styledChatEnabled && (
              <>
                <div className="preview-section">
                  <div className="mc-preview-container">
                    <div className="mc-tab-header">
                      <span className="tab-label">STYLED CHAT</span>
                    </div>
                    <div className="chat-line">
                      <MCPreview text={styledChatPreviewText} />
                      <span className="chat-message" style={{ color: '#FFFFFF' }}>: Hello, World!</span>
                    </div>
                  </div>
                </div>

                <div className="editor-section">
                  <div className="builder">
                    <div className="builder-row">
                      <div className="builder-field">
                        <label>Color Source</label>
                        <div className="chat-color-options">
                          <label className="radio-label">
                            <input
                              type="radio"
                              name={`chatColorMode-${tab.id}`}
                              value="first"
                              checked={chatColorMode === 'first'}
                              onChange={() => updateTab({ chatColorMode: 'first' })}
                            />
                            Use first color
                            <span className="radio-color-swatch" style={{ backgroundColor: useGradient ? gradientStart : singleColor }} />
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name={`chatColorMode-${tab.id}`}
                              value="last"
                              checked={chatColorMode === 'last'}
                              onChange={() => updateTab({ chatColorMode: 'last' })}
                            />
                            Use last color
                            <span className="radio-color-swatch" style={{ backgroundColor: useGradient ? gradientEnd : singleColor }} />
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name={`chatColorMode-${tab.id}`}
                              value="custom"
                              checked={chatColorMode === 'custom'}
                              onChange={() => updateTab({ chatColorMode: 'custom' })}
                            />
                            Custom color
                          </label>
                        </div>
                        {chatColorMode === 'custom' && (
                          <div className="chat-custom-picker">
                            <ColorPicker
                              value={chatCustomColor}
                              onChange={(v) => updateTab({ chatCustomColor: v })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="output-section">
                  <div className="section-header">
                    Output
                    <button className="copy-btn" onClick={() => {
                      navigator.clipboard.writeText(styledChatOutput);
                    }}>Copy</button>
                  </div>
                  <div className="output-box">
                    <code>{styledChatOutput}</code>
                  </div>
                  <div className="output-hint">
                    <code className="command-hint">
                      /lp user &lt;player&gt; meta set chatprefix &quot;{styledChatOutput}&quot;
                    </code>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

      </div>

      {/* Save prompt modal */}
      {showSavePrompt && (
        <div className="save-prompt-overlay">
          <div className="save-prompt">
            <p>This tab has unsaved changes. What would you like to do?</p>
            <div className="save-prompt-actions">
              <button className="save-prompt-btn save" onClick={saveAndClose}>
                Save to History
              </button>
              <button className="save-prompt-btn discard" onClick={() => doCloseTab(showSavePrompt)}>
                Discard
              </button>
              <button className="save-prompt-btn cancel" onClick={() => setShowSavePrompt(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Minecraft Username Styler — For LuckPerms + TAB</p>
      </footer>

    </div>

    <CommunityPanel
      currentFormatString={currentFormatString}
      onToggle={setCommunityOpen}
      onModify={handleModify}
    />
    <UtilsPanel onToggle={setUtilsOpen} />
  </>
  );
}

export default App;
