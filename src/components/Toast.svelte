<script lang="ts">
  import { toasts } from '../lib/toast';

  const tone: Record<string, string> = {
    info: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
  };
</script>

<div class="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
  {#each $toasts as t (t.id)}
    <div class="pointer-events-auto rounded-full px-4 py-2 text-sm font-medium shadow-lg {tone[t.kind]}">
      {t.text}
    </div>
  {/each}
</div>
