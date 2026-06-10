<h1 align="center">🎬 VidZone — Studio-Grade Video Editor</h1>

<p align="center">
  <strong>A fully client-side, privacy-first video rendering suite built with React, TypeScript, Electron & FFmpeg.wasm</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/FFmpeg.wasm-0.12-007ACC?logo=ffmpeg&logoColor=white" alt="FFmpeg.wasm" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
</p>

<p align="center">
  <strong>Presented by <a href="https://github.com/Vibhathcross">Vibhath</a> ✦ Built on Antigravity</strong>
</p>

<br />

---

## ✨ Overview

**VidZone** is a powerful, browser-native video editing application that lets you create studio-grade MP4 videos entirely on your device — **no uploads, no servers, no data leaving your machine**. It combines a sleek cyber-aesthetic interface with real-time audio visualization, multi-layer image compositing, and a full FFmpeg H.264 encoding pipeline that runs in the browser via WebAssembly.

VidZone also includes two bonus tools:
- **📄 PDF to Image Converter** — Render any PDF to high-quality JPEG pages
- **🎨 Image Creator** — Design custom graphics with text, images, and Malayalam script support

---

## 🚀 Features

### 🎥 VidZone Video Editor
| Feature | Description |
|---------|-------------|
| **Image + Audio to MP4** | Combine a background image with an audio track to produce a synchronized video |
| **Multi-Layer Overlays** | Add floating image layers on top of your background, with drag-to-move and resize handles |
| **Layer Cropping** | Inset crop controls (top, right, bottom, left) for each overlay |
| **Border Radius** | Adjust corner rounding on overlays — from sharp rectangles to circles |
| **Audio Waveform** | Real-time waveform visualization with gradient bars |
| **Playback Preview** | In-editor audio player with progress track and time display |
| **H.264 Encoding** | FFmpeg.wasm powered — `libx264` at CRF 15 for visually lossless quality |
| **AAC Audio** | 320 kbps AAC audio stream integration |
| **Custom Filename** | Set the output `.mp4` filename before export |
| **Live Console Logs** | Transparent processing log panel showing every FFmpeg step |
| **Progress Ring** | Animated circular progress indicator during encoding |
| **Startup Intro** | Animated splash screen with the VidZone branding |

### 📄 PDF to Image Converter
- Drag & drop any PDF file
- Renders every page to high-resolution JPEG (2x scale)
- Click to use any page as the video editor background
- Drag PDF pages directly onto the video canvas as overlays
- Download individual pages as standalone images

### 🎨 VidZone Image Creator
- **Canvas Presets**: YouTube (1280×720), Instagram Square (1080×1080), Instagram Story (1080×1920), Full HD (1920×1080), Twitter (1200×675), Custom
- **Text Layers**: Add and customize text with full font, size, color, alignment controls
- **Image Layers**: Overlay images with drag, resize, crop, and border radius
- **Malayalam Text Support**:
  - **Phonetic Mode** — Type in English, auto-transliterate to Malayalam via Google Input Tools
  - **Inscript Mode** — Native Malayalam keyboard mapping
- **Layer Management**: Reorder layers (front/back/up/down), delete, select
- **Export**: Download as PNG or send directly to the video editor as a cover image
- **Multi-Font Support**: Outfit, Inter, JetBrains Mono, Playfair Display, Montserrat, Manjari (Malayalam), Gayathri (Malayalam), Noto Sans/Serif Malayalam

### 🛡️ Privacy & Security
- **100% Client-Side** — All processing happens in your browser via WebAssembly
- **No Uploads** — Your files never leave your device
- **COOP/COEP Headers** — Proper security headers for SharedArrayBuffer support
- **Electron Desktop App** — Packaged as a standalone Windows application

---

## 🖥️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **UI Framework** | React 19 with TypeScript |
| **Build Tool** | Vite 8 |
| **Desktop Shell** | Electron 34 |
| **Video Engine** | FFmpeg.wasm 0.12 (`@ffmpeg/ffmpeg`, `@ffmpeg/util`) |
| **PDF Engine** | pdfjs-dist 6.0 |
| **Icons** | Lucide React |
| **File Upload** | react-dropzone |
| **Styling** | CSS with cyber/sci-fi aesthetic |
| **Packaging** | electron-packager |

---

## 📸 What You Can Create

