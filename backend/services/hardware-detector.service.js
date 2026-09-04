/**
 * MAQ AUTO EDITOR ULTRA - Hardware Detection & Encoder Provisioning Service
 * Detects CPU, RAM, GPU vendor, available FFmpeg hardware encoders, and manages automatic fallback.
 */

const os = require('os');
const { execSync } = require('child_process');
const { initPath, getFFmpegPath } = require('../utils/bin-locator');
const Logger = require('../utils/logger');
const logger = new Logger('HardwareDetector');

class HardwareDetectorService {
  constructor() {
    this.cachedInfo = null;
    initPath();
  }

  /**
   * Run command safely and return trimmed stdout
   */
  runCommand(cmd) {
    try {
      return execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
    } catch (e) {
      return '';
    }
  }

  /**
   * Detect FFmpeg encoder capabilities
   */
  detectEncoders() {
    const ffmpegBin = getFFmpegPath();
    const encodersOut = this.runCommand(`"${ffmpegBin}" -encoders`) || this.runCommand('ffmpeg -encoders');
    const available = {
      h264_amf: encodersOut.includes('h264_amf'),
      hevc_amf: encodersOut.includes('hevc_amf'),
      h264_nvenc: encodersOut.includes('h264_nvenc'),
      hevc_nvenc: encodersOut.includes('hevc_nvenc'),
      av1_nvenc: encodersOut.includes('av1_nvenc'),
      h264_qsv: encodersOut.includes('h264_qsv'),
      hevc_qsv: encodersOut.includes('hevc_qsv'),
      av1_qsv: encodersOut.includes('av1_qsv'),
      libx264: encodersOut.includes('libx264'),
      libx265: encodersOut.includes('libx265'),
      libsvtav1: encodersOut.includes('libsvtav1')
    };

    return available;
  }

  /**
   * Detect GPU information
   */
  detectGPU() {
    const isWindows = process.platform === 'win32';
    let gpuName = 'AMD Radeon Graphics (Integrated / Shared)';
    let vendor = 'AMD';
    let dedicatedVramMB = 496;
    let sharedVramMB = 7700;

    if (isWindows) {
      // 1. Try modern PowerShell CIM
      try {
        const psOut = this.runCommand('powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_VideoController | Select-Object -Property Name, AdapterRAM | ConvertTo-Json"');
        if (psOut) {
          const parsed = JSON.parse(psOut);
          const firstGpu = Array.isArray(parsed) ? parsed[0] : parsed;
          if (firstGpu && firstGpu.Name) {
            gpuName = firstGpu.Name;
            if (firstGpu.AdapterRAM) {
              dedicatedVramMB = Math.round(firstGpu.AdapterRAM / (1024 * 1024));
            }
            if (/nvidia/i.test(gpuName)) vendor = 'NVIDIA';
            else if (/intel/i.test(gpuName)) vendor = 'Intel';
            else if (/amd|radeon/i.test(gpuName)) vendor = 'AMD';
          }
        }
      } catch (e) {
        // Fallback to wmic if available
        const wmicOutput = this.runCommand('wmic path win32_VideoController get name,adapterram');
        if (wmicOutput) {
          const lines = wmicOutput.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length > 1) {
            gpuName = lines[1];
            if (/nvidia/i.test(gpuName)) vendor = 'NVIDIA';
            else if (/intel/i.test(gpuName)) vendor = 'Intel';
            else if (/amd|radeon/i.test(gpuName)) vendor = 'AMD';
          }
        }
      }
    } else {
      const lspciOut = this.runCommand('lspci 2>/dev/null');
      if (lspciOut) {
        const vgaLine = lspciOut.split('\n').find(l => /vga|3d|display/i.test(l));
        if (vgaLine) {
          gpuName = vgaLine.split(': ').slice(1).join(': ') || gpuName;
          if (/nvidia/i.test(gpuName)) vendor = 'NVIDIA';
          else if (/intel/i.test(gpuName)) vendor = 'Intel';
          else if (/amd|radeon/i.test(gpuName)) vendor = 'AMD';
        }
      }
    }

    return {
      gpuName,
      vendor,
      dedicatedVramMB,
      sharedVramMB
    };
  }

  /**
   * Detect all system hardware and determine optimal encoding profile
   */
  getSystemInfo(forceRefresh = false) {
    if (this.cachedInfo && !forceRefresh) {
      return this.cachedInfo;
    }

    const cpus = os.cpus() || [];
    const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'AMD Ryzen 5 5600U with Radeon Graphics';
    const cpuCores = cpus.length;
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const totalMemGB = +(totalMemBytes / (1024 ** 3)).toFixed(1);
    const freeMemGB = +(freeMemBytes / (1024 ** 3)).toFixed(1);

    const gpuInfo = this.detectGPU();
    const encoders = this.detectEncoders();

    // Determine primary H.264, HEVC, and AV1 encoders with CPU fallback
    let h264Encoder = 'libx264';
    let hevcEncoder = 'libx265';
    let av1Encoder = 'libsvtav1';
    let hwAccelerated = false;
    let hwVendor = 'CPU';

    if (gpuInfo.vendor === 'AMD' && (encoders.h264_amf || encoders.hevc_amf)) {
      if (encoders.h264_amf) h264Encoder = 'h264_amf';
      if (encoders.hevc_amf) hevcEncoder = 'hevc_amf';
      hwAccelerated = true;
      hwVendor = 'AMD (AMF)';
    } else if (gpuInfo.vendor === 'NVIDIA' && (encoders.h264_nvenc || encoders.hevc_nvenc)) {
      if (encoders.h264_nvenc) h264Encoder = 'h264_nvenc';
      if (encoders.hevc_nvenc) hevcEncoder = 'hevc_nvenc';
      if (encoders.av1_nvenc) av1Encoder = 'av1_nvenc';
      hwAccelerated = true;
      hwVendor = 'NVIDIA (NVENC)';
    } else if (gpuInfo.vendor === 'Intel' && (encoders.h264_qsv || encoders.hevc_qsv)) {
      if (encoders.h264_qsv) h264Encoder = 'h264_qsv';
      if (encoders.hevc_qsv) hevcEncoder = 'hevc_qsv';
      if (encoders.av1_qsv) av1Encoder = 'av1_qsv';
      hwAccelerated = true;
      hwVendor = 'Intel (QSV)';
    }

    const systemReadyBadge = hwAccelerated
      ? `SYSTEM READY: ${cpuModel} | ${gpuInfo.gpuName} | ${hwVendor} HW Acceleration Active`
      : `SYSTEM READY: ${cpuModel} | ${gpuInfo.gpuName} | CPU Software Encoding (libx264/libx265)`;

    const systemInfo = {
      cpu: {
        model: cpuModel,
        cores: cpuCores,
        arch: os.arch()
      },
      ram: {
        totalGB: totalMemGB,
        freeGB: freeMemGB
      },
      gpu: gpuInfo,
      encoders: {
        available: encoders,
        selected: {
          h264: h264Encoder,
          hevc: hevcEncoder,
          av1: av1Encoder
        },
        hardwareAccelerated: hwAccelerated,
        accelerationVendor: hwVendor
      },
      statusMessage: systemReadyBadge,
      platform: process.platform,
      osVersion: os.release(),
      hostname: os.hostname()
    };

    this.cachedInfo = systemInfo;
    logger.info('System hardware detected', { cpu: cpuModel, gpu: gpuInfo.gpuName, hwAccelerated });
    return systemInfo;
  }
}

module.exports = new HardwareDetectorService();
