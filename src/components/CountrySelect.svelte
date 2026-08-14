<script lang="ts">
  import { COUNTRIES } from '../lib/countries';

  interface Props {
    id: string;
    value: string;
  }

  let { id, value = $bindable() }: Props = $props();

  /**
   * A country already on the record but missing from the list — imported data,
   * or a name typed before the list existed. Kept as an option so opening the
   * form never silently wipes it.
   */
  const custom = $derived(
    value && !COUNTRIES.some((c) => c.name === value) ? value : '',
  );
</script>

<select {id} class="field-input" bind:value>
  <option value="">— Not set —</option>
  {#each COUNTRIES as c (c.name)}
    <option value={c.name}>{c.flag} {c.name}</option>
  {/each}
  {#if custom}
    <option value={custom}>{custom}</option>
  {/if}
</select>
