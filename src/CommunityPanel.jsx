import { useState, useEffect, useCallback, useRef } from 'react';
import { parseMCText } from './mcParser';
import './CommunityPanel.css';

function MiniMCPreview({ text }) {
  const spans = parseMCText(text);
  return (
    <span className="mini-mc-preview">
      {spans.map((span, i) => {
        const r = parseInt(span.color.slice(1, 3), 16);
        const g = parseInt(span.color.slice(3, 5), 16);
        const b = parseInt(span.color.slice(5, 7), 16);
        const shadow = `rgb(${Math.floor(r / 4)}, ${Math.floor(g / 4)}, ${Math.floor(b / 4)})`;
        const textShadow = span.bold
          ? `1.5px 1.5px 0 ${shadow}, 0.75px 0 0 currentColor`
          : `1.5px 1.5px 0 ${shadow}`;
        return (
          <span key={i} style={{
            color: span.color,
            textShadow,
            fontStyle: span.italic ? 'italic' : 'normal',
            textDecoration: [
              span.underline ? 'underline' : '',
              span.strikethrough ? 'line-through' : '',
            ].filter(Boolean).join(' ') || 'none',
          }}>{span.text}</span>
        );
      })}
    </span>
  );
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // audio not available
  }
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('mcstyle_history') || '[]');
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem('mcstyle_history', JSON.stringify(items));
}

const AVAILABLE_EMOJIS = ['\uD83D\uDD25', '\u2764\uFE0F', '\uD83D\uDE02', '\uD83C\uDFA8'];

