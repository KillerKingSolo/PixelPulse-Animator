/**
 * Pixel Art Animation Maker - Main JS
 * Core logic for pixel grid, animation timeline, tools, and export
 */

const canvas = document.getElementById('pixel-canvas');
const ctx = canvas.getContext('2d');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomLevelSpan = document.getElementById('zoom-level');
const zoomResetBtn = document.getElementById('zoom-reset');
const ZOOM_BASE = 2.0; // 200% is now "100%"
let zoomFactor = ZOOM_BASE;
let panX = 0;
let panY = 0;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 8.0;
const ZOOM_STEP = 0.25;
const colorPicker = document.getElementById('color-picker');
const toolSizeInput = document.getElementById('tool-size');
let toolSize = 1;
const hexInput = document.getElementById('hex-input');
const addFavoriteColorBtn = document.getElementById('add-favorite-color');
const recentColorsDiv = document.getElementById('recent-colors');
const favoriteColorsDiv = document.getElementById('favorite-colors');
const gridSizeSelect = document.getElementById('grid-size');

const RECENT_COLORS_KEY = 'pixelArtRecentColors';
const FAVORITE_COLORS_KEY = 'pixelArtFavoriteColors';
let recentColors = [];
let favoriteColors = [];
const MAX_RECENT_COLORS = 10;
const MAX_FAVORITE_COLORS = 5;

