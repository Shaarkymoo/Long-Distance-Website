<script>
  import helpTexts from '../lib/helpTexts.js';

  export let page = '';

  let visible = true;

  // Reset visibility whenever page changes
  $: {
    visible = true;
  }

  function close() {
    visible = false;
  }

  $: text = helpTexts[page] || '';
</script>

{#if visible && text}
  <div class="help-dialog">
    <button class="close-btn" on:click={close}>×</button>
    <p class="help-text">{text}</p>
  </div>
{/if}

<style>
  .help-dialog {
    position: absolute;
    top: 12px;
    right: 16px;
    width: 220px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 10px 32px 10px 12px;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .help-text {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.4;
    color: var(--text-secondary);
  }

  .close-btn {
    position: absolute;
    top: 4px;
    right: 6px;
    background: none;
    border: none;
    color: var(--accent);
    font-size: 1.1rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .close-btn:hover {
    opacity: 0.8;
  }
</style>
