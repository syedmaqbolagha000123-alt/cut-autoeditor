/**
 * MAQ AUTO EDITOR ULTRA - Smart Video Compression & Realistic Bitrate Engine
 * Calculates mathematically accurate target bitrates, evaluates perceptual quality (BPP), and executes 2-pass encoding.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const HardwareDetector = require('./hardware-detector.service');
const Logger = require('../utils/logger');
const logger = new Logger('CompressionEngine');

class CompressionService {
  /**
   * Calculate exact video bitrate for a target file size in Megabytes (MB)
   * @param {{
   *   targetSizeMB: number,
   *   durationSeconds: number,
   *   audioBitrateKbps?: number,
   *   width?: number,
   *   height?: number,
   *   fps?: number,
   *   containerOverheadPercent?: number
   * }} params
   * @returns {{
   *   targetBitrateKbps: number,
   *   audioBitrateKbps: number,
   *   totalBitrateKbps: number,
   *   bitsPerPixel: number,
   *   qualityLevel: 'Lossless'|'Very Good'|'Good'|'Moderate'|'Aggressive',
   *   isRealistic: boolean,
   *   recommendedTargetMB: number,
   *   warningMessage: string|null
   * }}
   */
  static calculateTargetBitrate(params) {
    const {
      targetSizeMB,
      durationSeconds,
      audioBitrateKbps = 128,
      width = 1920,
      height = 1080,
      fps = 30,
      containerOverheadPercent = 1.5
    } = params;

    if (durationSeconds <= 0 || targetSizeMB <= 0) {
      throw new Error('Duration and Target Size must be greater than zero.');
    }

    // Convert MB to bits, subtract container overhead
    const totalTargetBits = targetSizeMB * 8 * 1024 * 1024 * (1 - containerOverheadPercent / 100);
    const totalBitrateBps = totalTargetBits / durationSeconds;
    const totalBitrateKbps = Math.round(totalBitrateBps / 1000);

    const videoBitrateKbps = Math.max(totalBitrateKbps - audioBitrateKbps, 150);

    // Calculate Bits Per Pixel (BPP) = Bitrate / (Width * Height * FPS)
    const bitsPerPixel = +( (videoBitrateKbps * 1000) / (width * height * fps) ).toFixed(4);

    let qualityLevel = 'Good';
    let isRealistic = true;
    let warningMessage = null;

    // Evaluate realism threshold
    if (bitsPerPixel >= 0.15) {
      qualityLevel = 'Very Good';
    } else if (bitsPerPixel >= 0.08) {
      qualityLevel = 'Good';
    } else if (bitsPerPixel >= 0.045) {
      qualityLevel = 'Moderate';
    } else {
      qualityLevel = 'Aggressive';
      isRealistic = false;
      warningMessage = `Target size (${targetSizeMB} MB) is extremely aggressive for ${width}x${height} at ${fps} FPS. Visual compression artifacts (macroblocking/blurring) will occur.`;
    }

    // Calculate recommended target size for at least Good quality (BPP 0.08)
    const recommendedVideoBits = (0.08 * width * height * fps) * durationSeconds;
    const recommendedAudioBits = (audioBitrateKbps * 1000) * durationSeconds;
    const recommendedTargetMB = +( ((recommendedVideoBits + recommendedAudioBits) / (8 * 1024 * 1024)) * 1.02 ).toFixed(1);

    return {
      targetBitrateKbps: videoBitrateKbps,
      audioBitrateKbps,
      totalBitrateKbps,
      bitsPerPixel,
      qualityLevel,
      isRealistic,
      recommendedTargetMB: Math.max(recommendedTargetMB, 5),
      warningMessage
    };
  }

  /**
   * Probe an existing video file to extract duration, resolution, fps, bitrate, and size
   * @param {string} videoPath 
   */
  static probeVideo(videoPath) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`File not found: ${videoPath}`);
    }

    const stat = fs.statSync(videoPath);
    try {
      const ffprobeCmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
      const out = execSync(ffprobeCmd, { encoding: 'utf8' });
      const data = JSON.parse(out);

      const vStream = data.streams.find(s => s.codec_type === 'video') || {};
      const aStream = data.streams.find(s => s.codec_type === 'audio') || {};

      const width = vStream.width || 1920;
      const height = vStream.height || 1080;
      const duration = parseFloat(data.format.duration) || parseFloat(vStream.duration) || 0;
      const sizeMB = +(stat.size / (1024 * 1024)).toFixed(2);
      
      let fps = 30;
      if (vStream.r_frame_rate) {
        const [num, den] = vStream.r_frame_rate.split('/').map(Number);
        if (den > 0) fps = Math.round(num / den);
      }

      return {
        path: videoPath,
        filename: path.basename(videoPath),
        sizeBytes: stat.size,
        sizeMB,
        durationSeconds: duration,
        width,
        height,
        fps,
        videoCodec: vStream.codec_name || 'h264',
        audioCodec: aStream.codec_name || 'aac',
        bitrateKbps: Math.round((parseInt(data.format.bit_rate, 10) || 0) / 1000)
      };
    } catch (e) {
      logger.error('Failed probing video', { error: e.message });
      return {
        path: videoPath,
        filename: path.basename(videoPath),
        sizeBytes: stat.size,
        sizeMB: +(stat.size / (1024 * 1024)).toFixed(2),
        durationSeconds: 30,
        width: 1920,
        height: 1080,
        fps: 30,
        videoCodec: 'h264',
        audioCodec: 'aac',
        bitrateKbps: 4000
      };
    }
  }

  /**
   * Execute video compression using 2-pass bitrate mode or CRF mode
   * @param {{
   *   inputPath: string,
   *   outputPath: string,
   *   mode: 'crf'|'target_size',
   *   crf?: number,
   *   targetSizeMB?: number,
   *   codec?: 'h264'|'hevc'|'av1',
   *   speedPreset?: 'fast'|'balanced'|'max',
   *   onProgress?: (progressData: any) => void
   * }} options 
   */
  static async compressVideo(options) {
    const {
      inputPath,
      outputPath,
      mode = 'target_size',
      crf = 22,
      targetSizeMB = 50,
      codec = 'h264',
      speedPreset = 'balanced',
      onProgress
    } = options;

    const probe = this.probeVideo(inputPath);
    const sysInfo = HardwareDetector.getSystemInfo();

    let encoder = 'libx264';
    if (codec === 'hevc') encoder = 'libx265';
    if (codec === 'av1') encoder = 'libsvtav1';

    // Allow hardware encoding for fast mode if available
    if (speedPreset === 'fast' && sysInfo.encoders.hardwareAccelerated) {
      encoder = sysInfo.encoders.selected[codec] || encoder;
    }

    if (mode === 'target_size') {
      const calc = this.calculateTargetBitrate({
        targetSizeMB,
        durationSeconds: probe.durationSeconds,
        width: probe.width,
        height: probe.height,
        fps: probe.fps
      });

      const passLogDir = path.join(__dirname, '../../temp');
      const passLogName = `ffmpeg2pass_${Date.now()}`;
      const passLogPrefix = path.join(passLogDir, passLogName).replace(/\\/g, '/');

      // Pass 1
      const pass1Cmd = `ffmpeg -y -i "${inputPath}" -c:v ${encoder} -b:v ${calc.targetBitrateKbps}k -pass 1 -passlogfile "${passLogPrefix}" -an -f null ${process.platform === 'win32' ? 'NUL' : '/dev/null'}`;
      logger.info('Executing compression Pass 1', { cmd: pass1Cmd });
      execSync(pass1Cmd);

      // Pass 2
      const pass2Cmd = `ffmpeg -y -i "${inputPath}" -c:v ${encoder} -b:v ${calc.targetBitrateKbps}k -pass 2 -passlogfile "${passLogPrefix}" -c:a aac -b:a ${calc.audioBitrateKbps}k -movflags +faststart "${outputPath}"`;
      logger.info('Executing compression Pass 2', { cmd: pass2Cmd });
      execSync(pass2Cmd);

      // Clean pass log files
      try {
        const logFiles = fs.readdirSync(passLogDir).filter(f => f.startsWith(passLogName));
        logFiles.forEach(f => fs.unlinkSync(path.join(passLogDir, f)));
      } catch (e) {}

    } else {
      // CRF Mode
      const crfCmd = `ffmpeg -y -i "${inputPath}" -c:v ${encoder} -crf ${crf} -preset medium -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`;
      logger.info('Executing CRF compression', { cmd: crfCmd });
      execSync(crfCmd);
    }

    const compressedStat = fs.statSync(outputPath);
    return {
      success: true,
      originalSizeMB: probe.sizeMB,
      compressedSizeMB: +(compressedStat.size / (1024 * 1024)).toFixed(2),
      outputPath
    };
  }

  /**
   * Generate a 5-second sample preview to compare original vs compressed
   */
  static generateSample(inputPath, targetSizeMB, sampleDurationSec = 5.0) {
    const probe = this.probeVideo(inputPath);
    const tempDir = path.join(__dirname, '../../temp');
    const origSample = path.join(tempDir, `sample_orig_${Date.now()}.mp4`);
    const compSample = path.join(tempDir, `sample_comp_${Date.now()}.mp4`);

    // Extract middle 5s
    const startSec = Math.max(0, Math.floor(probe.durationSeconds / 2) - 2);
    execSync(`ffmpeg -y -ss ${startSec} -t ${sampleDurationSec} -i "${inputPath}" -c copy "${origSample}"`);

    // Compress sample proportional to target size
    const sampleTargetMB = +((targetSizeMB / probe.durationSeconds) * sampleDurationSec).toFixed(2);
    const calc = this.calculateTargetBitrate({
      targetSizeMB: Math.max(sampleTargetMB, 0.5),
      durationSeconds: sampleDurationSec,
      width: probe.width,
      height: probe.height,
      fps: probe.fps
    });

    execSync(`ffmpeg -y -i "${origSample}" -c:v libx264 -b:v ${calc.targetBitrateKbps}k -c:a aac -b:a 128k "${compSample}"`);

    const origStat = fs.statSync(origSample);
    const compStat = fs.statSync(compSample);

    return {
      originalSamplePath: origSample,
      compressedSamplePath: compSample,
      originalSizeKB: Math.round(origStat.size / 1024),
      compressedSizeKB: Math.round(compStat.size / 1024),
      qualityLevel: calc.qualityLevel,
      bitsPerPixel: calc.bitsPerPixel,
      recommendedTargetMB: calc.recommendedTargetMB
    };
  }
}

module.exports = CompressionService;
