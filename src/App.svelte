<script lang="ts">
  import type { Friend, FriendLevel, View } from './lib/types';
  import { LEVELS } from './lib/levels';
  import {
    friends,
    filteredFriends,
    view,
    search,
    levelFilter,
    theme,
    toggleTheme,
    exportJSON,
    importJSON,
  } from './lib/store';
  import { toast } from './lib/toast';
  import CircleView from './components/CircleView.svelte';
  import TimelineView from './components/TimelineView.svelte';
  import GridView from './components/GridView.svelte';
  import FriendModal from './components/FriendModal.svelte';
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

  const views: { id: View; label: string; icon: string }[] = [
    { id: 'circles', label: 'Circles', icon: '◎' },
    { id: 'timeline', label: 'Timeline', icon: '↧' },
    { id: 'grid', label: 'Grid', icon: '▦' },
  ];

  function toggleLevel(level: FriendLevel) {
    levelFilter.update((set) => {
      const next = new Set(set);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function doExport() {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-circle-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Exported your circle', 'success');
  }

  let fileInput: HTMLInputElement;
  function onImportFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const n = importJSON(String(reader.result));
        toast(`Imported ${n} friends`, 'success');
      } catch (err) {
        toast('Import failed: ' + (err as Error).message, 'error');
      }
    };
    reader.readAsText(file);
    (e.target as HTMLInputElement).value = '';
  }
</script>

<div class="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
  <!-- Header -->
  <header class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="font-display text-4xl leading-none">My Circle</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {$friends.length} people, mapped by how close they are.
      </p>
    </div>
    <div class="flex items-center gap-2">
      <button
        class="rounded-lg p-2 text-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Toggle theme"
        onclick={toggleTheme}
      >
        {$theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <button
        class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        onclick={doExport}
      >
        Export
      </button>
      <button
        class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        onclick={() => fileInput.click()}
      >
        Import
      </button>
      <input
        bind:this={fileInput}
        type="file"
        accept="application/json,.json"
        class="hidden"
        onchange={onImportFile}
      />
      <button
        class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        onclick={openAdd}
      >
        + Add friend
      </button>
    </div>
  </header>

  <!-- Controls: search + view switch -->
  <div class="mt-6 flex flex-wrap items-center gap-3">
    <div class="relative flex-1 sm:min-w-[240px] sm:flex-none">
      <input
        class="field-input pl-9"
        placeholder="Search name, tag, note…"
        bind:value={$search}
      />
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
    </div>

    <div class="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
      {#each views as v (v.id)}
        <button
          class="rounded-md px-3 py-1.5 text-sm font-medium transition
            {$view === v.id
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}"
          onclick={() => ($view = v.id)}
        >
          <span class="mr-1">{v.icon}</span>{v.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Level filter chips -->
  <div class="mt-3 flex flex-wrap gap-1.5">
    {#each LEVELS as l (l.level)}
      {@const active = $levelFilter.has(l.level)}
      <button
        class="rounded-full border px-2.5 py-1 text-xs font-medium transition
          {active ? 'border-transparent text-white' : 'border-slate-300 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400'}"
        style={active ? `background:${l.hex}` : ''}
        onclick={() => toggleLevel(l.level)}
        title={l.description}
      >
        {l.label}
      </button>
    {/each}
    {#if $levelFilter.size > 0}
      <button
        class="rounded-full px-2.5 py-1 text-xs font-medium text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-200"
        onclick={() => levelFilter.set(new Set())}
      >
        Clear
      </button>
    {/if}
  </div>

  <!-- Main content -->
  <main class="mt-8">
    {#if $friends.length === 0}
      <div class="rounded-2xl border border-dashed border-slate-300 py-20 text-center dark:border-slate-700">
        <p class="font-display text-2xl">Your circle is empty</p>
        <p class="mt-1 text-sm text-slate-500">Add the people who matter to start mapping them.</p>
        <button
          class="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
          onclick={openAdd}>+ Add your first friend</button
        >
      </div>
    {:else if $filteredFriends.length === 0}
      <p class="py-20 text-center text-sm text-slate-400">No one matches your search or filters.</p>
    {:else if $view === 'circles'}
      <CircleView onedit={openEdit} />
    {:else if $view === 'timeline'}
      <TimelineView onedit={openEdit} />
    {:else}
      <GridView onedit={openEdit} />
    {/if}
  </main>
</div>

{#if modalOpen}
  <!-- key on the editing target so the form re-initialises per friend -->
  {#key editing?.id ?? 'new'}
    <FriendModal friend={editing} onclose={closeModal} />
  {/key}
{/if}

<Toast />
