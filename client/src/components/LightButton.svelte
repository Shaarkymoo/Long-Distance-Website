<script>
  export let size = 'normal'; // 'normal' | 'large'

  let isOn = false;

  function toggle() {
    isOn = !isOn;
  }

  $: stateText = isOn ? 'Lights are ON' : 'Lights are OFF';
  $: bulbClass = isOn ? 'on' : 'off';
</script>

<div class="light-container" class:large={size === 'large'}>
  <button class="light-bulb {bulbClass}" on:click={toggle} aria-label="Toggle light">
    <div class="bulb-glow"></div>
    <div class="bulb-base"></div>
  </button>
  <p class="light-state">{stateText}</p>
</div>

<style>
  .light-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .light-bulb {
    position: relative;
    width: 80px;
    height: 80px;
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
  }
  .large .light-bulb {
    width: 120px;
    height: 120px;
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
    color: #666;
    font-size: 0.9rem;
    margin: 0;
  }
</style>
