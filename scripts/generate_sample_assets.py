import os
import json
import zipfile
import numpy as np
import scipy.io.wavfile as wavfile
from PIL import Image, ImageDraw
import subprocess

BASE_DIR = '/working_dir/c_434d79c9507458a0/maq_auto_editor_ultra'
DEMO_DIR = os.path.join(BASE_DIR, 'demo-project')
SFX_DIR = os.path.join(BASE_DIR, 'assets/sfx')
MUSIC_DIR = os.path.join(BASE_DIR, 'assets/music')
IMAGES_DIR = os.path.join(DEMO_DIR, 'images')
MAQ_EXPORT_DIR = os.path.join(DEMO_DIR, 'maqflow_export')
MAQ_IMAGES_DIR = os.path.join(MAQ_EXPORT_DIR, 'images')

os.makedirs(DEMO_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(MAQ_IMAGES_DIR, exist_ok=True)
os.makedirs(SFX_DIR, exist_ok=True)
os.makedirs(MUSIC_DIR, exist_ok=True)

sr = 44100

# 1. Voiceover Audio (30 seconds)
dur = 30.0
t = np.linspace(0, dur, int(sr * dur), endpoint=False)
voice = 0.4 * np.sin(2 * np.pi * 180 * t) + 0.25 * np.sin(2 * np.pi * 360 * t) + 0.15 * np.sin(2 * np.pi * 720 * t)
speech_env = np.abs(np.sin(2 * np.pi * 0.4 * t)) * (0.5 + 0.5 * np.cos(2 * np.pi * 1.8 * t))
speech_env = np.where(speech_env > 0.2, speech_env, 0.0)
vo_audio = (voice * speech_env * 0.7 * 32767).astype(np.int16)

vo_wav_path = os.path.join(DEMO_DIR, 'voiceover.wav')
wavfile.write(vo_wav_path, sr, vo_audio)

vo_mp3_path = os.path.join(DEMO_DIR, 'voiceover.mp3')
subprocess.run(['ffmpeg', '-y', '-i', vo_wav_path, '-c:a', 'libmp3lame', '-b:a', '192k', vo_mp3_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print("Generated Voiceover Audio.")

# 2. Comprehensive SFX Library (14 Categories)
sfx_definitions = {
    'whoosh': [
        ('fast_whoosh_01.wav', 0.8, lambda t: np.sin(2 * np.pi * (180 + 700 * t) * t) * np.exp(-5 * (t - 0.4)**2)),
        ('cinematic_swish_02.wav', 1.2, lambda t: np.sin(2 * np.pi * (120 + 400 * t) * t) * np.exp(-3 * (t - 0.6)**2))
    ],
    'impact': [
        ('heavy_impact_01.wav', 1.8, lambda t: (np.sin(2 * np.pi * 60 * t) + 0.6 * np.random.normal(0, 0.2, len(t))) * np.exp(-3.5 * t)),
        ('bass_boom_02.wav', 2.2, lambda t: np.sin(2 * np.pi * (80 - 25 * t) * t) * np.exp(-2.0 * t))
    ],
    'transition': [
        ('glitch_transition_01.wav', 0.9, lambda t: np.sin(2 * np.pi * 440 * (1 + np.floor(t * 12))) * np.exp(-4 * t)),
        ('smooth_pan_02.wav', 1.1, lambda t: np.sin(2 * np.pi * (200 + 300 * np.sin(np.pi * t)) * t) * np.exp(-3 * t))
    ],
    'click': [
        ('ui_button_click_01.wav', 0.3, lambda t: np.sin(2 * np.pi * 1400 * t) * np.exp(-35 * t)),
        ('mechanical_switch_02.wav', 0.4, lambda t: np.sin(2 * np.pi * 950 * t) * np.exp(-28 * t))
    ],
    'pop': [
        ('bubble_pop_01.wav', 0.4, lambda t: np.sin(2 * np.pi * (300 + 900 * t) * t) * np.exp(-20 * t)),
        ('accent_pop_02.wav', 0.35, lambda t: np.sin(2 * np.pi * 850 * t) * np.exp(-24 * t))
    ],
    'rise': [
        ('tension_riser_01.wav', 2.5, lambda t: np.sin(2 * np.pi * (80 + 350 * (t**2)) * t) * (t / 2.5)),
        ('cinematic_swell_02.wav', 3.0, lambda t: np.sin(2 * np.pi * (100 + 400 * t) * t) * (1 - np.cos(np.pi * t / 3.0)))
    ],
    'drop': [
        ('bass_drop_01.wav', 2.0, lambda t: np.sin(2 * np.pi * (220 - 160 * t) * t) * np.exp(-1.5 * t)),
        ('sub_hit_02.wav', 1.8, lambda t: np.sin(2 * np.pi * 50 * t) * np.exp(-2.5 * t))
    ],
    'cinematic': [
        ('cinematic_brass_hit_01.wav', 2.2, lambda t: (np.sin(2 * np.pi * 110 * t) + 0.4 * np.sin(2 * np.pi * 220 * t)) * np.exp(-1.8 * t)),
        ('dramatic_reveal_02.wav', 2.5, lambda t: (np.sin(2 * np.pi * 130 * t) + np.sin(2 * np.pi * 195 * t)) * np.exp(-1.5 * t))
    ],
    'ambient': [
        ('garage_room_tone_01.wav', 4.0, lambda t: np.random.normal(0, 0.08, len(t)) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.1 * t))),
        ('studio_silence_02.wav', 4.0, lambda t: np.random.normal(0, 0.05, len(t)))
    ],
    'ui': [
        ('notification_chime_01.wav', 0.6, lambda t: (np.sin(2 * np.pi * 523.25 * t) + np.sin(2 * np.pi * 659.25 * t)) * np.exp(-10 * t)),
        ('dialog_open_02.wav', 0.5, lambda t: np.sin(2 * np.pi * 880 * t) * np.exp(-14 * t))
    ],
    'nature': [
        ('ambient_wind_01.wav', 4.0, lambda t: np.random.normal(0, 0.15, len(t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * t))),
        ('water_stream_02.wav', 3.5, lambda t: np.random.normal(0, 0.12, len(t)) * (0.7 + 0.3 * np.cos(2 * np.pi * 0.5 * t)))
    ],
    'human': [
        ('footsteps_01.wav', 1.8, lambda t: np.sum([np.where((t >= k*0.4) & (t < k*0.4 + 0.08), np.sin(2 * np.pi * 220 * t) * np.exp(-25 * (t - k*0.4)), 0) for k in range(4)], axis=0)),
        ('breathing_intense_02.wav', 2.0, lambda t: np.sin(2 * np.pi * 80 * t) * np.exp(-3 * (t - 1.0)**2))
    ],
    'technology': [
        ('digital_beep_01.wav', 0.4, lambda t: np.sin(2 * np.pi * 1760 * t) * np.exp(-15 * t)),
        ('servo_motor_02.wav', 1.2, lambda t: np.sin(2 * np.pi * (300 + 50 * np.sin(2 * np.pi * 8 * t)) * t) * np.exp(-2.5 * t))
    ],
    'comedy': [
        ('cartoon_boing_01.wav', 0.8, lambda t: np.sin(2 * np.pi * (250 + 200 * np.sin(2 * np.pi * 14 * t)) * t) * np.exp(-3 * t)),
        ('record_scratch_02.wav', 0.6, lambda t: np.random.normal(0, 0.4, len(t)) * np.sin(2 * np.pi * 400 * t) * np.exp(-8 * t))
    ],
    'door': [
        ('door_slam_01.wav', 1.2, lambda t: (np.sin(2 * np.pi * 120 * t) + np.sin(2 * np.pi * 80 * t)) * np.exp(-6 * t))
    ],
    'thunder': [
        ('thunder_roll_01.wav', 3.0, lambda t: np.random.normal(0, 0.3, len(t)) * (np.sin(2 * np.pi * 45 * t) + 0.8) * np.exp(-0.9 * t))
    ],
    'vehicle': [
        ('car_pass_01.wav', 3.5, lambda t: np.sin(2 * np.pi * (120 + 80 * np.tanh(2 * (t - 1.7))) * t) * np.exp(-0.4 * (t - 1.7)**2))
    ]
}

for cat, file_list in sfx_definitions.items():
    cat_dir = os.path.join(SFX_DIR, cat)
    os.makedirs(cat_dir, exist_ok=True)
    for fname, s_dur, s_func in file_list:
        st = np.linspace(0, s_dur, int(sr * s_dur), endpoint=False)
        s_audio = (s_func(st) * 0.8 * 32767).astype(np.int16)
        s_path = os.path.join(cat_dir, fname)
        wavfile.write(s_path, sr, s_audio)
print("Generated Extended SFX Library (14 Categories).")

# 3. Comprehensive Background Music Catalog (8 Moods)
bgm_catalog = {
    'cinematic_ambient_01.mp3': (30.0, 90, "Cinematic Majesty", "Cinematic", lambda t: 0.3 * np.sin(2 * np.pi * 110 * t) + 0.2 * np.sin(2 * np.pi * 220 * t) + 0.15 * np.sin(2 * np.pi * 277.18 * t) + 0.15 * np.sin(2 * np.pi * 329.63 * t)),
    'suspense_pulse_01.mp3': (30.0, 110, "Dark Investigation", "Suspense", lambda t: (0.35 * np.sin(2 * np.pi * 55 * t) + 0.2 * np.sin(2 * np.pi * 110 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.0 * t))),
    'calm_story_01.mp3': (30.0, 80, "Reflective Journey", "Calm", lambda t: 0.25 * np.sin(2 * np.pi * 130.81 * t) + 0.2 * np.sin(2 * np.pi * 164.81 * t) + 0.2 * np.sin(2 * np.pi * 196.00 * t)),
    'emotional_piano_01.mp3': (30.0, 72, "Nostalgic Memories", "Emotional", lambda t: 0.3 * np.sin(2 * np.pi * 261.63 * t) + 0.2 * np.sin(2 * np.pi * 329.63 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * t))),
    'corporate_tech_01.mp3': (30.0, 120, "Modern Innovation", "Corporate", lambda t: 0.25 * np.sin(2 * np.pi * 220 * t) + 0.2 * np.sin(2 * np.pi * 440 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 4.0 * t))),
    'documentary_historic_01.mp3': (30.0, 78, "Archive Chronology", "Documentary", lambda t: 0.3 * np.sin(2 * np.pi * 98.00 * t) + 0.15 * np.sin(2 * np.pi * 146.83 * t) + 0.1 * np.sin(2 * np.pi * 196.00 * t)),
    'energetic_beat_01.mp3': (30.0, 128, "Dynamic Drive", "Energetic", lambda t: (0.4 * np.sin(2 * np.pi * 65 * t) + 0.2 * np.sin(2 * np.pi * 130 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 4.26 * t))),
    'cyberpunk_synth_01.mp3': (30.0, 115, "Synthetic Horizon", "Technology", lambda t: 0.3 * np.sin(2 * np.pi * 110 * t) + 0.25 * np.sin(2 * np.pi * 165 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.8 * t)))
}

