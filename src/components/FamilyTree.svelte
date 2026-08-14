<script lang="ts">
  import type { FamilyMember } from '../lib/types';
  import { visibleFamily, familyMatches } from '../lib/familyStore';
  import { layoutFamily, NODE_W, NODE_H } from '../lib/familyLayout';
  import { generationHex, isDistantRole, roleLabel, GENERATION_LABELS } from '../lib/familyRoles';
  import { countryFlag } from '../lib/countries';

  interface Props {
    onedit: (m: FamilyMember) => void;
  }
  let { onedit }: Props = $props();

  const layout = $derived(layoutFamily($visibleFamily));

  const PAD_X = 56;
  const PAD_Y = 44;
  /** Reserved strip down the left so generation labels never sit on a card. */
  const LABEL_GUTTER = 96;
  /**
   * How hard to pull the frame towards being symmetric about x = 0. At 1 you
   * sit in the exact centre, but a lopsided family (a big maternal side, a
   * small paternal one) then blanks out a third of the canvas. At 0 the frame
   * hugs the content and you drift off-centre. This keeps you near the middle
   * without paying full price for the imbalance.
   */
  const CENTRE_BIAS = 0.6;

  const box = $derived.by(() => {
    const left = layout.minX - PAD_X - LABEL_GUTTER;
    const right = layout.maxX + PAD_X;
    const half = Math.max(Math.abs(left), Math.abs(right));
    const x0 = left + (-half - left) * CENTRE_BIAS;
    const x1 = right + (half - right) * CENTRE_BIAS;
    return {
      x: x0,
      y: layout.minY - PAD_Y,
      w: x1 - x0,
      h: layout.maxY - layout.minY + PAD_Y * 2,
    };
  });

  /**
   * Cap how wide the frame may get relative to its height. Without this a very
   * lopsided tree on a narrow screen would drive the height down to nothing —
   * or, with a min-height, force the box wider than the viewport.
   */
  const frameAspect = $derived.by(() => {
    // Narrow screens need a squarer frame, or there's no room to show more than
    // one generation at the zoom level that makes the cards readable.
    const cap = frameW > 0 && frameW < NARROW_PX ? 1.1 : 2.6;
    return Math.min(box.w / box.h, cap);
  });

  const rowLabel = (g: number) =>
    GENERATION_LABELS.find((r) => r.generation === g)?.label ?? `Generation ${g}`;

  function clip(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function dimmed(m: FamilyMember): boolean {
    return $familyMatches !== null && !$familyMatches.has(m.id);
  }

  // ── Pan & zoom ─────────────────────────────────────────────────────────────
  let scale = $state(1);
  let tx = $state(0);
  let ty = $state(0);
  let dragging = $state(false);
  let last = { x: 0, y: 0 };
  let moved = false;
  /** Rendered width of the frame, for translating pixel drags into user units. */
  let frameW = $state(0);
  /** Once the view has been moved by hand, stop auto-fitting it. */
  let touched = $state(false);

  const unitsPerPx = $derived(frameW > 0 ? box.w / frameW : 1);

  /**
   * A wide tree squeezed onto a phone renders every card a few pixels across.
   * There, open zoomed in far enough to read, centred on the person in the
   * middle, and let the user pan out. On a roomy screen the whole tree fits
   * without help, and auto-zooming would only crop it — so don't.
   */
  const MIN_CARD_PX = 86;
  const NARROW_PX = 640;
  const MAX_SCALE = 4;
  const MIN_SCALE = 0.35;
  $effect(() => {
    const b = box;
    if (touched || frameW <= 0 || frameW >= NARROW_PX) return;
    const needed = MIN_CARD_PX / (NODE_W * (frameW / b.w));
    if (needed > 1.02) {
      scale = Math.min(MAX_SCALE, needed);
      tx = b.x + b.w / 2;
      ty = b.y + b.h / 2;
    }
  });

  function reset() {
    scale = 1;
    tx = 0;
    ty = 0;
    touched = false; // let the auto-fit take over again
  }
  function zoomBy(factor: number) {
    touched = true;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }
  function onPointerDown(e: PointerEvent) {
    dragging = true;
    moved = false;
    last = { x: e.clientX, y: e.clientY };
    // Deliberately no setPointerCapture here: capturing on the <svg> retargets
    // the follow-up click to the <svg>, so it would never reach a node.
    // The drag is tracked on the window instead (see <svelte:window> below).
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      moved = true;
      touched = true;
    }
    // Drag deltas arrive in CSS pixels; the transform is in viewBox units.
    tx += dx * unitsPerPx;
    ty += dy * unitsPerPx;
    last = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp() {
    dragging = false;
  }

  /** Suppress the click that ends a drag so panning never opens the editor. */
  function open(m: FamilyMember) {
    if (moved) return;
    onedit(m);
  }
</script>

<!-- Tracked on the window so a drag keeps panning even outside the svg. -->
<svelte:window onpointermove={onPointerMove} onpointerup={onPointerUp} />

<!-- Height follows the tree's own proportions, so there's no letterboxing. -->
<div
  class="relative w-full max-h-[74vh] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40"
  style="aspect-ratio: {frameAspect}"
  bind:clientWidth={frameW}
>
  <!-- Zoom controls -->
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
    aria-label="Family tree, mother's side on the left and father's side on the right"
    onwheel={onWheel}
    onpointerdown={onPointerDown}
  >
    <g transform="translate({tx} {ty}) scale({scale})">
      <!-- Centre axis + side headings -->
      <line
        x1="0"
        y1={box.y + 12}
        x2="0"
        y2={box.y + box.h - 12}
        stroke="currentColor"
        class="text-slate-300 dark:text-slate-700"
        stroke-width="1"
        stroke-dasharray="4 6"
      />
      <text x={box.x + 16} y={box.y + 26} class="fill-slate-400 text-[11px] font-semibold uppercase tracking-wider">
        Mother's side
      </text>
      <text
        x={box.x + box.w - 16}
        y={box.y + 26}
        text-anchor="end"
        class="fill-slate-400 text-[11px] font-semibold uppercase tracking-wider"
      >
        Father's side
      </text>

      <!-- Generation guides -->
      {#each layout.rows as row (row.generation)}
        <line
          x1={box.x + 12}
          y1={row.y}
          x2={box.x + box.w - 12}
          y2={row.y}
          stroke={generationHex(row.generation)}
          stroke-opacity="0.10"
          stroke-width="{NODE_H + 14}"
        />
        <!-- Sits inside its own band, clear of the side headings up top. -->
        <text
          x={box.x + 16}
          y={row.y + 3}
          class="text-[10px] font-medium"
          style="fill:{generationHex(row.generation)}"
        >
          {rowLabel(row.generation)}
        </text>
      {/each}

      <!-- Parent → child connectors -->
      {#each layout.connectors as d, i (i)}
        <path
          {d}
          fill="none"
          stroke="currentColor"
          class="text-slate-300 dark:text-slate-600"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      {/each}

      <!-- Extended-branch descent: dashed, so a solid line always means direct family -->
      {#each layout.distantConnectors as d, i (i)}
        <path
          {d}
          fill="none"
          stroke="currentColor"
          class="text-slate-300 dark:text-slate-600"
          stroke-width="1.5"
          stroke-dasharray="4 3"
          stroke-linecap="round"
        />
      {/each}

      <!-- Where the direct family ends and the extended branch begins -->
      {#each layout.branchDividers as x, i (i)}
        <line
          x1={x}
          y1={box.y + 34}
          x2={x}
          y2={box.y + box.h - 12}
          stroke="currentColor"
          class="text-slate-300 dark:text-slate-700"
          stroke-width="1"
          stroke-dasharray="2 5"
        />
        <text
          {x}
          y={box.y + 28}
          text-anchor="middle"
          class="fill-slate-400 text-[8px] font-medium uppercase tracking-wider"
        >
          extended
        </text>
      {/each}

      <!-- Marriage bars: heavier and darker than a descent line -->
      {#each layout.couples as d, i (i)}
        <path
          {d}
          fill="none"
          stroke="currentColor"
          class="text-slate-400 dark:text-slate-500"
          stroke-width="2.5"
          stroke-linecap="round"
        />
      {/each}

      <!-- People -->
      {#each layout.nodes as node (node.member.id)}
        {@const m = node.member}
        {@const isSelf = m.role === 'self'}
        {@const hex = generationHex(node.generation)}
        {@const distant = isDistantRole(m.role)}
        <g
          transform="translate({node.x - NODE_W / 2} {node.y - NODE_H / 2})"
          class="cursor-pointer transition-opacity"
          opacity={dimmed(m) ? 0.25 : 1}
          role="button"
          tabindex="0"
          aria-label="{m.name}, {roleLabel(m.role)}"
          onclick={() => open(m)}
          onkeydown={(e) => (e.key === 'Enter' ? onedit(m) : null)}
        >
          <!-- Distant kin get a dashed outline so the core family reads first. -->
          <rect
            width={NODE_W}
            height={NODE_H}
            rx="10"
            class={isSelf
              ? 'fill-slate-900 dark:fill-slate-100'
              : distant
                ? 'fill-slate-50 stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-600'
                : 'fill-white stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700'}
            stroke-width="1"
            stroke-dasharray={distant ? '4 3' : 'none'}
          />
          <!-- Generation accent -->
          <rect
            width={NODE_W}
            height="3"
            rx="1.5"
            fill={isSelf ? '#ffffff' : hex}
            opacity={isSelf ? 0.5 : distant ? 0.45 : 1}
          />

          <text
            x={NODE_W / 2}
            y="26"
            text-anchor="middle"
            class="pointer-events-none text-[12px] font-semibold {isSelf
              ? 'fill-white dark:fill-slate-900'
              : 'fill-slate-800 dark:fill-slate-100'}"
          >
            {clip(m.name, 16)}
          </text>
          <text
            x={NODE_W / 2}
            y="41"
            text-anchor="middle"
            class="pointer-events-none text-[9.5px] {isSelf
              ? 'fill-slate-300 dark:fill-slate-600'
              : 'fill-slate-400'}"
          >
            {clip(roleLabel(m.role) + (m.birthDate ? ` · ${m.birthDate.slice(0, 4)}` : ''), 22)}
          </text>

          {#if m.deceased}
            <text x="9" y="17" class="pointer-events-none fill-slate-400 text-[10px]">†</text>
          {/if}
          {#if m.favorite}
            <text x={NODE_W - 16} y="17" class="pointer-events-none text-[10px]">⭐</text>
          {/if}
          {#if countryFlag(m.country)}
            <title>{[m.city, m.country].filter(Boolean).join(', ')}</title>
            <text x={NODE_W - 15} y={NODE_H - 7} class="pointer-events-none text-[10px]">
              {countryFlag(m.country)}
            </text>
          {/if}
        </g>
      {/each}
    </g>
  </svg>
</div>

<!-- Legend -->
<div class="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
  {#each GENERATION_LABELS as g (g.generation)}
    {@const count = $visibleFamily.filter(
      (m) => layout.nodes.find((n) => n.member.id === m.id)?.generation === g.generation,
    ).length}
    {#if count > 0}
      <span class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span class="h-2.5 w-2.5 rounded-full" style="background:{generationHex(g.generation)}"></span>
        {g.label}
        <span class="text-slate-400">{count}</span>
      </span>
    {/if}
  {/each}
</div>
<p class="mt-2 text-center text-xs text-slate-400">
  Drag to pan · scroll to zoom · click anyone to edit
</p>
