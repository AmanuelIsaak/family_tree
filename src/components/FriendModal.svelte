<script lang="ts">
  import type { Friend, FriendLevel } from '../lib/types';
  import { LEVELS } from '../lib/levels';
  import CountrySelect from './CountrySelect.svelte';
  import { addFriend, updateFriend, removeFriend } from '../lib/store';
  import { toast } from '../lib/toast';

  interface Props {
    friend: Friend | null;
    onclose: () => void;
  }

  let { friend, onclose }: Props = $props();

  // svelte-ignore state_referenced_locally
  const editing = friend !== null;

  // One-time snapshot of the prop — the modal is re-mounted per friend via {#key}.
  // svelte-ignore state_referenced_locally
  const init = friend;
  let name = $state(init?.name ?? '');
  let level = $state<FriendLevel>(init?.level ?? 4);
  let tags = $state(init?.tags.join(', ') ?? '');
  let metAt = $state(init?.metAt ?? '');
  let city = $state(init?.city ?? '');
  let country = $state(init?.country ?? '');
  let metDate = $state(init?.metDate ?? '');
  let lastContact = $state(init?.lastContact ?? '');
  let notes = $state(init?.notes ?? '');
  let favorite = $state(init?.favorite ?? false);

  function save() {
    if (!name.trim()) {
      toast('Name is required.', 'error');
      return;
    }
    const draft = {
      name: name.trim(),
      level,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      metAt: metAt.trim(),
      city: city.trim(),
      country: country.trim(),
      metDate,
      lastContact,
      notes: notes.trim(),
      favorite,
    };
    if (friend) {
      updateFriend(friend.id, draft);
      toast('Updated ' + draft.name, 'success');
    } else {
      addFriend(draft);
      toast('Added ' + draft.name, 'success');
    }
    onclose();
  }

  function del() {
    if (friend) {
      removeFriend(friend.id);
      toast('Removed ' + friend.name);
    }
    onclose();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={onKey} />

<!-- Backdrop -->
<div
  class="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
  onclick={onclose}
  onkeydown={() => {}}
  role="presentation"
>
  <!-- Dialog -->
  <div
    class="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 sm:max-h-[88vh] sm:rounded-2xl"
    onclick={(e) => e.stopPropagation()}
    onkeydown={() => {}}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden"></div>

    <h2 class="shrink-0 px-6 pb-1 pt-4 font-display text-2xl sm:pt-6">
      {editing ? 'Edit friend' : 'Add a friend'}
    </h2>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
      <div>
        <label class="field-label" for="fm-name">Name</label>
        <input id="fm-name" class="field-input" bind:value={name} placeholder="Their name" />
      </div>

      <div>
        <span class="field-label">Closeness</span>
        <div class="flex flex-wrap gap-1.5">
          {#each LEVELS as l (l.level)}
            <button
              type="button"
              class="rounded-full border px-2.5 py-1 text-xs font-medium transition
                {level === l.level
                ? 'border-transparent text-white'
                : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:text-slate-300'}"
              style={level === l.level ? `background:${l.hex}` : ''}
              onclick={() => (level = l.level)}
              title={l.description}
            >
              {l.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="field-label" for="fm-metat">Where you met</label>
          <input id="fm-metat" class="field-input" bind:value={metAt} placeholder="e.g. University" />
        </div>
        <div>
          <label class="field-label" for="fm-tags">Tags</label>
          <input id="fm-tags" class="field-input" bind:value={tags} placeholder="work, gym" />
        </div>
        <div>
          <label class="field-label" for="fm-metdate">Met on</label>
          <input id="fm-metdate" type="date" class="field-input" bind:value={metDate} />
        </div>
        <div>
          <label class="field-label" for="fm-last">Last contact</label>
          <input id="fm-last" type="date" class="field-input" bind:value={lastContact} />
        </div>
        <div>
          <label class="field-label" for="fm-city">City</label>
          <input id="fm-city" class="field-input" bind:value={city} placeholder="e.g. Zürich" />
        </div>
        <div>
          <label class="field-label" for="fm-country">Country</label>
          <CountrySelect id="fm-country" bind:value={country} />
        </div>
      </div>

      <div>
        <label class="field-label" for="fm-notes">Notes</label>
        <textarea id="fm-notes" class="field-input min-h-[72px] resize-y" bind:value={notes}
          placeholder="Anything worth remembering"></textarea>
      </div>

      <label class="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" class="h-4 w-4 accent-amber-500" bind:checked={favorite} />
        Mark as favorite ⭐
      </label>
    </div>

    <div
      class="flex shrink-0 items-center gap-2 border-t border-slate-200 px-6 py-3.5 dark:border-slate-800"
      style="padding-bottom: calc(0.875rem + env(safe-area-inset-bottom))"
    >
      {#if editing}
        <button class="btn-danger" onclick={del}>Delete</button>
      {/if}
      <span class="flex-1"></span>
      <button class="btn-ghost" onclick={onclose}>Cancel</button>
      <button class="btn-primary px-5" onclick={save}>{editing ? 'Save' : 'Add'}</button>
    </div>
  </div>
</div>