function saveColorLists() {
  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recentColors));
  localStorage.setItem(FAVORITE_COLORS_KEY, JSON.stringify(favoriteColors));
}
function loadColorLists() {
  try {
    const r = JSON.parse(localStorage.getItem(RECENT_COLORS_KEY));
    if (Array.isArray(r)) recentColors = r;
    const f = JSON.parse(localStorage.getItem(FAVORITE_COLORS_KEY));
    if (Array.isArray(f)) favoriteColors = f;
  } catch (e) {
    console.error("Error loading color lists from localStorage:", e);
  }
}
function renderColorSwatches() {
  // Recent
  if (recentColorsDiv) {
    recentColorsDiv.innerHTML = '';
    recentColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.title = color;
      swatch.style.background = color;
      swatch.style.width = '22px';
      swatch.style.height = '22px';
      swatch.style.border = '1.5px solid #888';
      swatch.style.borderRadius = '4px';
      swatch.style.cursor = 'pointer';
      swatch.style.boxSizing = 'border-box';
      swatch.addEventListener('click', () => setColor(color));
      recentColorsDiv.appendChild(swatch);
    });
  }
  // Favorites
  if (favoriteColorsDiv) {
    favoriteColorsDiv.innerHTML = '';
    favoriteColors.forEach((color, idx) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.title = color + ' (right-click to remove)';
      swatch.style.background = color;
      swatch.style.width = '22px';
      swatch.style.height = '22px';
      swatch.style.border = '2px solid gold';
      swatch.style.borderRadius = '4px';
      swatch.style.cursor = 'pointer';
      swatch.style.boxSizing = 'border-box';
      swatch.addEventListener('click', () => setColor(color));
      swatch.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        favoriteColors.splice(idx, 1);
        saveColorLists();
        renderColorSwatches();
      });
      favoriteColorsDiv.appendChild(swatch);
    });
    // Fill up to MAX_FAVORITE_COLORS with empty slots
    for (let i = favoriteColors.length; i < MAX_FAVORITE_COLORS; ++i) {
      const empty = document.createElement('div');
      empty.className = 'color-swatch';
      empty.style.background = 'transparent';
      empty.style.width = '22px';
      empty.style.height = '22px';
      empty.style.border = '2px dashed #888';
      empty.style.borderRadius = '4px';
      empty.style.boxSizing = 'border-box';
      favoriteColorsDiv.appendChild(empty);
    }
  }
}
function setColor(color) {
  color = normalizeHex(color);
  if (!color) return;
  if (colorPicker) colorPicker.value = color;
  if (hexInput) hexInput.value = color;
  currentColor = color;
  // Do NOT add to recent colors here; handled on color selection completion
}
function normalizeHex(hex) {
  if (typeof hex !== 'string') return null;
  hex = hex.trim().toUpperCase();
  if (hex[0] !== '#') hex = '#' + hex;
  if (/^#[0-9A-F]{6}$/.test(hex)) return hex;
  // Allow 3-digit hex
  if (/^#[0-9A-F]{3}$/.test(hex)) {
    return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return null;
}
const tools = {
  pencil: document.getElementById('pencil-tool'),
  eraser: document.getElementById('eraser-tool'),
  fill: document.getElementById('fill-tool'),
  picker: document.getElementById('picker-tool')
};
const addFrameBtn = document.getElementById('add-frame');
const duplicateFrameBtn = document.getElementById('duplicate-frame');
const deleteFrameBtn = document.getElementById('delete-frame');
const playBtn = document.getElementById('play-animation');
const pauseBtn = document.getElementById('pause-animation');
const fpsInput = document.getElementById('fps');
const framesList = document.getElementById('frames-list');
const exportGifBtn = document.getElementById('export-gif');
const exportPngBtn = document.getElementById('export-png');
const downloadLink = document.getElementById('download-link');

let gridSize = parseInt(gridSizeSelect.value, 10);
let pixelSize = canvas.width / gridSize;
function updateCanvasSize() {
  // Base size is 256x256, scale by zoom
  const baseSize = 256;
  const size = Math.round(baseSize * zoomFactor);
  canvas.width = size;
  canvas.height = size;
  pixelSize = size / gridSize;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
}
let currentColor = colorPicker.value;
let currentTool = 'pencil';
let isDrawing = false;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let mouseStartX = 0;
let mouseStartY = 0;
let currentFrame = 0;
let frames = [];
let animationInterval = null;

// Initialize blank frame
function createBlankFrame() {
  return Array.from({ length: gridSize * gridSize }, () => '#ffffff');
}

// Draw the current frame to the canvas
function drawFrame(frameData) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  // Snap panX/panY to integer values to keep pixels sharp
  ctx.translate(Math.round(panX), Math.round(panY));
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      ctx.fillStyle = frameData[y * gridSize + x];
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
  // Draw grid lines
  ctx.strokeStyle = '#ccc';
  for (let i = 0; i <= gridSize; i++) {
    ctx.beginPath();
    ctx.moveTo(i * pixelSize, 0);
    ctx.lineTo(i * pixelSize, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * pixelSize);
    ctx.lineTo(canvas.width, i * pixelSize);
    ctx.stroke();
  }
  ctx.restore();
}

// Update the canvas and frame thumbnails
function updateDisplay() {
  updateCanvasSize();
  drawFrame(frames[currentFrame]);
  renderFramesList();
  if (zoomLevelSpan) {
    // Show percent relative to ZOOM_BASE
    zoomLevelSpan.textContent = Math.round((zoomFactor / ZOOM_BASE) * 100) + "%";
  }
}

// Handle drawing on the canvas
function getPixelIndex(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / pixelSize);
  const y = Math.floor((e.clientY - rect.top) / pixelSize);
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return -1;
  return y * gridSize + x;
}

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    // Right mouse button: start panning
    isPanning = true;
    panStartX = panX;
    panStartY = panY;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    e.preventDefault();
  } else if (e.button === 0) {
    // Left mouse button: start drawing
    isDrawing = true;
    handleDraw(e);
  }
});
canvas.addEventListener('mousemove', (e) => {
  if (isDrawing) handleDraw(e);
  if (isPanning) {
    const dx = e.clientX - mouseStartX;
    const dy = e.clientY - mouseStartY;
    panX = panStartX + dx;
    panY = panStartY + dy;
    updateDisplay();
  }
});
canvas.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    isPanning = false;
  } else if (e.button === 0) {
    isDrawing = false;
  }
});
canvas.addEventListener('mouseleave', () => {
  isDrawing = false;
  isPanning = false;
});
// Prevent context menu on right-click
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

