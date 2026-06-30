<script lang="ts">
  import type { Friend } from '../lib/types';
  import { filteredFriends } from '../lib/store';
  import { LEVELS } from '../lib/levels';

  interface Props {
    onedit: (f: Friend) => void;
  }
  let { onedit }: Props = $props();

  // Ring radius grows with distance — level 1 closest to the centre "You".
  const RING_STEP = 48;
  const RING_BASE = 56;
  function ringRadius(level: number): number {
    return RING_BASE + (level - 1) * RING_STEP;
  }
  const MAX_R = ringRadius(7);
  const VIEW = MAX_R + 46; // padding for node radius + labels

  interface Node {
    friend: Friend;
    x: number;
    y: number;
    hex: string;
    initials: string;
  }

  function initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  const nodes = $derived.by<Node[]>(() => {
    const out: Node[] = [];
    for (const lvl of LEVELS) {
      const members = $filteredFriends.filter((f) => f.level === lvl.level);
      const r = ringRadius(lvl.level);
      // Offset each ring's starting angle so nodes don't line up radially.
      const offset = (lvl.level * Math.PI) / 7;
      members.forEach((friend, i) => {
        const angle = (2 * Math.PI * i) / members.length - Math.PI / 2 + offset;
        out.push({
          friend,
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
          hex: lvl.hex,
          initials: initials(friend.name),
        });
      });
    }
    return out;
  });

  let hovered = $state<string | null>(null);
</script>

<div class="flex flex-col items-center">
  <svg
    viewBox="{-VIEW} {-VIEW} {VIEW * 2} {VIEW * 2}"
    class="mx-auto h-auto w-full max-w-[640px]"
    role="img"
    aria-label="Concentric friendship circles"
  >
    <!-- Rings + labels -->
    {#each LEVELS as l (l.level)}
      <circle
        cx="0"
        cy="0"
        r={ringRadius(l.level)}
        fill="none"
        stroke={l.hex}
        stroke-opacity="0.22"
        stroke-width="1.5"
      />
      <text
        x="0"
        y={-ringRadius(l.level) - 4}
        text-anchor="middle"
        class="fill-slate-400 text-[8px] font-medium"
        style="fill:{l.hex}"
      >
        {l.short}
      </text>
    {/each}

    <!-- Centre: You -->
    <circle cx="0" cy="0" r="22" class="fill-slate-900 dark:fill-slate-100" />
    <text x="0" y="3" text-anchor="middle" class="fill-white text-[10px] font-semibold dark:fill-slate-900">
      You
    </text>

    <!-- Friend nodes -->
    {#each nodes as node (node.friend.id)}
      <g
        class="cursor-pointer"
        transform="translate({node.x} {node.y})"
        onclick={() => onedit(node.friend)}
        onmouseenter={() => (hovered = node.friend.id)}
        onmouseleave={() => (hovered = null)}
        role="button"
        tabindex="0"
        onkeydown={(e) => (e.key === 'Enter' ? onedit(node.friend) : null)}
      >
        <circle
          r={hovered === node.friend.id ? 17 : 14}
          fill={node.hex}
          class="transition-all"
          stroke="white"
          stroke-width="1.5"
        />
        <text x="0" y="3" text-anchor="middle" class="pointer-events-none fill-white text-[8px] font-semibold">
          {node.initials}
        </text>
        {#if node.friend.favorite}
          <text x="11" y="-9" class="pointer-events-none text-[10px]">⭐</text>
        {/if}
        {#if hovered === node.friend.id}
          <text
            x="0"
            y="-22"
            text-anchor="middle"
            class="pointer-events-none fill-slate-700 text-[9px] font-medium dark:fill-slate-200"
          >
            {node.friend.name}
          </text>
        {/if}
      </g>
    {/each}
  </svg>

  <!-- Legend -->
  <div class="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
    {#each LEVELS as l (l.level)}
      {@const count = $filteredFriends.filter((f) => f.level === l.level).length}
      <span class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span class="h-2.5 w-2.5 rounded-full" style="background:{l.hex}"></span>
        {l.label}
        <span class="text-slate-400">{count}</span>
      </span>
    {/each}
  </div>
</div>