export default function CommunityPanel({ currentFormatString, open, onToggle, onModify, discordUser, authLoading, wsHandlersRef }) {
  const openRef = useRef(open);
  const [tab, setTab] = useState('history');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const userMenuRef = useRef(null);

  // Community state
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(() => getCookie('mcstyle_username'));
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // History state
  const [history, setHistory] = useState(loadHistory);
  const [historyLabel, setHistoryLabel] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState('newest');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
        setShowClearConfirm(false);
        setClearConfirmText('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  // Fetch community styles when switching to community tab
  const fetchStyles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/styles');
      if (res.ok) setStyles(await res.json());
    } catch { /* silently fail */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open && tab === 'community') fetchStyles();
  }, [open, tab, fetchStyles]);

  // Listen to shared WebSocket for real-time community updates
  useEffect(() => {
    if (!wsHandlersRef) return;
    const handler = (msg) => {
      if (msg.type === 'new_style') {
        setStyles((prev) => [msg.style, ...prev]);
        if (!openRef.current) playPing();
      } else if (msg.type === 'delete_style') {
        setStyles((prev) => prev.filter(s => s.id !== msg.id));
      } else if (msg.type === 'react_style') {
        setStyles((prev) => prev.map(s => s.id === msg.id ? { ...s, reactions: msg.reactions } : s));
      }
    };
    wsHandlersRef.current.add(handler);
    return () => { wsHandlersRef.current.delete(handler); };
  }, [wsHandlersRef]);

  useEffect(() => {
    if (username) setCookie('mcstyle_username', username);
  }, [username]);

  // Save to local history
  const saveToHistory = () => {
    if (!currentFormatString.trim()) return;
    const entry = {
      id: Date.now().toString(),
      formatString: currentFormatString.trim(),
      label: historyLabel.trim() || 'Untitled',
      date: new Date().toLocaleDateString(),
    };
    const updated = [entry, ...history].slice(0, 50);
    setHistory(updated);
    saveHistory(updated);
    setHistoryLabel('');
  };

  const removeFromHistory = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    saveHistory(updated);
  };

  // Share to community
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!username.trim()) { setError('Enter your MC username first!'); return; }
    if (!currentFormatString.trim()) { setError('Create a style first before sharing!'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          formatString: currentFormatString.trim(),
          label: label.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to share style.');
      } else {
        setSuccess('Style shared!');
        setLabel('');
        fetchStyles();
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch {
      setError('Network error. Try again.');
    }
    setSubmitting(false);
  };

  const handleReact = async (styleId, type) => {
    // Optimistic update
    setStyles((prev) => prev.map(s => {
      if (s.id !== styleId) return s;
      const r = s.reactions || { up: 0, down: 0, emojis: {}, userVote: null, userEmojis: [] };
      const updated = { ...r, emojis: { ...r.emojis }, userEmojis: [...(r.userEmojis || [])] };
      if (type === 'up' || type === 'down') {
        if (updated.userVote === type) {
          updated[type] = Math.max(0, updated[type] - 1);
          updated.userVote = null;
        } else {
          if (updated.userVote) updated[updated.userVote] = Math.max(0, updated[updated.userVote] - 1);
          updated[type] = (updated[type] || 0) + 1;
          updated.userVote = type;
        }
      } else {
        // emoji toggle
        if (updated.userEmojis.includes(type)) {
          updated.userEmojis = updated.userEmojis.filter(e => e !== type);
          updated.emojis[type] = Math.max(0, (updated.emojis[type] || 1) - 1);
          if (updated.emojis[type] === 0) delete updated.emojis[type];
        } else {
          updated.userEmojis.push(type);
          updated.emojis[type] = (updated.emojis[type] || 0) + 1;
        }
      }
      return { ...s, reactions: updated };
    }));
    try {
      await fetch(`/api/styles/${styleId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
    } catch { /* server will reconcile via WS */ }
  };

  // Sort styles
  const sortedStyles = [...styles].sort((a, b) => {
    const dir = sortDesc ? -1 : 1;
    if (sortBy === 'newest') {
      return dir * (new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    if (sortBy === 'upvoted') {
      const aUp = (a.reactions?.up || 0) - (a.reactions?.down || 0);
      const bUp = (b.reactions?.up || 0) - (b.reactions?.down || 0);
      return dir * (bUp - aUp);
    }
    if (sortBy === 'user') {
      const nameA = (a.discordName || a.username || '').toLowerCase();
      const nameB = (b.discordName || b.username || '').toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      if (cmp !== 0) return dir * cmp;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    return 0;
  });

  const copyStyle = (formatString, id) => {
    navigator.clipboard.writeText(formatString).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    });
  };

  return (
    <div className={`community-sidebar ${open ? 'open' : 'collapsed'}`}>
      {open && (
        <>
          <div className="community-header">
            <div className="community-tabs">
              <button
                className={`community-tab ${tab === 'history' ? 'active' : ''}`}
                onClick={() => setTab('history')}
              >
                History
              </button>
              <button
                className={`community-tab ${tab === 'community' ? 'active' : ''} ${!discordUser ? 'locked' : ''}`}
                onClick={() => discordUser ? setTab('community') : setTab('community')}
              >
                Community {!discordUser && !authLoading ? '\uD83D\uDD12' : ''}
              </button>
            </div>
          </div>

          <div className="community-body">
            {/* ===== HISTORY TAB ===== */}
            {tab === 'history' && (
              <>
                <div className="share-form">
                  <div className="share-form-title">Save Current Style</div>
                  <input
                    type="text"
                    placeholder="Label (e.g. Owner, Admin...)"
                    value={historyLabel}
                    onChange={(e) => setHistoryLabel(e.target.value)}
                    className="share-input"
                    maxLength={40}
                  />
                  <div className="share-preview-row">
                    <span className="share-preview-label">Style:</span>
                    <div className="share-preview-mc">
                      <MiniMCPreview text={currentFormatString + 'Steve'} />
                    </div>
                  </div>
                  <button className="share-btn" onClick={saveToHistory}>
                    Save to History
                  </button>
                </div>

                <div className="community-divider" />

                <div className="community-list">
                  {history.length === 0 && (
                    <div className="community-empty">No saved styles yet. Save one above!</div>
                  )}
                  {history.map((item) => (
                    <div key={item.id} className="community-card">
                      <div className="community-card-preview">
                        <MiniMCPreview text={item.formatString + 'Steve'} />
                      </div>
                      <div className="community-card-info">
                        <span className="community-card-label">{item.label}</span>
                        <span className="community-card-date">{item.date}</span>
                      </div>
                      <div className="community-card-actions">
                        <button
                          className="community-card-copy"
                          onClick={() => copyStyle(item.formatString, item.id)}
                        >
                          {copiedId === item.id ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          className="community-card-modify"
                          onClick={() => onModify && onModify(item.formatString, item.label)}
                        >
                          Modify
                        </button>
                        <button
                          className="community-card-delete"
                          onClick={() => removeFromHistory(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===== COMMUNITY TAB ===== */}
            {tab === 'community' && !discordUser && (
              <div className="community-login-gate">
                <div className="login-gate-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </div>
                <p className="login-gate-title">Connect with Discord</p>
                <ul className="login-gate-list">
                  <li>Save your projects to the cloud</li>
                  <li>Share styles with the community</li>
                  <li>Access your work from any device</li>
                </ul>
                <button className="discord-login-btn" onClick={async () => {
                  try {
                    const res = await fetch('/api/auth/discord-url');
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  } catch { /* */ }
                }}>
                  Login with Discord
                </button>
              </div>
            )}

            {tab === 'community' && discordUser && (
              <>
                <div className="community-user-bar">
                  <div className="community-user-menu-wrap" ref={userMenuRef}>
                    <button
                      className="community-avatar-btn"
                      onClick={() => { setShowUserMenu(v => !v); setShowClearConfirm(false); setClearConfirmText(''); }}
                      title="Account options"
                    >
                      {discordUser.avatar
                        ? <img className="community-user-avatar" src={discordUser.avatar} alt="" />
                        : <span className="community-user-avatar-fallback">{(discordUser.globalName || '?')[0]}</span>
                      }
                    </button>
                    {showUserMenu && (
                      <div className="community-user-dropdown">
                        {!showClearConfirm ? (
                          <>
                            <button className="user-dropdown-item danger" onClick={() => setShowClearConfirm(true)}>
                              Clear Data
                            </button>
                            <button className="user-dropdown-item" onClick={async () => {
                              await fetch('/api/auth/logout', { method: 'POST' });
                              window.location.reload();
                            }}>
                              Logout
                            </button>
                          </>
                        ) : (
                          <div className="user-dropdown-confirm">
                            <p className="user-dropdown-warn">This will delete ALL your shared styles and data. This cannot be undone.</p>
                            <p className="user-dropdown-warn-sub">Type <strong>confirm</strong> to proceed:</p>
                            <input
                              type="text"
                              className="share-input"
                              placeholder="Type confirm..."
                              value={clearConfirmText}
                              onChange={(e) => setClearConfirmText(e.target.value)}
                              autoFocus
                            />
                            <div className="user-dropdown-confirm-actions">
                              <button
                                className="user-dropdown-item"
                                onClick={() => { setShowClearConfirm(false); setClearConfirmText(''); }}
                              >
                                Cancel
                              </button>
                              <button
                                className="user-dropdown-item danger"
                                disabled={clearConfirmText !== 'confirm'}
                                onClick={async () => {
                                  await fetch('/api/auth/clear-data', { method: 'POST' });
                                  setShowUserMenu(false);
                                  setShowClearConfirm(false);
                                  setClearConfirmText('');
                                  fetchStyles();
                                }}
                              >
                                Delete Everything
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="community-user-name">{discordUser.globalName}</span>
                </div>

                <form className="share-form" onSubmit={handleSubmit}>
                  <div className="share-form-title">Share Your Style</div>
                  <input
                    type="text"
                    placeholder="MC Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="share-input"
                    maxLength={24}
                  />
                  <input
                    type="text"
                    placeholder="Label (e.g. Owner, Admin...)"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="share-input"
                    maxLength={40}
                  />
                  <div className="share-preview-row">
                    <span className="share-preview-label">Sharing:</span>
                    <div className="share-preview-mc">
                      <MiniMCPreview text={currentFormatString + (username || 'Steve')} />
                    </div>
                  </div>
                  <button type="submit" className="share-btn" disabled={submitting}>
                    {submitting ? 'Sharing...' : 'Share Style'}
                  </button>
                  {error && <div className="share-error">{error}</div>}
                  {success && <div className="share-success">{success}</div>}
                </form>

                <div className="community-divider" />

                <div className="community-sort-bar">
                  <select
                    className="community-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Newest</option>
                    <option value="upvoted">Most Upvoted</option>
                    <option value="user">By User</option>
                  </select>
                  <button
                    className="community-sort-direction"
                    onClick={() => setSortDesc(d => !d)}
                    title={sortDesc ? 'Descending' : 'Ascending'}
                  >
                    {sortDesc ? '\u2193' : '\u2191'}
                  </button>
                </div>

                <div className="community-list">
                  {loading && <div className="community-loading">Loading...</div>}
                  {!loading && styles.length === 0 && (
                    <div className="community-empty">No styles shared yet. Be the first!</div>
                  )}
                  {sortedStyles.map((style) => {
                    const r = style.reactions || { up: 0, down: 0, emojis: {}, userVote: null, userEmojis: [] };
                    return (
                      <div key={style.id} className="community-card">
                        <div className="community-card-preview">
                          <MiniMCPreview text={style.formatString + style.username} />
                        </div>
                        <div className="community-card-info">
                          {style.discordAvatar && <img className="community-card-avatar" src={style.discordAvatar} alt="" />}
                          <span className="community-card-user">{style.username}</span>
                          {style.label && <span className="community-card-label">{style.label}</span>}
                          {style.discordName && <span className="community-card-discord">{style.discordName}</span>}
                        </div>
                        <div className="community-card-actions">
                          <button
                            className="community-card-copy"
                            onClick={() => copyStyle(style.formatString, style.id)}
                          >
                            {copiedId === style.id ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            className="community-card-modify"
                            onClick={() => onModify && onModify(style.formatString, style.label || style.username)}
                          >
                            Modify
                          </button>
                        </div>
                        <div className="community-reactions">
                          <div className="reaction-votes">
                            <button
                              className={`reaction-vote reaction-up ${r.userVote === 'up' ? 'active' : ''}`}
                              onClick={() => handleReact(style.id, 'up')}
                            >
                              {'\u25B2'} {r.up || 0}
                            </button>
                            <button
                              className={`reaction-vote reaction-down ${r.userVote === 'down' ? 'active' : ''}`}
                              onClick={() => handleReact(style.id, 'down')}
                            >
                              {'\u25BC'} {r.down || 0}
                            </button>
                          </div>
                          <div className="reaction-emojis">
                            {AVAILABLE_EMOJIS.map(emoji => {
                              const count = r.emojis?.[emoji] || 0;
                              const active = r.userEmojis?.includes(emoji);
                              return (
                                <button
                                  key={emoji}
                                  className={`reaction-emoji ${active ? 'active' : ''}`}
                                  onClick={() => handleReact(style.id, emoji)}
                                >
                                  {emoji}{count > 0 ? ` ${count}` : ''}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Collapse/expand toggle at bottom */}
      <button className="sidebar-toggle" onClick={() => onToggle(!open)}>
        {open ? '<<' : '>>'}
      </button>
    </div>
  );
}
