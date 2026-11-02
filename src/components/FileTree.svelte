<script lang="ts">
  import { openFolderFromDialog, openPaths, workspace } from '../lib/state/app.svelte';
  import { buildTree, type TreeNode } from '../lib/fs/tree';
  import { t } from '../lib/i18n/index.svelte';

  let expanded = $state(new Set<string>());
  const tree = $derived(workspace.listing ? buildTree(workspace.listing.entries) : []);

  function toggle(node: TreeNode): void {
    const next = new Set(expanded);
    if (next.has(node.path)) next.delete(node.path);
    else next.add(node.path);
    expanded = next;
  }
</script>

{#if workspace.listing}
  {#if workspace.listing.truncated}<p class="folder-truncated">{t('folder.truncated')}</p>{/if}
  <ul class="file-tree" data-testid="file-tree">
    {#snippet renderNodes(nodes: TreeNode[])}
      {#each nodes as node (node.path)}
        <li>
          {#if node.children}
            <button
              class="tree-folder"
              aria-expanded={expanded.has(node.path)}
              onclick={() => toggle(node)}
              >{expanded.has(node.path) ? '▾' : '▸'} 📁 {node.name}</button
            >
            {#if expanded.has(node.path)}<ul>{@render renderNodes(node.children)}</ul>{/if}
          {:else}
            <button
              class="tree-file"
              data-testid="file-tree-file"
              onclick={() => void openPaths([node.path])}>📄 {node.name}</button
            >
          {/if}
        </li>
      {/each}
    {/snippet}
    {@render renderNodes(tree)}
  </ul>
{:else}
  <div class="file-tree-empty">
    <p>{t('folder.noneOpen')}</p>
    <button onclick={() => void openFolderFromDialog()}>{t('app.openFolder')}</button>
  </div>
{/if}
