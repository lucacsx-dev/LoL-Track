/* ═══════════════════════════════════════════════════════════
   LoL Tracker — Vanilla JS Frontend
   Connects to the Express backend (server.js)
   ═══════════════════════════════════════════════════════════ */

// ─── State ───
const state = {
  summoners: [],
  selectedSummonerId: null,
  matches: [],
  stats: null,
  settings: null,
  drills: [],
  champions: [],
  championsList: [],
  progress: null,
  advancedStats: [],
  performance: [],
  runePresets: [],
  drillCategories: [],
  isLoading: true,
  isSyncing: false,
  activeTab: 'matches',
  selectedLane: 'ALL',
  selectedChampion: 'ALL',
  deleteTargetId: null,
  championsSort: { key: 'games', direction: 'desc' },
  laneSettings: {
    topKillMultiplier: 0.5,
    topAssistMultiplier: 0.85,
    jungleKillMultiplier: 0.5,
    jungleAssistMultiplier: 0.85,
    midKillMultiplier: 0.5,
    midAssistMultiplier: 0.85,
    adcKillMultiplier: 0.5,
    adcAssistMultiplier: 0.85,
    supportKillMultiplier: 0.5,
    supportAssistMultiplier: 0.85,
  },
  syncDays: 30,
};

// ─── Constants ───
const LANE_COLORS = {
  TOP: '#f97316',
  JUNGLE: '#22c55e',
  MID: '#3b82f6',
  ADC: '#ef4444',
  SUPPORT: '#a855f7',
};

const LANE_ICONS_SVG = {
  TOP: '<svg class="icon" viewBox="0 0 24 24"><path d="M20 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2"/><path d="M2 17.5 20 20"/><path d="M20 4 2 22"/></svg>',
  JUNGLE: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  MID: '<svg class="icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  ADC: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  SUPPORT: '<svg class="icon" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
};

const LANE_LABELS = { TOP: 'TOP', JUNGLE: 'JUNGLE', MID: 'MID', ADC: 'ADC', SUPPORT: 'SUPPORT' };

// Chart instances
let chartWinRate = null;
let chartKDR = null;

// ─── Utility Functions ───
async function safeFetch(path, options) {
  const isLocalFile = window.location.protocol === 'file:';
  const API_BASE_URL = isLocalFile ? 'http://localhost:3000' : '';
  const url = path.startsWith('/') ? API_BASE_URL + path : path;

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
  }
  return res.json();
}

function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 3000);
}

function getProfileIconUrl(iconId) {
  if (!iconId) return 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/29.png';
  const version = state.settings?.dataDragonVersion || '14.1.1';
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
}

