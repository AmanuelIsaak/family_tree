<script lang="ts">
  import type { Friend } from '../lib/types';
  import { filteredFriends } from '../lib/store';
  import { ERAS, overlapsEra, friendSpan, isOngoing } from '../lib/eras';
  import FriendCard from './FriendCard.svelte';

  interface Props {
    onedit: (f: Friend) => void;
  }
  let { onedit }: Props = $props();

  // Each era collects every friend whose span overlaps it, so ongoing friends
  // appear in more than one chapter and drifted-apart ones stay behind.
  const groups = $derived(
    ERAS.map((era) => {
      const members = $filteredFriends.filter((f) => overlapsEra(f, era));
      return { era, members, ongoing: members.filter(isOngoing).length };
    }),
  );

  // Friends with no "met" date can't be placed on the timeline of eras.
  const undated = $derived($filteredFriends.filter((f) => !friendSpan(f)));
</script>

<p class="mb-6 text-sm text-slate-500 dark:text-slate-400">
  People appear in every era their friendship spanned — someone you still see today shows up in
  each chapter since you met, while the ones you’ve drifted from stay behind in the earlier ones.
</p>

<div class="space-y-10">
  {#each groups as group (group.era.id)}
    <section>
      <div class="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 class="font-display text-2xl">{group.era.label}</h3>
        <span class="text-sm text-slate-400">
          {group.members.length}
          {group.members.length === 1 ? 'person' : 'people'}
          {#if group.ongoing > 0}· {group.ongoing} still in touch{/if}
        </span>
      </div>
      <p class="mb-3 text-xs text-slate-400 dark:text-slate-500">{group.era.blurb}</p>

      {#if group.members.length > 0}
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {#each group.members as friend (friend.id)}
            <FriendCard {friend} {onedit} />
          {/each}
        </div>
      {:else}
        <p class="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400 dark:border-slate-800">
          No one from this era matches your filters.
        </p>
      {/if}
    </section>
  {/each}

  {#if undated.length > 0}
    <section>
      <div class="mb-1 flex flex-wrap items-baseline gap-x-3">
        <h3 class="font-display text-2xl text-slate-500 dark:text-slate-400">No date yet</h3>
        <span class="text-sm text-slate-400">{undated.length}</span>
      </div>
      <p class="mb-3 text-xs text-slate-400 dark:text-slate-500">
        Add a “met” date to slot these into an era.
      </p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {#each undated as friend (friend.id)}
          <FriendCard {friend} {onedit} />
        {/each}
      </div>
    </section>
  {/if}
</div>
