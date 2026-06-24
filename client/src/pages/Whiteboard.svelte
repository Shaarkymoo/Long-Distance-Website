<script>
  import { onMount, onDestroy } from 'svelte';

  let canvasEl;
  let ctx = null;
  let drawing = false;
  let currentStroke = null;
  let strokes = [];
  let color = '#e94560';
  let brushWidth = 3;
  let isEraser = false;
  let connected = false;
  let loading = true;
  let ws = null;
  let reconnectTimer = null;
  let message = '';

  const PRESET_COLORS = ['#e94560', '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#000000', '#888888', '#ffffff'];
  const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/whiteboard`;

  function connectWs() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      connected = true;
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'init') {
        strokes = msg.strokes || [];
        loading = false;
        redrawAll();
      } else if (msg.type === 'stroke') {
        strokes = [...strokes, msg.stroke];
        redrawAll();
      } else if (msg.type === 'clear') {
        strokes = [];
        redrawAll();
        message = 'Canvas cleared by other user';
        setTimeout(() => message = '', 2000);
      }
    };

    ws.onclose = () => {
      connected = false;
      reconnectTimer = setTimeout(connectWs, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  onMount(() => {
    connectWs();
    if (canvasEl) {
      ctx = canvasEl.getContext('2d');
      resizeCanvas();
    }
    window.addEventListener('resize', resizeCanvas);
  });

  onDestroy(() => {
    if (ws) ws.close();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    window.removeEventListener('resize', resizeCanvas);
  });

  function resizeCanvas() {
    if (!canvasEl || !ctx) return;
    const rect = canvasEl.parentElement.getBoundingClientRect();
    canvasEl.width = rect.width - 4;
    canvasEl.height = Math.min(600, window.innerHeight - 300);
    redrawAll();
  }

  function getPos(e) {
    const rect = canvasEl.getBoundingClientRect();
    const touch = e.touches?.[0];
    return {
      x: (touch?.clientX || e.clientX) - rect.left,
      y: (touch?.clientY || e.clientY) - rect.top
    };
  }

  function startDraw(e) {
    if (!connected) return;
    e.preventDefault();
    const pos = getPos(e);
    drawing = true;
    currentStroke = { points: [pos], color: isEraser ? '#ffffff' : color, width: isEraser ? brushWidth * 3 : brushWidth };
  }

  function draw(e) {
    e.preventDefault();
    if (!drawing || !ctx || !currentStroke) return;
    const pos = getPos(e);
    currentStroke.points.push(pos);
    const pts = currentStroke.points;
    if (pts.length >= 2) {
      const last = pts[pts.length - 2];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = currentStroke.color;
      ctx.lineWidth = currentStroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  function endDraw() {
    if (!drawing || !currentStroke) return;
    drawing = false;
    if (currentStroke.points.length > 1) {
      strokes.push(currentStroke);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stroke', stroke: currentStroke }));
      }
    }
    currentStroke = null;
  }

  function redrawAll() {
    if (!ctx || !canvasEl) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    if (currentStroke && currentStroke.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
      for (let i = 1; i < currentStroke.points.length; i++) {
        ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
      }
      ctx.strokeStyle = currentStroke.color;
      ctx.lineWidth = currentStroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  function clearCanvas() {
    if (!confirm('Clear the canvas for everyone?')) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'clear' }));
    }
  }

  function selectColor(c) {
    color = c;
    isEraser = false;
  }
</script>

<div class="whiteboard-page">
  <div class="page-header">
    <h1>🖍️ Shared Whiteboard</h1>
    <p class="subtitle">Draw together in real time</p>
  </div>

  <div class="status-bar">
    <span class="status-dot" class:connected></span>
    <span class="status-text">{connected ? 'Connected' : 'Reconnecting...'}</span>
  </div>

  <div class="toolbar">
    <div class="color-picker">
      {#each PRESET_COLORS as c}
        <button
          class="color-btn"
          class:active={color === c && !isEraser}
          style="background: {c}; border: 2px solid {c === '#ffffff' ? '#ccc' : c};"
          on:click={() => selectColor(c)}
          title={c}
        ></button>
      {/each}
    </div>

    <div class="tool-actions">
      <button class="tool-btn" class:active={isEraser} on:click={() => { isEraser = !isEraser; }} title="Eraser">
        🧹 Eraser
      </button>
    </div>

    <div class="brush-size">
      <label for="brush-range">Size:</label>
      <input id="brush-range" type="range" bind:value={brushWidth} min="1" max="20" />
      <span class="size-preview" style="width: {brushWidth}px; height: {brushWidth}px;"></span>
    </div>

    <div class="action-buttons">
      <button class="clear-btn" on:click={clearCanvas}>🗑️ Clear</button>
    </div>
  </div>

  {#if message}
    <div class="message">{message}</div>
  {/if}

  <div class="canvas-container">
    {#if loading}
      <div class="loading-overlay">Loading canvas...</div>
    {/if}
    {#if !connected && !loading}
      <div class="loading-overlay">Disconnected — drawing disabled</div>
    {/if}
    <canvas
      bind:this={canvasEl}
      on:mousedown={startDraw}
      on:mousemove={draw}
      on:mouseup={endDraw}
      on:mouseleave={endDraw}
      on:touchstart={startDraw}
      on:touchmove={draw}
      on:touchend={endDraw}
    ></canvas>
  </div>
</div>

<style>
  .whiteboard-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 24px;
  }
  .page-header h1 { margin: 0 0 0.3rem 0; }
  .subtitle { color: var(--text-secondary); margin: 0 0 0.5rem 0; }

  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.8rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e94560;
    transition: background 0.3s;
  }
  .status-dot.connected {
    background: #4caf50;
  }
  .status-text { font-size: 0.85rem; }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    align-items: center;
    background: var(--bg-surface);
    padding: 0.8rem 1rem;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    margin-bottom: 0.8rem;
  }
  .color-picker {
    display: flex;
    gap: 0.3rem;
  }
  .color-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    padding: 0;
  }
  .color-btn.active {
    box-shadow: 0 0 0 3px #333;
    transform: scale(1.15);
  }
  .tool-actions {
    display: flex;
    gap: 0.3rem;
  }
  .tool-btn {
    padding: 0.4rem 0.8rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .tool-btn.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
  .brush-size {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
  .size-preview {
    display: inline-block;
    background: var(--text-primary);
    border-radius: 50%;
  }
  .action-buttons {
    display: flex;
    gap: 0.3rem;
    margin-left: auto;
  }
  .clear-btn {
    background: #e94560;
    color: white;
    border: none;
    padding: 0.4rem 1rem;
    border-radius: 6px;
    cursor: pointer;
  }

  .message {
    text-align: center;
    padding: 0.4rem;
    color: #4caf50;
    font-size: 0.9rem;
    font-weight: bold;
  }

  .canvas-container {
    position: relative;
    background: var(--bg-card);
    border: 2px solid var(--border-color);
    border-radius: 10px;
    overflow: hidden;
  }
  canvas {
    display: block;
    width: 100%;
    touch-action: none;
    cursor: crosshair;
  }
  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.7);
    color: var(--text-secondary);
    font-size: 1.2rem;
    z-index: 1;
  }
</style>