function handleDraw(e) {
  const idx = getPixelIndex(e);
  if (idx === -1) return;
  if (currentTool === 'pencil' || currentTool === 'eraser') {
    // Draw a square of toolSize x toolSize centered on the cursor
    const center = idx;
    const x0 = center % gridSize;
    const y0 = Math.floor(center / gridSize);
    const half = Math.floor(toolSize / 2);
    // Make tool size square symmetric for both odd and even sizes
    const start = -Math.floor((toolSize - 1) / 2);
    const end = Math.floor(toolSize / 2);
    for (let dy = start; dy <= end; dy++) {
      for (let dx = start; dx <= end; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
          const i = y * gridSize + x;
          frames[currentFrame][i] = (currentTool === 'pencil') ? currentColor : '#ffffff';
        }
      }
    }
  } else if (currentTool === 'picker') {
    currentColor = frames[currentFrame][idx];
    colorPicker.value = currentColor;
    // Add picked color to recents
    const picked = normalizeHex(currentColor);
    if (/^#[0-9A-F]{6}$/i.test(picked)) {
      recentColors = [picked, ...recentColors.filter(c => c !== picked)];
      if (recentColors.length > MAX_RECENT_COLORS) recentColors.length = MAX_RECENT_COLORS;
      saveColorLists();
      renderColorSwatches();
    }
    selectTool('pencil');
  } else if (currentTool === 'fill') {
    floodFill(idx, frames[currentFrame][idx], currentColor);
  }
  updateDisplay();
  saveProgress();
}

// Flood fill algorithm for fill tool
function floodFill(idx, targetColor, fillColor) {
  if (targetColor === fillColor) return;
  const visited = new Uint8Array(frames[currentFrame].length);
  const stack = [idx];
  while (stack.length) {
    const i = stack.pop();
    if (visited[i]) continue;
    visited[i] = 1;
    if (frames[currentFrame][i] === targetColor) {
      frames[currentFrame][i] = fillColor;
      const x = i % gridSize, y = Math.floor(i / gridSize);
      if (x > 0) stack.push(i - 1);
      if (x < gridSize - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - gridSize);
      if (y < gridSize - 1) stack.push(i + gridSize);
    }
  }
}

// Tool selection
function selectTool(tool) {
  currentTool = tool;
  Object.keys(tools).forEach(t => {
    tools[t].classList.toggle('selected', t === tool);
  });
}
Object.keys(tools).forEach(tool => {
  tools[tool].addEventListener('click', () => selectTool(tool));
});

 // Color picker and hex input sync
if (colorPicker) {
  colorPicker.addEventListener('input', (e) => {
    const val = e.target.value;
    setColor(val);
  });
  // Only add to recent colors on 'change' (mouseup after drag)
  colorPicker.addEventListener('change', (e) => {
    const val = normalizeHex(e.target.value);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      recentColors = [val, ...recentColors.filter(c => c !== val)];
      if (recentColors.length > MAX_RECENT_COLORS) recentColors.length = MAX_RECENT_COLORS;
      saveColorLists();
      renderColorSwatches();
    }
  });
}
if (hexInput) {
  hexInput.addEventListener('input', (e) => {
    const val = e.target.value;
    const norm = normalizeHex(val);
    if (norm) setColor(norm);
  });
  hexInput.addEventListener('blur', (e) => {
    // On blur, correct to valid hex or revert to currentColor
    const val = e.target.value;
    const norm = normalizeHex(val);
    if (norm) {
      hexInput.value = norm;
    } else {
      hexInput.value = currentColor;
    }
  });
}
if (addFavoriteColorBtn) {
  addFavoriteColorBtn.addEventListener('click', () => {
    const color = normalizeHex(currentColor);
    if (!color) return;
    if (!favoriteColors.includes(color) && favoriteColors.length < MAX_FAVORITE_COLORS) {
      favoriteColors.push(color);
      saveColorLists();
      renderColorSwatches();
    }
  });
}

  // Grid size change
gridSizeSelect.addEventListener('change', (e) => {
  gridSize = parseInt(e.target.value, 10);
  // pixelSize will be set in updateCanvasSize
  // Resize all frames
  frames = frames.map(frame => resizeFrame(frame, gridSize));
  updateDisplay();
  saveProgress();
});

// Resize frame data to new grid size (simple nearest-neighbor)
function resizeFrame(frame, newSize) {
  const oldSize = Math.sqrt(frame.length);
  const newFrame = [];
  for (let y = 0; y < newSize; y++) {
    for (let x = 0; x < newSize; x++) {
      const oldX = Math.floor(x * oldSize / newSize);
      const oldY = Math.floor(y * oldSize / newSize);
      newFrame.push(frame[oldY * oldSize + oldX]);
    }
  }
  return newFrame;
}

 // Timeline controls
