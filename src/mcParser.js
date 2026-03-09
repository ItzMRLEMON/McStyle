/**
 * Minecraft Text Format Parser
 * Supports:
 * - & color codes (&0-&9, &a-&f)
 * - & formatting codes (&l=bold, &o=italic, &n=underline, &m=strikethrough, &k=obfuscated, &r=reset)
 * - LuckPerms gradient syntax: <#RRGGBB>text</#RRGGBB>
 * - Hex color codes: &#RRGGBB or <#RRGGBB> (single color, no closing tag)
 */

// Minecraft color code map
export const MC_COLORS = {
  '0': '#000000', // Black
  '1': '#0000AA', // Dark Blue
  '2': '#00AA00', // Dark Green
  '3': '#00AAAA', // Dark Aqua
  '4': '#AA0000', // Dark Red
  '5': '#AA00AA', // Dark Purple
  '6': '#FFAA00', // Gold
  '7': '#AAAAAA', // Gray
  '8': '#555555', // Dark Gray
  '9': '#5555FF', // Blue
  'a': '#55FF55', // Green
  'b': '#55FFFF', // Aqua
  'c': '#FF5555', // Red
  'd': '#FF55FF', // Light Purple
  'e': '#FFFF55', // Yellow
  'f': '#FFFFFF', // White
};

export const MC_COLOR_NAMES = {
  '0': 'Black',
  '1': 'Dark Blue',
  '2': 'Dark Green',
  '3': 'Dark Aqua',
  '4': 'Dark Red',
  '5': 'Dark Purple',
  '6': 'Gold',
  '7': 'Gray',
  '8': 'Dark Gray',
  '9': 'Blue',
  'a': 'Green',
  'b': 'Aqua',
  'c': 'Red',
  'd': 'Light Purple',
  'e': 'Yellow',
  'f': 'White',
};

// Interpolate between two hex colors
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function interpolateColor(color1, color2, factor) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * factor,
    c1.g + (c2.g - c1.g) * factor,
    c1.b + (c2.b - c1.b) * factor
  );
}

/**
 * Parse MC formatted text into an array of styled spans.
 * Each span: { text, color, bold, italic, underline, strikethrough, obfuscated }
 */
