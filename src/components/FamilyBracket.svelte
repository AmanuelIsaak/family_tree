<script lang="ts">
  import type { FamilyMember, FamilyRoleId, FamilySide } from '../lib/types';
  import { visibleFamily, familyMatches } from '../lib/familyStore';
  import { layoutBracket, CARD_W, CARD_H } from '../lib/familyBracket';
  import { roleLabel } from '../lib/familyRoles';
  import { countryFlag } from '../lib/countries';

  interface Props {
    onedit: (m: FamilyMember) => void;
    /** Clicking a blank seat offers to fill it. */
    onadd: (role: FamilyRoleId, side: FamilySide) => void;
  }
  let { onedit, onadd }: Props = $props();

  const layout = $derived(layoutBracket($visibleFamily));

  const PAD_X = 30;
  const PAD_Y = 62;
  const box = $derived({
    x: layout.minX - PAD_X,
    y: layout.minY - PAD_Y,
    w: layout.maxX - layout.minX + PAD_X * 2,
    h: layout.maxY - layout.minY + PAD_Y * 2,
  });

  /** Column headings, mirrored on both halves like tournament round labels. */
  const headings = $derived(
    layout.slots
      .filter((s) => s.y === Math.min(...layout.slots.filter((o) => o.depth === s.depth).map((o) => o.y)))
      .filter((s, i, all) => all.findIndex((o) => o.x === s.x) === i)
      .map((s) => ({
        x: s.x,
        label: ['You', 'Parents', 'Grandparents', 'Great-grandparents', '2× Great-grandparents'][
          s.depth
        ],
      })),
  );

  function clip(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function dimmed(m: FamilyMember | null): boolean {
    return m !== null && $familyMatches !== null && !$familyMatches.has(m.id);
  }

  // ── Pan & zoom ─────────────────────────────────────────────────────────────
  let scale = $state(1);
  let tx = $state(0);
  let ty = $state(0);
  let dragging = $state(false);
  let last = { x: 0, y: 0 };
  let moved = false;
  let frameW = $state(0);

  const unitsPerPx = $derived(frameW > 0 ? box.w / frameW : 1);
  const MAX_SCALE = 4;
  const MIN_SCALE = 0.35;

  function reset() {
    scale = 1;
    tx = 0;
    ty = 0;
  }
  function zoomBy(f: number) {
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * f));
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }
  function onPointerDown(e: PointerEvent) {
    dragging = true;
    moved = false;
    last = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
    tx += dx * unitsPerPx;
    ty += dy * unitsPerPx;
    last = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp() {
    dragging = false;
  }

  function activate(m: FamilyMember | null, role: FamilyRoleId, side: FamilySide) {
    if (moved) return; // a drag, not a click
    if (m) onedit(m);
    else onadd(role, side);
  }
</script>

<svelte:window onpointermove={onPointerMove} onpointerup={onPointerUp} />

<div
  class="relative w-full max-h-[74vh] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40"
  style="aspect-ratio: {Math.min(box.w / box.h, frameW > 0 && frameW < 640 ? 1.2 : 3.2)}"
  bind:clientWidth={frameW}
>
  <div class="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
    <button class="h-7 w-7 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800" title="Zoom out" onclick={() => zoomBy(1 / 1.2)}>−</button>
    <button class="h-7 rounded px-2 text-xs tabular-nums text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Reset view" onclick={reset}>
      {Math.round(scale * 100)}%
    </button>
    <button class="h-7 w-7 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800" title="Zoom in" onclick={() => zoomBy(1.2)}>+</button>
  </div>

  <svg
    viewBox="{box.x} {box.y} {box.w} {box.h}"
    class="h-full w-full touch-none {dragging ? 'cursor-grabbing' : 'cursor-grab'}"
    role="img"
    aria-label="Ancestor bracket, mother's line on the left and father's on the right"
    onwheel={onWheel}
    onpointerdown={onPointerDown}
  >
    <g transform="translate({tx} {ty}) scale({scale})">
      <!-- Side headings -->
      <text x={box.x + 14} y={box.y + 22} class="fill-slate-400 text-[11px] font-semibold uppercase tracking-wider">
        Mother's line
      </text>
      <text x={box.x + box.w - 14} y={box.y + 22} text-anchor="end" class="fill-slate-400 text-[11px] font-semibold uppercase tracking-wider">
        Father's line
      </text>

      <!-- Round headings -->
      {#each headings as h (h.x)}
        <text
          x={h.x}
          y={layout.minY - 22}
          text-anchor="middle"
          class="fill-slate-400 text-[9px] font-medium uppercase tracking-wide"
        >
          {h.label}
        </text>
      {/each}

      <!-- Bracket elbows -->
      {#each layout.links as d, i (i)}
        <path
          {d}
          fill="none"
          stroke="currentColor"
          class="text-slate-300 dark:text-slate-600"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      {/each}

      <!-- Seats -->
      {#each layout.slots as slot (slot.depth + ':' + slot.side + ':' + slot.y)}
        {@const m = slot.member}
        {@const isSelf = slot.depth === 0}
        <g
          transform="translate({slot.x - CARD_W / 2} {slot.y - CARD_H / 2})"
          class="cursor-pointer transition-opacity"
          opacity={dimmed(m) ? 0.25 : 1}
          role="button"
          tabindex="0"
          aria-label={m ? `${m.name}, ${roleLabel(m.role)}` : `Add ${roleLabel(slot.role)}`}
          onclick={() => activate(m, slot.role, slot.side)}
          onkeydown={(e) => (e.key === 'Enter' ? activate(m, slot.role, slot.side) : null)}
        >
          <rect
            width={CARD_W}
            height={CARD_H}
            rx="8"
            class={isSelf && m
              ? 'fill-slate-900 dark:fill-slate-100'
              : m
                ? 'fill-white stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700'
                : 'fill-transparent stroke-slate-300 dark:stroke-slate-700'}
            stroke-width="1"
            stroke-dasharray={m ? 'none' : '4 4'}
          />

          {#if m}
            <text
              x={CARD_W / 2}
              y="21"
              text-anchor="middle"
              class="pointer-events-none text-[11.5px] font-semibold {isSelf
                ? 'fill-white dark:fill-slate-900'
                : 'fill-slate-800 dark:fill-slate-100'}"
            >
              {clip(m.name, 17)}
            </text>
            <text
              x={CARD_W / 2}
              y="34"
              text-anchor="middle"
              class="pointer-events-none text-[9px] {isSelf ? 'fill-slate-300 dark:fill-slate-600' : 'fill-slate-400'}"
            >
              {clip(roleLabel(m.role) + (m.birthDate ? ` · ${m.birthDate.slice(0, 4)}` : ''), 24)}
            </text>
            {#if m.deceased}
              <text x="8" y="15" class="pointer-events-none fill-slate-400 text-[9px]">†</text>
            {/if}
            {#if countryFlag(m.country)}
              <text x={CARD_W - 15} y={CARD_H - 7} class="pointer-events-none text-[9px]">
                {countryFlag(m.country)}
              </text>
            {/if}
          {:else}
            <text
              x={CARD_W / 2}
              y="21"
              text-anchor="middle"
              class="pointer-events-none fill-slate-400 text-[10px] font-medium"
            >
              {clip(roleLabel(slot.role), 20)}
            </text>
            <text
              x={CARD_W / 2}
              y="34"
              text-anchor="middle"
              class="pointer-events-none fill-slate-300 text-[9px] dark:fill-slate-600"
            >
              + add
            </text>
          {/if}
        </g>
      {/each}
    </g>
  </svg>
</div>

<p class="mt-3 text-center text-xs text-slate-400">
  Direct ancestors only — siblings, aunts and cousins live in the tree view · click a blank seat to fill it
</p>