- **Music visualization videos** — Album art + audio track → polished MP4
- **Social media content** — Use the Image Creator for thumbnails, then render with audio
- **PDF presentations** — Convert PDF slides to video with background music
- **Malayalam typography posters** — Design text-heavy graphics with Indian language support
- **Multi-layer compositions** — Complex overlays with cropped images and custom shapes

---

## 🛠️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later)
- npm (comes with Node.js)

### Clone & Install
```bash
git clone https://github.com/Vibhathcross/VidZone-Video-Editor.git
cd VidZone-Video-Editor
npm install
```

### Development
```bash
npm run dev
```
Starts the Vite dev server. Open the URL shown in the terminal (typically `http://localhost:5173`).

### Production Build
```bash
npm run build
```
Builds the optimized production bundle into the `dist/` folder.

### Desktop App (Electron)
```bash
npm run build
npm run electron
```
Launches the standalone Electron window with a local HTTP server serving the built files with proper security headers.

### Package for Windows
```bash
npm run electron:package
```
Creates a distributable Windows executable in the `release/` folder.

---

## 🎮 Usage Guide

### Video Editor Mode
1. **Drop a background image** onto the main canvas area (supports PNG, JPG, WEBP, SVG)
2. **Drop an audio file** into the sidebar (supports MP3, WAV, M4A, OGG, FLAC)
3. **(Optional) Add overlay layers** — Drag more images onto the canvas or use the "Add Overlay" button
4. **Adjust layers** — Select, drag, resize, crop, and round corners of overlays
5. **Preview** — Click play to hear the audio synced with your visual composition
6. **Set filename** — Enter a custom output name
7. **Export** — Click "Export VidZone MP4" and watch the progress

### PDF Converter Mode
- Select "PDF to Image Converter" from the mode dropdown
- Drop a PDF file
- View all pages rendered as high-res JPEG previews
- Click a page to set it as video editor background, or download individually

### Image Creator Mode
- Select "VidZone Image Creator" from the mode dropdown
- Choose a canvas preset or set custom dimensions
- Add text layers (with Malayalam input support) or image layers
- Drag, resize, and style each layer
- Export as PNG or send to the video editor

---

## 📁 Project Structure

```
VidZone-Video-Editor/
├── public/                    # Static assets (served as-is)
│   ├── favicon.svg
│   ├── ffmpeg-core.js         # FFmpeg WASM core
│   ├── ffmpeg-core.wasm       # FFmpeg WASM binary
│   ├── icons.svg
│   ├── pdf.min.mjs            # PDF.js library
│   └── pdf.worker.min.mjs     # PDF.js worker
├── src/
│   ├── assets/                # Images & icons
│   ├── App.tsx                # Main application (all three modes)
│   ├── index.css              # Full styling with cyber aesthetic
│   └── main.tsx               # React entry point
├── dist/                      # Production build output (gitignored)
├── release/                   # Packaged Electron app (gitignored)
├── electron-main.cjs          # Electron main process
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies & scripts
└── .gitignore
```

---

## 🔧 Configuration

### FFmpeg Encoding Parameters
- **Codec**: H.264 (`libx264`)
- **Quality**: CRF 15 (visually lossless)
- **Preset**: Medium (balanced speed/quality)
- **Tune**: Still Image (optimized for image-based video)
- **Audio**: AAC, 320 kbps
- **Pixel Format**: yuv420p

### System Requirements
- **Browser**: Any modern browser (Chrome, Edge, Firefox, Safari)
- **RAM**: 2 GB+ recommended (FFmpeg.wasm loads ~30 MB core)
- **CPU**: Multi-core recommended for faster encoding

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is free and open-source. Feel free to use, modify, and distribute it as you like.

---

## 🙏 Acknowledgments

- Built with **[Antigravity](https://antigravity.dev/)** — AI-powered development environment
- **[FFmpeg.wasm](https://ffmpegwasm.netlify.app/)** — Bringing FFmpeg to the browser
- **[pdfjs-dist](https://mozilla.github.io/pdf.js/)** — Mozilla's PDF rendering engine
- **[Lucide](https://lucide.dev/)** — Beautiful open-source icons
- **[React Dropzone](https://react-dropzone.js.org/)** — Elegant file upload components

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Vibhathcross">Vibhath</a>
  <br />
  <sub>Created in Antigravity — where AI meets creativity</sub>
</p>