function getChampionImageUrl(championName) {
  const version = state.settings?.dataDragonVersion || '14.1.1';
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Dialog Helpers ───
function openDialog(id) {
  document.getElementById(id).style.display = 'flex';
}

function closeDialog(id) {
  document.getElementById(id).style.display = 'none';
}

// ─── Render Functions ───

function renderSummoners() {
  const list = document.getElementById('summoner-list');
  if (state.summoners.length === 0) {
    list.innerHTML = '<p class="text-sm text-muted" style="padding:0.5rem;">Nessun evocatore aggiunto</p>';
    return;
  }

  list.innerHTML = state.summoners.map(s => {
    const isActive = state.selectedSummonerId === s.id;
    const syncDate = s.lastSyncAt
      ? `Sync: ${new Date(s.lastSyncAt).toLocaleDateString('it-IT')}`
      : 'Mai sincronizzato';
    return `
      <div class="summoner-card ${isActive ? 'active' : ''}" data-id="${s.id}">
        <div class="summoner-top">
          <img class="summoner-avatar" src="${getProfileIconUrl(s.profileIconId)}"
               alt="${escapeHtml(s.summonerName)}"
               onerror="this.src='https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/29.png'" />
          <div class="summoner-info">
            <p class="summoner-name">${escapeHtml(s.summonerName)}</p>
            <p class="summoner-tag">#${escapeHtml(s.tagLine)}</p>
          </div>
          <span class="badge badge-secondary">${s._count?.matches || 0}</span>
        </div>
        <div class="summoner-bottom">
          <span class="summoner-sync-date">${syncDate}</span>
          <div class="summoner-actions">
            <button class="btn btn-ghost btn-icon summoner-sync-btn" data-id="${s.id}" title="Sincronizza" ${s.isSyncing ? 'disabled' : ''}>
              <svg class="icon ${s.isSyncing ? 'icon-spin' : ''}" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon destructive-text summoner-delete-btn" data-id="${s.id}" data-name="${escapeHtml(s.summonerName)}#${escapeHtml(s.tagLine)}" title="Elimina">
              <svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Event listeners
  list.querySelectorAll('.summoner-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.summoner-sync-btn') || e.target.closest('.summoner-delete-btn')) return;
      state.selectedSummonerId = card.dataset.id;
      onSummonerChange();
    });
  });

  list.querySelectorAll('.summoner-sync-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedSummonerId = btn.dataset.id;
      openDialog('dialog-sync');
    });
  });

  list.querySelectorAll('.summoner-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.deleteTargetId = btn.dataset.id;
      document.getElementById('delete-summoner-text').textContent =
        `Sei sicuro di voler eliminare ${btn.dataset.name}? Tutte le partite associate verranno eliminate.`;
      openDialog('dialog-delete-summoner');
    });
  });
}

function renderMainView() {
  const empty = document.getElementById('empty-state');
  const dashboard = document.getElementById('dashboard');

  if (!state.selectedSummonerId) {
    empty.style.display = 'flex';
    dashboard.style.display = 'none';
  } else {
    empty.style.display = 'none';
    dashboard.style.display = 'flex';
  }
}

function renderMatches() {
  const loading = document.getElementById('matches-loading');
  const emptyEl = document.getElementById('matches-empty');
  const tableWrapper = document.getElementById('matches-table-wrapper');
  const countEl = document.getElementById('matches-count');
  const tbody = document.getElementById('matches-tbody');

  if (state.isLoading) {
    loading.style.display = 'flex';
    emptyEl.style.display = 'none';
    tableWrapper.style.display = 'none';
    return;
  }

  loading.style.display = 'none';

  if (state.matches.length === 0) {
    emptyEl.style.display = 'block';
    tableWrapper.style.display = 'none';
    countEl.textContent = '0 partite trovate';
    return;
  }

  emptyEl.style.display = 'none';
  tableWrapper.style.display = 'block';
  countEl.textContent = `${state.matches.length} partite trovate`;

  tbody.innerHTML = state.matches.map((m, i) => {
    const laneColor = LANE_COLORS[m.lane] || '#888';
    const laneIcon = LANE_ICONS_SVG[m.lane] || '';
    return `
      <tr class="${m.win ? 'row-win' : 'row-loss'}" style="animation: fadeInUp 0.2s ease ${i * 0.02}s both;">
        <td>
          <span class="badge ${m.win ? 'badge-win' : 'badge-destructive'}">${m.win ? 'W' : 'L'}</span>
        </td>
        <td>
          <div class="champion-cell">
            <img class="champion-img" src="${getChampionImageUrl(m.championName)}"
                 alt="${escapeHtml(m.championName)}"
                 onerror="this.style.display='none'" />
            <span class="champion-name">${escapeHtml(m.championName)}</span>
          </div>
        </td>
        <td>
          <span class="badge badge-outline" style="border-color:${laneColor};color:${laneColor};">
            ${laneIcon}
            <span style="margin-left:0.25rem;">${m.lane}</span>
          </span>
        </td>
        <td class="text-center">
          <span class="text-green">${m.kills}</span><span class="text-muted">/</span><span class="text-red">${m.deaths}</span><span class="text-muted">/</span><span class="text-blue">${m.assists}</span>
        </td>
        <td class="text-center">${m.cs}</td>
        <td class="text-center">${m.gold.toLocaleString()}</td>
        <td class="text-center">${m.durationFormatted}</td>
        <td class="text-center">
          <span class="${m.kdr >= 0 ? 'text-green' : 'text-red'}">${m.kdr.toFixed(2)}</span>
        </td>
        <td class="text-center">${m.csPerMin.toFixed(2)}</td>
        <td class="text-center">${m.goldPerMin.toFixed(0)}</td>
      </tr>
    `;
  }).join('');

  // Populate champion filter
  updateChampionFilter();
}

function updateChampionFilter() {
  const sel = document.getElementById('filter-champion');
  const uniqueChamps = [...new Set(state.matches.map(m => m.championName))].sort();
  const currentVal = sel.value;

  // Only update if options changed
  const existingOpts = Array.from(sel.options).map(o => o.value).filter(v => v !== 'ALL');
  const same = existingOpts.length === uniqueChamps.length && existingOpts.every((v, i) => v === uniqueChamps[i]);
  if (same) return;

  sel.innerHTML = '<option value="ALL">Tutti</option>';
  uniqueChamps.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });

  if (uniqueChamps.includes(currentVal)) {
    sel.value = currentVal;
  }
}

function renderStats() {
  if (!state.stats) return;
  const s = state.stats.overall;

  document.getElementById('stat-winrate').textContent = `${s.winRate.toFixed(1)}%`;
  document.getElementById('stat-winrate-bar').style.width = `${s.winRate}%`;
  document.getElementById('stat-wl').textContent = `${s.wins}W / ${s.losses}L`;

  const kdrEl = document.getElementById('stat-kdr');
  kdrEl.textContent = s.avgKDR.toFixed(2);
  kdrEl.className = `stat-value ${s.avgKDR >= 0 ? 'text-green' : 'text-red'}`;

  document.getElementById('stat-csmin').textContent = s.avgCSPerMin.toFixed(2);
  document.getElementById('stat-duration').textContent = `${s.avgDuration} min`;

  document.getElementById('stat-avg-kills').textContent = s.avgKills.toFixed(1);
  document.getElementById('stat-avg-deaths').textContent = s.avgDeaths.toFixed(1);
  document.getElementById('stat-avg-assists').textContent = s.avgAssists.toFixed(1);
  document.getElementById('stat-kda-ratio').textContent =
    `${((s.avgKills + s.avgAssists) / Math.max(s.avgDeaths, 1)).toFixed(2)}:1`;

  renderCharts();
  renderChampionsTable();
  renderLanesCards();
}

function renderCharts() {
  if (!state.stats) return;

  // Win Rate Over Time chart
  const wrCanvas = document.getElementById('chart-winrate');
  const wrEmpty = document.getElementById('chart-winrate-empty');
  const wrData = state.stats.winRateOverTime || [];

  if (wrData.length === 0) {
    wrCanvas.style.display = 'none';
    wrEmpty.style.display = 'flex';
  } else {
    wrCanvas.style.display = 'block';
    wrEmpty.style.display = 'none';

    if (chartWinRate) chartWinRate.destroy();
    chartWinRate = new Chart(wrCanvas, {
      type: 'line',
      data: {
        labels: wrData.map(d => {
          const dt = new Date(d.date);
          return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}`;
        }),
        datasets: [{
          label: 'Win Rate',
          data: wrData.map(d => d.winRate),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#22c55e',
          pointRadius: 4,
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0, max: 100,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#a1a1aa' },
          },
          x: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#a1a1aa' },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a1f',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#fafafa',
            bodyColor: '#a1a1aa',
          },
        },
      },
    });
  }

  // KDR Distribution chart
  const kdrCanvas = document.getElementById('chart-kdr');
  const kdrData = state.stats.kdaDistribution || [];

  if (chartKDR) chartKDR.destroy();
  chartKDR = new Chart(kdrCanvas, {
    type: 'bar',
    data: {
      labels: kdrData.map(d => d.range),
      datasets: [{
        label: 'Count',
        data: kdrData.map(d => d.count),
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#a1a1aa' },
        },
        x: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#a1a1aa' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a1f',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#fafafa',
          bodyColor: '#a1a1aa',
        },
      },
    },
  });
}

