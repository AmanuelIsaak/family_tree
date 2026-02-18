import { $, gm, esc } from '../utils/helpers.js';
import { state, save } from '../utils/storage.js';
import { fitView } from './treeView.js';
import { COUNTRIES } from '../data/countries.js';
import { CITIES, getCityCoords } from '../data/cities.js';
import { toast } from './toast.js';

let render = null;

export function initModals(renderFn) {
  render = renderFn;

  // Populate country select
  const sel = $('fCountry');
  COUNTRIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c[0];
    opt.textContent = c[1] + ' ' + c[2];
    sel.appendChild(opt);
  });

  // Show/hide city row + populate datalist when country changes
  $('fCountry').addEventListener('change', () => {
    const code = $('fCountry').value;
    $('cityRow').style.display = code ? 'block' : 'none';
    if (!code) $('fCity').value = '';
    populateCityList(code);
  });

  // Photo handlers
  $('choosePhBtn').addEventListener('click', () => $('phIn').click());
  $('clearPhBtn').addEventListener('click', clearPh);
  $('phIn').addEventListener('change', function () { handlePh(this); });

  // Modal buttons
  $('cancelAddBtn').addEventListener('click', () => closeMd('addModal'));
  $('saveBtn').addEventListener('click', saveMember);
  $('delBtn').addEventListener('click', delMember);
  $('setMeBtn').addEventListener('click', () => {
    if (!state.editingId) return;
    if (state.egoId === state.editingId) {
      state.egoId = null;
    } else {
      state.egoId = state.editingId;
    }
    save();
    closeMd('addModal');
    render();
    // Show/hide layout toggle and auto-switch to ego mode
    const lt = $('layoutToggle');
    if (state.egoId) {
      lt.style.display = '';
      document.querySelectorAll('.lt-btn').forEach(b => b.classList.toggle('active', b.dataset.layout === 'ego'));
      document.dispatchEvent(new CustomEvent('setLayoutMode', { detail: 'ego' }));
    } else {
      lt.style.display = 'none';
      document.querySelectorAll('.lt-btn').forEach(b => b.classList.toggle('active', b.dataset.layout === 'classic'));
      document.dispatchEvent(new CustomEvent('setLayoutMode', { detail: 'classic' }));
    }
    setTimeout(fitView, 50);
  });
  $('cancelImpBtn').addEventListener('click', () => closeMd('importModal'));
  $('impBtn').addEventListener('click', doImport);
  $('fileDrop').addEventListener('click', () => $('fileIn').click());
  $('fileIn').addEventListener('change', function () { handleImpFile(this); });

  // Drag & drop
  const fd = $('fileDrop');
  fd.addEventListener('dragover', (e) => { e.preventDefault(); fd.classList.add('dov'); });
  fd.addEventListener('dragleave', () => fd.classList.remove('dov'));
  fd.addEventListener('drop', (e) => {
    e.preventDefault();
    fd.classList.remove('dov');
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.json')) {
      const dt = new DataTransfer();
      dt.items.add(f);
      $('fileIn').files = dt.files;
      handleImpFile($('fileIn'));
    } else {
      toast('Drop a .json file');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.mo.open').forEach(m => m.classList.remove('open'));
    }
  });

  // Close on backdrop click
  document.querySelectorAll('.mo').forEach(ov => {
    ov.addEventListener('click', (e) => {
      if (e.target === ov) ov.classList.remove('open');
    });
  });
}