addFrameBtn.addEventListener('click', () => {
  frames.splice(currentFrame + 1, 0, createBlankFrame());
  currentFrame++;
  updateDisplay();
  saveProgress();
});
duplicateFrameBtn.addEventListener('click', () => {
  frames.splice(currentFrame + 1, 0, [...frames[currentFrame]]);
  currentFrame++;
  updateDisplay();
  saveProgress();
});
deleteFrameBtn.addEventListener('click', () => {
  if (frames.length > 1) {
    frames.splice(currentFrame, 1);
    currentFrame = Math.max(0, currentFrame - 1);
    updateDisplay();
    saveProgress();
  }
});

// Render frame thumbnails
function renderFramesList() {
  framesList.innerHTML = '';
  frames.forEach((frame, idx) => {
    const thumb = document.createElement('canvas');
    thumb.width = 48;
    thumb.height = 48;
    const tctx = thumb.getContext('2d');
    const size = Math.sqrt(frame.length);
    const px = thumb.width / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        tctx.fillStyle = frame[y * size + x];
        tctx.fillRect(x * px, y * px, px, px);
      }
    }
    thumb.className = 'frame-thumb' + (idx === currentFrame ? ' selected' : '');
    thumb.addEventListener('click', () => {
      currentFrame = idx;
      updateDisplay();
    });

    // Drag and drop for rearranging frames
    thumb.setAttribute('draggable', 'true');
    thumb.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', idx);
      thumb.classList.add('dragging');
    });
    thumb.addEventListener('dragend', () => {
      thumb.classList.remove('dragging');
    });
    thumb.addEventListener('dragover', (e) => {
      e.preventDefault();
      thumb.classList.add('drag-over');
    });
    thumb.addEventListener('dragleave', () => {
      thumb.classList.remove('drag-over');
    });
    thumb.addEventListener('drop', (e) => {
      e.preventDefault();
      thumb.classList.remove('drag-over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const toIdx = idx;
      if (fromIdx !== toIdx) {
        // Move frame in array
        const [moved] = frames.splice(fromIdx, 1);
        frames.splice(toIdx, 0, moved);
        // Update currentFrame index if needed
        if (currentFrame === fromIdx) {
          currentFrame = toIdx;
        } else if (fromIdx < currentFrame && toIdx >= currentFrame) {
          currentFrame--;
        } else if (fromIdx > currentFrame && toIdx <= currentFrame) {
          currentFrame++;
        }
        updateDisplay();
        saveProgress();
      }
    });

    framesList.appendChild(thumb);
  });

  // Allow dropping between frames (at the end)
  framesList.ondragover = (e) => e.preventDefault();
  framesList.ondrop = (e) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIdx !== frames.length - 1) {
      const [moved] = frames.splice(fromIdx, 1);
      frames.push(moved);
      if (currentFrame === fromIdx) {
        currentFrame = frames.length - 1;
      } else if (fromIdx < currentFrame) {
        currentFrame--;
      }
      updateDisplay();
      saveProgress();
    }
  };
}

// Animation playback
playBtn.addEventListener('click', () => {
  playBtn.disabled = true;
  pauseBtn.disabled = false;
  let frameIdx = 0;
  animationInterval = setInterval(() => {
    currentFrame = frameIdx;
    updateDisplay();
    frameIdx = (frameIdx + 1) % frames.length;
  }, 1000 / parseInt(fpsInput.value, 10));
});
pauseBtn.addEventListener('click', () => {
  playBtn.disabled = false;
  pauseBtn.disabled = true;
  clearInterval(animationInterval);
});

 // FPS input
fpsInput.addEventListener('change', () => {
  if (animationInterval) {
    clearInterval(animationInterval);
    playBtn.disabled = false;
    pauseBtn.disabled = true;
  }
  saveProgress();
});

// Export as PNG
exportPngBtn.addEventListener('click', () => {
  drawFrame(frames[currentFrame]);
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = `frame${currentFrame + 1}.png`;
    downloadLink.style.display = 'block';
    downloadLink.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      downloadLink.style.display = 'none';
    }, 100);
  });
});