function renderChampionsTable() {
  if (!state.stats || !state.stats.byChampion) return;

  const tbody = document.getElementById('champions-tbody');
  const empty = document.getElementById('champions-empty');
  const wrapper = document.getElementById('champions-table-wrapper');

  if (state.stats.byChampion.length === 0) {
    empty.style.display = 'block';
    wrapper.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  wrapper.style.display = 'block';

  const sorted = getSortedChampions(state.stats.byChampion, state.championsSort);

  tbody.innerHTML = sorted.map(c => `
    <tr>
      <td>
        <div class="champion-cell">
          <img class="champion-img" src="${getChampionImageUrl(c.championName)}"
               alt="${escapeHtml(c.championName)}"
               onerror="this.style.display='none'" />
          <span class="champion-name">${escapeHtml(c.championName)}</span>
        </div>
      </td>
      <td class="text-center">${c.games}</td>
      <td class="text-center">
        <span class="badge ${c.winRate >= 50 ? 'badge-win' : 'badge-destructive'}">${c.winRate.toFixed(0)}%</span>
      </td>
      <td class="text-center">
        <span class="text-green">${c.avgKills.toFixed(1)}</span><span class="text-muted">/</span><span class="text-red">${c.avgDeaths.toFixed(1)}</span><span class="text-muted">/</span><span class="text-blue">${c.avgAssists.toFixed(1)}</span>
      </td>
      <td class="text-center">${c.avgCS.toFixed(0)}</td>
      <td class="text-center">${c.avgCSPerMin.toFixed(2)}</td>
      <td class="text-center">
        <span class="${c.avgKDR >= 0 ? 'text-green' : 'text-red'}">${c.avgKDR.toFixed(2)}</span>
      </td>
    </tr>
  `).join('');

  // Update sort indicators
  document.querySelectorAll('#tab-champions .sortable').forEach(th => {
    const key = th.dataset.sort;
    th.classList.remove('sort-active', 'sort-asc', 'sort-desc');
    if (state.championsSort.key === key && state.championsSort.direction) {
      th.classList.add('sort-active');
      th.classList.add(state.championsSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

function getSortedChampions(champions, sortConfig) {
  if (!sortConfig.key || !sortConfig.direction) return champions;

  return [...champions].sort((a, b) => {
    let aVal, bVal;

    switch (sortConfig.key) {
      case 'championName':
        aVal = a.championName.toLowerCase();
        bVal = b.championName.toLowerCase();
        break;
      case 'games': aVal = a.games; bVal = b.games; break;
      case 'winRate': aVal = a.winRate; bVal = b.winRate; break;
      case 'avgKills': aVal = a.avgKills; bVal = b.avgKills; break;
      case 'avgDeaths': aVal = a.avgDeaths; bVal = b.avgDeaths; break;
      case 'avgAssists': aVal = a.avgAssists; bVal = b.avgAssists; break;
      case 'avgCS': aVal = a.avgCS; bVal = b.avgCS; break;
      case 'avgCSPerMin': aVal = a.avgCSPerMin; bVal = b.avgCSPerMin; break;
      case 'avgKDR': aVal = a.avgKDR; bVal = b.avgKDR; break;
      default: return 0;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
  });
}

function renderLanesCards() {
  if (!state.stats || !state.stats.byLane) return;

  const grid = document.getElementById('lanes-grid');

  if (state.stats.byLane.length === 0) {
    grid.innerHTML = '<div class="empty-tab">Nessuna statistica per lane disponibile</div>';
    return;
  }

  grid.innerHTML = state.stats.byLane.map(lane => {
    const color = LANE_COLORS[lane.lane] || '#888';
    const icon = LANE_ICONS_SVG[lane.lane] || '';
    return `
      <div class="card">
        <div class="card-header" style="padding-bottom:0.75rem;">
          <div class="lane-card-header">
            <span style="color:${color}">${icon}</span>
            <h4 class="card-title" style="color:${color}">${lane.lane}</h4>
          </div>
          <p class="card-description">${lane.games} partite</p>
        </div>
        <div class="card-content" style="padding-top:0;">
          <div style="margin-bottom:0.5rem;">
            <div style="display:flex;justify-content:space-between;font-size:0.875rem;margin-bottom:0.25rem;">
              <span>Win Rate</span>
              <span style="font-weight:500;">${lane.winRate.toFixed(1)}%</span>
            </div>
            <div class="progress-bar" style="height:0.375rem;">
              <div class="progress-fill" style="width:${lane.winRate}%;background:${color};"></div>
            </div>
          </div>
          <div class="lane-stat-grid">
            <div>
              <p class="lane-stat-value text-green">${lane.avgKills.toFixed(1)}</p>
              <p class="lane-stat-label">Kills</p>
            </div>
            <div>
              <p class="lane-stat-value text-red">${lane.avgDeaths.toFixed(1)}</p>
              <p class="lane-stat-label">Deaths</p>
            </div>
            <div>
              <p class="lane-stat-value text-blue">${lane.avgAssists.toFixed(1)}</p>
              <p class="lane-stat-label">Assists</p>
            </div>
          </div>
          <div class="separator"></div>
          <div class="lane-detail-grid">
            <div>
              <p class="lane-detail-label">CS/min</p>
              <p class="lane-detail-value">${lane.avgCSPerMin.toFixed(2)}</p>
            </div>
            <div>
              <p class="lane-detail-label">KDR</p>
              <p class="lane-detail-value ${lane.avgKDR >= 0 ? 'text-green' : 'text-red'}">${lane.avgKDR.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderDrills() {
  const empty = document.getElementById('drills-empty');
  const wrapper = document.getElementById('drills-table-wrapper');
  const tbody = document.getElementById('drills-tbody');

  if (state.drills.length === 0) {
    empty.style.display = 'block';
    wrapper.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  wrapper.style.display = 'block';

  tbody.innerHTML = state.drills.map(d => `
    <tr>
      <td>${new Date(d.date).toLocaleDateString('it-IT')}</td>
      <td>${escapeHtml(d.champion) || '-'}</td>
      <td class="text-center">${d.csDrill != null ? d.csDrill : '-'}</td>
      <td class="text-center">${d.minute != null ? d.minute : '-'}</td>
      <td class="text-center">${d.csDrill != null && d.minute ? (d.csDrill / d.minute).toFixed(2) : '-'}</td>
      <td>${escapeHtml(d.focus) || '-'}</td>
      <td>${escapeHtml(d.mode) || '-'}</td>
      <td>
        <button class="btn btn-ghost btn-icon destructive-text drill-delete-btn" data-id="${d.id}" title="Elimina">
          <svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.drill-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteDrill(btn.dataset.id));
  });
}

function renderSettingsDialog() {
  const body = document.getElementById('settings-body');
  const lanes = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  body.innerHTML = lanes.map(lane => {
    const killKey = `${lane.toLowerCase()}KillMultiplier`;
    const assistKey = `${lane.toLowerCase()}AssistMultiplier`;
    const color = LANE_COLORS[lane];
    const icon = LANE_ICONS_SVG[lane];
    return `
      <div class="settings-lane-card">
        <div class="settings-lane-header" style="color:${color}">
          ${icon}
          <span>${lane}</span>
        </div>
        <div class="settings-lane-inputs">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label text-xs">Moltiplicatore Kill</label>
            <input class="input settings-input" type="number" step="0.05"
                   data-key="${killKey}" value="${state.laneSettings[killKey]}" />
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label text-xs">Moltiplicatore Assist</label>
            <input class="input settings-input" type="number" step="0.05"
                   data-key="${assistKey}" value="${state.laneSettings[assistKey]}" />
          </div>
        </div>
      </div>
    `;
  }).join('') + `
    <div class="settings-separator"></div>
    <div class="form-group">
      <label class="form-label">Giorni di default per sincronizzazione iniziale</label>
      <input class="input" id="settings-sync-days" type="number" value="${state.syncDays}" />
    </div>
  `;
}

function renderProgress() {
  if (!state.progress) {
    document.getElementById('progress-completion').textContent = '0%';
    document.getElementById('progress-done').textContent = '0';
    document.getElementById('progress-missing').textContent = '0';
    document.getElementById('progress-available').textContent = '0';
    document.getElementById('progress-bar-fill').style.width = '0%';
    document.getElementById('progress-formula').textContent = 'Done / (Done + Missing) = 0 / 0 = 0%';
    return;
  }

  const { completionPercent, done, missing, championAvailable } = state.progress;

  document.getElementById('progress-completion').textContent = `${completionPercent}%`;
  document.getElementById('progress-done').textContent = done;
  document.getElementById('progress-missing').textContent = missing;
  document.getElementById('progress-available').textContent = championAvailable;
  document.getElementById('progress-bar-fill').style.width = `${completionPercent}%`;
  document.getElementById('progress-formula').textContent =
    `Done / Champion Available = ${done} / ${championAvailable} = ${completionPercent}%`;
}

function renderChampionsTracker() {
  const empty = document.getElementById('champions-tracker-empty');
  const wrapper = document.getElementById('champions-tracker-wrapper');
  const grid = document.getElementById('champions-grid');

  const roleFilter = document.getElementById('filter-champion-role')?.value || 'ALL';
  const statusFilter = document.getElementById('filter-champion-status')?.value || 'ALL';

  if (state.championsList.length === 0) {
    empty.style.display = 'block';
    wrapper.style.display = 'none';
    return;
  }

  // Filter champions
  let filtered = state.championsList;

  if (roleFilter !== 'ALL') {
    filtered = filtered.filter(c => {
      const roles = (c.roles || '').toUpperCase();
      return roles.includes(roleFilter);
    });
  }

  if (statusFilter === 'TRACKED') {
    filtered = filtered.filter(c => c.tracked === 1);
  } else if (statusFilter === 'UNTRACKED') {
    filtered = filtered.filter(c => c.tracked !== 1);
  }

  if (filtered.length === 0) {
    empty.style.display = 'block';
    wrapper.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  wrapper.style.display = 'block';

  grid.innerHTML = filtered.map(c => {
    const roles = c.roles ? c.roles.split(',').map(r => r.trim()) : [];
    const tracked = c.tracked === 1;

    return `
      <div class="champion-card ${tracked ? 'tracked' : ''}" data-id="${c.id}">
        <div class="champion-card-header">
          <img class="champion-card-img" src="${getChampionImageUrl(c.name)}"
               alt="${escapeHtml(c.name)}"
               onerror="this.style.display='none'" />
          <span class="champion-card-name">${escapeHtml(c.name)}</span>
          ${tracked ? '<span class="tracked-badge">✔</span>' : ''}
        </div>
        <div class="champion-card-roles">
          ${roles.map(r => `<span class="champion-card-role ${r.toLowerCase()}">${r}</span>`).join('')}
        </div>
        <div class="champion-card-actions">
          <button class="btn btn-ghost btn-icon champion-track-btn" data-id="${c.id}" data-tracked="${tracked}" title="${tracked ? 'Rimuovi tracciamento' : 'Traccia'}">
            <svg class="icon" viewBox="0 0 24 24">
              ${tracked
        ? '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'
        : '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'
      }
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners for track buttons
  grid.querySelectorAll('.champion-track-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const tracked = btn.dataset.tracked === 'true';
      handleToggleChampionTracked(id, tracked);
    });
  });
}

// ─── Fetch Functions ───

let syncPollInterval = null;

function checkPolling() {
  const isAnySyncing = state.summoners.some(s => s.isSyncing);
  if (isAnySyncing && !syncPollInterval) {
    syncPollInterval = setInterval(async () => {
      await fetchSummoners(true);
      if (state.selectedSummonerId) {
        await fetchMatches(true);
        await fetchStats(true);
      }
    }, 3000);
  } else if (!isAnySyncing && syncPollInterval) {
    clearInterval(syncPollInterval);
    syncPollInterval = null;
    if (state.selectedSummonerId) {
      fetchMatches(true);
      fetchStats(true);
    }
  }
}

async function fetchSummoners(silent = false) {
  try {
    const data = await safeFetch('/api/summoners');
    state.summoners = data;
    if (data.length > 0 && !state.selectedSummonerId) {
      state.selectedSummonerId = data[0].id;
    }
    renderSummoners();
    if (!silent) renderMainView();
    checkPolling();
  } catch (error) {
    console.error('Error fetching summoners:', error);
    if (!silent) toast('Errore nel caricamento degli evocatori', 'error');
  }
}

async function fetchMatches(silent = false) {
  if (!state.selectedSummonerId) return;
  if (!silent) {
    state.isLoading = true;
    renderMatches();
  }
  try {
    const params = new URLSearchParams({
      summonerId: state.selectedSummonerId,
      lane: state.selectedLane,
      champion: state.selectedChampion,
    });
    const data = await safeFetch(`/api/matches?${params}`);
    state.matches = data.matches || [];
  } catch (error) {
    console.error('Error fetching matches:', error);
    if (!silent) toast('Errore nel caricamento delle partite', 'error');
  } finally {
    if (!silent) {
      state.isLoading = false;
    }
    renderMatches();
  }
}

async function fetchStats(silent = false) {
  if (!state.selectedSummonerId) return;
  try {
    const params = new URLSearchParams({
      summonerId: state.selectedSummonerId,
      lane: state.selectedLane,
      champion: state.selectedChampion,
    });
    const data = await safeFetch(`/api/stats?${params}`);
    state.stats = data;
    if (data.settings) {
      state.laneSettings = data.settings;
    }
    renderStats();
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

async function fetchSettings() {
  try {
    const data = await safeFetch('/api/settings');
    state.settings = data;
    state.syncDays = data.defaultSyncDays || 30;
    state.laneSettings = {
      topKillMultiplier: data.topKillMultiplier,
      topAssistMultiplier: data.topAssistMultiplier,
      jungleKillMultiplier: data.jungleKillMultiplier,
      jungleAssistMultiplier: data.jungleAssistMultiplier,
      midKillMultiplier: data.midKillMultiplier,
      midAssistMultiplier: data.midAssistMultiplier,
      adcKillMultiplier: data.adcKillMultiplier,
      adcAssistMultiplier: data.adcAssistMultiplier,
      supportKillMultiplier: data.supportKillMultiplier,
      supportAssistMultiplier: data.supportAssistMultiplier,
    };
  } catch (error) {
    console.error('Error fetching settings:', error);
  }
}

async function fetchDrills() {
  if (!state.selectedSummonerId) return;
  try {
    const data = await safeFetch(`/api/drills?summonerId=${state.selectedSummonerId}`);
    state.drills = data;
    renderDrills();
  } catch (error) {
    console.error('Error fetching drills:', error);
  }
}

async function fetchChampions() {
  try {
    const data = await safeFetch('/api/datadragon');
    state.champions = data.champions || [];
  } catch (error) {
    console.error('Error fetching champions:', error);
  }
}

async function fetchChampionsList() {
  try {
    const data = await safeFetch('/api/champions');
    state.championsList = data || [];
  } catch (error) {
    console.error('Error fetching champions list:', error);
  }
}

async function fetchProgress() {
  if (!state.selectedSummonerId) return;
  try {
    const data = await safeFetch(`/api/progress?summonerId=${state.selectedSummonerId}`);
    state.progress = data;
  } catch (error) {
    console.error('Error fetching progress:', error);
  }
}

async function fetchAdvancedStats() {
  if (!state.selectedSummonerId) return;
  try {
    const data = await safeFetch(`/api/advanced-stats?summonerId=${state.selectedSummonerId}`);
    state.advancedStats = data.stats || [];
  } catch (error) {
    console.error('Error fetching advanced stats:', error);
  }
}

async function fetchPerformance() {
  if (!state.selectedSummonerId) return;
  try {
    const data = await safeFetch(`/api/performance?summonerId=${state.selectedSummonerId}`);
    state.performance = data.performance || [];
    state.performanceTotals = data.totals || {};
  } catch (error) {
    console.error('Error fetching performance:', error);
  }
}

async function fetchRunePresets() {
  try {
    const data = await safeFetch('/api/rune-presets');
    state.runePresets = data || [];
  } catch (error) {
    console.error('Error fetching rune presets:', error);
  }
}

async function fetchDrillCategories() {
  try {
    const data = await safeFetch('/api/drill-categories');
    state.drillCategories = data || [];
  } catch (error) {
    console.error('Error fetching drill categories:', error);
  }
}

async function handleSyncChampions() {
  try {
    const data = await safeFetch('/api/champions/sync', { method: 'POST' });
    toast(data.message);
    await fetchChampionsList();
  } catch (error) {
    console.error('Error syncing champions:', error);
    toast('Errore nella sincronizzazione dei campioni', 'error');
  }
}

async function handleToggleChampionTracked(id, currentTracked) {
  try {
    await safeFetch(`/api/champions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracked: !currentTracked }),
    });
    await fetchChampionsList();
    await fetchProgress();
    toast('Campione aggiornato');
  } catch (error) {
    console.error('Error toggling champion:', error);
    toast('Errore nell\'aggiornamento del campione', 'error');
  }
}

// ─── Action Handlers ───

async function handleAddSummoner() {
  const nameInput = document.getElementById('input-summoner-name');
  const tagInput = document.getElementById('input-summoner-tag');
  const name = nameInput.value.trim();
  const tag = tagInput.value.trim().toUpperCase();

  if (!name || !tag) {
    toast("Inserisci nome e tag dell'evocatore", 'error');
    return;
  }

  try {
    const data = await safeFetch('/api/summoners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName: name, tagLine: tag }),
    });

    toast(`Evocatore ${data.summonerName}#${data.tagLine} aggiunto!`);
    nameInput.value = '';
    tagInput.value = '';
    closeDialog('dialog-add-summoner');
    state.selectedSummonerId = data.id;
    await fetchSummoners();
    onSummonerChange();
  } catch (error) {
    console.error('Error adding summoner:', error);
    toast(error.message || "Errore nell'aggiunta dell'evocatore", 'error');
  }
}

async function handleDeleteSummoner() {
  if (!state.deleteTargetId) return;

  try {
    await safeFetch('/api/summoners', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: state.deleteTargetId }),
    });

    toast('Evocatore rimosso');
    closeDialog('dialog-delete-summoner');

    if (state.selectedSummonerId === state.deleteTargetId) {
      state.selectedSummonerId = state.summoners.find(s => s.id !== state.deleteTargetId)?.id || null;
    }
    state.deleteTargetId = null;
    await fetchSummoners();
    onSummonerChange();
  } catch (error) {
    console.error('Error deleting summoner:', error);
    toast("Errore nell'eliminazione dell'evocatore", 'error');
  }
}