export function openAdd(id) {
  state.editingId = id || null;
  $('mdTitle').textContent = id ? 'Edit Member' : 'Add Family Member';
  $('saveBtn').textContent = id ? 'Save' : 'Add';
  $('delBtn').style.display = id ? 'inline-block' : 'none';

  ['fP1', 'fP2', 'fSp'].forEach(s => {
    $(s).innerHTML = s === 'fP1'
      ? '<option value="">— None (Root) —</option>'
      : '<option value="">— None —</option>';
  });

  state.members.forEach(m => {
    if (m.id === id) return;
    const n = esc((m.firstName + ' ' + (m.lastName || '')).trim());
    const o = '<option value="' + m.id + '">' + n + '</option>';
    ['fP1', 'fP2', 'fSp'].forEach(s => $(s).innerHTML += o);
  });

  state.pendPh = null;

  if (id) {
    const m = gm(id);
    $('fFirst').value = m.firstName;
    $('fLast').value = m.lastName || '';
    $('fGender').value = m.gender;
    $('fBirth').value = m.birthYear || '';
    $('fCountry').value = m.country || '';
    $('fCity').value = m.city || '';
    $('cityRow').style.display = m.country ? 'block' : 'none';
    populateCityList(m.country || '');
    $('fP1').value = m.parent1Id || '';
    $('fP2').value = m.parent2Id || '';
    $('fSp').value = m.spouseId || '';
    $('fSide').value = m.side || '';
    $('fNotes').value = m.notes || '';
    state.pendPh = m.photo || null;
    if (m.photo) {
      $('phPrev').style.backgroundImage = 'url(' + m.photo + ')';
      $('phPrev').textContent = '';
      $('clearPhBtn').style.display = 'inline-block';
    } else {
      $('phPrev').style.backgroundImage = '';
      $('phPrev').textContent = '👤';
      $('clearPhBtn').style.display = 'none';
    }
  } else {
    ['fFirst', 'fLast', 'fBirth', 'fNotes'].forEach(f => $(f).value = '');
    $('fGender').value = 'male';
    $('fCountry').value = '';
    $('fCity').value = '';
    $('cityRow').style.display = 'none';
    $('fP1').value = '';
    $('fP2').value = '';
    $('fSp').value = '';
    $('fSide').value = '';
    $('phPrev').style.backgroundImage = '';
    $('phPrev').textContent = '👤';
    $('clearPhBtn').style.display = 'none';
  }

  // Show/update "Set as Me" button
  const meBtn = $('setMeBtn');
  if (id) {
    meBtn.style.display = 'inline-block';
    meBtn.textContent = state.egoId === id ? 'Unset Me' : 'Set as Me';
  } else {
    meBtn.style.display = 'none';
  }

  $('phIn').value = '';
  $('addModal').classList.add('open');
  setTimeout(() => $('fFirst').focus(), 100);
}

function populateCityList(code) {
  const dl = $('cityList');
  dl.innerHTML = '';
  const list = CITIES[code];
  if (!list) return;
  list.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c[0];
    dl.appendChild(opt);
  });
}

function closeMd(id) {
  $(id).classList.remove('open');
}

export function openImport() {
  state.impData = null;
  $('selFile').style.display = 'none';
  $('impBtn').disabled = true;
  $('fileIn').value = '';
  $('importModal').classList.add('open');
}

function handlePh(input) {
  const f = input.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      const sz = 96;
      c.width = sz;
      c.height = sz;
      const ctx = c.getContext('2d');
      const mn = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - mn) / 2, (img.height - mn) / 2, mn, mn, 0, 0, sz, sz);
      state.pendPh = c.toDataURL('image/jpeg', 0.65);
      $('phPrev').style.backgroundImage = 'url(' + state.pendPh + ')';
      $('phPrev').textContent = '';
      $('clearPhBtn').style.display = 'inline-block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(f);
}

function clearPh() {
  state.pendPh = '';
  $('phPrev').style.backgroundImage = '';
  $('phPrev').textContent = '👤';
  $('clearPhBtn').style.display = 'none';
  $('phIn').value = '';
}

