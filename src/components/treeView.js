import { $, gm, pk, gen, esc, getSide, desc, getSiblings, buildAncestorChain } from '../utils/helpers.js';
import { state } from '../utils/storage.js';
import { cMap } from '../data/countries.js';

const NW = 90, NH = 34, GX = 12, GY = 46, SG = 8;

const collapsed = new Set();
let sideFilter = 'all'; // 'all' | 'paternal' | 'maternal'
let layoutMode = 'classic'; // 'classic' | 'ego'

export function setLayoutMode(mode) {
  layoutMode = mode;
  renderTree();
  fitView();
}

export function setSideFilter(side) {
  sideFilter = side;
  document.querySelectorAll('.sf-btn').forEach(b => b.classList.toggle('active', b.dataset.side === side));
  renderTree();
  fitView();
}

function mkEdge(pp, cp, sec) {
  const px = pp.x + pp.w / 2, py = pp.y + pp.h;
  const cx = cp.x + cp.w / 2, cy = cp.y;
  const my = py + (cy - py) / 2;
  return '<path d="M' + px + ',' + py + ' L' + px + ',' + my + ' L' + cx + ',' + my + ' L' + cx + ',' + cy +
    '" fill="none" stroke="var(--edge)" stroke-width="1" stroke-dasharray="' + (sec ? '2,3' : '3,3') +
    '" opacity="' + (sec ? '.3' : '.6') + '"/>';
}

function renderMM(pos) {
  const ids = Object.keys(pos);
  if (!ids.length) return;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  ids.forEach(id => {
    const p = pos[id];
    x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x + p.w); y2 = Math.max(y2, p.y + p.h);
  });
  const pd = 15;
  x1 -= pd; y1 -= pd; x2 += pd; y2 += pd;

  let ms = '<svg viewBox="' + x1 + ' ' + y1 + ' ' + (x2 - x1) + ' ' + (y2 - y1) + '" preserveAspectRatio="xMidYMid meet">';
  ids.forEach(id => {
    const p = pos[id];
    const m = gm(parseInt(id));
    const c = m && m.gender === 'female' ? 'var(--fdot)' : 'var(--mdot)';
    ms += '<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="2" fill="' + c + '" opacity=".4"/>';
  });

  const area = $('treeView').getBoundingClientRect();
  const vx = (-state.panX) / state.scale, vy = (-state.panY) / state.scale;
  const vw = area.width / state.scale, vh = area.height / state.scale;
  ms += '<rect class="mm-vp" x="' + vx + '" y="' + vy + '" width="' + vw + '" height="' + vh + '" rx="3"/></svg>';
  $('mmSvg').innerHTML = ms;
}

