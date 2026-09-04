/**
 * MAQ AUTO EDITOR ULTRA - Storage Management & Cache Protection Service
 * Manages project workspace folders, disk quotas, cache cleanup, and low-disk warnings.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Logger = require('../utils/logger');
const logger = new Logger('StorageManager');

class StorageService {
  constructor() {
    this.baseDir = path.join(__dirname, '../../');
    this.projectsDir = path.join(this.baseDir, 'projects');
    this.mediaDir = path.join(this.projectsDir, 'media');
    this.cacheDir = path.join(this.baseDir, 'cache');
    this.tempDir = path.join(this.baseDir, 'temp');
    this.exportsDir = path.join(this.baseDir, 'exports');
    this.maxCacheSizeMB = 5120; // 5 GB default max cache
    this.lowDiskWarningThresholdGB = 10;

    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.projectsDir, this.mediaDir, this.cacheDir, this.tempDir, this.exportsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Recursively calculate folder size in bytes
   */
  getFolderSize(folderPath) {
    if (!fs.existsSync(folderPath)) return 0;
    let totalSize = 0;

    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        if (entry.isDirectory()) {
          totalSize += this.getFolderSize(fullPath);
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullPath);
            totalSize += stat.size;
          } catch (e) {}
        }
      }
    } catch (e) {
      logger.warn(`Failed reading folder size for ${folderPath}: ${e.message}`);
    }

    return totalSize;
  }

  /**
   * Get disk space metrics for base drive
   */
  getDiskSpace() {
    let freeBytes = 50 * 1024 * 1024 * 1024; // Default fallback 50 GB
    let totalBytes = 256 * 1024 * 1024 * 1024; // 256 GB NVMe

    try {
      if (typeof fs.statfsSync === 'function') {
        const stats = fs.statfsSync(this.baseDir);
        const bsize = stats.bsize || 4096;
        freeBytes = stats.bfree * bsize;
        totalBytes = stats.blocks * bsize;
      }
    } catch (e) {
      // Use fallback defaults
    }

    const freeGB = +(freeBytes / (1024 ** 3)).toFixed(2);
    const totalGB = +(totalBytes / (1024 ** 3)).toFixed(2);
    const usedGB = +(totalGB - freeGB).toFixed(2);

    return {
      totalBytes,
      freeBytes,
      totalGB,
      freeGB,
      usedGB,
      percentUsed: Math.round((usedGB / totalGB) * 100)
    };
  }

  /**
   * Get comprehensive storage overview
   */
  getStorageMetrics() {
    const disk = this.getDiskSpace();
    const cacheSizeBytes = this.getFolderSize(this.cacheDir);
    const tempSizeBytes = this.getFolderSize(this.tempDir);
    const exportsSizeBytes = this.getFolderSize(this.exportsDir);
    const projectsSizeBytes = this.getFolderSize(this.projectsDir);

    const cacheSizeMB = +(cacheSizeBytes / (1024 * 1024)).toFixed(2);
    const tempSizeMB = +(tempSizeBytes / (1024 * 1024)).toFixed(2);
    const exportsSizeMB = +(exportsSizeBytes / (1024 * 1024)).toFixed(2);
    const projectsSizeMB = +(projectsSizeBytes / (1024 * 1024)).toFixed(2);

    const isLowDisk = disk.freeGB < this.lowDiskWarningThresholdGB;
    const isCacheExceeded = cacheSizeMB > this.maxCacheSizeMB;

    return {
      disk,
      directories: {
        projects: { path: this.projectsDir, sizeMB: projectsSizeMB },
        cache: { path: this.cacheDir, sizeMB: cacheSizeMB },
        temp: { path: this.tempDir, sizeMB: tempSizeMB },
        exports: { path: this.exportsDir, sizeMB: exportsSizeMB }
      },
      limits: {
        maxCacheSizeMB: this.maxCacheSizeMB,
        lowDiskThresholdGB: this.lowDiskWarningThresholdGB
      },
      warnings: {
        isLowDisk,
        isCacheExceeded,
        message: isLowDisk
          ? `WARNING: Free disk space is low (${disk.freeGB} GB available). Please clear cache or free up drive space.`
          : 'Storage status optimal.'
      }
    };
  }

  /**
   * Delete files in directory recursively
   */
  clearDirectory(folderPath) {
    if (!fs.existsSync(folderPath)) return { clearedBytes: 0, count: 0 };
    let clearedBytes = 0;
    let count = 0;

    const items = fs.readdirSync(folderPath);
    for (const item of items) {
      const fullPath = path.join(folderPath, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          clearedBytes += stat.size;
          count++;
        } else {
          clearedBytes += stat.size;
          fs.unlinkSync(fullPath);
          count++;
        }
      } catch (e) {
        logger.warn(`Could not delete item ${fullPath}: ${e.message}`);
      }
    }

    logger.info(`Cleared directory ${folderPath}`, { clearedBytes, count });
    return { clearedBytes, count };
  }

  clearCache() {
    return this.clearDirectory(this.cacheDir);
  }

  clearTemp() {
    return this.clearDirectory(this.tempDir);
  }

  /**
   * Save an uploaded file to projects/media/
   */
  saveUploadedFile(originalFilename, buffer) {
    const safeName = (originalFilename || 'upload.dat').replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext);
    let targetFilename = safeName;
    let targetPath = path.join(this.mediaDir, targetFilename);

    let counter = 1;
    while (fs.existsSync(targetPath)) {
      targetFilename = `${base}_${counter}${ext}`;
      targetPath = path.join(this.mediaDir, targetFilename);
      counter++;
    }

    fs.writeFileSync(targetPath, buffer);
    logger.info(`Saved uploaded file: ${targetFilename}`, { sizeBytes: buffer.length, path: targetPath });

    const relPath = path.relative(this.baseDir, targetPath).replace(/\\/g, '/');
    return {
      filename: targetFilename,
      path: targetPath,
      url: `/media/${encodeURIComponent(relPath)}`
    };
  }
}

module.exports = new StorageService();
