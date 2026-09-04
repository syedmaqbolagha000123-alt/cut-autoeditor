/**
 * MAQ AUTO EDITOR ULTRA - Binary & Runtime Path Resolver
 * Automatically resolves portable FFmpeg, FFprobe, and injects bin/ into PATH.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const LOCAL_BIN_DIR = path.join(ROOT_DIR, 'bin');

// Inject local bin directory to beginning of PATH
function initPath() {
  const currentPath = process.env.PATH || '';
  const delimiter = process.platform === 'win32' ? ';' : ':';
  const pathParts = currentPath.split(delimiter);

  if (fs.existsSync(LOCAL_BIN_DIR) && !pathParts.includes(LOCAL_BIN_DIR)) {
    process.env.PATH = `${LOCAL_BIN_DIR}${delimiter}${currentPath}`;
  }
}

// Locate ffmpeg executable
function getFFmpegPath() {
  initPath();
  const exeName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const localExe = path.join(LOCAL_BIN_DIR, exeName);
  if (fs.existsSync(localExe)) {
    return localExe;
  }
  return 'ffmpeg';
}

// Locate ffprobe executable
function getFFprobePath() {
  initPath();
  const exeName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  const localExe = path.join(LOCAL_BIN_DIR, exeName);
  if (fs.existsSync(localExe)) {
    return localExe;
  }
  return 'ffprobe';
}

initPath();

module.exports = {
  initPath,
  getFFmpegPath,
  getFFprobePath,
  LOCAL_BIN_DIR
};
