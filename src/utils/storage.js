export const state = {
  members: [],
  editingId: null,
  nextId: 1,
  egoId: null,
  pendPh: null,
  impData: null,
  panX: 0,
  panY: 0,
  scale: 1,
  isPan: false,
  psx: 0,
  psy: 0,
  lastPos: {},
};

export function save() {
  try {
    localStorage.setItem('ft_v4', JSON.stringify({
      members: state.members,
      nextId: state.nextId,
      egoId: state.egoId,
    }));
  } catch (e) { /* ignore */ }
}

export function load() {
  try {
    let r = localStorage.getItem('ft_v4');
    if (r) {
      const d = JSON.parse(r);
      state.members = d.members || [];
      state.nextId = d.nextId || 1;
      state.egoId = d.egoId || null;
      return;
    }
    // migrate older versions
    for (const key of ['ft_v3', 'familyTreeData_v2', 'familyTreeData']) {
      r = localStorage.getItem(key);
      if (r) {
        const d = JSON.parse(r);
        const old = d.members || [];
        state.members = old.map(m => ({
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
        state.nextId = d.nextId || 1;
        save();
        return;
      }
    }
  } catch (e) { /* ignore */ }
}