music_meta = []
for b_fname, (b_dur, bpm, title, mood, b_func) in bgm_catalog.items():
    bt = np.linspace(0, b_dur, int(sr * b_dur), endpoint=False)
    b_wav_tmp = os.path.join(DEMO_DIR, f'tmp_{b_fname}.wav')
    b_audio = (b_func(bt) * 0.65 * 32767).astype(np.int16)
    wavfile.write(b_wav_tmp, sr, b_audio)
    b_out = os.path.join(MUSIC_DIR, b_fname)
    subprocess.run(['ffmpeg', '-y', '-i', b_wav_tmp, '-c:a', 'libmp3lame', '-b:a', '192k', b_out], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(b_wav_tmp):
        os.remove(b_wav_tmp)
    music_meta.append({
        "id": f"bgm_{len(music_meta)+1}",
        "filename": b_fname,
        "title": title,
        "mood": mood,
        "duration": b_dur,
        "bpm": bpm,
        "relPath": f"assets/music/{b_fname}"
    })

with open(os.path.join(MUSIC_DIR, 'catalog.json'), 'w', encoding='utf-8') as f:
    json.dump(music_meta, f, indent=2)

print("Generated Music Catalog (8 Moods).")

# 4. Cinematic 1080p Images
scenes = [
    ("0-03.png", 3, "SCENE 1: THE DISCOVERY", "In the heart of the vintage restoration garage...", (30, 40, 70), (10, 15, 30)),
    ("0-07.png", 7, "SCENE 2: BLUEPRINT ARCHIVE", "Engineering schematics from 1931 unveiled.", (50, 30, 40), (20, 10, 15)),
    ("0-12.png", 12, "SCENE 3: WORKSHOP CRAFTSMANSHIP", "Precision machining of the functional scale chassis.", (25, 55, 45), (10, 25, 20)),
    ("0-18.png", 18, "SCENE 4: ENGINE IGNITION", "The handcrafted twin-cam powerplant roars to life.", (70, 45, 20), (30, 15, 10)),
    ("0-24.png", 24, "SCENE 5: HIGH-SPEED ROAD TEST", "Taking the 1:3 hypercar prototype out on the circuit.", (35, 35, 75), (15, 15, 35)),
    ("0-30.png", 30, "SCENE 6: MASTERPIECE REVEAL", "A triumph of functional scale engineering.", (20, 60, 60), (10, 25, 25))
]

w, h = 1920, 1080
for fname, ts_sec, title, desc, col1, col2 in scenes:
    img = Image.new('RGB', (w, h), color=col1)
    draw = ImageDraw.Draw(img)

    for y in range(h):
        factor = y / h
        r = int(col1[0] * (1 - factor) + col2[0] * factor)
        g = int(col1[1] * (1 - factor) + col2[1] * factor)
        b = int(col1[2] * (1 - factor) + col2[2] * factor)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    for gx in range(0, w, 120):
        draw.line([(gx, 0), (gx, h)], fill=(255, 255, 255, 20), width=1)
    for gy in range(0, h, 120):
        draw.line([(0, gy), (w, gy)], fill=(255, 255, 255, 20), width=1)

    draw.rectangle([(40, 40), (w - 40, h - 40)], outline=(255, 255, 255, 80), width=3)
    draw.rectangle([(50, 50), (w - 50, h - 50)], outline=(99, 102, 241), width=2)

    draw.text((120, 140), "MAQ AUTO EDITOR ULTRA • AI STORYTELLING STUDIO", fill=(129, 140, 248))
    draw.text((120, 200), title, fill=(255, 255, 255))
    draw.text((120, 300), desc, fill=(200, 210, 230))
    draw.text((120, 380), f"TIMESTAMP: {fname.replace('.png', '')} ({ts_sec}s) | 1920x1080 30FPS", fill=(6, 182, 212))

    draw.rectangle([(400, 480), (1520, 940)], fill=(15, 20, 30), outline=(255, 255, 255, 100), width=2)
    draw.text((450, 540), f"VISUAL ASSET: {fname}", fill=(240, 240, 250))
    draw.text((450, 600), "• Full 1080p Resolution\n• Auto-Paced Timeline Synchronization\n• Dynamic Pan & Zoom / Ken Burns Applied\n• Context-Sensitive Sound Cue Anchored", fill=(160, 175, 200))

    out_demo = os.path.join(IMAGES_DIR, fname)
    out_maq = os.path.join(MAQ_IMAGES_DIR, fname)
    img.save(out_demo)
    img.save(out_maq)

print("Generated 1080p Images.")

# 5. MAQFLOW manifest.json & ZIP
manifest_data = {
    "version": "3.1.0",
    "generator": "MAQFLOW ULTRA Chrome Extension",
    "timestamp": "2026-08-31T12:00:00Z",
    "project": "MAQ AUTO EDITOR PROJECT 01",
    "scenes": [
        { "sceneNumber": 1, "timestamp": "0-03", "timestampSeconds": 3, "outputIndex": 1, "prompt": "Cinematic shot of classic garage workshop door opening with dust in the sunbeams", "filename": "images/0-03.png", "mediaType": "image/png" },
        { "sceneNumber": 2, "timestamp": "0-07", "timestampSeconds": 7, "outputIndex": 1, "prompt": "Vintage 1931 blueprint archive macro focus on technical schematics and measurements", "filename": "images/0-07.png", "mediaType": "image/png" },
        { "sceneNumber": 3, "timestamp": "0-12", "timestampSeconds": 12, "outputIndex": 1, "prompt": "Engineer footsteps approaching lathe machine precision machining automotive components", "filename": "images/0-12.png", "mediaType": "image/png" },
        { "sceneNumber": 4, "timestamp": "0-18", "timestampSeconds": 18, "outputIndex": 1, "prompt": "Close-up of miniature 1:3 scale engine block exhaust and thunderous mechanical ignition", "filename": "images/0-18.png", "mediaType": "image/png" },
        { "sceneNumber": 5, "timestamp": "0-24", "timestampSeconds": 24, "outputIndex": 1, "prompt": "Scale model car driving and accelerating down a private asphalt test track", "filename": "images/0-24.png", "mediaType": "image/png" },
        { "sceneNumber": 6, "timestamp": "0-30", "timestampSeconds": 30, "outputIndex": 1, "prompt": "Hero dramatic cinematic studio shot of the completed 1:3 scale masterpiece", "filename": "images/0-30.png", "mediaType": "image/png" }
    ]
}

manifest_path = os.path.join(MAQ_EXPORT_DIR, 'manifest.json')
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest_data, f, indent=2)

