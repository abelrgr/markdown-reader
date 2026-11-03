<script lang="ts">
  let { src = $bindable(''), alt = '' }: { src?: string; alt?: string } = $props();
  let dialog: HTMLDialogElement;
  $effect(() => {
    if (src && dialog && !dialog.open) dialog.showModal();
    else if (!src && dialog?.open) dialog.close();
  });
  function close(): void {
    src = '';
  }
</script>

<dialog
  bind:this={dialog}
  class="image-lightbox"
  aria-label={alt || 'Image'}
  onclose={close}
  onclick={(event) => {
    if (event.target === dialog) close();
  }}
>
  <button type="button" class="image-lightbox-close" aria-label="Close image" onclick={close}
    >×</button
  >
  {#if src}<img {src} {alt} />{/if}
</dialog>