async function handleSync(isIncremental = false) {
  if (!state.selectedSummonerId) return;

  state.isSyncing = true;
  renderSummoners();
  const syncBtn = document.getElementById('btn-sync');
  if (syncBtn) syncBtn.disabled = true;

  try {
    const body = {
      summonerId: state.selectedSummonerId,
      count: 100,
      incremental: isIncremental,
    };
    if (!isIncremental) {
      body.days = state.syncDays;
    }

    const data = await safeFetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    toast(data.message);
    closeDialog('dialog-sync');
    fetchSummoners(); // This will start polling if isSyncing evaluates to true
  } catch (error) {
    console.error('Error syncing:', error);
    toast(error.message || 'Errore nella sincronizzazione', 'error');
  } finally {
    state.isSyncing = false;
    renderSummoners();
    if (syncBtn) syncBtn.disabled = false;
  }
}

async function handleSaveSettings() {
  // Read values from dialog
  const inputs = document.querySelectorAll('.settings-input');
  inputs.forEach(input => {
    state.laneSettings[input.dataset.key] = parseFloat(input.value) || 0.5;
  });
  const syncDaysInput = document.getElementById('settings-sync-days');
  if (syncDaysInput) {
    state.syncDays = parseInt(syncDaysInput.value) || 30;
  }

  try {
    await safeFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...state.laneSettings,
        defaultSyncDays: state.syncDays,
      }),
    });

    toast('Impostazioni salvate');
    closeDialog('dialog-settings');
    fetchSettings();
    fetchStats();
  } catch (error) {
    console.error('Error saving settings:', error);
    toast('Errore nel salvataggio delle impostazioni', 'error');
  }
}

