const fs = require('fs');
const assert = require('assert');

// DOM elements table
const elements = {};
let clickedElements = [];

const html = fs.readFileSync('frontend/index.html', 'utf8');
const idMatches = html.matchAll(/id=["']([^"']+)["']/g);
for (const m of idMatches) {
  const id = m[1];
  elements[id] = {
    id: id,
    classList: {
      classes: new Set(),
      add: function(...cls) { cls.forEach(c => this.classes.add(c)); },
      remove: function(...cls) { cls.forEach(c => this.classes.delete(c)); },
      contains: function(c) { return this.classes.has(c); },
      toggle: function(c) { if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c); }
    },
    style: {},
    dataset: {},
    listeners: {},
    closest: function(sel) { return sel.includes(this.id) ? this : null; },
    addEventListener: function(evt, handler) {
      if (!this.listeners[evt]) this.listeners[evt] = [];
      this.listeners[evt].push(handler);
    },
    click: function() {
      clickedElements.push(this.id);
      if (this.listeners['click']) {
        const ev = { stopPropagation: ()=>{}, target: this, currentTarget: this };
        this.listeners['click'].forEach(fn => fn(ev));
      }
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    getContext: () => ({
      clearRect: ()=>{}, drawImage: ()=>{}, fillRect: ()=>{}, strokeRect: ()=>{}, save: ()=>{}, restore: ()=>{}, beginPath: ()=>{}, stroke: ()=>{}, fill: ()=>{},
      createLinearGradient: () => ({ addColorStop: ()=>{} }),
      createRadialGradient: () => ({ addColorStop: ()=>{} }),
      arc: ()=>{}, roundRect: ()=>{},
      fillText: ()=>{}, measureText: () => ({ width: 50 })
    })
  };
}

// Extract data-step
for (let i = 1; i <= 5; i++) {
  if (elements[`stepItem${i}`]) {
    elements[`stepItem${i}`].dataset.step = String(i);
  }
}

let domContentLoadedHandler = null;
global.document = {
  getElementById: (id) => elements[id] || null,
  querySelector: (sel) => null,
  querySelectorAll: (sel) => {
    if (sel === '.stepper-step-item') {
      return [1, 2, 3, 4, 5].map(i => elements[`stepItem${i}`]).filter(Boolean);
    }
    return [];
  },
  addEventListener: (event, cb) => {
    if (event === 'DOMContentLoaded') {
      domContentLoadedHandler = cb;
    }
  },
  body: { classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false } },
  documentElement: { style: { setProperty: ()=>{} } },
  createElement: () => ({
    classList: { add: ()=>{}, remove: ()=>{} },
    style: {},
    setAttribute: ()=>{},
    click: function() { clickedElements.push('dynamic_input'); }
  })
};

global.window = {
  addEventListener: () => {},
  document: global.document,
  location: { protocol: 'http:', host: 'localhost:4000' },
  WebSocket: class { addEventListener() {} send() {} close() {} },
  localStorage: { getItem: () => null, setItem: () => {} }
};
global.localStorage = global.window.localStorage;

require('../shared/constants.js');
const vm = require('vm');
const utilsCode = fs.readFileSync('frontend/js/utils.js', 'utf8');
const apiCode = fs.readFileSync('frontend/js/api.js', 'utf8');
const previewCode = fs.readFileSync('frontend/js/components/preview-engine.js', 'utf8');
const timelineCode = fs.readFileSync('frontend/js/components/timeline.js', 'utf8');
const inspectorCode = fs.readFileSync('frontend/js/components/inspector.js', 'utf8');
vm.runInThisContext(utilsCode);
vm.runInThisContext(apiCode);
vm.runInThisContext(previewCode);
vm.runInThisContext(timelineCode);
vm.runInThisContext(inspectorCode);

global.Audio = class { constructor() { this.src = ''; } addEventListener() {} pause() {} play() { return Promise.resolve(); } };
global.projectStore = {
  subscribers: [],
  subscribe: function(fn) { this.subscribers.push(fn); },
  notify: function() { this.subscribers.forEach(fn => fn()); },
  project: { timeline: {}, imageAssets: [] }
};
global.timelineStore = {
  subscribers: [],
  subscribe: function(fn) { this.subscribers.push(fn); },
  currentTime: 0,
  zoomLevel: 50
};
global.ToastSystem = class { show() {} };
global.AudioPreviewPlayer = class {};
global.loadPersistedLayout = () => {};
global.updateMediaUI = () => {};

