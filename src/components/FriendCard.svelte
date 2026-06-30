<script lang="ts">
  import type { Friend } from '../lib/types';
  import { levelMeta } from '../lib/levels';
  import { toggleFavorite } from '../lib/store';

  interface Props {
    friend: Friend;
    onedit: (f: Friend) => void;
  }

  let { friend, onedit }: Props = $props();

  const meta = $derived(levelMeta(friend.level));
  const place = $derived([friend.city, friend.country].filter(Boolean).join(', '));

  function initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }
</script>

<div
  class="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
>
  <button
    class="absolute right-3 top-3 text-lg leading-none transition hover:scale-110"
    title={friend.favorite ? 'Unfavorite' : 'Favorite'}
    onclick={() => toggleFavorite(friend.id)}
  >
    {friend.favorite ? '⭐' : '☆'}
  </button>

  <div class="flex items-center gap-3">
    <div
      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style="background:{meta.hex}"
    >
      {initials(friend.name)}
    </div>
    <div class="min-w-0">
      <p class="truncate font-medium">{friend.name}</p>
      <p class="text-xs" style="color:{meta.hex}">{meta.label}</p>
    </div>
  </div>

  {#if place}
    <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">📍 {place}</p>
  {/if}

  {#if friend.metAt}
    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Met: {friend.metAt}</p>
  {/if}

  {#if friend.tags.length}
    <div class="mt-2 flex flex-wrap gap-1">
      {#each friend.tags as tag}
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {tag}
        </span>
      {/each}
    </div>
  {/if}

  {#if friend.notes}
    <p class="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{friend.notes}</p>
  {/if}

  <button
    class="mt-3 self-start text-xs font-medium text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-slate-700 dark:hover:text-slate-200"
    onclick={() => onedit(friend)}
  >
    Edit →
  </button>
</div>