async function handleAddDrill() {
  if (!state.selectedSummonerId) return;

  const form = {
    summonerId: state.selectedSummonerId,
    csDrill: parseInt(document.getElementById('drill-cs').value) || null,
    minute: parseInt(document.getElementById('drill-minute').value) || null,
    mode: document.getElementById('drill-mode').value,
    champion: document.getElementById('drill-champion').value,
    focus: document.getElementById('drill-focus').value,
    runes: document.getElementById('drill-runes').value,
    runeShard: document.getElementById('drill-runeshard').value,
    notes: document.getElementById('drill-notes').value,
  };

  try {
    await safeFetch('/api/drills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    toast('Drill aggiunto!');
    closeDialog('dialog-add-drill');
    // Reset form
    document.getElementById('drill-cs').value = '';
    document.getElementById('drill-minute').value = '10';
    document.getElementById('drill-mode').value = 'Practice Tool';
    document.getElementById('drill-champion').value = '';
    document.getElementById('drill-focus').value = '';
    document.getElementById('drill-runes').value = '';
    document.getElementById('drill-runeshard').value = '';
    document.getElementById('drill-notes').value = '';
    fetchDrills();
  } catch (error) {
    console.error('Error adding drill:', error);
    toast("Errore nell'aggiunta del drill", 'error');
  }
}

// ─── Export / Import Handlers ───

async function handleExport() {
  try {
    const data = await safeFetch('/api/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `lol-tracker-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Dati esportati con successo!');
  } catch (error) {
    console.error('Error exporting:', error);
    toast("Errore nell'esportazione dei dati", 'error');
  }
}

async function handleImport() {
  document.getElementById('import-file-input').click();
}

async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate structure
    if (!data.version || !data.summoners) {
      throw new Error('Formato file non valido');
    }

    const result = await safeFetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    toast(result.message || 'Dati importati con successo!');

    // Refresh all data
    await fetchSummoners();
    if (state.selectedSummonerId) {
      await fetchMatches();
      await fetchStats();
      await fetchDrills();
    }
  } catch (error) {
    console.error('Error importing:', error);
    toast(error.message || "Errore nell'importazione dei dati", 'error');
  }

  // Reset input
  event.target.value = '';
}

