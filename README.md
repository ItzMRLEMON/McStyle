# MCStyle

A web-based Minecraft username/prefix styler for **LuckPerms + TAB** and **Styled Chat** plugins. Create gradient prefixes, preview them in a Minecraft-accurate renderer, and share styles with the community.

Live at: [mcstyle.notceleste.xyz](https://mcstyle.notceleste.xyz)

## Features

- **Builder Mode** - Pick colors, gradients, and formatting with a visual editor
- **Raw Editor** - Write LuckPerms format strings directly with quick-insert buttons
- **Live Preview** - Minecraft-accurate rendering with Mojangles font, proper text shadows, and obfuscated text
- **LuckPerms Gradient Syntax** - Full support for `<#hex>text</#hex>` gradients
- **Styled Chat Support** - Single-color prefix output for the Styled Chat plugin
- **Multi-Tab Editing** - Work on multiple prefixes at once with project tabs
- **Community Styles** - Share and browse styles from other users in real-time via WebSocket
- **Local History** - Save styles locally and load them later
- **Utilities Panel** - Tiny Text Generator, Minecraft Color Key, Text Generators, and more
- **Custom Color Picker** - HSV-based color picker (no native browser picker)

## Tech Stack

- **Frontend:** React + Vite (plain CSS, no Tailwind)
- **Backend:** Express 5 + WebSocket (ws)
- **Font:** Mojangles/Minecraft via `@south-paw/typeface-minecraft`
- **Profanity Filter:** bad-words library
- **Deployment:** Docker (nginx + Node.js) with Cloudflare Tunnel

## Development

```bash
# Install dependencies
npm install

# Start the backend server (port 5858)
node server.js

# Start the frontend dev server (separate terminal)
npm run dev
```

Vite proxies `/api` and `/ws` to the backend automatically.

## Docker Deployment

```bash
# Build and run both services
docker compose -p mcstyle up --build -d
```

This starts:
- **web** (nginx) on port `5858` - serves frontend, proxies API/WebSocket internally
- **api** (Node.js) on port `5859` - Express backend with WebSocket

Point your Cloudflare Tunnel to `http://localhost:5858`.

## MC Format Support

| Syntax | Description |
|--------|-------------|
| `&0`-`&f` | Minecraft color codes |
| `&l` `&o` `&n` `&m` `&k` | Bold, Italic, Underline, Strikethrough, Obfuscated |
| `&r` | Reset formatting |
| `<#RRGGBB>text</#RRGGBB>` | LuckPerms gradient |
| `<#RRGGBB>text` | Single hex color |

## License

MIT
