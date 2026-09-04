/**
 * MAQ AUTO EDITOR ULTRA - Release Packaging Script
 * Packs the entire source repository and the standalone Windows distribution into ZIP archives.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, '..');

const FINAL_ZIP = path.join(OUTPUT_DIR, 'MAQ_AUTO_EDITOR_ULTRA_FINAL.zip');
const WIN_BUILD_ZIP = path.join(OUTPUT_DIR, 'MAQ_AUTO_EDITOR_ULTRA_WINDOWS_BUILD.zip');

console.log('===========================================================');
console.log('       PACKAGING MAQ AUTO EDITOR ULTRA RELEASE ZIPs        ');
console.log('===========================================================');

const pyPackScript = `
import os, zipfile, sys

def zip_folder(folder_path, output_zip, exclude_dirs=['node_modules', '.git', 'lost+found']):
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(folder_path):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, folder_path)
                zf.write(full_path, rel_path)

zip_folder(sys.argv[1], sys.argv[2])
print(f"Created: {sys.argv[2]} ({os.path.getsize(sys.argv[2]) / (1024*1024):.2f} MB)")
`;

// 1. Pack Complete Source Project
console.log('[1/2] Packing complete source repository...');
execSync(`python3 -c "${pyPackScript}" "${ROOT_DIR}" "${FINAL_ZIP}"`, { stdio: 'inherit' });

// 2. Prepare Windows Standalone Distribution Folder
const winDistDir = path.join(ROOT_DIR, 'temp/win_dist');
if (fs.existsSync(winDistDir)) {
  fs.rmSync(winDistDir, { recursive: true, force: true });
}
fs.mkdirSync(winDistDir, { recursive: true });

// Copy essential folders and files
const copyRecursive = (src, dest) => {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(item => {
      copyRecursive(path.join(src, item), path.join(dest, item));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

['backend', 'frontend', 'shared', 'assets', 'demo-project', 'projects', 'MAQAutoEditor.bat', 'MAQAutoEditor.ps1', 'MAQAutoEditor.sh', 'launcher.js', 'package.json', 'README.md'].forEach(item => {
  copyRecursive(path.join(ROOT_DIR, item), path.join(winDistDir, item));
});

// Create bin folder for local ffmpeg binaries
fs.mkdirSync(path.join(winDistDir, 'bin'), { recursive: true });
fs.writeFileSync(path.join(winDistDir, 'bin/README_FFMPEG.txt'), 'Place ffmpeg.exe and ffprobe.exe in this folder for portable Windows execution without system PATH installation.\n');

console.log('[2/2] Packing Windows standalone distribution...');
execSync(`python3 -c "${pyPackScript}" "${winDistDir}" "${WIN_BUILD_ZIP}"`, { stdio: 'inherit' });

console.log('Packaging finished successfully.');