// Evaluate app.js
const appCode = fs.readFileSync('frontend/js/app.js', 'utf8');
eval(appCode);

// Trigger DOMContentLoaded
console.log('--- Triggering DOMContentLoaded ---');
domContentLoadedHandler();

console.log('Testing Button & Tab Clicks:');

// Test 1: Step indicator click changes step
console.log('1. Testing Stepper Tab Clicks...');
elements['stepItem2'].click();
assert.strictEqual(global.window.currentCreatorStep, 2, 'Clicking step 2 should set currentCreatorStep to 2');
console.log('  ✓ StepItem2 click -> Step 2 verified');

elements['stepItem3'].click();
assert.strictEqual(global.window.currentCreatorStep, 3, 'Clicking step 3 should set currentCreatorStep to 3');
console.log('  ✓ StepItem3 click -> Step 3 verified');

elements['stepItem4'].click();
assert.strictEqual(global.window.currentCreatorStep, 4, 'Clicking step 4 should set currentCreatorStep to 4');
console.log('  ✓ StepItem4 click -> Step 4 verified');

elements['stepItem5'].click();
assert.strictEqual(global.window.currentCreatorStep, 5, 'Clicking step 5 should set currentCreatorStep to 5');
console.log('  ✓ StepItem5 click -> Step 5 verified');

elements['stepItem1'].click();
assert.strictEqual(global.window.currentCreatorStep, 1, 'Clicking step 1 should set currentCreatorStep to 1');
console.log('  ✓ StepItem1 click -> Step 1 verified');

// Test 2: Browse Voiceover Button triggers input
console.log('2. Testing Browse Voiceover Button...');
clickedElements = [];
elements['btnCreatorBrowseVO'].click();
assert.ok(clickedElements.includes('inputTriggerVoiceover'), 'btnCreatorBrowseVO should trigger inputTriggerVoiceover click');
console.log('  ✓ btnCreatorBrowseVO triggers inputTriggerVoiceover');

// Test 3: Dropzone click triggers input
console.log('3. Testing Drop Zone Click...');
clickedElements = [];
elements['creatorVoDropZone'].click();
assert.ok(clickedElements.includes('inputTriggerVoiceover'), 'creatorVoDropZone click should trigger inputTriggerVoiceover click');
console.log('  ✓ creatorVoDropZone triggers inputTriggerVoiceover');

// Test 4: Browse Media Button triggers input
console.log('4. Testing Browse Media Button...');
clickedElements = [];
elements['btnCreatorBrowseMedia'].click();
assert.ok(clickedElements.includes('inputTriggerImages'), 'btnCreatorBrowseMedia should trigger inputTriggerImages click');
console.log('  ✓ btnCreatorBrowseMedia triggers inputTriggerImages');

// Test 5: Browse Folder Button triggers input
console.log('5. Testing Browse Folder Button...');
clickedElements = [];
elements['btnCreatorBrowseFolder'].click();
assert.ok(clickedElements.includes('inputTriggerFolder'), 'btnCreatorBrowseFolder should trigger inputTriggerFolder click');
console.log('  ✓ btnCreatorBrowseFolder triggers inputTriggerFolder');

// Test 6: Verify Clean Initial Project State (No Demo Project Auto-Loaded)
console.log('6. Testing Clean Studio State (0 Demo Project)...');
assert.ok(!global.projectStore.project.voiceover, 'Voiceover should start null without demo project');
assert.strictEqual((global.projectStore.project.imageAssets || []).length, 0, 'Image assets should be empty');
console.log('  ✓ Clean Studio startup verified with 0 demo clips');

// Test 7: Re-Assemble Button in Step 4 returns to Step 3
console.log('7. Testing Re-Assemble Button...');
elements['stepItem4'].click();
assert.strictEqual(global.window.currentCreatorStep, 4);
elements['btnCreatorReassemble'].click();
assert.strictEqual(global.window.currentCreatorStep, 3, 'btnCreatorReassemble should return to Step 3');
console.log('  ✓ Re-assemble button smoothly transitions to Step 3');

