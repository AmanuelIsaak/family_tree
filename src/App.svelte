<script lang="ts">
  import type {
    FamilyMember,
    FamilyRoleId,
    FamilySide,
    FamilyView,
    Friend,
    FriendLevel,
    Section,
    View,
  } from './lib/types';
  import { LEVELS } from './lib/levels';
  import {
    friends,
    filteredFriends,
    view,
    search,
    levelFilter,
    theme,
    toggleTheme,
  } from './lib/store';
  import {
    family,
    visibleFamily,
    section,
    sideFilter,
    showDistant,
    distantCount,
    familyView,
  } from './lib/familyStore';
  import { SIDE_LABELS } from './lib/familyRoles';
  import { exportAll, importAll } from './lib/backup';
  import { toast } from './lib/toast';
  import CircleView from './components/CircleView.svelte';
  import TimelineView from './components/TimelineView.svelte';
  import GridView from './components/GridView.svelte';
  import ErasView from './components/ErasView.svelte';
  import FriendModal from './components/FriendModal.svelte';
  import FamilyTree from './components/FamilyTree.svelte';
  import FamilyBracket from './components/FamilyBracket.svelte';
  import FamilyModal from './components/FamilyModal.svelte';
  import Toast from './components/Toast.svelte';

  // Modal state. `modalOpen` toggles visibility; `editing` is the target or null (= add).
  let modalOpen = $state(false);
  let editing = $state<Friend | null>(null);

  function openAdd() {
    editing = null;
    modalOpen = true;
  }
  function openEdit(f: Friend) {
    editing = f;
    modalOpen = true;
  }
  function closeModal() {
    modalOpen = false;
    editing = null;
  }

  // Family modal, kept separate so each section owns its own form.
  let famModalOpen = $state(false);
  let famEditing = $state<FamilyMember | null>(null);
  let famPreset = $state<{ role: FamilyRoleId; side: FamilySide } | null>(null);

  function openFamilyAdd() {
    famEditing = null;
    famPreset = null;
    famModalOpen = true;
  }
  function openFamilyEdit(m: FamilyMember) {
    famEditing = m;
    famPreset = null;
    famModalOpen = true;
  }
  /** A blank bracket seat: open the form already set to that relation. */
  function openFamilySeat(role: FamilyRoleId, side: FamilySide) {
    famEditing = null;
    famPreset = { role, side };
    famModalOpen = true;
  }
  function closeFamilyModal() {
    famModalOpen = false;
    famEditing = null;
    famPreset = null;
  }

  const familyViews: { id: FamilyView; label: string; icon: string }[] = [
    { id: 'tree', label: 'Tree', icon: '⚭' },
    { id: 'bracket', label: 'Bracket', icon: '⊢' },
  ];

  const sections: { id: Section; label: string; icon: string }[] = [
    { id: 'friends', label: 'Friends', icon: '◎' },
    { id: 'family', label: 'Family', icon: '⚭' },
  ];

  const views: { id: View; label: string; icon: string }[] = [
    { id: 'circles', label: 'Circles', icon: '◎' },
    { id: 'timeline', label: 'Timeline', icon: '↧' },
    { id: 'eras', label: 'Eras', icon: '❏' },
    { id: 'grid', label: 'Grid', icon: '▦' },
  ];

  const sides: FamilySide[] = ['maternal', 'own', 'paternal'];

  function toggleLevel(level: FriendLevel) {
    levelFilter.update((set) => {
      const next = new Set(set);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function toggleSide(side: FamilySide) {
    sideFilter.update((set) => {
      const next = new Set(set);
      if (next.has(side)) next.delete(side);
      else next.add(side);
      return next;
    });
  }

  function doExport() {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-circle-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Exported friends and family', 'success');
  }

  let fileInput: HTMLInputElement;
  function onImportFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const n = importAll(String(reader.result));
        toast(`Imported ${n.friends} friends and ${n.family} relatives`, 'success');
      } catch (err) {
        toast('Import failed: ' + (err as Error).message, 'error');
      }
    };
    reader.readAsText(file);
    (e.target as HTMLInputElement).value = '';
  }
