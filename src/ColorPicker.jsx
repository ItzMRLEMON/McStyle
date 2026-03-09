import { useState, useRef, useCallback, useEffect } from 'react';
import './ColorPicker.css';

// --- Color conversion helpers ---
function hexToHsv(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h, s, v };
}

function hsvToHex(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hueToRgbHex(h) {
  return hsvToHex(h, 1, 1);
}

// --- Custom Color Picker ---
export default function ColorPicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const pickerRef = useRef(null);
  const satPanelRef = useRef(null);
  const huePanelRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    const newHsv = hexToHsv(value);
    // Only update if the hex actually differs (avoid loop)
    if (hsvToHex(hsv.h, hsv.s, hsv.v) !== value.toLowerCase()) {
      setHsv(newHsv);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const updateColor = useCallback((newHsv) => {
    setHsv(newHsv);
    onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  }, [onChange]);

  // --- Saturation/Brightness panel dragging ---
  const handleSatPanel = useCallback((e) => {
    const rect = satPanelRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    updateColor({ ...hsv, s: x, v: 1 - y });
  }, [hsv, updateColor]);

  const startSatDrag = (e) => {
    e.preventDefault();
    handleSatPanel(e);
    const move = (ev) => {
      const rect = satPanelRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
      // Use functional update to always have latest hsv.h
      setHsv(prev => {
        const next = { h: prev.h, s: x, v: 1 - y };
        onChange(hsvToHex(next.h, next.s, next.v));
        return next;
      });
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  // --- Hue slider dragging ---
  const handleHuePanel = useCallback((e) => {
    const rect = huePanelRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updateColor({ ...hsv, h: x });
  }, [hsv, updateColor]);

  const startHueDrag = (e) => {
    e.preventDefault();
    handleHuePanel(e);
    const move = (ev) => {
      const rect = huePanelRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      setHsv(prev => {
        const next = { ...prev, h: x };
        onChange(hsvToHex(next.h, next.s, next.v));
        return next;
      });
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const hexInput = (e) => {
    const v = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      setHsv(hexToHsv(v));
      onChange(v);
    }
  };

  return (
    <div className="cp-wrapper" ref={pickerRef}>
      {label && <label className="cp-label">{label}</label>}
      <div className="cp-trigger-row">
        <button
          className="cp-swatch"
          style={{ backgroundColor: value }}
          onClick={() => setOpen(!open)}
          type="button"
        />
        <input
          type="text"
          className="cp-hex-input"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            // Allow typing
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
              onChange(v);
            }
          }}
          onBlur={hexInput}
          maxLength={7}
        />
      </div>

      {open && (
        <div className="cp-popup">
          {/* Saturation / Brightness panel */}
          <div
            className="cp-sat-panel"
            ref={satPanelRef}
            style={{ backgroundColor: hueToRgbHex(hsv.h) }}
            onMouseDown={startSatDrag}
          >
            <div className="cp-sat-white" />
            <div className="cp-sat-black" />
            <div
              className="cp-sat-cursor"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
              }}
            />
          </div>

          {/* Hue slider */}
          <div
            className="cp-hue-bar"
            ref={huePanelRef}
            onMouseDown={startHueDrag}
          >
            <div
              className="cp-hue-cursor"
              style={{ left: `${hsv.h * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
