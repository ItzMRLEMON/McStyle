import { useState } from 'react';
import './TinyText.css';

// Small caps mapping (lowercase -> Unicode small caps)
const SMALL_CAPS = {
  'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ',
  'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ',
  'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ',
  's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x',
  'y': 'ʏ', 'z': 'ᴢ',
};

// Superscript mapping
const SUPERSCRIPT = {
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ',
  'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ',
  'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'q': 'q', 'r': 'ʳ',
  's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ',
  'y': 'ʸ', 'z': 'ᶻ',
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};

// Subscript mapping
const SUBSCRIPT = {
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
  'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
  's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
};

function convert(text, map) {
  return text
    .toLowerCase()
    .split('')
    .map(ch => map[ch] || ch)
    .join('');
}

const STYLES = [
  { id: 'smallcaps', label: 'Small Caps', map: SMALL_CAPS, example: 'ᴏᴡɴᴇʀ' },
  { id: 'superscript', label: 'Superscript', map: SUPERSCRIPT, example: 'ᵒʷⁿᵉʳ' },
  { id: 'subscript', label: 'Subscript', map: SUBSCRIPT, example: 'ₒwₙₑᵣ' },
];

export default function TinyText() {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    }).catch(() => {});
  };

  return (
    <div className="tiny-text-panel">
      <div className="section-header">Tiny Text Generator</div>
      <input
        type="text"
        className="tiny-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type text here... e.g. owner"
      />
      {input && (
        <div className="tiny-results">
          {STYLES.map(({ id, label, map }) => {
            const result = convert(input, map);
            return (
              <div key={id} className="tiny-result-row">
                <div className="tiny-result-label">{label}</div>
                <div className="tiny-result-value">
                  <span className="tiny-result-text">{result}</span>
                  <button
                    className="tiny-copy-btn"
                    onClick={() => copyText(result, id)}
                  >
                    {copiedId === id ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!input && (
        <div className="tiny-hint">
          Type to see conversions. Great for rank names like <strong>ᴏᴡɴᴇʀ</strong>, <strong>ᴀᴅᴍɪɴ</strong>, <strong>ᴍᴏᴅ</strong>
        </div>
      )}
    </div>
  );
}
