<script>
  import { onMount } from 'svelte';
  import api from '../lib/api.js';
  import LightButton from '../components/LightButton.svelte';

  let wledAvailable = false;
  let wledOn = false;
  let wledBrightness = 100;
  let checking = true;
  let mode = 'simulation'; // 'simulation' | 'wled'

  onMount(async () => {
    try {
      const data = await api.get('/wled/status');
      if (data.available) {
        wledAvailable = true;
        wledOn = data.on || false;
        wledBrightness = data.brightness || 100;
        mode = 'wled';
      }
    } catch (e) {}
    checking = false;
  });

  async function toggleWled() {
    try {
      const data = await api.post('/wled/toggle');
      if (data.available !== false) {
        wledOn = !wledOn;
      } else {
        mode = 'simulation';
      }
    } catch (e) {
      mode = 'simulation';
    }
  }

  async function turnOn() {
    try {
      const data = await api.post('/wled/on');
      if (data.available !== false) {
        wledOn = true;
      }
    } catch (e) {}
  }

  async function turnOff() {
    try {
      const data = await api.post('/wled/off');
      if (data.available !== false) {
        wledOn = false;
      }
    } catch (e) {}
  }

  function switchMode(m) {
    mode = m;
    if (m === 'simulation') {
      wledOn = false;
    }
  }
</script>

<div class="light-page">
  <h1>💡 Light Control</h1>
  <p class="subtitle">Control your room lights</p>

  <div class="mode-toggle">
    <button class="mode-btn" class:active={mode === 'simulation'} on:click={() => switchMode('simulation')}>🎮 Simulation</button>
    <button class="mode-btn" class:active={mode === 'wled'} on:click={() => switchMode('wled')} disabled={!wledAvailable}>
      💡 Real Light {wledAvailable ? '✓' : ''}
    </button>
  </div>

  {#if checking}
    <p class="status-msg">Checking WLED connection...</p>
  {:else if mode === 'simulation'}
    <div class="light-demo">
      <LightButton size="large" />
    </div>
    <div class="info-card">
      <div class="wled-status offline">
        <span class="status-dot"></span>
        WLED device not detected
      </div>
      <p>Set <code>WLED_IP=192.168.x.x</code> in your .env file and restart the server to enable hardware control.</p>
    </div>
  {:else}
    <div class="light-demo">
      <button class="wled-bulb" class:on={wledOn} on:click={toggleWled} aria-label="Toggle WLED light">
        <div class="bulb-glow"></div>
        <div class="bulb-base"></div>
      </button>
      <p class="light-state">{wledOn ? 'Lights are ON' : 'Lights are OFF'}</p>
    </div>
    <div class="wled-controls">
      <button class="wled-btn on-btn" on:click={turnOn} disabled={wledOn}>Turn On</button>
      <button class="wled-btn off-btn" on:click={turnOff} disabled={!wledOn}>Turn Off</button>
    </div>
    <div class="info-card">
      <div class="wled-status online">
        <span class="status-dot"></span>
        WLED connected — brightness: {wledBrightness}%
      </div>
    </div>
  {/if}
</div>

<style>
  .light-page {
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
  }
  h1 {
    font-size: 1.8rem;
    color: var(--text-primary);
    margin-bottom: 0.3rem;
  }
  .subtitle {
    color: var(--text-secondary);
    margin-top: 0;
    margin-bottom: 2rem;
  }

  .mode-toggle {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 2rem;
  }
  .mode-btn {
    padding: 0.5rem 1.2rem;
    border-radius: 8px;
    border: 2px solid var(--border-color);
    background: var(--bg-card);
    cursor: pointer;
    font-size: 0.95rem;
  }
  .mode-btn.active {
    border-color: var(--accent);
    background: var(--accent);
    color: white;
  }
  .mode-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status-msg {
    color: var(--text-secondary);
    font-style: italic;
  }

  .light-demo {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .wled-bulb {
    position: relative;
    width: 120px;
    height: 120px;
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
    margin-bottom: 1rem;
  }
  .bulb-glow {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 40%, #666, #444);
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .on .bulb-glow {
    background: radial-gradient(circle at 50% 40%, #fff7a0, #ffd700 60%, #ffaa00);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.6),
                0 0 40px rgba(255, 215, 0, 0.4),
                0 0 80px rgba(255, 215, 0, 0.2);
  }
  .bulb-base {
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 30%;
    height: 12px;
    background: #888;
    border-radius: 2px 2px 4px 4px;
  }
  .light-state {
    color: var(--text-secondary);
    font-size: 1rem;
    margin: 0;
  }

  .wled-controls {
    display: flex;
    gap: 0.8rem;
    justify-content: center;
    margin-bottom: 1.5rem;
  }
  .wled-btn {
    padding: 0.6rem 2rem;
    border-radius: 8px;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    font-weight: bold;
  }
  .wled-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .on-btn {
    background: #4caf50;
    color: white;
  }
  .off-btn {
    background: var(--accent);
    color: white;
  }

  .info-card {
    background: var(--bg-card);
    border-radius: 12px;
    padding: 1.5rem;
    text-align: left;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .info-card code {
    display: inline;
    background: var(--bg-elevated);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85rem;
    color: var(--accent);
  }
  .info-card p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0.5rem 0 0 0;
  }

  .wled-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: bold;
    font-size: 0.95rem;
  }
  .wled-status.online { color: #4caf50; }
  .wled-status.offline { color: var(--accent); }
  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }
  .online .status-dot { background: #4caf50; }
  .offline .status-dot { background: var(--accent); }
</style>
