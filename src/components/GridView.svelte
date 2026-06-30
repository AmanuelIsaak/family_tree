<script lang="ts">
  import type { Friend } from '../lib/types';
  import { filteredFriends } from '../lib/store';
  import { LEVELS } from '../lib/levels';
  import FriendCard from './FriendCard.svelte';

  interface Props {
    onedit: (f: Friend) => void;
  }
  let { onedit }: Props = $props();

  // Group filtered friends by level so the grid reads top-down by closeness.
  const groups = $derived(
    LEVELS.map((l) => ({
      meta: l,
      members: $filteredFriends.filter((f) => f.level === l.level),
    })).filter((g) => g.members.length > 0),
  );
</script>

<div class="space-y-8">
  {#each groups as group (group.meta.level)}
    <section>
      <div class="mb-3 flex items-center gap-2">
        <span class="h-2.5 w-2.5 rounded-full" style="background:{group.meta.hex}"></span>
        <h3 class="font-display text-xl">{group.meta.label}</h3>
        <span class="text-sm text-slate-400">{group.members.length}</span>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {#each group.members as friend (friend.id)}
          <FriendCard {friend} {onedit} />
        {/each}
      </div>
    </section>
  {/each}
</div>
