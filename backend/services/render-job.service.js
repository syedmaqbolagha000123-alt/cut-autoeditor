/**
 * MAQ AUTO EDITOR ULTRA - Master Render Job & Filtergraph Engine
 * Converts project timeline into deterministic FFmpeg filtergraphs and manages background render lifecycle.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getFFmpegPath } = require('../utils/bin-locator');
const HardwareDetector = require('./hardware-detector.service');
const AudioDucking = require('./audio-ducking.service');
const CaptionService = require('./caption.service');
const { RESOLUTIONS, TRANSITIONS, HARDWARE_ENCODERS } = require('../../shared/constants');
const Logger = require('../utils/logger');
const logger = new Logger('RenderEngine');

class RenderJobService {
  constructor() {
    this.activeJobs = new Map(); // jobId -> Job instance
    this.exportHistory = [];
  }

  /**
   * Build complete video filtergraph for image clips with motion, effects, transitions, and subtitles
   */
  static buildVideoFilterGraph(clips, options = {}) {
    const {
      width = 1920,
      height = 1080,
      fps = 30,
      assSubtitlePath = null
    } = options;

    const inputArgs = [];
    const filterParts = [];
    let currentOffset = 0;

    if (!clips || clips.length === 0) {
      throw new Error('Cannot render video: video track has 0 clips.');
    }

    clips.forEach((clip, idx) => {
      let resolvedPath = clip.path || clip.src || '';

      // Strip http://localhost:port or http://127.0.0.1:port if present
      if (resolvedPath.includes('/media/')) {
        resolvedPath = resolvedPath.substring(resolvedPath.indexOf('/media/'));
      }

      if (resolvedPath.startsWith('/media/')) {
        resolvedPath = path.join(__dirname, '../../', decodeURIComponent(resolvedPath.replace('/media/', '')));
      } else if (!path.isAbsolute(resolvedPath) && !resolvedPath.startsWith('http') && !resolvedPath.startsWith('blob:')) {
        resolvedPath = path.join(__dirname, '../../', resolvedPath);
      } else if (resolvedPath.startsWith('blob:') && (clip.filename || clip.name)) {
        const candidateName = clip.filename || clip.name;
        const candidate = path.join(__dirname, '../../projects/media', candidateName);
        const safeCandidate = path.join(__dirname, '../../projects/media', candidateName.replace(/[^a-zA-Z0-9._-]/g, '_'));
        if (fs.existsSync(candidate)) {
          resolvedPath = candidate;
        } else if (fs.existsSync(safeCandidate)) {
          resolvedPath = safeCandidate;
        }
      }

      if (resolvedPath.startsWith('blob:')) {
        throw new Error(`Media clip "${clip.name || clip.filename || idx + 1}" was not uploaded to server before render. Please ensure assets are uploaded.`);
      }

      const ext = path.extname(resolvedPath).toLowerCase();
      const isVideo = clip.mediaType?.startsWith('video/') || ['.mp4', '.mov', '.webm', '.mkv'].includes(ext);

      if (isVideo) {
        if (clip.trimStart && clip.trimStart > 0) {
          inputArgs.push('-ss', String(clip.trimStart));
        }
        inputArgs.push('-t', String(clip.duration), '-i', resolvedPath);
      } else {
        inputArgs.push('-loop', '1', '-framerate', String(fps), '-t', String(clip.duration), '-i', resolvedPath);
      }

      const streamLabel = `v${idx}`;
      const processedLabel = `p${idx}`;

      // 1. Scale & Crop to exact canvas dimensions
      let baseFilter = `[${idx}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;

      // 2. Visual Effects
      const fx = clip.effects || {};
      const eqParts = [];
      if (fx.brightness && fx.brightness !== 0) eqParts.push(`brightness=${fx.brightness}`);
      if (fx.contrast && fx.contrast !== 1) eqParts.push(`contrast=${fx.contrast}`);
      if (fx.saturation && fx.saturation !== 1) eqParts.push(`saturation=${fx.saturation}`);
      if (eqParts.length > 0) baseFilter += `,eq=${eqParts.join(':')}`;
      if (fx.blur && fx.blur > 0) baseFilter += `,boxblur=${Math.round(fx.blur * 5)}`;
      if (fx.vignette && fx.vignette > 0) baseFilter += `,vignette=PI/${Math.max(1, 10 - fx.vignette * 6)}`;

      if (!isVideo) {
        // 3. Motion (Zoom / Pan / Ken Burns) for still images
        const motion = clip.motion || {};
        const frames = Math.max(Math.round(clip.duration * fps), 1);
        const intensity = motion.intensity || 0.15;

        let zoomExpr = `min(pzoom+${(intensity / frames).toFixed(5)},1.3)`;
        if (motion.preset === 'SLOW_PULL' || motion.preset === 'ZOOM_OUT') {
          zoomExpr = `max(1.0,${(1.0 + intensity).toFixed(3)}-${(intensity / frames).toFixed(5)}*on)`;
        } else if (motion.preset === 'NONE') {
          zoomExpr = '1.0';
        }

        baseFilter += `,zoompan=z='${zoomExpr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps},setpts=PTS-STARTPTS,settb=AVTB[${processedLabel}]`;
      } else {
        // Video clip frame rate and PTS alignment
        baseFilter += `,fps=${fps},setpts=PTS-STARTPTS,settb=AVTB[${processedLabel}]`;
      }

      filterParts.push(baseFilter);
    });

    // 4. Transitions between clips using xfade or concat
    let lastStream = `[p0]`;
    currentOffset = clips[0].duration;

    if (clips.length === 1) {
      if (assSubtitlePath && fs.existsSync(assSubtitlePath)) {
        filterParts.push(`${lastStream}ass='${assSubtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')}'[vout]`);
      } else {
        filterParts.push(`${lastStream}null[vout]`);
      }
    } else {
      for (let i = 1; i < clips.length; i++) {
        const trans = clips[i].transition || { type: 'DISSOLVE', duration: 0.35 };
        const transDef = TRANSITIONS[trans.type] || TRANSITIONS.DISSOLVE;
        const nextStream = `[p${i}]`;
        const outStream = `[xf${i}]`;
        const ffmpegTrans = transDef.ffmpegName || 'fade';
        const transDur = (trans.duration && trans.duration > 0 && trans.duration < clips[i].duration && trans.duration < clips[i - 1].duration)
          ? trans.duration
          : 0.35;

        currentOffset -= transDur;
        filterParts.push(`${lastStream}${nextStream}xfade=transition=${ffmpegTrans}:duration=${transDur}:offset=${currentOffset.toFixed(3)},settb=AVTB${outStream}`);
        currentOffset += clips[i].duration;
        lastStream = outStream;
      }

      // 5. Burn Subtitles / Captions if present
      if (assSubtitlePath && fs.existsSync(assSubtitlePath)) {
        filterParts.push(`${lastStream}ass='${assSubtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')}'[vout]`);
      } else {
        filterParts.push(`${lastStream}null[vout]`);
      }
    }

    return {
      inputArgs,
      filterGraph: filterParts.join(';'),
      outputMap: '[vout]',
      totalVideoDuration: currentOffset
    };
  }

  /**
   * Start background render job
   */
  startRender(project, exportSettings = {}, callbacks = {}) {
    const settings = exportSettings || {};
    const jobId = `render_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const tempDir = path.join(__dirname, '../../temp');
    const exportsDir = path.join(__dirname, '../../exports');
    const filename = `${(project?.name || 'Untitled').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.mp4`;
    const outputPath = path.join(exportsDir, filename);

    const resConfig = RESOLUTIONS[settings.resolution || '1080p'] || RESOLUTIONS['1080p'];
    const width = resConfig.width;
    const height = resConfig.height;
    const fps = settings.fps || 30;
    const codec = settings.codec || 'h264';
    const quality = settings.quality || 'balanced';

    const videoClips = project?.timeline?.videoClips || project?.tracks?.find(t => t.type === 'video')?.clips || [];

    // Generate ASS Subtitles file if captions (and enabled) or text overlays exist
    let assPath = null;
    const enableCaptions = project?.enableCaptions !== false;
    const captions = enableCaptions ? (project.timeline?.captions || []) : [];
    const textOverlays = project.timeline?.textOverlays || [];
    if (captions.length > 0 || textOverlays.length > 0) {
      const assContent = CaptionService.generateASS(
        captions,
        project.captionStyle || 'BOLD_YELLOW',
        width,
        height,
        textOverlays,
        {
          fontSize: project.captionFontSize,
          positionPercent: project.captionPositionPercent
        }
      );
      assPath = path.join(tempDir, `subs_${jobId}.ass`);
      fs.writeFileSync(assPath, assContent, 'utf8');
    }

    // Build Video Filtergraph
    const videoBuild = RenderJobService.buildVideoFilterGraph(videoClips, {
      width,
      height,
      fps,
      assSubtitlePath: assPath
    });

    // Build Audio Filtergraph with proper input offset
    const totalDur = Math.max(videoBuild.totalVideoDuration, project.voiceoverDuration || 0);
    
    let voPath = project.voiceover?.path || null;
    if (voPath) {
      if (voPath.startsWith('/media/')) {
        voPath = path.join(__dirname, '../../', decodeURIComponent(voPath.replace('/media/', '')));
      } else if (!path.isAbsolute(voPath) && !voPath.startsWith('http') && !voPath.startsWith('blob:')) {
        voPath = path.join(__dirname, '../../', voPath);
      } else if (voPath.startsWith('blob:') && project.voiceover?.filename) {
        const candidate = path.join(__dirname, '../../projects/media', project.voiceover.filename);
        if (fs.existsSync(candidate)) {
          voPath = candidate;
        }
      }
      if (voPath && (!fs.existsSync(voPath) || fs.statSync(voPath).size < 100)) {
        logger.warn(`Voiceover path [${voPath}] invalid or too small, skipping voiceover stream.`);
        voPath = null;
      }
    }

    const voVol = (typeof project.voiceoverVolume === 'number')
      ? project.voiceoverVolume
      : (project.audioSettings?.voiceoverVolume || 1.0);

    const audioBuild = AudioDucking.buildAudioFilterGraph({
      voiceoverPath: voPath,
      musicClips: project.timeline?.musicClips || [],
      sfxClips: project.timeline?.sfxClips || [],
      inputIndexOffset: videoClips.length,
      duckingStrengthDB: project.audioSettings?.duckingStrengthDB || -18,
      voiceoverVolume: voVol,
      musicVolume: project.audioSettings?.musicVolume || 0.35,
      sfxVolume: project.audioSettings?.sfxVolume || 0.7,
      totalDuration: totalDur
    });

    // Select Hardware or CPU Encoder
    const sysInfo = HardwareDetector.getSystemInfo();
    let selectedEncoder = sysInfo.encoders.selected[codec] || 'libx264';
    if (!exportSettings.useHardwareAcceleration) {
      selectedEncoder = HARDWARE_ENCODERS.CPU[codec] || 'libx264';
    }

    // CRF or Bitrate settings
    const crf = quality === 'high_quality' ? 18 : (quality === 'small_file' ? 26 : 22);

    // Assemble FFmpeg arguments
    const ffmpegArgs = ['-y'];

    // Add Video Inputs
    ffmpegArgs.push(...videoBuild.inputArgs);

    // Add Audio Inputs
    ffmpegArgs.push(...audioBuild.inputArgs);

    // Combined Filter Complex
    const combinedFilter = `${videoBuild.filterGraph};${audioBuild.filterComplex}`;
    ffmpegArgs.push('-filter_complex', combinedFilter);

    // Maps
    ffmpegArgs.push('-map', videoBuild.outputMap);
    ffmpegArgs.push('-map', audioBuild.outputMap);

    // Encoding parameters
    ffmpegArgs.push('-c:v', selectedEncoder);
    if (selectedEncoder.includes('libx264') || selectedEncoder.includes('libx265')) {
      ffmpegArgs.push('-crf', String(crf), '-preset', 'medium');
    } else {
      // Hardware encoder rate control
      ffmpegArgs.push('-b:v', '6000k');
    }

    ffmpegArgs.push('-c:a', 'aac', '-b:a', exportSettings.audioBitrate || '128k');
    ffmpegArgs.push('-r', String(fps));
    ffmpegArgs.push('-pix_fmt', 'yuv420p');
    ffmpegArgs.push('-movflags', '+faststart');

    let finalDur = totalDur;
    if (exportSettings.trimRange && typeof exportSettings.trimRange.start === 'number' && typeof exportSettings.trimRange.duration === 'number' && exportSettings.trimRange.duration > 0) {
      ffmpegArgs.push('-ss', String(exportSettings.trimRange.start), '-t', String(exportSettings.trimRange.duration));
      finalDur = exportSettings.trimRange.duration;
    } else {
      ffmpegArgs.push('-t', String(totalDur));
    }

    ffmpegArgs.push('-progress', 'pipe:1');
    ffmpegArgs.push(outputPath);

    logger.info(`Starting Render Job [${jobId}]`, { encoder: selectedEncoder, resolution: `${width}x${height}`, finalDur });

    const totalFrames = Math.max(Math.round(finalDur * fps), 1);
    const startTimeMs = Date.now();

    const job = {
      id: jobId,
      projectName: project.name || 'Untitled',
      outputPath,
      filename,
      status: 'rendering',
      stage: 'Encoding Video & Audio',
      progressPercent: 0,
      currentFrame: 0,
      totalFrames,
      fps: 0,
      elapsedSeconds: 0,
      remainingSecondsEstimate: 0,
      startTimeMs,
      process: null,
      error: null
    };

    const ffProc = spawn(getFFmpegPath(), ffmpegArgs);
    job.process = ffProc;
    this.activeJobs.set(jobId, job);

    ffProc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const frameMatch = text.match(/frame=\s*(\d+)/);
      const fpsMatch = text.match(/fps=\s*([\d.]+)/);

      if (frameMatch) {
        const frame = parseInt(frameMatch[1], 10);
        job.currentFrame = frame;
        job.progressPercent = Math.min(Math.round((frame / totalFrames) * 100), 99);
      }
      if (fpsMatch) {
        job.fps = parseFloat(fpsMatch[1]);
      }

      job.elapsedSeconds = Math.round((Date.now() - startTimeMs) / 1000);
      if (job.fps > 0) {
        const remainingFrames = totalFrames - job.currentFrame;
        job.remainingSecondsEstimate = Math.max(Math.round(remainingFrames / job.fps), 0);
      }

      if (callbacks.onProgress) callbacks.onProgress(job);
    });

    let stderrOutput = '';
    ffProc.stderr.on('data', (data) => {
      stderrOutput += data.toString();
    });

    ffProc.on('close', (code) => {
      if (code === 0) {
        job.status = 'completed';
        job.stage = 'Finished';
        job.progressPercent = 100;
        job.elapsedSeconds = Math.round((Date.now() - startTimeMs) / 1000);
        job.remainingSecondsEstimate = 0;

        // Clean temp ASS
        if (assPath && fs.existsSync(assPath)) {
          try { fs.unlinkSync(assPath); } catch (e) {}
        }

        const stat = fs.statSync(outputPath);
        const record = {
          jobId,
          filename,
          outputPath,
          fileSizeMB: +(stat.size / (1024 * 1024)).toFixed(2),
          durationSeconds: totalDur,
          resolution: `${width}x${height}`,
          codec,
          renderTimeSeconds: job.elapsedSeconds,
          date: new Date().toISOString()
        };
        this.exportHistory.unshift(record);

        logger.info(`Render Job [${jobId}] Completed Successfully`, record);
        if (callbacks.onComplete) callbacks.onComplete(record);
      } else {
        // Automatic hardware acceleration fallback: retry with libx264 CPU encoder
        if (selectedEncoder !== 'libx264' && !job._retriedWithCpu) {
          logger.warn(`Hardware encoder [${selectedEncoder}] failed with code ${code}. Automatically retrying with robust CPU encoder (libx264)...`, {
            stderrSnippet: stderrOutput.slice(-400)
          });
          job._retriedWithCpu = true;
          job.stage = 'Hardware acceleration unavailable; rendering with CPU...';
          return this.runCpuFallbackRender(job, project, exportSettings, callbacks, assPath, width, height, fps, crf, totalDur, totalFrames, startTimeMs, outputPath, filename, videoBuild, audioBuild);
        }

        job.status = 'failed';
        job.error = `FFmpeg error (code ${code}): ${stderrOutput.slice(-300) || 'Unknown error'}`;
        logger.error(`Render Job [${jobId}] Failed`, { code, stderr: stderrOutput.slice(-800) });
        if (callbacks.onError) callbacks.onError(job.error);
      }
    });

    return job;
  }

  /**
   * Automatic CPU Fallback Render when GPU acceleration is unavailable
   */
  runCpuFallbackRender(job, project, exportSettings, callbacks, assPath, width, height, fps, crf, totalDur, totalFrames, startTimeMs, outputPath, filename, videoBuild, audioBuild) {
    const fallbackArgs = ['-y'];
    fallbackArgs.push(...videoBuild.inputArgs);
    fallbackArgs.push(...audioBuild.inputArgs);
    const combinedFilter = `${videoBuild.filterGraph};${audioBuild.filterComplex}`;
    fallbackArgs.push('-filter_complex', combinedFilter);
    fallbackArgs.push('-map', videoBuild.outputMap);
    fallbackArgs.push('-map', audioBuild.outputMap);
    fallbackArgs.push('-c:v', 'libx264', '-crf', String(crf), '-preset', 'medium');
    fallbackArgs.push('-c:a', 'aac', '-b:a', exportSettings?.audioBitrate || '128k');
    fallbackArgs.push('-r', String(fps));
    fallbackArgs.push('-pix_fmt', 'yuv420p');
    fallbackArgs.push('-movflags', '+faststart');
    fallbackArgs.push('-t', String(totalDur));
    fallbackArgs.push('-progress', 'pipe:1');
    fallbackArgs.push(outputPath);

    logger.info(`Starting CPU Fallback Render Job [${job.id}] with libx264`);

    let fallbackStderr = '';
    const ffProc = spawn(getFFmpegPath(), fallbackArgs);
    job.process = ffProc;

    ffProc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const frameMatch = text.match(/frame=\s*(\d+)/);
      const fpsMatch = text.match(/fps=\s*([\d.]+)/);

      if (frameMatch) {
        const frame = parseInt(frameMatch[1], 10);
        job.currentFrame = frame;
        job.progressPercent = Math.min(Math.round((frame / totalFrames) * 100), 99);
      }
      if (fpsMatch) {
        job.fps = parseFloat(fpsMatch[1]);
      }

      job.elapsedSeconds = Math.round((Date.now() - startTimeMs) / 1000);
      if (job.fps > 0) {
        const remainingFrames = totalFrames - job.currentFrame;
        job.remainingSecondsEstimate = Math.max(Math.round(remainingFrames / job.fps), 0);
      }

      if (callbacks.onProgress) callbacks.onProgress(job);
    });

    ffProc.stderr.on('data', (data) => {
      fallbackStderr += data.toString();
    });

    ffProc.on('close', (code) => {
      if (code === 0) {
        job.status = 'completed';
        job.stage = 'Finished';
        job.progressPercent = 100;
        job.elapsedSeconds = Math.round((Date.now() - startTimeMs) / 1000);
        job.remainingSecondsEstimate = 0;

        if (assPath && fs.existsSync(assPath)) {
          try { fs.unlinkSync(assPath); } catch (e) {}
        }

        const stat = fs.statSync(outputPath);
        const record = {
          jobId: job.id,
          filename,
          outputPath,
          fileSizeMB: +(stat.size / (1024 * 1024)).toFixed(2),
          durationSeconds: totalDur,
          resolution: `${width}x${height}`,
          codec: 'h264',
          renderTimeSeconds: job.elapsedSeconds,
          date: new Date().toISOString()
        };
        this.exportHistory.unshift(record);

        logger.info(`CPU Fallback Render Job [${job.id}] Completed Successfully`, record);
        if (callbacks.onComplete) callbacks.onComplete(record);
      } else {
        job.status = 'failed';
        job.error = `FFmpeg fallback error (code ${code}): ${fallbackStderr.slice(-300) || 'Unknown error'}`;
        logger.error(`CPU Fallback Render Job [${job.id}] Failed`, { code, stderr: fallbackStderr.slice(-800) });
        if (callbacks.onError) callbacks.onError(job.error);
      }
    });

    return job;
  }

  cancelRender(jobId) {
    const job = this.activeJobs.get(jobId);
    if (job && job.process) {
      try {
        job.process.kill('SIGTERM');
        job.status = 'cancelled';
        logger.info(`Cancelled Render Job [${jobId}]`);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  getJob(jobId) {
    return this.activeJobs.get(jobId) || null;
  }

  getExportHistory() {
    return this.exportHistory;
  }
}

module.exports = new RenderJobService();
