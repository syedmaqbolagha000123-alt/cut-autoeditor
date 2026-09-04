/**
 * MAQ AUTO EDITOR ULTRA - MAQFLOW Ultra Integration & Asset Importer
 * Ingests MAQFLOW ZIP exports, parses manifest.json, handles duplicate timestamps, and monitors auto-import folder.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const FilenameParser = require('../utils/filename-parser');
const TimestampParser = require('../utils/timestamp-parser');
const Logger = require('../utils/logger');
const logger = new Logger('MAQFlowImporter');

class MAQFlowImporterService {
  /**
   * Unpack a ZIP file to target directory using unzip or python zipfile
   * @param {string} zipFilePath 
   * @param {string} destDir 
   */
  static extractZip(zipFilePath, destDir) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const isWindows = process.platform === 'win32';

    // 1. On Windows, use built-in PowerShell Expand-Archive (zero external dependencies)
    if (isWindows) {
      try {
        const safeZip = zipFilePath.replace(/'/g, "''");
        const safeDest = destDir.replace(/'/g, "''");
        execSync(`powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath '${safeZip}' -DestinationPath '${safeDest}' -Force"`, { timeout: 15000 });
        return true;
      } catch (e) {
        // Continue to python fallback
      }
    }

    // 2. Try unzip on Linux/macOS or git-bash
    try {
      execSync(`unzip -o -q "${zipFilePath}" -d "${destDir}"`, { timeout: 15000 });
      return true;
    } catch (e) {
      // 3. Fallback to Python zipfile (try python and python3)
      const pyScript = `import zipfile, sys; zipfile.ZipFile(sys.argv[1], 'r').extractall(sys.argv[2])`;
      for (const pyCmd of ['python', 'python3']) {
        try {
          execSync(`${pyCmd} -c "${pyScript}" "${zipFilePath}" "${destDir}"`, { timeout: 15000 });
          return true;
        } catch (err2) {
          // try next
        }
      }

      logger.error('Failed extracting ZIP with all methods (PowerShell, unzip, python)', { zip: zipFilePath });
      throw new Error(`Failed to extract ZIP archive: ${zipFilePath}`);
    }
  }

  /**
   * Scan an unzipped folder or imported directory for MAQFLOW assets and manifest
   * @param {string} folderPath 
   * @returns {{
   *   hasManifest: boolean,
   *   manifest: any|null,
   *   assets: Array<{
   *     id: string,
   *     path: string,
   *     filename: string,
   *     timestampSeconds: number,
   *     displayTimestamp: string,
   *     outputIndex: number,
   *     sceneNumber: number|null,
   *     prompt: string|null,
   *     mediaType: string,
   *     source: 'manifest'|'filename'
   *   }>,
   *   duplicates: Array<{ timestampSeconds: number, count: number, files: string[] }>,
   *   summary: { totalImages: number, uniqueTimestamps: number, durationEstimate: number }
   * }}
   */
  static importFolder(folderPath) {
    if (!fs.existsSync(folderPath)) {
      throw new Error(`Folder not found: ${folderPath}`);
    }

    let manifest = null;
    let hasManifest = false;

    // Check for manifest.json at root or subfolders
    const manifestCandidates = [
      path.join(folderPath, 'manifest.json'),
      path.join(folderPath, 'images', 'manifest.json'),
      path.join(folderPath, 'export', 'manifest.json')
    ];

    for (const cand of manifestCandidates) {
      if (fs.existsSync(cand)) {
        try {
          const raw = fs.readFileSync(cand, 'utf8');
          manifest = JSON.parse(raw);
          hasManifest = true;
          logger.info('Found MAQFLOW manifest.json', { location: cand });
          break;
        } catch (e) {
          logger.warn(`Failed parsing manifest at ${cand}: ${e.message}`);
        }
      }
    }

    const assets = [];
    const timestampMap = new Map(); // timestampSeconds -> array of assets

    // If manifest exists, process manifest scenes/items
    if (hasManifest && manifest && (Array.isArray(manifest.scenes) || Array.isArray(manifest.items) || Array.isArray(manifest))) {
      const manifestList = Array.isArray(manifest) ? manifest : (manifest.scenes || manifest.items || []);
      
      for (const item of manifestList) {
        // Resolve filename path in folder
        const relPath = item.filename || item.imagePath || item.file || '';
        let fullPath = path.join(folderPath, relPath);
        if (!fs.existsSync(fullPath)) {
          // Check under images/ folder
          const subPath = path.join(folderPath, 'images', path.basename(relPath));
          if (fs.existsSync(subPath)) fullPath = subPath;
        }

        const tsSec = typeof item.timestampSeconds === 'number'
          ? item.timestampSeconds
          : (item.timestamp ? TimestampParser.parse(item.timestamp).seconds : 0);

        const assetObj = {
          id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          path: fs.existsSync(fullPath) ? fullPath : relPath,
          filename: path.basename(relPath || fullPath),
          timestampSeconds: tsSec,
          displayTimestamp: TimestampParser.formatSeconds(tsSec),
          outputIndex: item.outputIndex || 1,
          sceneNumber: item.sceneNumber || null,
          prompt: item.prompt || item.description || null,
          mediaType: item.mediaType || 'image/png',
          source: 'manifest',
          characterId: item.characterId || null,
          seed: item.seed || null
        };

        assets.push(assetObj);
        if (!timestampMap.has(tsSec)) timestampMap.set(tsSec, []);
        timestampMap.get(tsSec).push(assetObj);
      }
    }

    // Also scan filesystem for any additional images or if no manifest was present
    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(full);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
            // Check if already in assets
            const alreadyAdded = assets.some(a => path.basename(a.path) === entry.name);
            if (!alreadyAdded) {
              const parsed = FilenameParser.parse(entry.name);
              const assetObj = {
                id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                path: full,
                filename: entry.name,
                timestampSeconds: parsed.timestampSeconds,
                displayTimestamp: parsed.displayTimestamp,
                outputIndex: parsed.outputIndex || 1,
                sceneNumber: parsed.sequentialIndex || null,
                prompt: null,
                mediaType: ext === '.webp' ? 'image/webp' : (ext === '.png' ? 'image/png' : 'image/jpeg'),
                source: 'filename'
              };
              assets.push(assetObj);
              if (!timestampMap.has(parsed.timestampSeconds)) timestampMap.set(parsed.timestampSeconds, []);
              timestampMap.get(parsed.timestampSeconds).push(assetObj);
            }
          }
        }
      }
    };

    scanDir(folderPath);

    // Sort assets chronologically by timestampSeconds, then by outputIndex
    assets.sort((a, b) => {
      if (a.timestampSeconds !== b.timestampSeconds) {
        return a.timestampSeconds - b.timestampSeconds;
      }
      return a.outputIndex - b.outputIndex;
    });

    // Detect duplicate timestamps (multi-output scenes)
    const duplicates = [];
    timestampMap.forEach((items, ts) => {
      if (items.length > 1) {
        duplicates.push({
          timestampSeconds: ts,
          displayTimestamp: TimestampParser.formatSeconds(ts),
          count: items.length,
          files: items.map(i => i.filename)
        });
      }
    });

    // Calculate duration estimate (max timestamp + 5 sec default)
    const maxTs = assets.length > 0 ? assets[assets.length - 1].timestampSeconds : 0;
    const durationEstimate = maxTs + 5;

    return {
      hasManifest,
      manifest,
      assets,
      duplicates,
      summary: {
        totalImages: assets.length,
        uniqueTimestamps: timestampMap.size,
        duplicateTimestamps: duplicates.length,
        durationEstimate
      }
    };
  }

  /**
   * Ingest a MAQFLOW ZIP archive directly into a project media directory
   * @param {string} zipPath 
   * @param {string} projectMediaDir 
   */
  static importZip(zipPath, projectMediaDir) {
    const extractTemp = path.join(projectMediaDir, `import_zip_${Date.now()}`);
    this.extractZip(zipPath, extractTemp);
    const result = this.importFolder(extractTemp);
    return result;
  }
}

module.exports = MAQFlowImporterService;
