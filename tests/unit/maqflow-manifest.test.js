const MAQFlowImporter = require('../../backend/services/maqflow-importer.service');
const path = require('path');

describe('MAQFLOW Manifest & ZIP Ingestion Tests', () => {
  test('Parses MAQFLOW export folder and extracts prompts and scene numbers', () => {
    const exportFolder = path.join(__dirname, '../../demo-project/maqflow_export');
    const result = MAQFlowImporter.importFolder(exportFolder);

    assert.isTrue(result.hasManifest);
    assert.strictEqual(result.summary.totalImages, 6);
    assert.strictEqual(result.assets[0].timestampSeconds, 3);
    assert.strictEqual(result.assets[0].sceneNumber, 1);
    assert.ok(result.assets[0].prompt.includes('garage workshop'));
  });

  test('Unpacks and imports sample MAQFLOW ZIP archive', () => {
    const zipPath = path.join(__dirname, '../../demo-project/maqflow_sample_export.zip');
    const tempMediaDir = path.join(__dirname, '../../temp');
    const result = MAQFlowImporter.importZip(zipPath, tempMediaDir);

    assert.isTrue(result.hasManifest);
    assert.strictEqual(result.assets.length, 6);
  });
});
