import { $, esc } from '../utils/helpers.js';
import { state } from '../utils/storage.js';
import { cMap } from '../data/countries.js';
import { COORDS } from '../data/land.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let map = null;
let tileLayer = null;
let markerLayer = null;
let activeCountryCode = null;

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function isDark() {
  return document.documentElement.dataset.theme === 'dark';
}

function memberCoords(m) {
  if (m.cityLat != null && m.cityLng != null) return [m.cityLat, m.cityLng];
  if (m.country && COORDS[m.country]) return COORDS[m.country];
  return null;
}

export function initMapPanZoom() {
  map = L.map('leafletMap', {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 10,
    zoomControl: false,
    worldCopyJump: true,
    attributionControl: true,
  });

  tileLayer = L.tileLayer(isDark() ? DARK_TILES : LIGHT_TILES, {
    attribution: TILE_ATTR,
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  // Delegated click for map panel items
  $('mpList').addEventListener('click', (e) => {
    const tag = e.target.closest('.cc-tag');
    if (tag && tag.dataset.focus) {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('focusMember', { detail: parseInt(tag.dataset.focus) }));
      return;
    }
    const item = e.target.closest('.mp-item');
    if (item && item.dataset.country) {
      selectCountryInPanel(item.dataset.country);
    }
  });
}

export function renderWorldMap() {
  if (!map || !markerLayer) return;
  markerLayer.clearLayers();

  // Group members by location key: "CC" for country-only, "CC:CityName" for city-level
  const byLocation = {};
  state.members.forEach(m => {
    if (!m.country || !COORDS[m.country]) return;
    const key = m.city && m.cityLat != null ? m.country + ':' + m.city : m.country;
    if (!byLocation[key]) byLocation[key] = [];
    byLocation[key].push(m);
  });

  Object.entries(byLocation).forEach(([key, list]) => {
    const code = key.split(':')[0];
    const cityName = key.includes(':') ? key.split(':').slice(1).join(':') : null;
    const c = cMap[code];
    if (!c) return;

    // Use city coords if available, else country center
    const coord = memberCoords(list[0]);
    if (!coord) return;

    const single = list.length === 1;
    let label;
    if (cityName) {
      label = single
        ? list[0].firstName + (list[0].lastName ? ' ' + list[0].lastName[0] + '.' : '')
        : cityName + ' ' + list.length;
    } else {
      label = single
        ? list[0].firstName + (list[0].lastName ? ' ' + list[0].lastName[0] + '.' : '')
        : (c.flag + ' ' + list.length);
    }

    const dotHTML = single
      ? '<div class="pin-dot"></div>'
      : '<div class="pin-dot multi">' + list.length + '</div>';

    const html = '<div class="pin-wrap">' +
      '<div class="pin-pulse"></div>' +
      dotHTML +
      '<div class="pin-label">' + esc(label) + '</div>' +
      '</div>';

    const icon = L.divIcon({
      className: 'pin-icon',
      html: html,
      iconSize: [40, 36],
      iconAnchor: [20, 14],
    });

    const heading = cityName
      ? '<span style="font-size:22px;vertical-align:middle">' + c.flag + '</span> <b style="font-size:12px">' + esc(cityName) + '</b><div style="font-size:9px;color:var(--t3)">' + esc(c.name) + '</div>'
      : '<span style="font-size:22px;vertical-align:middle">' + c.flag + '</span> <b style="font-size:12px">' + esc(c.name) + '</b>';

    const popupContent = '<div style="text-align:center;padding:2px 0">' +
      heading +
      '<div style="margin-top:4px;font-size:10px;color:var(--t2)">' +
      list.map(m => esc(m.firstName) + (m.city && !cityName ? ' <span style="color:var(--t3)">(' + esc(m.city) + ')</span>' : '')).join(', ') +
      '</div></div>';

    const marker = L.marker([coord[0], coord[1]], { icon })
      .bindPopup(popupContent, { closeButton: false, offset: [0, -4] })
      .on('click', () => {
        selectCountryInPanel(code);
      });

    markerLayer.addLayer(marker);
  });
}

function selectCountryInPanel(code) {
  activeCountryCode = activeCountryCode === code ? null : code;
  renderMapPanel();

  // Fly to the selected country
  if (activeCountryCode && COORDS[activeCountryCode] && map) {
    const coord = COORDS[activeCountryCode];
    map.flyTo([coord[0], coord[1]], 5, { duration: 0.8 });
  }
}

export function renderMapPanel() {
  const byCountry = {};
  const noCountry = [];
  state.members.forEach(m => {
    if (m.country && cMap[m.country]) {
      if (!byCountry[m.country]) byCountry[m.country] = [];
      byCountry[m.country].push(m);
    } else {
      noCountry.push(m);
    }
  });

  const sorted = Object.entries(byCountry).sort((a, b) => b[1].length - a[1].length);
  $('mpCount').textContent = sorted.length + ' countries';

  let html = '';
  sorted.forEach(([code, list]) => {
    const c = cMap[code];
    const isA = activeCountryCode === code;
    html += '<div class="mp-item' + (isA ? ' active' : '') + '" data-country="' + code + '">';
    html += '<div class="mp-flag">' + c.flag + '</div><div class="mp-info"><div class="mp-name">' + esc(c.name) + '</div>';
    html += '<div class="mp-sub">' + list.map(m => m.firstName + (m.city ? ' (' + m.city + ')' : '')).join(', ') + '</div></div>';
    html += '<div class="mp-num">' + list.length + '</div></div>';
    if (isA) {
      // Group by city within country
      const byCityMap = {};
      const noCity = [];
      list.forEach(m => {
        if (m.city) {
          if (!byCityMap[m.city]) byCityMap[m.city] = [];
          byCityMap[m.city].push(m);
        } else {
          noCity.push(m);
        }
      });

      html += '<div class="mp-members">';
      Object.entries(byCityMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([city, members]) => {
        html += '<div style="font-size:9px;color:var(--t3);margin:4px 2px 2px;font-weight:600">' + esc(city) + '</div>';
        members.forEach(m => {
          html += '<span class="cc-tag" data-focus="' + m.id + '">' + esc(m.firstName + (m.lastName ? ' ' + m.lastName[0] + '.' : '')) + '</span>';
        });
      });
      if (noCity.length) {
        if (Object.keys(byCityMap).length) {
          html += '<div style="font-size:9px;color:var(--t3);margin:4px 2px 2px;font-weight:600">No city set</div>';
        }
        noCity.forEach(m => {
          html += '<span class="cc-tag" data-focus="' + m.id + '">' + esc(m.firstName + (m.lastName ? ' ' + m.lastName[0] + '.' : '')) + '</span>';
        });
      }
      html += '</div>';
    }
  });

  $('mpList').innerHTML = html || '<div style="padding:20px;text-align:center;font-size:11px;color:var(--t3)">No countries assigned yet</div>';

  if (noCountry.length) {
    $('mpUnset').style.display = 'block';
    $('mpUnset').innerHTML = '<b>' + noCountry.length + '</b> without country';
  } else {
    $('mpUnset').style.display = 'none';
  }

  $('mapDesc').textContent = sorted.length + ' countries \u00b7 ' + state.members.filter(m => m.country).length + ' members located';
}

export function fitMapView() {
  if (!map) return;
  map.invalidateSize();

  const coords = [];
  state.members.forEach(m => {
    const c = memberCoords(m);
    if (c) coords.push(c);
  });

  if (coords.length > 0) {
    map.fitBounds(L.latLngBounds(coords).pad(0.3), { maxZoom: 6, animate: true });
  } else {
    map.setView([20, 0], 2);
  }
}

export function updateMapTheme() {
  if (!tileLayer || !map) return;
  tileLayer.setUrl(isDark() ? DARK_TILES : LIGHT_TILES);
}