// Test 8: Verify Scene Editor and Transition Picker Modals
console.log('8. Testing Storyboard Scene & Transition Modals...');
assert.ok(elements['modalCardSceneEditor'], 'modalCardSceneEditor should exist in DOM');
assert.ok(elements['modalTransitionPicker'], 'modalTransitionPicker should exist in DOM');
assert.ok(elements['btnSaveSceneEditor'], 'btnSaveSceneEditor should exist in DOM');
assert.ok(elements['btnPickerApplySingle'], 'btnPickerApplySingle should exist in DOM');
console.log('  ✓ Storyboard Scene Editor & Transition Picker components verified');

// Test 9: Captions Controls Suite
console.log('9. Testing Captions Controls Suite (Disable Toggle, Font Size, Position)...');
assert.ok(elements['chkCreatorEnableCaptions'], 'chkCreatorEnableCaptions should exist in DOM');
assert.ok(elements['sliderCaptionFontSize'], 'sliderCaptionFontSize should exist in DOM');
assert.ok(elements['sliderCaptionPosV'], 'sliderCaptionPosV should exist in DOM');
assert.ok(elements['btnCaptionPosTop'], 'btnCaptionPosTop should exist in DOM');
assert.ok(elements['btnCaptionPosCenter'], 'btnCaptionPosCenter should exist in DOM');
assert.ok(elements['btnCaptionPosBottom'], 'btnCaptionPosBottom should exist in DOM');
console.log('  ✓ Captions controls (toggle, font size slider, position buttons) verified in DOM');

// Test 10: Organic SFX Multi-Select Suite
console.log('10. Testing Organic SFX Multi-Select Suite...');
assert.ok(elements['chkCreatorSFXEnabled'], 'chkCreatorSFXEnabled should exist in DOM');
assert.ok(elements['boxCreatorSFXChips'], 'boxCreatorSFXChips should exist in DOM');
assert.ok(elements['btnUploadCustomSFX'], 'btnUploadCustomSFX should exist in DOM');
console.log('  ✓ Organic SFX multi-select chips and upload controls verified in DOM');

// Test 11: Step 4 Dedicated Voiceover Review Bar & Volume Slider
console.log('11. Testing Step 4 Voiceover Review Bar & Volume Controls...');
assert.ok(elements['creatorVoiceoverReviewBar'], 'creatorVoiceoverReviewBar should exist in DOM');
assert.ok(elements['btnVoReviewPlayPause'], 'btnVoReviewPlayPause should exist in DOM');
assert.ok(elements['voProgressTrack'], 'voProgressTrack should exist in DOM');
assert.ok(elements['sliderVoReviewVolume'], 'sliderVoReviewVolume should exist in DOM');
assert.ok(elements['lblVoReviewVolume'], 'lblVoReviewVolume should exist in DOM');
console.log('  ✓ Step 4 Voiceover review bar, waveform track, and volume slider verified');

// Test 12: Step 4 Storyboard Zoom Slider & Grid View Toggle
console.log('12. Testing Storyboard Zoom Slider & Grid View Toggle...');
assert.ok(elements['sliderStoryboardZoom'], 'sliderStoryboardZoom should exist in DOM');
assert.ok(elements['lblStoryboardZoom'], 'lblStoryboardZoom should exist in DOM');
assert.ok(elements['btnStoryboardDeckView'], 'btnStoryboardDeckView should exist in DOM');
assert.ok(elements['btnStoryboardGridView'], 'btnStoryboardGridView should exist in DOM');
console.log('  ✓ Storyboard Zoom slider and Deck / Grid View toggle verified');

// Test 13: CaptionService Voiceover Duration Sync
console.log('13. Testing CaptionService Voiceover Pacing...');
const CaptionService = require('../backend/services/caption.service');
const testScript = "Line 1 vision.\nLine 2 breakthrough.\nLine 3 execution.\nLine 4 mastery.";
const pacedCaptions = CaptionService.parseTXT(testScript, 3.5, 40.0);
assert.strictEqual(pacedCaptions.length, 4, 'Should produce 4 captions');
assert.ok(pacedCaptions[3].endTime <= 40.0, 'Last caption should end within voiceover duration');
assert.ok(pacedCaptions[3].startTime >= 25.0, 'Captions should stretch across 40s voiceover length');
console.log('  ✓ Captions accurately synchronize and pace across voiceover duration');

console.log('\n========================================');
console.log('ALL UI CLICK & FEATURE TESTS PASSED (13/13) ✓');
console.log('========================================');
process.exit(0);
