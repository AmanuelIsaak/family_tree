<script lang="ts">
  import type { Friend } from '../lib/types';
  import { filteredFriends } from '../lib/store';
  import { levelMeta } from '../lib/levels';

  interface Props {
    onedit: (f: Friend) => void;
  }
  let { onedit }: Props = $props();

  // Sort by when you met (oldest first). Undated friends sink to the bottom.
  const ordered = $derived(
    [...$filteredFriends].sort((a, b) => {
      if (!a.metDate) return 1;
      if (!b.metDate) return -1;
      return a.metDate.localeCompare(b.metDate);
    }),
  );

  function year(d: string): string {
    return d ? d.slice(0, 4) : '—';
  }

  function pretty(d: string): string {
    if (!d) return 'Date unknown';
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
</script>

<div class="mx-auto max-w-2xl">
  <ol class="relative ml-3 border-l-2 border-slate-200 dark:border-slate-800">
    {#each ordered as friend, i (friend.id)}
      {@const meta = levelMeta(friend.level)}
      {@const showYear = i === 0 || year(friend.metDate) !== year(ordered[i - 1].metDate)}
      <li class="mb-6 ml-6">
        {#if showYear}
          <span class="absolute -left-[1.65rem] mt-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {year(friend.metDate)}
          </span>
        {/if}
        <span
          class="absolute -left-[0.55rem] mt-1.5 h-4 w-4 rounded-full border-2 border-white dark:border-slate-950"
          style="background:{meta.hex}"
        ></span>
        <button
          class="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          onclick={() => onedit(friend)}
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium">{friend.name} {friend.favorite ? '⭐' : ''}</span>
            <span class="text-xs" style="color:{meta.hex}">{meta.label}</span>
          </div>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {pretty(friend.metDate)}{friend.metAt ? ` · ${friend.metAt}` : ''}{[friend.city, friend.country].filter(Boolean).length
              ? ` · 📍 ${[friend.city, friend.country].filter(Boolean).join(', ')}`
              : ''}
          </p>
        </button>
      </li>
    {/each}
  </ol>

  {#if ordered.length === 0}
    <p class="py-12 text-center text-sm text-slate-400">No one matches your filters.</p>
  {/if}
</div>
