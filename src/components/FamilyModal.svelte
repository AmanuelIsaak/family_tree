<script lang="ts">
  import type { FamilyMember, FamilyRoleId, FamilySide } from '../lib/types';
  import CountrySelect from './CountrySelect.svelte';
  import {
    SELECTABLE_ROLES,
    roleMeta,
    roleLabel,
    generationOf,
    GENERATION_LABELS,
    SIDE_LABELS,
  } from '../lib/familyRoles';
  import {
    addMember,
    updateMember,
    removeMember,
    parentCandidates,
    partnerCandidates,
  } from '../lib/familyStore';
  import { toast } from '../lib/toast';

  interface Props {
    member: FamilyMember | null;
    /** Starting relation and side when adding, e.g. from a blank bracket seat. */
    preset?: { role: FamilyRoleId; side: FamilySide } | null;
    onclose: () => void;
  }

  let { member, preset = null, onclose }: Props = $props();

  // svelte-ignore state_referenced_locally
  const editing = member !== null;
  // svelte-ignore state_referenced_locally
  const init = member;
  /** The centre person: no role or side to choose, and can't be deleted. */
  // svelte-ignore state_referenced_locally
  const isSelf = init?.role === 'self';

  let name = $state(init?.name ?? '');
  // svelte-ignore state_referenced_locally
  let role = $state<FamilyRoleId>(init?.role ?? preset?.role ?? 'cousin');
  // svelte-ignore state_referenced_locally
  let side = $state<FamilySide>(init?.side ?? preset?.side ?? 'maternal');
  let parentId = $state(init?.parentId ?? '');
  let partnerId = $state(init?.partnerId ?? '');
  let generation = $state(init?.generation ?? 0);
  let birthDate = $state(init?.birthDate ?? '');
  let deceased = $state(init?.deceased ?? false);
  let deceasedYear = $state(init?.deceasedYear ?? '');
  let city = $state(init?.city ?? '');
  let country = $state(init?.country ?? '');
  let notes = $state(init?.notes ?? '');
  let favorite = $state(init?.favorite ?? false);

  const meta = $derived(roleMeta(role));

  /** Who this person could have married: same generation, blood relatives. */
  const partners = $derived(
    isSelf ? [] : partnerCandidates(role, generationOf({ role, generation }), init?.id),
  );
  const partner = $derived(partners.find((p) => p.id === partnerId));

  /**
   * Roles like Mother only make sense on one side. Marrying in also settles it:
   * your aunt's husband belongs to whichever side your aunt is on.
   */
  const sideLocked = $derived(meta.sides.length === 1 || partner !== undefined);

  // Keep `side` legal whenever the role or the partner changes.
  $effect(() => {
    if (partner) side = partner.side;
    else if (!meta.sides.includes(side)) side = meta.sides[0];
  });

  // Forget a partner who is no longer a valid choice for the current role.
  $effect(() => {
    if (partnerId && !partners.some((p) => p.id === partnerId)) partnerId = '';
  });

  const candidates = $derived(
    meta.nestable
      ? parentCandidates(role, generationOf({ role, generation }), side, init?.id)
      : [],
  );

  // Drop a stale parent link if the chosen one is no longer a valid option.
  $effect(() => {
    if (parentId && !candidates.some((c) => c.id === parentId)) parentId = '';
  });

  /** Roles grouped into optgroups by generation, oldest first. */
  const roleGroups = $derived(
    GENERATION_LABELS.map((g) => ({
      label: g.label,
      roles: SELECTABLE_ROLES.filter((r) => r.generation === g.generation),
    })).filter((g) => g.roles.length > 0),
  );

  function save() {
    if (!name.trim()) {
      toast('Name is required.', 'error');
      return;
    }
    const draft = {
      name: name.trim(),
      role: isSelf ? ('self' as FamilyRoleId) : role,
      side: isSelf ? ('own' as FamilySide) : side,
      parentId: !isSelf && meta.nestable && parentId ? parentId : undefined,
      partnerId: !isSelf && partnerId ? partnerId : undefined,
      generation: !isSelf && role === 'other' ? generation : undefined,
      birthDate: birthDate || undefined,
      deceased,
      deceasedYear: deceased && deceasedYear.trim() ? deceasedYear.trim() : undefined,
      city: city.trim(),
      country: country.trim(),
      notes: notes.trim(),
      favorite,
    };
    if (member) {
      updateMember(member.id, draft);
      toast('Updated ' + draft.name, 'success');
    } else {
      addMember(draft);
      toast('Added ' + draft.name, 'success');
    }
    onclose();
  }

  function del() {
    if (member && !isSelf) {
      removeMember(member.id);
      toast('Removed ' + member.name);
    }
    onclose();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={onKey} />

<div
  class="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
  onclick={onclose}
  onkeydown={() => {}}
  role="presentation"
>
  <div
    class="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 sm:max-h-[88vh] sm:rounded-2xl"
    onclick={(e) => e.stopPropagation()}
    onkeydown={() => {}}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <!-- Grab handle, so the sheet reads as draggable-looking on a phone -->
    <div class="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden"></div>

    <h2 class="shrink-0 px-6 pb-1 pt-4 font-display text-2xl sm:pt-6">
      {isSelf ? 'This is you' : editing ? 'Edit relative' : 'Add a relative'}
    </h2>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
      <div>
        <label class="field-label" for="fam-name">Name</label>
        <input id="fam-name" class="field-input" bind:value={name} placeholder="Their name" />
      </div>

      {#if !isSelf}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="field-label" for="fam-role">Relation</label>
            <select id="fam-role" class="field-input" bind:value={role}>
              {#each roleGroups as group (group.label)}
                <optgroup label={group.label}>
                  {#each group.roles as r (r.id)}
                    <option value={r.id}>{r.label}</option>
                  {/each}
                </optgroup>
              {/each}
            </select>
          </div>

          {#if role === 'other'}
            <div>
              <label class="field-label" for="fam-gen">Generation</label>
              <select id="fam-gen" class="field-input" bind:value={generation}>
                {#each GENERATION_LABELS as g (g.generation)}
                  <option value={g.generation}>{g.label}</option>
                {/each}
              </select>
            </div>
          {/if}
        </div>

        <div>
          <label class="field-label" for="fam-partner">
            Married to <span class="font-normal text-slate-400">(optional)</span>
          </label>
          <select id="fam-partner" class="field-input" bind:value={partnerId} disabled={partners.length === 0}>
            <option value="">
              {partners.length === 0 ? 'No one in this generation yet' : 'Not married in'}
            </option>
            {#each partners as p (p.id)}
              <option value={p.id}>{p.name} · {roleLabel(p.role)}</option>
            {/each}
          </select>
          <p class="mt-1 text-xs text-slate-400">
            Use this for relatives who joined the family by marriage — your aunt's husband,
            your sibling's partner. They'll sit beside their spouse instead of being drawn
            as a child of the generation above.
          </p>
        </div>

        <div>
          <span class="field-label">Side of the family</span>
          {#if partner}
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {SIDE_LABELS[partner.side]} — follows {partner.name}.
            </p>
          {:else if sideLocked}
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {SIDE_LABELS[meta.sides[0]]} — fixed by the “{roleLabel(role)}” relation.
            </p>
          {:else}
            <div class="flex flex-wrap gap-1.5">
              {#each meta.sides as s (s)}
                <button
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-medium transition
                    {side === s
                    ? 'border-transparent bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:text-slate-300'}"
                  onclick={() => (side = s)}
                >
                  {SIDE_LABELS[s]}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        {#if meta.nestable}
          <div>
            <label class="field-label" for="fam-parent">
              Child of <span class="font-normal text-slate-400">(optional — nests them in the tree)</span>
            </label>
            <select id="fam-parent" class="field-input" bind:value={parentId} disabled={candidates.length === 0}>
              <option value="">
                {candidates.length === 0 ? 'No one on this side yet' : 'Not linked'}
              </option>
              {#each candidates as c (c.id)}
                <option value={c.id}>{c.name} · {roleLabel(c.role)}</option>
              {/each}
            </select>
          </div>
        {/if}
      {/if}

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="field-label" for="fam-born">Born</label>
          <input id="fam-born" type="date" class="field-input" bind:value={birthDate} />
        </div>
        <div>
          <label class="field-label" for="fam-city">City</label>
          <input id="fam-city" class="field-input" bind:value={city} placeholder="e.g. Zürich" />
        </div>
        <div class="sm:col-span-2">
          <label class="field-label" for="fam-country">Country</label>
          <CountrySelect id="fam-country" bind:value={country} />
        </div>
      </div>

      {#if !isSelf}
        <div class="flex flex-wrap items-center gap-4">
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" class="h-4 w-4 accent-slate-600" bind:checked={deceased} />
            No longer with us
          </label>
          {#if deceased}
            <input
              class="field-input w-28"
              bind:value={deceasedYear}
              placeholder="Year"
              aria-label="Year of death"
            />
          {/if}
        </div>
      {/if}

      <div>
        <label class="field-label" for="fam-notes">Notes</label>
        <textarea
          id="fam-notes"
          class="field-input min-h-[72px] resize-y"
          bind:value={notes}
          placeholder="Anything worth remembering"
        ></textarea>
      </div>

      <label class="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" class="h-4 w-4 accent-amber-500" bind:checked={favorite} />
        Mark as favorite ⭐
      </label>
    </div>

    <!-- Pinned so Save is always reachable, however long the form gets. -->
    <div
      class="flex shrink-0 items-center gap-2 border-t border-slate-200 px-6 py-3.5 dark:border-slate-800"
      style="padding-bottom: calc(0.875rem + env(safe-area-inset-bottom))"
    >
      {#if editing && !isSelf}
        <button class="btn-danger" onclick={del}>Delete</button>
      {/if}
      <span class="flex-1"></span>
      <button class="btn-ghost" onclick={onclose}>Cancel</button>
      <button class="btn-primary px-5" onclick={save}>{editing ? 'Save' : 'Add'}</button>
    </div>
  </div>
</div>