</script>

<div class="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
  <!-- Header -->
  <header class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <h1 class="font-display text-[2.1rem] font-semibold leading-none tracking-tight sm:text-5xl">
        My Circle
      </h1>
      <p class="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400 sm:text-sm">
        {#if $section === 'friends'}
          {$friends.length} people, mapped by how close they are.
        {:else}
          {$family.length} relatives, mapped across both sides of the family.
        {/if}
      </p>
    </div>

    <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <button class="btn-icon text-base" title="Toggle theme" aria-label="Toggle theme" onclick={toggleTheme}>
        {$theme === 'dark' ? '☀' : '☾'}
      </button>
      <!-- Import/export collapse to icons on a phone; the labels return at sm. -->
      <button class="btn-icon sm:btn-outline sm:w-auto sm:px-3.5" title="Export" onclick={doExport}>
        <span aria-hidden="true" class="sm:hidden">↓</span>
        <span class="hidden sm:inline">Export</span>
      </button>
      <button class="btn-icon sm:btn-outline sm:w-auto sm:px-3.5" title="Import" onclick={() => fileInput.click()}>
        <span aria-hidden="true" class="sm:hidden">↑</span>
        <span class="hidden sm:inline">Import</span>
      </button>
      <input
        bind:this={fileInput}
        type="file"
        accept="application/json,.json"
        class="hidden"
        onchange={onImportFile}
      />
      <button
        class="btn-primary hidden sm:inline-flex"
        onclick={$section === 'friends' ? openAdd : openFamilyAdd}
      >
        {$section === 'friends' ? '+ Add friend' : '+ Add relative'}
      </button>
    </div>
  </header>

  <!-- Section switch -->
  <div class="mt-5 flex items-center gap-2 sm:mt-6">
    <div class="segmented">
      {#each sections as s (s.id)}
        <button
          class="segment flex-1 px-4 font-semibold sm:flex-none {$section === s.id ? 'segment-active' : ''}"
          onclick={() => ($section = s.id)}
        >
          <span class="mr-1.5" aria-hidden="true">{s.icon}</span>{s.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Controls: search + view switch -->
  <div class="mt-3 flex flex-col gap-2.5 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
    <div class="relative sm:min-w-[260px] sm:flex-none">
      <input
        class="field-input pl-9"
        type="search"
        placeholder={$section === 'friends'
          ? 'Search name, tag, note…'
          : 'Search name, relation, place…'}
        bind:value={$search}
      />
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
    </div>

    <!-- The view switcher fills the width on a phone so both options are easy to hit. -->
    {#if $section === 'friends'}
      <div class="segmented w-full sm:w-auto">
        {#each views as v (v.id)}
          <button
            class="segment flex-1 justify-center sm:flex-none {$view === v.id ? 'segment-active' : ''}"
            onclick={() => ($view = v.id)}
          >
            <span class="mr-1" aria-hidden="true">{v.icon}</span>{v.label}
          </button>
        {/each}
      </div>
    {:else}
      <div class="segmented w-full sm:w-auto">
        {#each familyViews as v (v.id)}
          <button
            class="segment flex-1 justify-center sm:flex-none {$familyView === v.id ? 'segment-active' : ''}"
            onclick={() => ($familyView = v.id)}
          >
            <span class="mr-1" aria-hidden="true">{v.icon}</span>{v.label}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if $section === 'friends'}
    <!-- Level filter chips -->
    <div class="chip-row mt-3">
      {#each LEVELS as l (l.level)}
        {@const active = $levelFilter.has(l.level)}
        <button
          class="chip {active ? 'border-transparent text-white hover:text-white' : ''}"
          style={active ? `background:${l.hex}` : ''}
          onclick={() => toggleLevel(l.level)}
          title={l.description}
        >
          {l.label}
        </button>
      {/each}
      {#if $levelFilter.size > 0}
        <button
          class="chip border-transparent underline hover:border-transparent"
          onclick={() => levelFilter.set(new Set())}
        >
          Clear
        </button>
      {/if}
    </div>
  {:else}
    <!-- Side filter chips -->
    <div class="chip-row mt-3">
      {#each sides as s (s)}
        {@const active = $sideFilter.has(s)}
        <button class="chip {active ? 'chip-active' : ''}" onclick={() => toggleSide(s)}>
          {SIDE_LABELS[s]}
        </button>
      {/each}
      {#if $sideFilter.size > 0}
        <button
          class="chip border-transparent underline hover:border-transparent"
          onclick={() => sideFilter.set(new Set())}
        >
          Clear
        </button>
      {/if}

      <!-- The bracket only ever draws direct ancestors, so the fold has nothing to do there. -->
      {#if $distantCount > 0 && $familyView === 'tree'}
        <span class="h-4 w-px shrink-0 bg-slate-300 dark:bg-slate-700"></span>
        <button
          class="chip border-dashed"
          onclick={() => showDistant.update((v) => !v)}
          title="Great-aunts and uncles, your parents' cousins, and second cousins"
        >
          {$showDistant ? 'Hide' : 'Show'} distant kin ({$distantCount})
        </button>
      {/if}
    </div>
  {/if}

  <!-- Main content -->
  <main class="mt-8">
    {#if $section === 'family'}
      {#if $visibleFamily.length <= 1 && $familyView === 'tree'}
        <div class="rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700 sm:py-20">
          <p class="font-display text-2xl">No relatives yet</p>
          <p class="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
            {$sideFilter.size > 0
              ? 'Nobody on the side you picked — clear the filter to see everyone.'
              : 'Start with your parents, then fan out to grandparents, aunts and cousins.'}
          </p>
          <button class="btn-primary mt-5" onclick={openFamilyAdd}>+ Add your first relative</button>
        </div>
      {:else if $familyView === 'bracket'}
        <FamilyBracket onedit={openFamilyEdit} onadd={openFamilySeat} />
      {:else}
        <FamilyTree onedit={openFamilyEdit} />
      {/if}
    {:else if $friends.length === 0}
      <div class="rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700 sm:py-20">
        <p class="font-display text-2xl">Your circle is empty</p>
        <p class="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
          Add the people who matter to start mapping them.
        </p>
        <button class="btn-primary mt-5" onclick={openAdd}>+ Add your first friend</button>
      </div>
    {:else if $filteredFriends.length === 0}
      <p class="py-20 text-center text-sm text-slate-400">No one matches your search or filters.</p>
    {:else if $view === 'circles'}
      <CircleView onedit={openEdit} />
    {:else if $view === 'timeline'}
      <TimelineView onedit={openEdit} />
    {:else if $view === 'eras'}
      <ErasView onedit={openEdit} />
    {:else}
      <GridView onedit={openEdit} />
    {/if}
  </main>
</div>

<!-- Phone-sized screens lose the header's add button, so it becomes a thumb-reachable
     floating action instead. Hidden at sm, where the header button is back. -->
<button
  class="fixed bottom-5 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full
    bg-slate-900 text-2xl font-light text-white shadow-lg shadow-slate-900/25 transition
    active:scale-95 dark:bg-slate-100 dark:text-slate-900 sm:hidden"
  style="bottom: calc(1.25rem + env(safe-area-inset-bottom))"
  aria-label={$section === 'friends' ? 'Add friend' : 'Add relative'}
  onclick={$section === 'friends' ? openAdd : openFamilyAdd}
>
  +
</button>

{#if modalOpen}
  <!-- key on the editing target so the form re-initialises per friend -->
  {#key editing?.id ?? 'new'}
    <FriendModal friend={editing} onclose={closeModal} />
  {/key}
{/if}

{#if famModalOpen}
  {#key famEditing?.id ?? famPreset?.role ?? 'new'}
    <FamilyModal member={famEditing} preset={famPreset} onclose={closeFamilyModal} />
  {/key}
{/if}

<Toast />
