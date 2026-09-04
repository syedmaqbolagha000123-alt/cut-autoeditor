# MAQ AUTO EDITOR ULTRA (v1.0.0)

**Local Automated Storytelling Video Editor & Rendering Suite**

MAQ AUTO EDITOR ULTRA is a standalone, local video editing application engineered specifically for high-efficiency storytelling workflows. It eliminates repetitive manual timeline dragging by automatically constructing synchronized video timelines from voiceover audio and timestamped image assets, applying subtle cinematic motion, conservative sound effects, dynamic voiceover ducking, styled subtitles, hardware-accelerated rendering, and mathematically accurate two-pass video compression.

---

## Table of Contents
1. [System Requirements & Target Platform](#1-system-requirements--target-platform)
2. [Installation & Setup](#2-installation--setup)
3. [First Launch & Desktop Experience](#3-first-launch--desktop-experience)
4. [How to Create a Project](#4-how-to-create-a-project)
5. [How to Import Voiceover](#5-how-to-import-voiceover)
6. [How to Import Images](#6-how-to-import-images)
7. [Timestamp Naming Conventions](#7-timestamp-naming-conventions)
8. [MAQFLOW Ultra Chrome Extension Integration](#8-maqflow-ultra-chrome-extension-integration)
9. [Automatic Editing (One-Click Assembly)](#9-automatic-editing-one-click-assembly)
10. [Manual Editing & Ripple Duration Controls](#10-manual-editing--ripple-duration-controls)
11. [Transitions & Smart Mix Engine](#11-transitions--smart-mix-engine)
12. [Image Motion & Ken Burns Animations](#12-image-motion--ken-burns-animations)
13. [Sound Effects (SFX) & Smart Suggestion Mode](#13-sound-effects-sfx--smart-suggestion-mode)
14. [Background Music & Mood Catalogs](#14-background-music--mood-catalogs)
15. [Audio Ducking Engine](#15-audio-ducking-engine)
16. [Captions, Subtitle Styles & Animated Highlights](#16-captions-subtitle-styles--animated-highlights)
17. [Master Rendering Engine](#17-master-rendering-engine)
18. [Smart Video Compression & Realistic Bitrate Engine](#18-smart-video-compression--realistic-bitrate-engine)
19. [Target File Size Calculator & Quality Realism](#19-target-file-size-calculator--quality-realism)
20. [Storage Management & Cache Protection](#20-storage-management--cache-protection)
21. [GPU Hardware Acceleration (AMF / NVENC / QSV)](#21-gpu-hardware-acceleration-amf--nvenc--qsv)
22. [CPU Fallback Architecture](#22-cpu-fallback-architecture)
23. [Project Backup & File Management](#23-project-backup--file-management)
24. [Troubleshooting & Diagnostics](#24-troubleshooting--diagnostics)

---

## 1. System Requirements & Target Platform
- **Operating System:** Windows 10 64-bit (Build 19041+) or Windows 11 64-bit. Also supports Linux / macOS.
- **CPU:** AMD Ryzen 5000/6000/7000/8000 series, Intel Core i5/i7/i9 8th Gen+, or multi-core CPU (minimum 4 physical cores).
- **RAM:** 16 GB DDR4/DDR5 recommended (minimum 8 GB).
- **GPU:** AMD Radeon Integrated / Discrete, NVIDIA GeForce GTX/RTX, Intel Iris/UHD, or CPU-only software fallback.
- **Dedicated VRAM:** 512 MB to 8 GB+ (Shared system RAM dynamically utilized on AMD APUs).
- **Storage:** NVMe SSD with at least 5 GB free disk space.
- **DirectX:** Feature Level 12.1+.
- **Runtime:** Node.js v18+ and FFmpeg (bundled portable in `bin/` or system PATH).

---

## 2. Installation & Setup
1. Extract `MAQ_AUTO_EDITOR_ULTRA_FINAL.zip` or `MAQ_AUTO_EDITOR_ULTRA_WINDOWS_BUILD.zip` to your chosen directory (e.g. `C:\MAQAutoEditor`).
2. Ensure `node` is installed on your system or present in the application folder.
3. If running portable, place `ffmpeg.exe` and `ffprobe.exe` into the `bin/` directory.

---

## 3. First Launch & Desktop Experience
1. Double-click **`MAQAutoEditor.bat`** or run **`MAQAutoEditor.ps1`** on Windows.
2. The background engine starts a local daemon on port `4000`.
3. Your default web browser will automatically open to `http://localhost:4000`.
4. The top header will display the hardware diagnostic badge:
   `SYSTEM READY: AMD Ryzen 5 5600U | AMD Radeon Graphics | CPU/AMF Encoding Active`

---

## 4. How to Create a Project
- Click **File > New Project** or select a template from the home drawer.
- Projects are saved as structured `.maqp` (JSON format) files in the `projects/` directory.
- The `.maqp` file contains references to image assets, audio tracks, keyframes, transitions, caption styling, and export presets without duplicating multi-gigabyte media files.

---

## 5. How to Import Voiceover
- Drag and drop your voiceover audio file directly into the **VOICEOVER AUDIO** card in the Media panel.
- Supported audio formats: **MP3, WAV, M4A, AAC, FLAC, OGG**.
- The system automatically extracts exact duration, channels, and sample rate via ffprobe and updates the timeline track.

---

## 6. How to Import Images
- **Batch Selection:** Click `+ Add Files` to select multiple PNG/JPG/WEBP files.
- **Folder Import:** Click `Import Folder` or drag and drop a whole folder into the media bin.
- **MAQFLOW ZIP:** Drag and drop an exported MAQFLOW ZIP archive.
- Supported image formats: **PNG, JPG, JPEG, WEBP**.

---

## 7. Timestamp Naming Conventions
The filename parser normalizes timestamps into exact seconds:
- `0-03.png` $\rightarrow$ 3 seconds
- `0-07.png` $\rightarrow$ 7 seconds
- `1-03.png` $\rightarrow$ 63 seconds (1 min 3 sec)
- `1-23.png` $\rightarrow$ 83 seconds (1 min 23 sec)
- `1-02-03.png` $\rightarrow$ 3723 seconds (1 hr 2 min 3 sec)
- `0-03-2.png`, `0-03-3.png` $\rightarrow$ Multi-output assets for the 3-second scene.
- `001.png`, `002.png` $\rightarrow$ Sequential fallback mode (uses user-defined default duration per slide).

---

## 8. MAQFLOW Ultra Chrome Extension Integration
When importing assets exported by MAQFLOW Ultra:
- The editor scans for `manifest.json`.
- It reads prompt descriptions (used by Smart SFX), scene numbers, output indices, and timestamp offsets.
- If `manifest.json` is not present, it seamlessly falls back to filename timestamp parsing.

---

## 9. Automatic Editing (One-Click Assembly)
1. Drop in your Voiceover audio.
2. Drop in your timestamped images.
3. Click the purple **ONE-CLICK AUTO EDIT** button in the top bar.
4. Select your desired storytelling preset:
   - **Cinematic Storytelling:** Subtle push/pull motion, gentle crossfades, conservative sound effects, lower classic captions.
   - **Dynamic Storyteller:** Punchy zooms and pans, slide transitions, bold yellow highlight captions, energetic SFX.
   - **Historical Documentary:** Ken Burns documentary pacing, dissolves, documentary subtitle bars.
   - **Clean Minimal:** Pure cuts, zero clutter, high voiceover priority.
5. The timeline is instantly populated, paced, and ready to preview or export.

---

## 10. Manual Editing & Ripple Duration Controls
- Drag the left or right trim handles on any clip on Track 1 to change duration.
- With **Ripple Edit** enabled, adjusting one clip automatically shifts subsequent clips forward or backward, keeping timeline synchronization intact.
- Split clip at playhead with shortcut **`S`**.
- Delete selected clip with **`Delete`** or **`Backspace`**.
- Full multi-level **Undo (Ctrl+Z)** and **Redo (Ctrl+Shift+Z)**.

---

## 11. Transitions & Smart Mix Engine
- Supported transitions: Hard Cut, Cross Dissolve, Dip to Black, Dip to White, Slide Left, Slide Right, Slide Up, Slide Down, Smooth Zoom, Wipe Left, Wipe Right.
- **Smart Mix Mode:** Intelligently restricts transitions to major scene changes while keeping fast dialogue cuts crisp.

---

## 12. Image Motion & Ken Burns Animations
- Professional motion presets:
  - Slow Push In (100% $\rightarrow$ 115%)
  - Slow Pull Out (115% $\rightarrow$ 100%)
  - Ken Burns Diagonal (Top-Left to Bottom-Right)
  - Standard Zoom In / Zoom Out
  - Pan Left / Pan Right / Pan Up / Pan Down
- Intensity slider allows tuning motion from subtle (8%) to dramatic (35%).

---

## 13. Sound Effects (SFX) & Smart Suggestion Mode
- Categorized local library in `assets/sfx/`: `ambient`, `nature`, `impacts`, `whoosh`, `door`, `footsteps`, `thunder`, `vehicle`, `click`, `cinematic`.
- **Smart SFX Analyzer:** Scans transcript and image generation prompts for contextual cues (e.g. "door slammed" $\rightarrow$ door slam SFX, "footsteps approached" $\rightarrow$ footsteps SFX).
- Conservative spacing prevents sound effect clutter.

---

## 14. Background Music & Mood Catalogs
- Local background music catalog in `assets/music/`.
- Mood filters: Cinematic, Suspense, Calm, Emotional, Dark.
- Independent volume, fade-in, and fade-out controls.

---

## 15. Audio Ducking Engine
- Voiceover is prioritized as the primary audio channel.
- Automatically calculates sidechain compression envelope to attenuate background music by -18 dB (configurable) during speech segments.
- Applies standard EBU R128 loudness normalization (`loudnorm`) across the master audio mix.

---

## 16. Captions, Subtitle Styles & Animated Highlights
- Imports timestamped transcripts in **SRT, VTT, or TXT** format.
- Professional style presets:
  - **Bold Storyteller:** Yellow word pop, thick black border, dark shadow.
  - **Cinematic Classic:** Serif typography, gentle fade animations.
  - **Minimal White:** Clean sans-serif lower-third.
  - **Karaoke:** Spoken word progressive highlighting.
- Generates styled ASS subtitle filtergraphs for pixel-perfect burning.

---

## 17. Master Rendering Engine
- Powered by FFmpeg 5.x/6.x.
- Supported output resolutions: **1080p, 1440p, 4K, 720p, Vertical 1080x1920 (Shorts/Reels)**.
- Frame rates: **24, 30, 60 FPS**.
- Video codecs: **H.264, H.265/HEVC, AV1**.
- Real-time progress monitoring with live frame count, FPS, elapsed time, and ETA.

---

## 18. Smart Video Compression & Realistic Bitrate Engine
- Multi-mode compression:
  - High Quality (CRF 18)
  - Balanced (CRF 22)
  - Small File (CRF 26)
  - Target File Size (2-Pass Bitrate Calculation)
- Two-pass encoding guarantees exact compliance with target file sizes.

---

## 19. Target File Size Calculator & Quality Realism
- Formula:
  $$\text{Bitrate} = \frac{\text{Target MB} \times 8 \times 1024 \times 1024}{\text{Duration (s)}} - \text{Audio Bitrate} - \text{Container Overhead}$$
- Calculates Bits Per Pixel ($\text{BPP} = \frac{\text{Bitrate}}{\text{Width} \times \text{Height} \times \text{FPS}}$).
- Transparent quality evaluation:
  - $\text{BPP} \ge 0.15$: Very Good / Visually Lossless
  - $\text{BPP} \ge 0.08$: Good / Balanced
  - $\text{BPP} \ge 0.045$: Moderate
  - $\text{BPP} < 0.045$: Aggressive (shows warning and calculates recommended size).
- Generate 5-second sample preview to evaluate visual fidelity before full encoding.

---

## 20. Storage Management & Cache Protection
- Live disk space monitor displays free and total SSD capacity.
- Displays size breakdown for `projects/`, `cache/`, `temp/`, and `exports/`.
- One-click buttons to `Clear Cache` and `Purge Temporary Files`.
- Low-disk threshold alerts prevent SSD exhaustion on 256 GB drives.

---

## 21. GPU Hardware Acceleration (AMF / NVENC / QSV)
- Automatically probes hardware on startup:
  - AMD: `h264_amf`, `hevc_amf`
  - NVIDIA: `h264_nvenc`, `hevc_nvenc`, `av1_nvenc`
  - Intel: `h264_qsv`, `hevc_qsv`, `av1_qsv`

---

## 22. CPU Fallback Architecture
- If no GPU encoder is detected or if hardware encoding fails, the application automatically falls back to CPU encoding via `libx264`, `libx265`, or `libsvtav1`.
- The application will **never crash** due to GPU driver unavailability.

---

## 23. Project Backup & File Management
- Projects are completely portable `.maqp` files.
- Export history is stored in the project database with timestamps, file sizes, and render durations.

---

## 24. Troubleshooting & Diagnostics
- **Port 4000 in use:** Set `PORT=4001` in your environment or launch command.
- **Missing Audio in Render:** Verify audio tracks are enabled in the timeline.
- **Subtitles overlapping:** Switch caption preset to `MINIMAL` or adjust `yOffsetPercent`.
- **Run automated test suite:** Execute `npm test` or `node tests/test-runner.js`.

---

## License
MIT License. Built with pride by MAQ Ultra Engineering.
