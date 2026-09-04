import os
import subprocess

BASE_DIR = '/working_dir/c_434d79c9507458a0/maq_auto_editor_ultra'
SFX_DIR = os.path.join(BASE_DIR, 'assets/sfx')
MUSIC_DIR = os.path.join(BASE_DIR, 'assets/music')

# Compress all SFX wav files to 22050 Hz mono 16-bit PCM (super compact)
for root, _, files in os.walk(SFX_DIR):
    for f in files:
        if f.endswith('.wav'):
            full_p = os.path.join(root, f)
            tmp_p = full_p + '.tmp.wav'
            subprocess.run(['ffmpeg', '-y', '-i', full_p, '-ar', '22050', '-ac', '1', tmp_p], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if os.path.exists(tmp_p):
                os.replace(tmp_p, full_p)

# Compress music files to 128k MP3
for f in os.listdir(MUSIC_DIR):
    if f.endswith('.mp3'):
        full_p = os.path.join(MUSIC_DIR, f)
        tmp_p = full_p + '.tmp.mp3'
        subprocess.run(['ffmpeg', '-y', '-i', full_p, '-c:a', 'libmp3lame', '-b:a', '128k', '-t', '20', tmp_p], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if os.path.exists(tmp_p):
            os.replace(tmp_p, full_p)

print("Audio assets optimized.")
