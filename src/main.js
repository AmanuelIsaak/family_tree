import './style.css';

import { $ } from './utils/helpers.js';
import { state, load } from './utils/storage.js';
import { initTheme, toggleTheme } from './components/theme.js';
import { renderList, bindSidebarClicks } from './components/sidebar.js';
import { renderTree, fitView, zoomIn, zoomOut, initTreePanZoom, collapseAll, expandAll, setSideFilter, setLayoutMode } from './components/treeView.js';
import { renderWorldMap, renderMapPanel, fitMapView, initMapPanZoom, updateMapTheme } from './components/mapView.js';
import { initModals, openAdd, openImport, exportData } from './components/modals.js';

// ===== RENDER =====
function render() {
  renderList();
  renderTree();
}

// ===== TAB SWITCHING =====
function switchTab(t) {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === t));
  $('treeView').classList.toggle('active', t === 'tree');
  $('mapView').classList.toggle('active', t === 'map');
  if (t === 'map') {
    setTimeout(() => {
      fitMapView();
      renderWorldMap();
      renderMapPanel();
    }, 60);
  }
  if (t === 'tree') renderTree();
}

// ===== FOCUS MEMBER =====
function focusMember(id) {
  switchTab('tree');
  if (state.lastPos && state.lastPos[id]) {
    const p = state.lastPos[id];
    const area = $('treeView').getBoundingClientRect();
    state.scale = 1.2;
    state.panX = (area.width / 2) - (p.x + p.w / 2) * state.scale;
    state.panY = (area.height / 2) - (p.y + p.h / 2) * state.scale;
    renderTree();
  }
  openAdd(id);
}

// ===== INIT =====
initTheme();
initModals(render);
initTreePanZoom();
initMapPanZoom();

// Bind sidebar clicks
bindSidebarClicks(focusMember);

// Bind search
$('searchIn').addEventListener('input', renderList);

// Bind tab clicks
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// Bind header buttons
$('themeBtn').addEventListener('click', () => { toggleTheme(renderTree); updateMapTheme(); });
$('addBtn').addEventListener('click', () => openAdd());
$('exportBtn').addEventListener('click', exportData);
$('importBtn').addEventListener('click', openImport);

// Bind zoom controls
$('zoomInBtn').addEventListener('click', zoomIn);
$('zoomOutBtn').addEventListener('click', zoomOut);
$('fitBtn').addEventListener('click', fitView);
$('colAllBtn').addEventListener('click', collapseAll);
$('expAllBtn').addEventListener('click', expandAll);

// Bind side filter buttons
document.querySelectorAll('.sf-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setSideFilter(btn.dataset.side);
  });
});

// Bind layout toggle buttons
document.querySelectorAll('.lt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lt-btn').forEach(b => b.classList.toggle('active', b.dataset.layout === btn.dataset.layout));
    setLayoutMode(btn.dataset.layout);
  });
});

// Custom events for cross-component communication
document.addEventListener('openEdit', (e) => openAdd(e.detail));
document.addEventListener('focusMember', (e) => focusMember(e.detail));
document.addEventListener('setLayoutMode', (e) => setLayoutMode(e.detail));

// Load data and render
load();
// Show layout toggle if ego is already set
if (state.egoId) {
  $('layoutToggle').style.display = '';
}
render();
if (state.members.length > 0) setTimeout(fitView, 50);