export function renderTree() {
  const svg = $('treeSvg');
  const empty = $('emptyState');
  const mm = $('minimap');

  if (!state.members.length) {
    svg.innerHTML = '';
    empty.style.display = 'block';
    mm.style.display = 'none';
    $('statsBar').innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  mm.style.display = 'block';

  const pos = {};
  const laid = new Set();
  const primary = new Set();

  function famKids(id) {
    const m = gm(id);
    if (!m) return [];
    let kids = pk(id);
    if (m.spouseId && !laid.has(m.spouseId)) {
      const sk = pk(m.spouseId).filter(c => !kids.find(k => k.id === c.id));
      kids = kids.concat(sk);
    }
    return kids.filter(c => !laid.has(c.id)).sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999) || a.id - b.id);
  }

  function markDescLaid(id) {
    pk(id).forEach(c => {
      if (!laid.has(c.id)) {
        laid.add(c.id);
        const cm = gm(c.id);
        if (cm && cm.spouseId && !laid.has(cm.spouseId)) {
          const sp = gm(cm.spouseId);
          if (sp && !sp.parent1Id) laid.add(cm.spouseId);
        }
        markDescLaid(c.id);
      }
    });
  }

  function meas(id) {
    if (laid.has(id)) return 0;
    const m = gm(id);
    if (!m) return 0;
    const hs = m.spouseId && gm(m.spouseId) && !laid.has(m.spouseId);
    const sw = hs ? NW * 2 + SG : NW;
    if (collapsed.has(id)) return sw;
    laid.add(id);
    if (hs) laid.add(m.spouseId);
    const kids = famKids(id);
    let cw = 0;
    kids.forEach((c, i) => { if (i > 0) cw += GX; cw += meas(c.id); });
    laid.delete(id);
    if (hs) laid.delete(m.spouseId);
    return Math.max(sw, cw);
  }

  function lay(id, x, y) {
    if (laid.has(id)) return;
    const m = gm(id);
    if (!m) return;
    laid.add(id);
    primary.add(id);
    const hs = m.spouseId && gm(m.spouseId) && !laid.has(m.spouseId);
    if (hs) laid.add(m.spouseId);

    if (collapsed.has(id)) {
      const sx = x;
      pos[id] = { x: sx, y, w: NW, h: NH };
      if (hs) pos[m.spouseId] = { x: sx + NW + SG, y, w: NW, h: NH };
      markDescLaid(id);
      if (hs) markDescLaid(m.spouseId);
      return;
    }

    const kids = famKids(id);
    const cws = kids.map(c => meas(c.id));
    let tcw = 0;
    cws.forEach((w, i) => { if (i > 0) tcw += GX; tcw += w; });
    const sw = hs ? NW * 2 + SG : NW;
    const tw = Math.max(sw, tcw);
    const sx = x + (tw - sw) / 2;
    pos[id] = { x: sx, y, w: NW, h: NH };
    if (hs) pos[m.spouseId] = { x: sx + NW + SG, y, w: NW, h: NH };
    let cx = x + (tw - tcw) / 2;
    kids.forEach((c) => { const cw = meas(c.id); lay(c.id, cx, y + NH + GY); cx += cw + GX; });
  }

  // ===== EGO LAYOUT =====
  function egoLayout() {
    const ego = gm(state.egoId);
    if (!ego) return false;

    let fatherId = ego.parent1Id;
    let motherId = ego.parent2Id;
    if (!motherId && fatherId) { const fa = gm(fatherId); if (fa && fa.spouseId) motherId = fa.spouseId; }
    if (!fatherId && motherId) { const mo = gm(motherId); if (mo && mo.spouseId) fatherId = mo.spouseId; }
    if (!fatherId && !motherId) return false;

    // Ego siblings (same parents, sorted by birth year)
    const egoSibSet = new Set();
    if (fatherId) pk(fatherId).forEach(c => { if (c.id !== state.egoId) egoSibSet.add(c.id); });
    if (motherId) pk(motherId).forEach(c => { if (c.id !== state.egoId) egoSibSet.add(c.id); });
    const egoSibs = [...egoSibSet].map(id => gm(id)).filter(Boolean)
      .sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999) || a.id - b.id);
    const egoRow = [...egoSibs, ego].sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999) || a.id - b.id);

    // Aunts/uncles
    const dadSibs = fatherId ? getSiblings(fatherId) : [];
    const momSibs = motherId ? getSiblings(motherId) : [];

    // Ancestor chains (paternal & maternal)
    const patAncs = fatherId ? buildAncestorChain(fatherId) : [];
    const matAncs = motherId ? buildAncestorChain(motherId) : [];
    const maxAncLevels = Math.max(patAncs.length, matAncs.length);

    const ROW_H = NH + GY;
    const MARGIN = 40;

    // Measure subtree widths
    const dadSibW = dadSibs.map(s => meas(s.id));
    const momSibW = momSibs.map(s => meas(s.id));
    const egoRowW = egoRow.map(s => meas(s.id));

    const totalDadW = dadSibW.reduce((a, w, i) => a + w + (i > 0 ? GX : 0), 0);
    const totalMomW = momSibW.reduce((a, w, i) => a + w + (i > 0 ? GX : 0), 0);
    const totalEgoW = egoRowW.reduce((a, w, i) => a + w + (i > 0 ? GX : 0), 0);

    // Gap between couple and sibling subtrees (large enough to avoid cousin/sibling overlap)
    const sideGap = Math.max(GX * 3, totalEgoW / 2 - NW + GX * 3);

    // Y levels
    const egoY = MARGIN + (maxAncLevels + 2) * ROW_H;
    const parentY = egoY - ROW_H;
    const gpY = egoY - 2 * ROW_H;

    // Couple center X: place couple to the right of all paternal siblings
    const coupleCenter = MARGIN + totalDadW + (dadSibs.length ? sideGap + NW + SG / 2 : NW / 2);
    const fatherX = coupleCenter - NW - SG / 2;
    const motherX = coupleCenter + SG / 2;

    // Place parents
    if (fatherId) { pos[fatherId] = { x: fatherX, y: parentY, w: NW, h: NH }; laid.add(fatherId); primary.add(fatherId); }
    if (motherId) { pos[motherId] = { x: motherX, y: parentY, w: NW, h: NH }; laid.add(motherId); primary.add(motherId); }

    // Place ego row (ego + siblings) centered under couple
    const egoRowStartX = coupleCenter - totalEgoW / 2;
    let sx = egoRowStartX;
    egoRow.forEach((sib, i) => {
      if (!laid.has(sib.id)) lay(sib.id, sx, egoY);
      sx += egoRowW[i] + GX;
    });

    // Place dad's siblings LEFT of dad (closest sibling nearest dad, going outward)
    let leftX = fatherX - sideGap;
    for (let i = dadSibs.length - 1; i >= 0; i--) {
      const sib = dadSibs[i];
      if (!laid.has(sib.id)) { const sibX = leftX - dadSibW[i]; lay(sib.id, sibX, parentY); leftX = sibX - GX; }
      else leftX -= dadSibW[i] + GX;
    }

    // Place mom's siblings RIGHT of mom
    let rightX = motherX + NW + sideGap;
    momSibs.forEach((sib, i) => {
      if (!laid.has(sib.id)) { lay(sib.id, rightX, parentY); }
      rightX += momSibW[i] + GX;
    });

    // Place paternal grandparents (centered above paternal cluster)
    if (patAncs.length > 0) {
      // Bounding box of paternal side at parentY
      let patL = fatherX + NW, patR = fatherX;
      Object.keys(pos).forEach(idStr => {
        const p = pos[idStr];
        if (p.y === parentY && p.x + p.w <= fatherX + NW + 1) { patL = Math.min(patL, p.x); patR = Math.max(patR, p.x + p.w); }
      });
      const patGPC = (patL + patR) / 2;
      patAncs.forEach((anc, gi) => {
        const ancY = gpY - gi * ROW_H;
        if (!laid.has(anc.id)) {
          pos[anc.id] = { x: patGPC - NW / 2, y: ancY, w: NW, h: NH };
          laid.add(anc.id); primary.add(anc.id);
        }
        if (anc.spouseId && !laid.has(anc.spouseId)) {
          const ax = pos[anc.id] ? pos[anc.id].x : patGPC - NW / 2;
          pos[anc.spouseId] = { x: ax + NW + SG, y: ancY, w: NW, h: NH };
          laid.add(anc.spouseId);
        }
      });
    }

    // Place maternal grandparents (centered above maternal cluster)
    if (matAncs.length > 0) {
      let matL = motherX + NW, matR = motherX;
      Object.keys(pos).forEach(idStr => {
        const p = pos[idStr];
        if (p.y === parentY && p.x >= motherX - 1) { matL = Math.min(matL, p.x); matR = Math.max(matR, p.x + p.w); }
      });
      const matGPC = (matL + matR) / 2;
      matAncs.forEach((anc, gi) => {
        const ancY = gpY - gi * ROW_H;
        if (!laid.has(anc.id)) {
          pos[anc.id] = { x: matGPC - NW / 2, y: ancY, w: NW, h: NH };
          laid.add(anc.id); primary.add(anc.id);
        }
        if (anc.spouseId && !laid.has(anc.spouseId)) {
          const ax = pos[anc.id] ? pos[anc.id].x : matGPC - NW / 2;
          pos[anc.spouseId] = { x: ax + NW + SG, y: ancY, w: NW, h: NH };
          laid.add(anc.spouseId);
        }
      });
    }

    // Orphans at the bottom
    const maxY = Object.values(pos).length ? Math.max(...Object.values(pos).map(p => p.y + p.h)) + ROW_H : MARGIN;
    let orphX = MARGIN;
    state.members.forEach(m => {
      if (!laid.has(m.id)) { pos[m.id] = { x: orphX, y: maxY, w: NW, h: NH }; laid.add(m.id); orphX += NW + GX; }
    });

    return true;
  }

  // ===== RUN LAYOUT =====
  if (layoutMode === 'ego' && state.egoId) {
    if (!egoLayout()) {
      // fallback to classic if ego layout fails (no parents)
      layoutMode = 'classic';
    }
  }

  // Variables used in draw section (set by classic layout)
  let patEnd = 0, matStart = 0, showPat = true, showMat = true;
  let patRoots = [], matRoots = [];

  if (layoutMode !== 'ego' || !state.egoId) {
  // Group roots by side
  const spR = new Set();
  state.members.forEach(m => {
    if (m.spouseId) {
      const sp = gm(m.spouseId);
      if (sp && !sp.parent1Id && pk(sp.id).length === 0) spR.add(sp.id);
    }
  });
  const roots = state.members.filter(m => !m.parent1Id && !spR.has(m.id));

  patRoots = roots.filter(r => getSide(r) === 'paternal').sort((a, b) => desc(b.id) - desc(a.id));
  matRoots = roots.filter(r => getSide(r) === 'maternal').sort((a, b) => desc(b.id) - desc(a.id));
  const unkRoots = roots.filter(r => { const s = getSide(r); return s !== 'paternal' && s !== 'maternal'; }).sort((a, b) => desc(b.id) - desc(a.id));

  // Apply side filter
  showPat = sideFilter === 'all' || sideFilter === 'paternal';
  showMat = sideFilter === 'all' || sideFilter === 'maternal';
  const showUnk = sideFilter === 'all';

  // Measure each side's total width independently
  let patW = 0, matW = 0, unkW = 0;
  if (showPat) patRoots.forEach((r, i) => { if (i > 0) patW += GX * 3; patW += meas(r.id); });
  if (showMat) matRoots.forEach((r, i) => { if (i > 0) matW += GX * 3; matW += meas(r.id); });
  if (showUnk) unkRoots.forEach((r, i) => { if (i > 0) unkW += GX * 3; unkW += meas(r.id); });

  // Independent centering: get viewport width, distribute sides with equal weight
  const area = $('treeView').getBoundingClientRect();
  const vpW = area.width / (state.scale || 1);
  const SIDE_GAP = 100;
  const activeSides = (showPat && patRoots.length ? 1 : 0) + (showMat && matRoots.length ? 1 : 0);

  let tx;
  if (sideFilter !== 'all' || activeSides <= 1) {
    // Single side or filtered: center it
    const totalW = patW + matW + unkW;
    tx = Math.max(40, (vpW - totalW) / 2);
  } else {
    // Both sides: give each side its own half with centering
    const halfVp = vpW / 2;
    const patStart = Math.max(40, halfVp - patW - SIDE_GAP / 2);
    tx = patStart;
  }

  patEnd = tx;
  if (showPat) {
    patRoots.forEach(r => { if (laid.has(r.id)) return; const w = meas(r.id); lay(r.id, tx, 40); tx += w + GX * 3; });
    patEnd = tx;
  }

  if (showPat && patRoots.length && ((showMat && matRoots.length) || (showUnk && unkRoots.length))) {
    if (activeSides === 2) {
      // Jump to the right half for maternal side
      const halfVp = vpW / 2;
      tx = Math.max(tx + 60, halfVp + SIDE_GAP / 2);
    } else {
      tx += 60;
    }
  }

  matStart = tx;
  if (showMat) {
    matRoots.forEach(r => { if (laid.has(r.id)) return; const w = meas(r.id); lay(r.id, tx, 40); tx += w + GX * 3; });
  }

  if (showUnk && unkRoots.length && (patRoots.length || matRoots.length)) tx += 40;
  if (showUnk) {
    unkRoots.forEach(r => { if (laid.has(r.id)) return; const w = meas(r.id); lay(r.id, tx, 40); tx += w + GX * 3; });
  }

  // Orphans (only in "all" mode)
  if (sideFilter === 'all') {
    state.members.forEach(m => {
      if (!laid.has(m.id)) {
        pos[m.id] = { x: tx, y: 40, w: NW, h: NH };
        laid.add(m.id);
        tx += NW + GX;
      }
    });
  }
  } // end classic layout

  state.lastPos = pos;

  // ===== DRAW =====
  let s = '<g transform="translate(' + state.panX + ',' + state.panY + ') scale(' + state.scale + ')">';

  // Side labels
  if (layoutMode === 'ego' && state.egoId) {
    // Ego mode: label each side
    const ego = gm(state.egoId);
    if (ego && pos[state.egoId]) {
      const ep = pos[state.egoId];
      s += '<text x="' + (ep.x + NW / 2) + '" y="' + (ep.y - 8) + '" text-anchor="middle" font-family="Instrument Serif,serif" font-size="11" fill="var(--acc)" font-style="italic">you</text>';
    }
    // Find x bounds for paternal and maternal sides
    const allPosVals = Object.keys(pos);
    let patMinX = Infinity, matMaxX = -Infinity;
    if (ego && ego.parent1Id && pos[ego.parent1Id]) {
      const fatherX = pos[ego.parent1Id].x;
      allPosVals.forEach(id => { if (pos[id].x <= fatherX) patMinX = Math.min(patMinX, pos[id].x); });
    }
    if (ego && (ego.parent2Id || (ego.parent1Id && gm(ego.parent1Id) && gm(ego.parent1Id).spouseId))) {
      const motherId = ego.parent2Id || (ego.parent1Id ? gm(ego.parent1Id).spouseId : null);
      if (motherId && pos[motherId]) {
        const motherX = pos[motherId].x;
        allPosVals.forEach(id => { if (pos[id].x >= motherX) matMaxX = Math.max(matMaxX, pos[id].x + NW); });
      }
    }
    const allYVals = Object.values(pos);
    const topY = allYVals.length ? Math.min(...allYVals.map(p => p.y)) : 40;
    if (patMinX < Infinity) s += '<text x="' + patMinX + '" y="' + (topY - 8) + '" font-family="Instrument Serif,serif" font-size="13" fill="var(--t3)" font-style="italic">Paternal</text>';
    if (matMaxX > -Infinity) s += '<text x="' + matMaxX + '" y="' + (topY - 8) + '" text-anchor="end" font-family="Instrument Serif,serif" font-size="13" fill="var(--t3)" font-style="italic">Maternal</text>';
  } else {
    if (showPat && patRoots.length) {
      const px = patRoots[0] && pos[patRoots[0].id] ? pos[patRoots[0].id].x : 40;
      s += '<text x="' + px + '" y="26" font-family="Instrument Serif,serif" font-size="13" fill="var(--t3)" font-style="italic">Dad\'s Side</text>';
    }
    if (showMat && matRoots.length) {
      let mx = Infinity;
      matRoots.forEach(r => { if (pos[r.id]) mx = Math.min(mx, pos[r.id].x); });
      if (mx < Infinity) s += '<text x="' + mx + '" y="26" font-family="Instrument Serif,serif" font-size="13" fill="var(--t3)" font-style="italic">Mom\'s Side</text>';
    }
  }

  // Side divider (classic mode only, "all" mode with both sides)
  if (layoutMode !== 'ego' && sideFilter === 'all' && patRoots.length && matRoots.length) {
    let minY = Infinity, maxY = -Infinity;
    Object.values(pos).forEach(p => { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y + p.h); });
    const divX = (patEnd + matStart) / 2;
    s += '<line x1="' + divX + '" y1="' + (minY - 10) + '" x2="' + divX + '" y2="' + (maxY + 20) + '" stroke="var(--brd)" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>';
  }

  // Edges
  state.members.forEach(m => {
    if (m.parent1Id && pos[m.id] && pos[m.parent1Id]) s += mkEdge(pos[m.parent1Id], pos[m.id], false);
    if (m.parent2Id && pos[m.id] && pos[m.parent2Id]) s += mkEdge(pos[m.parent2Id], pos[m.id], true);
  });

  // Spouse lines
  const dsp = new Set();
  state.members.forEach(m => {
    if (m.spouseId && pos[m.id] && pos[m.spouseId]) {
      const k = Math.min(m.id, m.spouseId) + '-' + Math.max(m.id, m.spouseId);
      if (dsp.has(k)) return;
      dsp.add(k);
      const a = pos[m.id], b = pos[m.spouseId];
      const d = Math.abs((a.x + a.w / 2) - (b.x + b.w / 2));
      if (d < NW * 3) {
        const x1 = a.x < b.x ? a.x + a.w : a.x;
        const x2 = a.x < b.x ? b.x : b.x + b.w;
        const my = (a.y + a.h / 2 + b.y + b.h / 2) / 2;
        s += '<line x1="' + x1 + '" y1="' + my + '" x2="' + x2 + '" y2="' + my + '" stroke="var(--spline)" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.6"/>';
        s += '<text x="' + ((x1 + x2) / 2) + '" y="' + (my + 3) + '" text-anchor="middle" font-size="8" fill="var(--spline)">\u2665</text>';
      } else {
        s += '<path d="M' + (a.x + a.w / 2) + ',' + a.y + ' Q' + ((a.x + a.w / 2 + b.x + b.w / 2) / 2) + ',' + (Math.min(a.y, b.y) - 20) + ' ' + (b.x + b.w / 2) + ',' + b.y + '" fill="none" stroke="var(--spline)" stroke-width="1" stroke-dasharray="3,3" opacity="0.35"/>';
      }
    }
  });

  // Cross-side connection lines: spouse appears on one side, their parents on the other
  if (sideFilter === 'all') {
    state.members.forEach(m => {
      if (!m.spouseId || !m.parent1Id) return;
      if (!pos[m.id]) return;
      const mySide = getSide(m);
      const sp = gm(m.spouseId);
      if (!sp || !pos[m.spouseId]) return;
      const spSide = getSide(sp);
      // If my parent is on the other side from where I'm displayed (as a spouse)
      const parent = gm(m.parent1Id);
      if (!parent || !pos[m.parent1Id]) return;
      const parentSide = getSide(parent);
      // Draw cross-side arc if the member is placed as spouse on the opposite side from their parent
      if (parentSide && spSide && parentSide !== spSide) {
        const from = pos[m.id];
        const to = pos[m.parent1Id];
        const fromX = from.x + from.w / 2, fromY = from.y;
        const toX = to.x + to.w / 2, toY = to.y + to.h;
        const cpY = Math.min(fromY, toY) - 40;
        s += '<path d="M' + fromX + ',' + fromY + ' C' + fromX + ',' + cpY + ' ' + toX + ',' + cpY + ' ' + toX + ',' + toY +
          '" fill="none" stroke="var(--acc)" stroke-width="1" stroke-dasharray="4,3" opacity="0.35"/>';
        // Small label at the midpoint
        const midX = (fromX + toX) / 2, midY = cpY + 8;
        s += '<text x="' + midX + '" y="' + midY + '" text-anchor="middle" font-family="Geist,sans-serif" font-size="7" fill="var(--acc)" opacity="0.5">\u2194</text>';
      }
    });
  }

  // Nodes + collapse toggles
  state.members.forEach(m => {
    if (!pos[m.id]) return;
    const p = pos[m.id];
    const dc = m.gender === 'female' ? 'var(--fdot)' : 'var(--mdot)';
    const lbl = m.firstName + (m.lastName ? ' ' + m.lastName[0] + '.' : '');
    const det = [];
    if (m.birthYear) det.push('b.' + m.birthYear);
    if (m.country && cMap[m.country]) det.push(cMap[m.country].flag + (m.city ? ' ' + m.city : ''));
    const detStr = det.join(' ');

    const isEgo = m.id === state.egoId;
    s += '<g class="nd" data-id="' + m.id + '" style="cursor:pointer">';
    if (isEgo) {
      s += '<rect x="' + (p.x - 3) + '" y="' + (p.y - 3) + '" width="' + (NW + 6) + '" height="' + (NH + 6) + '" rx="8" fill="var(--acc)" opacity="0.15"/>';
    }
    s += '<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="5" fill="var(--nbg)" stroke="' + (isEgo ? 'var(--acc)' : 'var(--nbrd)') + '" stroke-width="' + (isEgo ? '1.5' : '1') + '"/>';

    if (m.photo) {
      s += '<defs><clipPath id="cp' + m.id + '"><circle cx="' + (p.x + 12) + '" cy="' + (p.y + p.h / 2) + '" r="8"/></clipPath></defs>';
      s += '<image href="' + m.photo + '" x="' + (p.x + 4) + '" y="' + (p.y + p.h / 2 - 8) + '" width="16" height="16" clip-path="url(#cp' + m.id + ')" preserveAspectRatio="xMidYMid slice"/>';
      s += '<circle cx="' + (p.x + 12) + '" cy="' + (p.y + p.h / 2) + '" r="8" fill="none" stroke="var(--nbrd)" stroke-width=".5"/>';
    } else {
      s += '<circle cx="' + (p.x + 10) + '" cy="' + (p.y + p.h / 2) + '" r="2.5" fill="' + dc + '"/>';
    }

    const tX = m.photo ? p.x + 25 : p.x + 17;
    s += '<text x="' + tX + '" y="' + (p.y + p.h / 2 - (detStr ? 2 : 0)) + '" font-family="Geist,sans-serif" font-size="9" font-weight="600" fill="var(--t0)" dominant-baseline="middle">' + esc(lbl) + '</text>';
    if (detStr) s += '<text x="' + tX + '" y="' + (p.y + p.h / 2 + 8) + '" font-family="Geist,sans-serif" font-size="7" fill="var(--t2)" dominant-baseline="middle">' + detStr + '</text>';
    s += '</g>';

    // Collapse/expand toggle for primary nodes with descendants
    const kidCount = desc(m.id);
    if (primary.has(m.id) && kidCount > 0) {
      const isCol = collapsed.has(m.id);
      const togY = p.y + p.h + 3;
      const hasSp = m.spouseId && pos[m.spouseId];
      const togCx = hasSp
        ? (p.x + pos[m.spouseId].x + pos[m.spouseId].w) / 2
        : p.x + p.w / 2;
      const label = isCol ? '+' + kidCount : '\u2212';
      const togW = isCol ? Math.max(24, String(kidCount).length * 6 + 18) : 16;

      s += '<g class="tog" data-toggle="' + m.id + '" style="cursor:pointer">';
      if (isCol) {
        s += '<rect x="' + (togCx - togW / 2) + '" y="' + togY + '" width="' + togW + '" height="13" rx="6.5" fill="var(--accbg)" stroke="var(--accbd)" stroke-width="0.8"/>';
        s += '<text x="' + togCx + '" y="' + (togY + 9.5) + '" text-anchor="middle" font-family="Geist,sans-serif" font-size="8" font-weight="700" fill="var(--acc)">' + label + '</text>';
      } else {
        s += '<rect x="' + (togCx - togW / 2) + '" y="' + togY + '" width="' + togW + '" height="13" rx="6.5" fill="var(--bg2)" stroke="var(--brd)" stroke-width="0.6"/>';
        s += '<text x="' + togCx + '" y="' + (togY + 9.5) + '" text-anchor="middle" font-family="Geist,sans-serif" font-size="9" font-weight="600" fill="var(--t3)">' + label + '</text>';
      }
      s += '</g>';
    }
  });

  s += '</g>';
  svg.innerHTML = s;

  // Node click events
  svg.querySelectorAll('.nd').forEach(n => {
    n.addEventListener('click', function (e) {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('openEdit', { detail: parseInt(this.dataset.id) }));
    });
    n.addEventListener('mouseenter', function () {
      this.querySelector('rect').setAttribute('stroke', 'var(--acc)');
    });
    n.addEventListener('mouseleave', function () {
      const id = parseInt(this.dataset.id);
      this.querySelector('rect').setAttribute('stroke', id === state.egoId ? 'var(--acc)' : 'var(--nbrd)');
    });
  });

  // Toggle click events
  svg.querySelectorAll('.tog').forEach(t => {
    t.addEventListener('click', function (e) {
      e.stopPropagation();
      const id = parseInt(this.dataset.toggle);
      if (collapsed.has(id)) collapsed.delete(id);
      else collapsed.add(id);
      renderTree();
    });
  });

  // Stats
  const gs = {};
  state.members.forEach(m => { gs[gen(m.id)] = true; });
  const couples = state.members.filter(m => m.spouseId && m.id < m.spouseId).length;
  const countries = new Set(state.members.filter(m => m.country).map(m => m.country)).size;
  $('statsBar').innerHTML =
    '<div class="st-chip"><b>' + state.members.length + '</b> members</div>' +
    '<div class="st-chip"><b>' + Object.keys(gs).length + '</b> gen</div>' +
    '<div class="st-chip"><b>' + couples + '</b> couples</div>' +
    (countries ? '<div class="st-chip"><b>' + countries + '</b> countries</div>' : '');

  renderMM(pos);
}

