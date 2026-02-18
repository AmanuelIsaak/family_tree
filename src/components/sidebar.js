import { $, gen, esc, getSide, subLbl } from '../utils/helpers.js';
import { state } from '../utils/storage.js';

export function renderList() {
  const q = $('searchIn').value.toLowerCase();
  const filtered = state.members.filter(m =>
    (m.firstName + ' ' + (m.lastName || '')).toLowerCase().includes(q)
  );

  const sides = { paternal: [], maternal: [], unknown: [] };
  filtered.forEach(m => {
    const s = getSide(m);
    if (s === 'paternal') sides.paternal.push(m);
    else if (s === 'maternal') sides.maternal.push(m);
    else sides.unknown.push(m);
  });

  let html = '';
  const gLabels = ['Roots', 'Gen 1', 'Gen 2', 'Gen 3', 'Gen 4', 'Gen 5', 'Gen 6', 'Gen 7', 'Gen 8'];

  function renderGroup(label, list) {
    if (list.length === 0) return;
    const gens = {};
    list.forEach(m => {
      const g = gen(m.id);
      if (!gens[g]) gens[g] = [];
      gens[g].push(m);
    });

    if (label) {
      html += '<div class="gl" style="color:var(--acc);padding-top:14px">── ' + label + ' ──</div>';
    }

    Object.keys(gens).sort((a, b) => a - b).forEach(g => {
      html += '<div class="gl">' + (gLabels[g] || 'Gen ' + g) + ' · ' + gens[g].length + '</div>';
      gens[g].sort((a, b) => a.firstName.localeCompare(b.firstName)).forEach(m => {
        const ini = (m.firstName[0] + (m.lastName ? m.lastName[0] : '')).toUpperCase();
        const sub = subLbl(m);
        const phSt = m.photo ? 'background-image:url(' + m.photo + ')' : '';
        const avCls = m.photo ? '' : 'np ' + m.gender;
        html += '<div class="mi" data-id="' + m.id + '">' +
          '<div class="ma ' + avCls + '" style="' + phSt + '">' + (m.photo ? '' : ini) + '</div>' +
          '<div class="mi-info"><div class="mn">' + esc(m.firstName) + ' ' + esc(m.lastName || '') + '</div>' +
          '<div class="ms">' + esc(sub) + '</div></div></div>';
      });
    });
  }

  renderGroup("Dad's Side", sides.paternal);
  renderGroup("Mom's Side", sides.maternal);
  renderGroup(
    sides.paternal.length || sides.maternal.length ? "Unassigned" : null,
    sides.unknown
  );

  $('memberList').innerHTML = html || '<div style="text-align:center;padding:40px 0;color:var(--t3);font-size:11px">No members yet</div>';

  const gs = {};
  state.members.forEach(m => { gs[gen(m.id)] = true; });
  $('fCount').textContent = state.members.length + ' member' + (state.members.length !== 1 ? 's' : '');
  $('fGen').textContent = Object.keys(gs).length + ' gen';
}

export function bindSidebarClicks(focusMember) {
  $('memberList').addEventListener('click', (e) => {
    const mi = e.target.closest('.mi');
    if (mi && mi.dataset.id) {
      focusMember(parseInt(mi.dataset.id));
    }
  });
}