async function handleDeleteDrill(id) {
  try {
    await safeFetch('/api/drills', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    toast('Drill eliminato');
    fetchDrills();
  } catch (error) {
    console.error('Error deleting drill:', error);
    toast("Errore nell'eliminazione del drill", 'error');
  }
}

// ─── Event Handlers / Lifecycle ───

function onSummonerChange() {
  renderSummoners();
  renderMainView();
  if (state.selectedSummonerId) {
    fetchMatches();
    fetchStats();
    fetchDrills();
    fetchProgress();
    fetchAdvancedStats();
    fetchPerformance();
    fetchChampionsList();
  }
}

function switchTab(tabName) {
  state.activeTab = tabName;

  // Update triggers
  document.querySelectorAll('.tab-trigger').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });

  // Update content
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `tab-${tabName}`);
  });

  // Re-render charts when stats tab becomes active
  if (tabName === 'stats' && state.stats) {
    requestAnimationFrame(() => renderCharts());
  }

  // Render progress tab
  if (tabName === 'progress') {
    renderProgress();
  }

  // Render champions tracker tab
  if (tabName === 'champions-tracker') {
    renderChampionsTracker();
  }
}

// ─── Initialize ───

function initEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => switchTab(trigger.dataset.tab));
  });

  // Add Summoner button(s)
  document.getElementById('btn-add-summoner').addEventListener('click', () => openDialog('dialog-add-summoner'));
  document.getElementById('btn-add-summoner-empty').addEventListener('click', () => openDialog('dialog-add-summoner'));
  document.getElementById('btn-cancel-add-summoner').addEventListener('click', () => closeDialog('dialog-add-summoner'));
  document.getElementById('btn-confirm-add-summoner').addEventListener('click', handleAddSummoner);

  // Input: convert tag to uppercase
  document.getElementById('input-summoner-tag').addEventListener('input', function () {
    this.value = this.value.toUpperCase();
  });

  // Delete dialog
  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    state.deleteTargetId = null;
    closeDialog('dialog-delete-summoner');
  });
  document.getElementById('btn-confirm-delete').addEventListener('click', handleDeleteSummoner);

  // Settings
  document.getElementById('btn-settings').addEventListener('click', () => {
    renderSettingsDialog();
    openDialog('dialog-settings');
  });
  document.getElementById('btn-cancel-settings').addEventListener('click', () => closeDialog('dialog-settings'));
  document.getElementById('btn-save-settings').addEventListener('click', handleSaveSettings);

  // Sync dialog
  document.getElementById('btn-sync').addEventListener('click', () => openDialog('dialog-sync'));
  document.getElementById('btn-sync-days').addEventListener('click', () => handleSync(false));
  document.getElementById('btn-sync-incremental').addEventListener('click', () => handleSync(true));

  // Sync days input update label
  document.getElementById('input-sync-days').addEventListener('input', function () {
    state.syncDays = parseInt(this.value) || 30;
    document.getElementById('sync-days-label').textContent = `Sincronizza ultimi ${state.syncDays} giorni`;
  });

  // Drill dialog
  document.getElementById('btn-add-drill').addEventListener('click', () => openDialog('dialog-add-drill'));
  document.getElementById('btn-cancel-drill').addEventListener('click', () => closeDialog('dialog-add-drill'));
  document.getElementById('btn-save-drill').addEventListener('click', handleAddDrill);

  // Filter changes
  document.getElementById('filter-lane').addEventListener('change', function () {
    state.selectedLane = this.value;
    fetchMatches();
    fetchStats();
  });

  document.getElementById('filter-champion').addEventListener('change', function () {
    state.selectedChampion = this.value;
    fetchMatches();
    fetchStats();
  });

  // Champions table sorting
  document.querySelectorAll('#tab-champions .sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.championsSort.key === key) {
        if (state.championsSort.direction === 'desc') {
          state.championsSort = { key, direction: 'asc' };
        } else if (state.championsSort.direction === 'asc') {
          state.championsSort = { key: '', direction: null };
        } else {
          state.championsSort = { key, direction: 'desc' };
        }
      } else {
        state.championsSort = { key, direction: 'desc' };
      }
      renderChampionsTable();
    });
  });

  // Close dialogs on overlay click
  document.querySelectorAll('.dialog-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });
  });

  // Close dialogs on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.dialog-overlay').forEach(overlay => {
        overlay.style.display = 'none';
      });
    }
  });

  // Export/Import buttons
  document.getElementById('btn-export').addEventListener('click', handleExport);
  document.getElementById('btn-import').addEventListener('click', handleImport);
  document.getElementById('import-file-input').addEventListener('change', handleImportFile);

  // Sync Champions button
  document.getElementById('btn-sync-champions')?.addEventListener('click', handleSyncChampions);

  // Champion tracker filters
  document.getElementById('filter-champion-role')?.addEventListener('change', renderChampionsTracker);
  document.getElementById('filter-champion-status')?.addEventListener('change', renderChampionsTracker);
}

async function init() {
  initEventListeners();

  // Initial data fetch
  await Promise.all([
    fetchSummoners(),
    fetchSettings(),
    fetchChampions(),
  ]);

  // If summoner is selected, fetch their data
  if (state.selectedSummonerId) {
    renderMainView();
    fetchMatches();
    fetchStats();
    fetchDrills();
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