export function fitView() {
  const ids = Object.keys(state.lastPos);
  if (!ids.length) return;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  ids.forEach(id => {
    const p = state.lastPos[id];
    x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x + p.w); y2 = Math.max(y2, p.y + p.h);
  });
  const area = $('treeView').getBoundingClientRect();
  const pd = 50;
  const tw = x2 - x1 + pd * 2, th = y2 - y1 + pd * 2;
  state.scale = Math.min(area.width / tw, area.height / th, 1.5);
  state.scale = Math.max(0.08, state.scale);
  state.panX = (area.width - (x2 + x1) * state.scale) / 2;
  state.panY = (area.height - (y2 + y1) * state.scale) / 2;
  renderTree();
}

export function zoomIn() {
  state.scale = Math.min(5, state.scale * 1.25);
  renderTree();
}

export function zoomOut() {
  state.scale = Math.max(0.06, state.scale * 0.8);
  renderTree();
}

export function collapseAll() {
  state.members.forEach(m => collapsed.add(m.id));
  renderTree();
  fitView();
}

export function expandAll() {
  collapsed.clear();
  renderTree();
  fitView();
}

export function initTreePanZoom() {
  const ca = $('treeView');

  ca.addEventListener('mousedown', (e) => {
    if (e.target.closest('.nd') || e.target.closest('.tog') || e.target.closest('.cb') || e.target.closest('.mm') || e.target.closest('.sf-btn') || e.target.closest('.lt-btn')) return;
    state.isPan = true;
    state.psx = e.clientX - state.panX;
    state.psy = e.clientY - state.panY;
    ca.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.isPan) return;
    state.panX = e.clientX - state.psx;
    state.panY = e.clientY - state.psy;
    renderTree();
  });

  window.addEventListener('mouseup', () => {
    state.isPan = false;
    const ca = $('treeView');
    if (ca) ca.style.cursor = '';
  });

  ca.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = ca.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const o = state.scale;
    state.scale = Math.max(0.06, Math.min(5, state.scale * (e.deltaY > 0 ? 0.9 : 1.1)));
    state.panX = mx - (mx - state.panX) * (state.scale / o);
    state.panY = my - (my - state.panY) * (state.scale / o);
    renderTree();
  }, { passive: false });

  $('minimap').addEventListener('click', (e) => {
    const ids = Object.keys(state.lastPos);
    if (!ids.length) return;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    ids.forEach(id => {
      const p = state.lastPos[id];
      x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y);
      x2 = Math.max(x2, p.x + p.w); y2 = Math.max(y2, p.y + p.h);
    });
    const rect = e.currentTarget.getBoundingClientRect();
    const pd = 15;
    const tw = x2 - x1 + pd * 2, th = y2 - y1 + pd * 2;
    const wx = (x1 - pd) + (e.clientX - rect.left) / rect.width * tw;
    const wy = (y1 - pd) + (e.clientY - rect.top) / rect.height * th;
    const area = $('treeView').getBoundingClientRect();
    state.panX = area.width / 2 - wx * state.scale;
    state.panY = area.height / 2 - wy * state.scale;
    renderTree();
  });
}