zip_out = os.path.join(DEMO_DIR, 'maqflow_sample_export.zip')
with zipfile.ZipFile(zip_out, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(manifest_path, 'manifest.json')
    for root, _, files in os.walk(MAQ_IMAGES_DIR):
        for file in files:
            full_f = os.path.join(root, file)
            arcname = os.path.relpath(full_f, MAQ_EXPORT_DIR)
            zf.write(full_f, arcname)

# 6. Transcripts
srt_content = """1
00:00:00,000 --> 00:00:03,000
Welcome to the functional scale engineering workshop.

2
00:00:03,000 --> 00:00:07,000
It all began with an archive of original 1931 blueprints.

3
00:00:07,000 --> 00:00:12,000
Every single component was machined from solid aerospace-grade alloy.

4
00:00:12,000 --> 00:00:18,000
The custom handcrafted engine produces real combustion power.

5
00:00:18,000 --> 00:00:24,000
Testing the vehicle on the track proved the suspension and chassis rigidity.

6
00:00:24,000 --> 00:00:30,000
A breathtaking tribute to historic automotive craftsmanship.
"""
with open(os.path.join(DEMO_DIR, 'transcript.srt'), 'w', encoding='utf-8') as f:
    f.write(srt_content)

# 7. Demo Project
demo_project = {
    "version": "1.0.0",
    "id": "proj_demo_01",
    "name": "MAQ AUTO EDITOR PROJECT 01",
    "createdAt": "2026-08-31T12:00:00Z",
    "updatedAt": "2026-08-31T12:00:00Z",
    "preset": "CINEMATIC",
    "voiceover": { "filename": "voiceover.mp3", "path": os.path.join(DEMO_DIR, "voiceover.mp3"), "duration": 30.0 },
    "voiceoverDuration": 30.0,
    "imageAssets": [
        { "id": f"asset_{i+1}", "filename": s[0], "path": os.path.join(IMAGES_DIR, s[0]), "timestampSeconds": s[1], "displayTimestamp": f"00:{s[1]:02d}", "outputIndex": 1, "prompt": manifest_data['scenes'][i]['prompt'], "mediaType": "image/png" }
        for i, s in enumerate(scenes)
    ],
    "timeline": {
        "videoClips": [
            { "id": "clip_1", "path": os.path.join(IMAGES_DIR, "0-03.png"), "filename": "0-03.png", "startTime": 0.0, "duration": 7.0, "endTime": 7.0, "prompt": manifest_data['scenes'][0]['prompt'], "motion": { "preset": "SLOW_PUSH", "intensity": 0.15 }, "effects": { "brightness": 0.0, "contrast": 1.05, "vignette": 0.2 }, "transition": { "type": "CUT", "duration": 0.0 } },
            { "id": "clip_2", "path": os.path.join(IMAGES_DIR, "0-07.png"), "filename": "0-07.png", "startTime": 7.0, "duration": 5.0, "endTime": 12.0, "prompt": manifest_data['scenes'][1]['prompt'], "motion": { "preset": "KEN_BURNS_TL_BR", "intensity": 0.15 }, "effects": { "brightness": 0.0, "contrast": 1.0, "vignette": 0.15 }, "transition": { "type": "FADE", "duration": 0.5 } },
            { "id": "clip_3", "path": os.path.join(IMAGES_DIR, "0-12.png"), "filename": "0-12.png", "startTime": 12.0, "duration": 6.0, "endTime": 18.0, "prompt": manifest_data['scenes'][2]['prompt'], "motion": { "preset": "SLOW_PULL", "intensity": 0.15 }, "effects": { "brightness": 0.0, "contrast": 1.0, "vignette": 0.1 }, "transition": { "type": "DISSOLVE", "duration": 0.5 } },
            { "id": "clip_4", "path": os.path.join(IMAGES_DIR, "0-18.png"), "filename": "0-18.png", "startTime": 18.0, "duration": 6.0, "endTime": 24.0, "prompt": manifest_data['scenes'][3]['prompt'], "motion": { "preset": "ZOOM_IN", "intensity": 0.2 }, "effects": { "brightness": 0.02, "contrast": 1.1, "vignette": 0.25 }, "transition": { "type": "CUT", "duration": 0.0 } },
            { "id": "clip_5", "path": os.path.join(IMAGES_DIR, "0-24.png"), "filename": "0-24.png", "startTime": 24.0, "duration": 6.0, "endTime": 30.0, "prompt": manifest_data['scenes'][4]['prompt'], "motion": { "preset": "PAN_RIGHT", "intensity": 0.15 }, "effects": { "brightness": 0.0, "contrast": 1.0, "vignette": 0.15 }, "transition": { "type": "SLIDE_LEFT", "duration": 0.4 } }
        ],
        "captions": [
            { "id": "cap_1", "startTime": 0.0, "endTime": 3.0, "duration": 3.0, "text": "Welcome to the functional scale engineering workshop." },
            { "id": "cap_2", "startTime": 3.0, "endTime": 7.0, "duration": 4.0, "text": "It all began with an archive of original 1931 blueprints." },
            { "id": "cap_3", "startTime": 7.0, "endTime": 12.0, "duration": 5.0, "text": "Every single component was machined from solid aerospace-grade alloy." },
            { "id": "cap_4", "startTime": 12.0, "endTime": 18.0, "duration": 6.0, "text": "The custom handcrafted engine produces real combustion power." },
            { "id": "cap_5", "startTime": 18.0, "endTime": 24.0, "duration": 6.0, "text": "Testing the vehicle on the track proved the suspension and chassis rigidity." },
            { "id": "cap_6", "startTime": 24.0, "endTime": 30.0, "duration": 6.0, "text": "A breathtaking tribute to historic automotive craftsmanship." }
        ],
        "sfxClips": [
            { "id": "sfx_1", "name": "fast_whoosh_01", "path": os.path.join(SFX_DIR, "whoosh/fast_whoosh_01.wav"), "startTime": 0.0, "duration": 0.8, "volume": 0.75 },
            { "id": "sfx_2", "name": "heavy_impact_01", "path": os.path.join(SFX_DIR, "impact/heavy_impact_01.wav"), "startTime": 7.0, "duration": 1.8, "volume": 0.8 },
            { "id": "sfx_3", "name": "door_slam_01", "path": os.path.join(SFX_DIR, "door/door_slam_01.wav"), "startTime": 12.0, "duration": 1.2, "volume": 0.7 },
            { "id": "sfx_4", "name": "car_pass_01", "path": os.path.join(SFX_DIR, "vehicle/car_pass_01.wav"), "startTime": 24.0, "duration": 3.5, "volume": 0.85 }
        ],
        "musicClips": [
            { "id": "bgm_1", "name": "cinematic_ambient_01", "path": os.path.join(MUSIC_DIR, "cinematic_ambient_01.mp3"), "startTime": 0.0, "duration": 30.0, "volume": 0.35, "fadeIn": 1.0, "fadeOut": 1.5, "duckingEnabled": True }
        ]
    },
    "audioSettings": { "duckingStrengthDB": -18, "voiceoverVolume": 1.0, "musicVolume": 0.35, "sfxVolume": 0.75 },
    "captionStyle": "BOLD_YELLOW",
    "exportSettings": { "resolution": "1080p", "fps": 30, "codec": "h264", "quality": "balanced", "audioBitrate": "128k", "useHardwareAcceleration": True }
}

with open(os.path.join(DEMO_DIR, 'demo.maqp'), 'w', encoding='utf-8') as f:
    json.dump(demo_project, f, indent=2)

projects_dir = os.path.join(BASE_DIR, 'projects')
os.makedirs(projects_dir, exist_ok=True)
with open(os.path.join(projects_dir, 'demo.maqp'), 'w', encoding='utf-8') as f:
    json.dump(demo_project, f, indent=2)

print("Demo Project (.maqp) generated with 'MAQ AUTO EDITOR PROJECT 01'.")