// Export as GIF (stub, real encoding requires full gif.js worker)
exportGifBtn.addEventListener('click', () => {
  if (typeof GIF === 'undefined') {
    alert('GIF export library not loaded.');
    return;
  }
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: canvas.width,
    height: canvas.height,
    workerScript: 'libs/gif.worker.js'
  });
  frames.forEach(frame => {
    // Draw frame to canvas, then add to GIF
    drawFrame(frame);
    gif.addFrame(ctx, {copy: true, delay: 1000 / parseInt(fpsInput.value, 10)});
  });
  gif.on('finished', function(result) {
    const url = URL.createObjectURL(result.blob);
    downloadLink.href = url;
    downloadLink.download = 'animation.gif';
    downloadLink.style.display = 'block';
    downloadLink.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      downloadLink.style.display = 'none';
    }, 100);
  });
  gif.render();
});

/**
 * Save progress to localStorage
 */
function saveProgress() {
  const data = {
    frames,
    currentFrame,
    gridSize,
    fps: fpsInput.value
  };
  localStorage.setItem('pixelArtAnimationProgress', JSON.stringify(data));
}

/**
 * Load progress from localStorage
 */
function loadProgress() {
  const data = localStorage.getItem('pixelArtAnimationProgress');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (
        Array.isArray(parsed.frames) &&
        typeof parsed.currentFrame === 'number' &&
        typeof parsed.gridSize === 'number'
      ) {
        gridSize = parsed.gridSize;
        gridSizeSelect.value = gridSize;
        pixelSize = canvas.width / gridSize;
        frames = parsed.frames;
        currentFrame = Math.min(parsed.currentFrame, frames.length - 1);
        if (parsed.fps) fpsInput.value = parsed.fps;
        return true;
      }
    } catch (e) {
      console.error("Error loading animation progress from localStorage:", e);
      // Fallback to default
    }
  }
  return false;
}

 // Zoom controls
if (zoomInBtn && zoomOutBtn && zoomLevelSpan) {
  zoomInBtn.addEventListener('click', () => {
    zoomFactor = Math.min(ZOOM_MAX, zoomFactor + ZOOM_STEP);
    updateDisplay();
  });
  zoomOutBtn.addEventListener('click', () => {
    zoomFactor = Math.max(ZOOM_MIN, zoomFactor - ZOOM_STEP);
    updateDisplay();
  });
}
if (zoomResetBtn) {
  zoomResetBtn.addEventListener('click', () => {
    zoomFactor = ZOOM_BASE;
    panX = 0;
    panY = 0;
    updateDisplay();
  });
}

 // Mouse wheel zoom on canvas
if (canvas) {
  canvas.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // allow browser zoom
    e.preventDefault();
    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // Canvas pixel under mouse before zoom
    const beforeX = (mouseX - panX) / zoomFactor;
    const beforeY = (mouseY - panY) / zoomFactor;
    const oldZoom = zoomFactor;
    const delta = Math.sign(e.deltaY);
    if (delta < 0) {
      // Zoom in
      zoomFactor = Math.min(ZOOM_MAX, zoomFactor + ZOOM_STEP);
    } else if (delta > 0) {
      // Zoom out
      zoomFactor = Math.max(ZOOM_MIN, zoomFactor - ZOOM_STEP);
    }
    // Adjust pan so the pixel under the mouse stays under the mouse
    panX = mouseX - beforeX * zoomFactor;
    panY = mouseY - beforeY * zoomFactor;
    updateDisplay();
  }, { passive: false });
}

 // Initialize app
function init() {
  loadColorLists();
  renderColorSwatches();
  if (!loadProgress()) {
    frames = [createBlankFrame()];
    currentFrame = 0;
  }
  setColor(currentColor || "#000000");
  zoomFactor = ZOOM_BASE;
  panX = 0;
  panY = 0;
  updateDisplay();
  selectTool('pencil');
  // Initialize tool size
  if (toolSizeInput) {
    toolSize = parseInt(toolSizeInput.value, 10) || 1;
    toolSizeInput.addEventListener('change', (e) => {
      toolSize = Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1));
      toolSizeInput.value = toolSize;
    });
  }
}
init();