function saveMember() {
  const fn = $('fFirst').value.trim();
  if (!fn) { toast('Enter a first name'); return; }

  const data = {
    firstName: fn,
    lastName: $('fLast').value.trim(),
    gender: $('fGender').value,
    birthYear: $('fBirth').value ? parseInt($('fBirth').value) : null,
    country: $('fCountry').value || '',
    city: $('fCity').value.trim(),
    cityLat: null,
    cityLng: null,
    parent1Id: $('fP1').value ? parseInt($('fP1').value) : null,
    parent2Id: $('fP2').value ? parseInt($('fP2').value) : null,
    spouseId: $('fSp').value ? parseInt($('fSp').value) : null,
    side: $('fSide').value || '',
    notes: $('fNotes').value.trim(),
    photo: state.pendPh === '' ? null : (state.pendPh || (state.editingId ? (gm(state.editingId) || {}).photo : null)) || null,
  };

  // Resolve city coordinates
  if (data.country && data.city) {
    const cc = getCityCoords(data.country, data.city);
    if (cc) { data.cityLat = cc[0]; data.cityLng = cc[1]; }
  }

  if (data.parent1Id && data.parent1Id === data.parent2Id) data.parent2Id = null;

  if (state.editingId) {
    const idx = state.members.findIndex(m => m.id === state.editingId);
    const osp = state.members[idx].spouseId;
    state.members[idx] = { ...state.members[idx], ...data };
    if (osp && osp !== data.spouseId) {
      const o = gm(osp);
      if (o && o.spouseId === state.editingId) o.spouseId = null;
    }
    if (data.spouseId) {
      const n = gm(data.spouseId);
      if (n) n.spouseId = state.editingId;
    }
    toast('Updated');
  } else {
    data.id = state.nextId++;
    state.members.push(data);
    if (data.spouseId) {
      const s = gm(data.spouseId);
      if (s) s.spouseId = data.id;
    }
    toast('Added');
  }

  save();
  closeMd('addModal');
  render();
}

function delMember() {
  if (!state.editingId || !confirm('Remove this member?')) return;
  const m = gm(state.editingId);
  if (m && m.spouseId) {
    const sp = gm(m.spouseId);
    if (sp) sp.spouseId = null;
  }
  state.members.forEach(c => {
    if (c.parent1Id === state.editingId) {
      c.parent1Id = c.parent2Id || null;
      c.parent2Id = null;
    }
    if (c.parent2Id === state.editingId) c.parent2Id = null;
  });
  state.members = state.members.filter(x => x.id !== state.editingId);
  save();
  closeMd('addModal');
  render();
  toast('Removed');
}

export function exportData() {
  const o = {
    version: 4,
    exportedAt: new Date().toISOString(),
    memberCount: state.members.length,
    members: state.members,
    nextId: state.nextId,
  };
  const b = new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = 'family-tree-' + new Date().toISOString().slice(0, 10) + '.json';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(u); }, 1000);
  toast('Exported ' + state.members.length + ' members');
}

function handleImpFile(input) {
  const f = input.files[0];
  if (!f) return;
  $('selFile').textContent = f.name;
  $('selFile').style.display = 'block';
  const r = new FileReader();
  r.onload = (e) => {
    try {
      state.impData = JSON.parse(e.target.result);
      $('impBtn').disabled = false;
    } catch (err) {
      toast('Invalid JSON');
      state.impData = null;
      $('impBtn').disabled = true;
    }
  };
  r.readAsText(f);
}

function doImport() {
  if (!state.impData) { toast('No file'); return; }
  let imp = state.impData.members || [];
  imp = imp.map(m => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName || '',
    gender: m.gender || 'male',
    birthYear: m.birthYear || null,
    parent1Id: m.parent1Id || m.parentId || null,
    parent2Id: m.parent2Id || null,
    spouseId: m.spouseId || null,
    notes: m.notes || '',
    photo: m.photo || null,
    country: m.country || '',
    city: m.city || '',
    cityLat: m.cityLat || null,
    cityLng: m.cityLng || null,
    side: m.side || '',
  }));
  if (!imp.every(m => m.id && m.firstName)) { toast('Invalid data'); return; }
  state.members = imp;
  state.nextId = state.impData.nextId || (Math.max(0, ...state.members.map(m => m.id)) + 1);
  save();
  closeMd('importModal');
  render();
  toast('Imported ' + state.members.length + ' members');
}