export function parseMCText(input) {
  const spans = [];
  let i = 0;

  // Current formatting state
  let currentColor = '#FFFFFF';
  let bold = false;
  let italic = false;
  let underline = false;
  let strikethrough = false;
  let obfuscated = false;

  // First pass: find gradients and handle them, then process the rest
  // We'll process the string character by character

  let buffer = '';

  const flushBuffer = () => {
    if (buffer.length > 0) {
      spans.push({
        text: buffer,
        color: currentColor,
        bold, italic, underline, strikethrough, obfuscated,
      });
      buffer = '';
    }
  };

  while (i < input.length) {
    // Check for LuckPerms gradient: <#RRGGBB>text</#RRGGBB>
    const gradientMatch = input.slice(i).match(/^<(#[0-9A-Fa-f]{6})>(.*?)<\/(#[0-9A-Fa-f]{6})>/);
    if (gradientMatch) {
      flushBuffer();
      const startColor = gradientMatch[1];
      const endColor = gradientMatch[3];
      const gradientText = gradientMatch[2];

      // Parse inner text for formatting codes but apply gradient colors
      const innerSpans = parseGradientText(gradientText, startColor, endColor, { bold, italic, underline, strikethrough, obfuscated });
      spans.push(...innerSpans);

      i += gradientMatch[0].length;
      continue;
    }

    // Check for hex color: <#RRGGBB> (without closing - single color)
    const hexTagMatch = input.slice(i).match(/^<(#[0-9A-Fa-f]{6})>/);
    if (hexTagMatch && !input.slice(i).match(/^<#[0-9A-Fa-f]{6}>.*?<\/#[0-9A-Fa-f]{6}>/)) {
      flushBuffer();
      currentColor = hexTagMatch[1];
      i += hexTagMatch[0].length;
      continue;
    }

    // Check for & codes (color and formatting)
    if (input[i] === '&' && i + 1 < input.length) {
      const code = input[i + 1].toLowerCase();

      if (MC_COLORS[code]) {
        flushBuffer();
        currentColor = MC_COLORS[code];
        // Color codes reset formatting in MC
        bold = false;
        italic = false;
        underline = false;
        strikethrough = false;
        obfuscated = false;
        i += 2;
        continue;
      }

      if (code === 'l') { flushBuffer(); bold = true; i += 2; continue; }
      if (code === 'o') { flushBuffer(); italic = true; i += 2; continue; }
      if (code === 'n') { flushBuffer(); underline = true; i += 2; continue; }
      if (code === 'm') { flushBuffer(); strikethrough = true; i += 2; continue; }
      if (code === 'k') { flushBuffer(); obfuscated = true; i += 2; continue; }
      if (code === 'r') {
        flushBuffer();
        currentColor = '#FFFFFF';
        bold = false;
        italic = false;
        underline = false;
        strikethrough = false;
        obfuscated = false;
        i += 2;
        continue;
      }
    }

    // Check for § codes (same as & but with section sign)
    if (input[i] === '§' && i + 1 < input.length) {
      const code = input[i + 1].toLowerCase();
      if (MC_COLORS[code]) {
        flushBuffer();
        currentColor = MC_COLORS[code];
        bold = false; italic = false; underline = false; strikethrough = false; obfuscated = false;
        i += 2;
        continue;
      }
      if (code === 'l') { flushBuffer(); bold = true; i += 2; continue; }
      if (code === 'o') { flushBuffer(); italic = true; i += 2; continue; }
      if (code === 'n') { flushBuffer(); underline = true; i += 2; continue; }
      if (code === 'm') { flushBuffer(); strikethrough = true; i += 2; continue; }
      if (code === 'k') { flushBuffer(); obfuscated = true; i += 2; continue; }
      if (code === 'r') {
        flushBuffer();
        currentColor = '#FFFFFF'; bold = false; italic = false; underline = false; strikethrough = false; obfuscated = false;
        i += 2;
        continue;
      }
    }

    buffer += input[i];
    i++;
  }

  flushBuffer();
  return spans;
}

/**
 * Parse text inside a gradient, applying per-character gradient colors.
 * Formatting codes inside gradients are still respected.
 */
function parseGradientText(text, startColor, endColor, formatting) {
  const spans = [];
  let { bold, italic, underline, strikethrough, obfuscated } = formatting;

  // First, extract the visible characters and their positions
  const chars = [];
  let i = 0;
  while (i < text.length) {
    if ((text[i] === '&' || text[i] === '§') && i + 1 < text.length) {
      const code = text[i + 1].toLowerCase();
      if (code === 'l') { bold = true; i += 2; continue; }
      if (code === 'o') { italic = true; i += 2; continue; }
      if (code === 'n') { underline = true; i += 2; continue; }
      if (code === 'm') { strikethrough = true; i += 2; continue; }
      if (code === 'k') { obfuscated = true; i += 2; continue; }
      if (code === 'r') {
        bold = false; italic = false; underline = false; strikethrough = false; obfuscated = false;
        i += 2;
        continue;
      }
      // Color codes inside gradient are ignored for color but still processed
      if (MC_COLORS[code]) { i += 2; continue; }
    }
    chars.push({
      char: text[i],
      bold, italic, underline, strikethrough, obfuscated,
    });
    i++;
  }

  // Apply gradient to each character
  const totalChars = chars.length;
  for (let j = 0; j < totalChars; j++) {
    const factor = totalChars === 1 ? 0 : j / (totalChars - 1);
    const color = interpolateColor(startColor, endColor, factor);
    spans.push({
      text: chars[j].char,
      color,
      bold: chars[j].bold,
      italic: chars[j].italic,
      underline: chars[j].underline,
      strikethrough: chars[j].strikethrough,
      obfuscated: chars[j].obfuscated,
    });
  }

  return spans;
}

