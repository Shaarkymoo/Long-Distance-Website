<script>
  import { spriteToBoxShadow, spriteSize } from '../lib/pixelObjects.js';

  export let sprite;
  export let pixelSize = 4;

  $: size = spriteSize(sprite);
  $: boxShadow = spriteToBoxShadow(sprite, pixelSize);
</script>

<div
  class="sprite"
  style="width: {size.width * pixelSize}px; height: {size.height * pixelSize}px; box-shadow: {boxShadow};"
>
</div>

<style>
  .sprite {
    background: transparent;
    image-rendering: pixelated;
    flex-shrink: 0;
  }
</style>
