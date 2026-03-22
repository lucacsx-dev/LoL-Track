const LANE_ICONS = {
  TOP: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  JUNGLE: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  MID: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  ADC: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>',
  SUPPORT: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
};

const LANE_COLORS = {
  TOP: '#f97316',
  JUNGLE: '#22c55e',
  MID: '#3b82f6',
  ADC: '#ef4444',
  SUPPORT: '#a855f7'
};

const DEFAULT_ICON = 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/29.png';

const DD_VERSION = '14.1.1';

const state = {
  summoners: [],
  selectedSummonerId: null,
  matches: [],
  stats: null,
  settings: {
    dataDragonVersion: DD_VERSION,
    defaultSyncDays: 30,
    topKillMultiplier: 0.5,
    topAssistMultiplier: 0.85,
    jungleKillMultiplier: 0.5,
    jungleAssistMultiplier: 0.85,
    midKillMultiplier: 0.5,
    midAssistMultiplier: 0.85,
    adcKillMultiplier: 0.5,
    adcAssistMultiplier: 0.85,
    supportKillMultiplier: 0.5,
    supportAssistMultiplier: 0.85
  },
  drills: [],
  champions: [],
  isLoading: false,
  isSyncing: false,
  activeTab: 'matches',
  selectedLane: 'ALL',
  selectedChampion: 'ALL',
  championsSort: { key: 'games', direction: 'desc' },
  deleteConfirmId: null,
  laneSettings: {}
};

const CHAMPION_ROLES = {
  'Aatrox': { primary: 'TOP', secondary: null },
  'Ahri': { primary: 'MID', secondary: null },
  'Akali': { primary: 'MID', secondary: 'TOP' },
  'Akshan': { primary: 'MID', secondary: 'TOP' },
  'Alistar': { primary: 'SUPPORT', secondary: null },
  'Amumu': { primary: 'SUPPORT', secondary: 'JUNGLE' },
  'Anivia': { primary: 'MID', secondary: null },
  'Annie': { primary: 'MID', secondary: 'SUPPORT' },
  'Aphelios': { primary: 'ADC', secondary: null },
  'Ashe': { primary: 'ADC', secondary: 'SUPPORT' },
  'Aurelion Sol': { primary: 'MID', secondary: null },
  'Azir': { primary: 'MID', secondary: null },
  'Bard': { primary: 'SUPPORT', secondary: null },
  'Bel\'Veth': { primary: 'JUNGLE', secondary: null },
  'Blitzcrank': { primary: 'SUPPORT', secondary: null },
  'Brand': { primary: 'SUPPORT', secondary: 'MID' },
  'Braum': { primary: 'SUPPORT', secondary: null },
  'Briar': { primary: 'JUNGLE', secondary: 'MID' },
  'Caitlyn': { primary: 'ADC', secondary: null },
  'Camille': { primary: 'TOP', secondary: 'JUNGLE' },
  'Cassiopeia': { primary: 'MID', secondary: null },
  'Cho\'Gath': { primary: 'TOP', secondary: null },
  'Corki': { primary: 'MID', secondary: null },
  'Darius': { primary: 'TOP', secondary: 'JUNGLE' },
  'Diana': { primary: 'JUNGLE', secondary: 'MID' },
  'Dr. Mundo': { primary: 'TOP', secondary: 'JUNGLE' },
  'Draven': { primary: 'ADC', secondary: null },
  'Ekko': { primary: 'JUNGLE', secondary: 'MID' },
  'Elise': { primary: 'JUNGLE', secondary: 'MID' },
  'Evelynn': { primary: 'JUNGLE', secondary: null },
  'Ezreal': { primary: 'ADC', secondary: null },
  'Fiddlesticks': { primary: 'JUNGLE', secondary: 'SUPPORT' },
  'Fiora': { primary: 'TOP', secondary: null },
  'Fizz': { primary: 'MID', secondary: null },
  'Galio': { primary: 'MID', secondary: 'SUPPORT' },
  'Gangplank': { primary: 'TOP', secondary: null },
  'Garen': { primary: 'TOP', secondary: null },
  'Gnar': { primary: 'TOP', secondary: null },
  'Gragas': { primary: 'JUNGLE', secondary: 'TOP' },
  'Graves': { primary: 'JUNGLE', secondary: null },
  'Guinsoo': { primary: 'TOP', secondary: 'JUNGLE' },
  'Gwen': { primary: 'TOP', secondary: null },
  'Harstan': { primary: 'SUPPORT', secondary: null },
  'Hecarim': { primary: 'JUNGLE', secondary: null },
  'Heimerdinger': { primary: 'MID', secondary: 'SUPPORT' },
  'Hwei': { primary: 'MID', secondary: 'SUPPORT' },
  'Illaoi': { primary: 'TOP', secondary: null },
  'Irelia': { primary: 'TOP', secondary: 'MID' },
  'Ivern': { primary: 'JUNGLE', secondary: null },
  'Janna': { primary: 'SUPPORT', secondary: null },
  'Jarvan IV': { primary: 'JUNGLE', secondary: 'TOP' },
  'Jax': { primary: 'TOP', secondary: 'JUNGLE' },
  'Jayce': { primary: 'TOP', secondary: 'MID' },
  'Jhin': { primary: 'ADC', secondary: null },
  'Jinx': { primary: 'ADC', secondary: null },
  'K\'Sante': { primary: 'TOP', secondary: null },
  'Kai\'Sa': { primary: 'ADC', secondary: null },
  'Kalista': { primary: 'ADC', secondary: null },
  'Karma': { primary: 'SUPPORT', secondary: 'MID' },
  'Karthus': { primary: 'JUNGLE', secondary: null },
  'Kassadin': { primary: 'MID', secondary: null },
  'Katarina': { primary: 'MID', secondary: null },
  'Kayle': { primary: 'TOP', secondary: null },
  'Kayn': { primary: 'JUNGLE', secondary: null },
  'Kennen': { primary: 'TOP', secondary: null },
  'Kha\'Zix': { primary: 'JUNGLE', secondary: null },
  'Kindred': { primary: 'JUNGLE', secondary: null },
  'Kled': { primary: 'TOP', secondary: null },
  'Kog\'Maw': { primary: 'ADC', secondary: null },
  'LeBlanc': { primary: 'MID', secondary: null },
  'Lee Sin': { primary: 'JUNGLE', secondary: null },
  'Leona': { primary: 'SUPPORT', secondary: null },
  'Lissandra': { primary: 'MID', secondary: null },
  'Lucian': { primary: 'ADC', secondary: 'MID' },
  'Lulu': { primary: 'SUPPORT', secondary: null },
  'Lux': { primary: 'SUPPORT', secondary: 'MID' },
  'Malphite': { primary: 'TOP', secondary: 'SUPPORT' },
  'Malzahar': { primary: 'MID', secondary: null },
  'Maokai': { primary: 'SUPPORT', secondary: 'JUNGLE' },
  'Master Yi': { primary: 'JUNGLE', secondary: null },
  'Milio': { primary: 'SUPPORT', secondary: null },
  'Miss Fortune': { primary: 'ADC', secondary: null },
  'Mordekaiser': { primary: 'TOP', secondary: 'JUNGLE' },
  'Morgana': { primary: 'SUPPORT', secondary: 'MID' },
  'Naafiri': { primary: 'MID', secondary: null },
  'Nami': { primary: 'SUPPORT', secondary: null },
  'Nasus': { primary: 'TOP', secondary: null },
  'Nautilus': { primary: 'SUPPORT', secondary: null },
  'Neeko': { primary: 'MID', secondary: 'SUPPORT' },
  'Nidalee': { primary: 'JUNGLE', secondary: null },
  'Nilah': { primary: 'ADC', secondary: null },
  'Nocturne': { primary: 'JUNGLE', secondary: null },
  'Nunu & Willump': { primary: 'JUNGLE', secondary: null },
  'Olaf': { primary: 'JUNGLE', secondary: 'TOP' },
  'Orianna': { primary: 'MID', secondary: null },
  'Ornn': { primary: 'TOP', secondary: null },
  'Pantheon': { primary: 'MID', secondary: 'SUPPORT' },
  'Poppy': { primary: 'JUNGLE', secondary: 'TOP' },
  'Pyke': { primary: 'SUPPORT', secondary: null },
  'Qiyana': { primary: 'MID', secondary: null },
  'Quinn': { primary: 'TOP', secondary: 'JUNGLE' },
  'Rakan': { primary: 'SUPPORT', secondary: null },
  'Rammus': { primary: 'JUNGLE', secondary: null },
  'Rek\'Sai': { primary: 'JUNGLE', secondary: null },
  'Rell': { primary: 'SUPPORT', secondary: null },
  'Renata Glasc': { primary: 'SUPPORT', secondary: null },
  'Rengar': { primary: 'JUNGLE', secondary: 'TOP' },
  'Riven': { primary: 'TOP', secondary: null },
  'Rumble': { primary: 'TOP', secondary: 'JUNGLE' },
  'Ryze': { primary: 'MID', secondary: null },
  'Samira': { primary: 'ADC', secondary: null },
  'Sejuani': { primary: 'JUNGLE', secondary: null },
  'Senna': { primary: 'SUPPORT', secondary: 'ADC' },
  'Seraphine': { primary: 'SUPPORT', secondary: 'MID' },
  'Sett': { primary: 'TOP', secondary: 'SUPPORT' },
  'Shaco': { primary: 'JUNGLE', secondary: 'SUPPORT' },
  'Shen': { primary: 'TOP', secondary: 'SUPPORT' },
  'Shyvana': { primary: 'JUNGLE', secondary: 'TOP' },
  'Singed': { primary: 'TOP', secondary: null },
  'Sion': { primary: 'TOP', secondary: null },
  'Sivir': { primary: 'ADC', secondary: null },
  'Skarner': { primary: 'JUNGLE', secondary: null },
  'Sona': { primary: 'SUPPORT', secondary: null },
  'Soraka': { primary: 'SUPPORT', secondary: null },
  'Swain': { primary: 'MID', secondary: 'SUPPORT' },
  'Sylas': { primary: 'MID', secondary: null },
  'Syndra': { primary: 'MID', secondary: null },
  'Tahm Kench': { primary: 'TOP', secondary: 'SUPPORT' },
  'Taliyah': { primary: 'JUNGLE', secondary: 'MID' },
  'Talon': { primary: 'MID', secondary: null },
  'Taric': { primary: 'SUPPORT', secondary: null },
  'Teemo': { primary: 'TOP', secondary: 'MID' },
  'Thresh': { primary: 'SUPPORT', secondary: null },
  'Tristana': { primary: 'ADC', secondary: 'MID' },
  'Trundle': { primary: 'JUNGLE', secondary: 'TOP' },
  'Tryndamere': { primary: 'TOP', secondary: null },
  'Twisted Fate': { primary: 'MID', secondary: null },
  'Twitch': { primary: 'ADC', secondary: null },
  'Udyr': { primary: 'JUNGLE', secondary: null },
  'Urgot': { primary: 'TOP', secondary: null },
  'Varus': { primary: 'ADC', secondary: 'MID' },
  'Vayne': { primary: 'ADC', secondary: 'TOP' },
  'Veigar': { primary: 'MID', secondary: null },
  'Vel\'Koz': { primary: 'MID', secondary: 'SUPPORT' },
  'Vex': { primary: 'MID', secondary: null },
  'Vi': { primary: 'JUNGLE', secondary: null },
  'Viego': { primary: 'JUNGLE', secondary: null },
  'Viktor': { primary: 'MID', secondary: null },
  'Vladimir': { primary: 'MID', secondary: 'TOP' },
  'Volibear': { primary: 'JUNGLE', secondary: 'TOP' },
  'Warwick': { primary: 'JUNGLE', secondary: 'TOP' },
  'Wukong': { primary: 'JUNGLE', secondary: 'TOP' },
  'Xayah': { primary: 'ADC', secondary: null },
  'Xerath': { primary: 'MID', secondary: 'SUPPORT' },
  'Xin Zhao': { primary: 'JUNGLE', secondary: 'MID' },
  'Yasuo': { primary: 'MID', secondary: 'ADC' },
  'Yone': { primary: 'MID', secondary: 'TOP' },
  'Yorick': { primary: 'TOP', secondary: null },
  'Yuumi': { primary: 'SUPPORT', secondary: null },
  'Zac': { primary: 'JUNGLE', secondary: 'SUPPORT' },
  'Zed': { primary: 'MID', secondary: null },
  'Zeri': { primary: 'ADC', secondary: null },
  'Ziggs': { primary: 'MID', secondary: 'ADC' },
  'Zilean': { primary: 'SUPPORT', secondary: 'MID' },
  'Zoe': { primary: 'MID', secondary: null },
  'Zyra': { primary: 'SUPPORT', secondary: null }
};

const DRILL_INSTRUCTIONS = [
  {
    drill: "Timing Last-Hit",
    category: "Farming",
    conditions: ["No Skill", "No Pressure"],
    setup: "Posizionare 3 dummy con 100 HP ciascuno. Nessuna abilità attiva. Nessun nemico presente. Mana infinito."
  },
  {
    drill: "Push Efficiency",
    category: "Farming",
    conditions: ["No Skill", "Under Tower"],
    setup: "Posizionare 6 dummy sotto torre con HP progressivo (minion wave). Torre che attacca. Solo auto-attack."
  },
  {
    drill: "CS under Pressure",
    category: "Farming",
    conditions: ["No Pressure", "No Skill"],
    setup: "Posizionare dummy nemici che simulano pressione. Auto-attack only. 10 minuti di durata."
  },
  {
    drill: "Spacing Fundamentals",
    category: "Spacing",
    conditions: ["No Skill", "No Pressure"],
    setup: "Eseguire orbita attorno al dummy mantenendo distanza ottimale. 5 giri per lato. Senza usare abilità."
  },
  {
    drill: "Trading Stance",
    category: "Spacing",
    conditions: ["No Skill", "Under Tower"],
    setup: "Posizione tra dummy nemico e propria torre. Simulazione di trading base con dummy che attacca."
  },
  {
    drill: "Wave Management",
    category: "Macro",
    conditions: ["No Skill", "No Pressure"],
    setup: "Creare wave freeze/slowpush/shove. Posizionare dummy appropriati. Osservare comportamento wave."
  },
  {
    drill: "Recall Timing",
    category: "Macro",
    conditions: ["No Skill", "No Pressure"],
    setup: "Simulare wave state. Praticare recall al momento ottimale (wave cleared, cannon minion)."
  },
  {
    drill: "Vision Control",
    category: "Vision",
    conditions: ["No Skill"],
    setup: "Posizionare dummy wards/sweeper. Pratcare clearing e planting in posizioni strategiche."
  }
];

const DRILL_CATEGORIES = ["Farming", "Spacing", "Macro", "Vision"];

let winRateChart = null;
let kdrChart = null;

function getKDRMultipliers(lane) {
  const laneUpper = lane.toUpperCase();
  switch (laneUpper) {
    case 'TOP':
      return { kill: state.settings.topKillMultiplier, assist: state.settings.topAssistMultiplier };
    case 'JUNGLE':
      return { kill: state.settings.jungleKillMultiplier, assist: state.settings.jungleAssistMultiplier };
    case 'MID':
      return { kill: state.settings.midKillMultiplier, assist: state.settings.midAssistMultiplier };
    case 'ADC':
    case 'BOTTOM':
      return { kill: state.settings.adcKillMultiplier, assist: state.settings.adcAssistMultiplier };
    case 'SUPPORT':
      return { kill: state.settings.supportKillMultiplier, assist: state.settings.supportAssistMultiplier };
    default:
      return { kill: 0.5, assist: 0.85 };
  }
}

function calculateKDR(kills, deaths, assists, lane) {
  const multipliers = getKDRMultipliers(lane);
  const kdr = (kills * multipliers.kill) + (assists * multipliers.assist) - deaths;
  return Math.round(kdr * 100) / 100;
}

function calculateCSPerMin(cs, duration) {
  if (duration === 0) return 0;
  return Math.round((cs / (duration / 60)) * 100) / 100;
}

async function apiRequest(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  return response.json();
}

async function fetchSummonerData(name, tag) {
  try {
    const data = await apiRequest(`/api/summoner/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
    return data;
  } catch (error) {
    throw error;
  }
}

async function fetchMatches(name, tag, days = 30) {
  try {
    const data = await apiRequest(`/api/summoner/${encodeURIComponent(name)}/${encodeURIComponent(tag)}/matches?days=${days}`);
    return data;
  } catch (error) {
    throw error;
  }
}

async function fetchIncrementalMatches(name, tag, after) {
  try {
    const afterParam = after ? `&after=${encodeURIComponent(after)}` : '';
    const data = await apiRequest(`/api/summoner/${encodeURIComponent(name)}/${encodeURIComponent(tag)}/matches/incremental?${afterParam.slice(1)}`);
    return data;
  } catch (error) {
    throw error;
  }
}

async function syncSummoner(summoner, days = 30) {
  try {
    state.isSyncing = true;
    showToast(`Sincronizzazione di ${summoner.summonerName}...`);
    
    const data = await fetchMatches(summoner.summonerName, summoner.tagLine, days);
    
    summoner.profileIconId = data.summoner.profileIconId;
    summoner.summonerLevel = data.summoner.summonerLevel;
    summoner.riotPuuid = data.summoner.puuid;
    summoner.lastSyncAt = new Date().toISOString();
    summoner.lastMatchTime = data.matches.length > 0 ? data.matches[0].gameCreation : null;
    summoner._count = { matches: data.matches.length };
    
    const processedMatches = data.matches.map(match => ({
      ...match,
      kdr: calculateKDR(match.kills, match.deaths, match.assists, match.lane),
      csPerMin: calculateCSPerMin(match.cs, match.gameDuration),
      goldPerMin: calculateGoldPerMin(match.gold, match.gameDuration),
      durationMinutes: Math.round(match.gameDuration / 60),
      durationFormatted: formatDuration(match.gameDuration)
    }));
    
    const existingMatchIds = new Set(state.matches.map(m => m.riotMatchId));
    const newMatches = processedMatches.filter(m => !existingMatchIds.has(m.riotMatchId));
    
    state.matches = [...newMatches, ...state.matches].sort((a, b) => 
      new Date(b.gameCreation) - new Date(a.gameCreation)
    );
    
    saveSummoners();
    
    state.isSyncing = false;
    showToast(`Sincronizzate ${data.matches.length} partite per ${summoner.summonerName}`);
    
    return data.matches.length;
  } catch (error) {
    state.isSyncing = false;
    showToast(`Errore sync: ${error.message}`, 'error');
    throw error;
  }
}

async function syncIncremental(summoner) {
  try {
    state.isSyncing = true;
    showToast(`Sincronizzazione incrementale di ${summoner.summonerName}...`);
    
    const data = await fetchIncrementalMatches(summoner.summonerName, summoner.tagLine, summoner.lastMatchTime);
    
    if (data.matches.length > 0) {
      summoner.lastMatchTime = data.matches[0].gameCreation;
      summoner._count = { matches: (summoner._count?.matches || 0) + data.matches.length };
      
      const processedMatches = data.matches.map(match => ({
        ...match,
        kdr: calculateKDR(match.kills, match.deaths, match.assists, match.lane),
        csPerMin: calculateCSPerMin(match.cs, match.gameDuration),
        goldPerMin: calculateGoldPerMin(match.gold, match.gameDuration),
        durationMinutes: Math.round(match.gameDuration / 60),
        durationFormatted: formatDuration(match.gameDuration)
      }));
      
      const existingMatchIds = new Set(state.matches.map(m => m.riotMatchId));
      const newMatches = processedMatches.filter(m => !existingMatchIds.has(m.riotMatchId));
      
      state.matches = [...newMatches, ...state.matches].sort((a, b) => 
        new Date(b.gameCreation) - new Date(a.gameCreation)
      );
      
      saveSummoners();
    }
    
    summoner.lastSyncAt = new Date().toISOString();
    
    state.isSyncing = false;
    showToast(`Trovate ${data.matches.length} nuove partite per ${summoner.summonerName}`);
    
    return data.matches.length;
  } catch (error) {
    state.isSyncing = false;
    showToast(`Errore sync: ${error.message}`, 'error');
    throw error;
  }
}

function saveSummoners() {
  const summonerData = state.summoners.map(s => ({
    id: s.id,
    riotPuuid: s.riotPuuid,
    summonerName: s.summonerName,
    tagLine: s.tagLine,
    profileIconId: s.profileIconId,
    summonerLevel: s.summonerLevel,
    lastSyncAt: s.lastSyncAt,
    lastMatchTime: s.lastMatchTime,
    _count: s._count
  }));
  localStorage.setItem('lol-tracker-summoners', JSON.stringify(summonerData));
  localStorage.setItem('lol-tracker-matches', JSON.stringify(state.matches));
  localStorage.setItem('lol-tracker-drills', JSON.stringify(state.drills));
}

function loadSummoners() {
  try {
    const savedSummoners = localStorage.getItem('lol-tracker-summoners');
    const savedMatches = localStorage.getItem('lol-tracker-matches');
    const savedDrills = localStorage.getItem('lol-tracker-drills');
    
    if (savedSummoners) {
      const parsed = JSON.parse(savedSummoners);
      state.summoners = parsed.filter(s => s.summonerName && s.tagLine);
      if (parsed.length !== state.summoners.length) {
        saveSummoners();
      }
    }
    if (savedMatches) {
      state.matches = JSON.parse(savedMatches);
    }
    if (savedDrills) {
      state.drills = JSON.parse(savedDrills);
    }
  } catch (e) {
    console.warn('Failed to load saved data:', e);
  }
}

function calculateGoldPerMin(gold, duration) {
  if (duration === 0) return 0;
  return Math.round((gold / (duration / 60)) * 100) / 100;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getChampionImageUrl(championName) {
  const cleanedName = championName
    .replace(/['.]/g, '')
    .replace(/\s+/g, '')
    .replace(/&/g, '');
  return `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${cleanedName}.png`;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${type === 'success' 
        ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
        : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'}
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

function openModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function switchTab(tabName) {
  state.activeTab = tabName;
  
  document.querySelectorAll('.tabs-trigger').forEach(trigger => {
    trigger.classList.toggle('active', trigger.dataset.tab === tabName);
  });
  
  document.querySelectorAll('.tabs-content').forEach(content => {
    content.classList.toggle('active', content.dataset.content === tabName);
  });
  
  if (tabName === 'stats' && state.stats) {
    setTimeout(() => renderCharts(), 100);
  } else if (tabName === 'drillCharts') {
    setTimeout(() => renderDrillCharts(), 100);
  } else if (tabName === 'progress') {
    setTimeout(() => renderProgress(), 100);
  } else if (tabName === 'performance') {
    setTimeout(() => renderPerformance(), 100);
  } else if (tabName === 'metadata') {
    setTimeout(() => renderMetadata(), 100);
  } else if (tabName === 'drillInstruction') {
    setTimeout(() => renderDrillInstructions(), 100);
  } else if (tabName === 'championList') {
    setTimeout(() => renderChampionList(), 100);
  }
}

function renderSummoners() {
  const list = document.getElementById('summonerList');
  const existingLabel = list.querySelector('label');
  list.innerHTML = '';
  if (existingLabel) {
    list.appendChild(existingLabel.cloneNode(true));
  } else {
    const label = document.createElement('label');
    label.className = 'text-sm text-muted-foreground mb-2 block';
    label.textContent = 'Evocatori Tracciati';
    list.appendChild(label);
  }
  
  state.summoners.forEach(summoner => {
    const item = document.createElement('div');
    item.className = `summoner-item ${summoner.id === state.selectedSummonerId ? 'selected' : ''}`;
    item.innerHTML = `
      <div class="summoner-item-header">
        <img src="${summoner.profileIconId ? `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/profileicon/${summoner.profileIconId}.png` : DEFAULT_ICON}" 
             alt="${summoner.summonerName}" 
             class="summoner-avatar"
             onerror="this.src='${DEFAULT_ICON}'">
        <div class="summoner-info">
          <p class="summoner-name">${summoner.summonerName}</p>
          <p class="summoner-tag">#${summoner.tagLine}</p>
        </div>
        <span class="summoner-badge">${summoner._count?.matches || 0}</span>
      </div>
      <div class="summoner-meta">
        <span class="summoner-sync">
          ${summoner.lastSyncAt 
            ? `Sync: ${new Date(summoner.lastSyncAt).toLocaleDateString()}`
            : 'Mai sincronizzato'}
        </span>
        <div class="summoner-actions">
          <button class="btn btn-icon btn-sm" data-action="sync" data-id="${summoner.id}" title="Sincronizza">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 16h5v5"/>
            </svg>
          </button>
          <button class="btn btn-icon btn-sm" data-action="delete" data-id="${summoner.id}" title="Elimina">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    item.addEventListener('click', (e) => {
      if (!e.target.closest('[data-action]')) {
        selectSummoner(summoner.id);
      }
    });
    
    list.appendChild(item);
  });
  
  document.querySelectorAll('[data-action="sync"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const summoner = state.summoners.find(s => s.id === btn.dataset.id);
      if (summoner) {
        state.selectedSummonerId = summoner.id;
        renderSummoners();
        document.getElementById('syncDaysModal').value = state.settings.defaultSyncDays;
        document.getElementById('syncDaysLabel').textContent = state.settings.defaultSyncDays;
        openModal('syncModal');
      }
    });
  });
  
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.deleteConfirmId = btn.dataset.id;
      const summoner = state.summoners.find(s => s.id === state.deleteConfirmId);
      document.getElementById('deleteMessage').textContent = 
        `Sei sicuro di voler eliminare ${summoner.summonerName}#${summoner.tagLine}? Tutte le partite associate verranno eliminate.`;
      openModal('deleteModal');
    });
  });
}

function renderChampionFilter() {
  const select = document.getElementById('championFilter');
  const uniqueChampions = [...new Set(state.matches.map(m => m.championName))].sort();
  
  select.innerHTML = '<option value="ALL">Tutti</option>';
  uniqueChampions.forEach(champ => {
    select.innerHTML += `<option value="${champ}">${champ}</option>`;
  });
  
  select.value = state.selectedChampion;
}

function renderMatches() {
  const tbody = document.getElementById('matchesTableBody');
  const countEl = document.getElementById('matchesCount');
  
  countEl.textContent = `${state.matches.length} partite trovate`;
  
  if (state.matches.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-12">
          <div class="text-muted-foreground">
            <svg class="icon-lg mx-auto mb-4" style="width:48px;height:48px;opacity:0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>Nessuna partita trovata</p>
            <p class="text-sm">Sincronizza per recuperare le partite</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = state.matches.map(match => `
    <tr class="${match.win ? 'win-row' : 'lose-row'}">
      <td>
        <span class="badge ${match.win ? 'badge-default' : 'badge-destructive'} ${match.win ? 'bg-green-500' : ''}">
          ${match.win ? 'W' : 'L'}
        </span>
      </td>
      <td>
        <div class="flex items-center gap-2">
          <img src="${getChampionImageUrl(match.championName)}" 
               alt="${match.championName}" 
               class="w-8 h-8 rounded"
               onerror="this.style.display='none'">
          <span class="font-medium">${match.championName}</span>
        </div>
      </td>
      <td>
        <span class="badge badge-outline" style="border-color: ${LANE_COLORS[match.lane] || '#888'}; color: ${LANE_COLORS[match.lane] || '#888'}">
          ${LANE_ICONS[match.lane] || ''}
          <span class="ml-1">${match.lane}</span>
        </span>
      </td>
      <td class="text-center">
        <span class="text-green-500">${match.kills}</span>
        <span class="text-muted-foreground">/</span>
        <span class="text-red-500">${match.deaths}</span>
        <span class="text-muted-foreground">/</span>
        <span class="text-blue-500">${match.assists}</span>
      </td>
      <td class="text-center">${match.cs}</td>
      <td class="text-center">${match.gold.toLocaleString()}</td>
      <td class="text-center">${match.durationFormatted}</td>
      <td class="text-center">
        <span class="${match.kdr >= 0 ? 'text-green-500' : 'text-red-500'}">
          ${match.kdr.toFixed(2)}
        </span>
      </td>
      <td class="text-center">${match.csPerMin.toFixed(2)}</td>
      <td class="text-center">${match.goldPerMin.toFixed(0)}</td>
    </tr>
  `).join('');
}

function calculateStats() {
  const filteredMatches = state.matches.filter(m => {
    if (state.selectedLane !== 'ALL' && m.lane !== state.selectedLane) return false;
    if (state.selectedChampion !== 'ALL' && m.championName !== state.selectedChampion) return false;
    return true;
  });
  
  if (filteredMatches.length === 0) {
    state.stats = {
      overall: {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgKills: 0,
        avgDeaths: 0,
        avgAssists: 0,
        avgCS: 0,
        avgGold: 0,
        avgCSPerMin: 0,
        avgGoldPerMin: 0,
        avgKDR: 0,
        avgDuration: 0
      },
      byChampion: [],
      byLane: [],
      winRateOverTime: [],
      kdaDistribution: []
    };
    return;
  }
  
  const totalKills = filteredMatches.reduce((sum, m) => sum + m.kills, 0);
  const totalDeaths = filteredMatches.reduce((sum, m) => sum + m.deaths, 0);
  const totalAssists = filteredMatches.reduce((sum, m) => sum + m.assists, 0);
  const totalCS = filteredMatches.reduce((sum, m) => sum + m.cs, 0);
  const totalGold = filteredMatches.reduce((sum, m) => sum + m.gold, 0);
  const totalDuration = filteredMatches.reduce((sum, m) => sum + m.gameDuration, 0);
  const wins = filteredMatches.filter(m => m.win).length;
  
  const avgKDR = filteredMatches.reduce((sum, m) => sum + m.kdr, 0) / filteredMatches.length;
  
  const overall = {
    totalGames: filteredMatches.length,
    wins,
    losses: filteredMatches.length - wins,
    winRate: Math.round((wins / filteredMatches.length) * 10000) / 100,
    avgKills: Math.round((totalKills / filteredMatches.length) * 100) / 100,
    avgDeaths: Math.round((totalDeaths / filteredMatches.length) * 100) / 100,
    avgAssists: Math.round((totalAssists / filteredMatches.length) * 100) / 100,
    avgCS: Math.round(totalCS / filteredMatches.length),
    avgGold: Math.round(totalGold / filteredMatches.length),
    avgCSPerMin: Math.round((filteredMatches.reduce((sum, m) => sum + m.csPerMin, 0) / filteredMatches.length) * 100) / 100,
    avgGoldPerMin: Math.round((filteredMatches.reduce((sum, m) => sum + m.goldPerMin, 0) / filteredMatches.length) * 100) / 100,
    avgKDR: Math.round(avgKDR * 100) / 100,
    avgDuration: Math.round(totalDuration / filteredMatches.length / 60)
  };
  
  const championMap = new Map();
  filteredMatches.forEach(match => {
    if (!championMap.has(match.championName)) {
      championMap.set(match.championName, []);
    }
    championMap.get(match.championName).push(match);
  });
  
  const byChampion = [];
  championMap.forEach((matches, name) => {
    const champKills = matches.reduce((sum, m) => sum + m.kills, 0);
    const champDeaths = matches.reduce((sum, m) => sum + m.deaths, 0);
    const champAssists = matches.reduce((sum, m) => sum + m.assists, 0);
    const champCS = matches.reduce((sum, m) => sum + m.cs, 0);
    const champWins = matches.filter(m => m.win).length;
    const champKDR = matches.reduce((sum, m) => sum + m.kdr, 0) / matches.length;
    
    const zeroDeathGames = matches.filter(m => m.deaths === 0).length;
    const surviveRate = Math.round((zeroDeathGames / matches.length) * 100);
    
    const csValues = matches.map(m => m.csPerMin);
    const csConsistency = calculateConsistency(csValues);
    
    byChampion.push({
      championName: name,
      championId: matches[0].championId,
      games: matches.length,
      wins: champWins,
      losses: matches.length - champWins,
      winRate: Math.round((champWins / matches.length) * 10000) / 100,
      avgKills: Math.round((champKills / matches.length) * 100) / 100,
      avgDeaths: Math.round((champDeaths / matches.length) * 100) / 100,
      avgAssists: Math.round((champAssists / matches.length) * 100) / 100,
      avgCS: Math.round(champCS / matches.length),
      avgCSPerMin: Math.round((matches.reduce((sum, m) => sum + m.csPerMin, 0) / matches.length) * 100) / 100,
      avgKDR: Math.round(champKDR * 100) / 100,
      surviveRate,
      csConsistency
    });
  });
  byChampion.sort((a, b) => b.games - a.games);
  
  const laneMap = new Map();
  filteredMatches.forEach(match => {
    if (!laneMap.has(match.lane)) {
      laneMap.set(match.lane, []);
    }
    laneMap.get(match.lane).push(match);
  });
  
  const byLane = [];
  laneMap.forEach((matches, lane) => {
    const laneKills = matches.reduce((sum, m) => sum + m.kills, 0);
    const laneDeaths = matches.reduce((sum, m) => sum + m.deaths, 0);
    const laneAssists = matches.reduce((sum, m) => sum + m.assists, 0);
    const laneCS = matches.reduce((sum, m) => sum + m.cs, 0);
    const laneWins = matches.filter(m => m.win).length;
    const laneKDR = matches.reduce((sum, m) => sum + m.kdr, 0) / matches.length;
    
    byLane.push({
      lane,
      games: matches.length,
      wins: laneWins,
      losses: matches.length - laneWins,
      winRate: Math.round((laneWins / matches.length) * 10000) / 100,
      avgKills: Math.round((laneKills / matches.length) * 100) / 100,
      avgDeaths: Math.round((laneDeaths / matches.length) * 100) / 100,
      avgAssists: Math.round((laneAssists / matches.length) * 100) / 100,
      avgCS: Math.round(laneCS / matches.length),
      avgCSPerMin: Math.round((matches.reduce((sum, m) => sum + m.csPerMin, 0) / matches.length) * 100) / 100,
      avgKDR: Math.round(laneKDR * 100) / 100
    });
  });
  byLane.sort((a, b) => b.games - a.games);
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dayMap = new Map();
  
  filteredMatches
    .filter(m => new Date(m.gameCreation) >= thirtyDaysAgo)
    .forEach(match => {
      const date = new Date(match.gameCreation).toISOString().split('T')[0];
      if (!dayMap.has(date)) {
        dayMap.set(date, { wins: 0, total: 0 });
      }
      const existing = dayMap.get(date);
      existing.total++;
      if (match.win) existing.wins++;
    });
  
  const winRateOverTime = [];
  dayMap.forEach((data, date) => {
    winRateOverTime.push({
      date,
      winRate: Math.round((data.wins / data.total) * 100),
      games: data.total
    });
  });
  winRateOverTime.sort((a, b) => a.date.localeCompare(b.date));
  
  const buckets = { '< -5': 0, '-5 to 0': 0, '0 to 5': 0, '5 to 10': 0, '10 to 15': 0, '> 15': 0 };
  filteredMatches.forEach(m => {
    if (m.kdr < -5) buckets['< -5']++;
    else if (m.kdr < 0) buckets['-5 to 0']++;
    else if (m.kdr < 5) buckets['0 to 5']++;
    else if (m.kdr < 10) buckets['5 to 10']++;
    else if (m.kdr < 15) buckets['10 to 15']++;
    else buckets['> 15']++;
  });
  
  const kdaDistribution = Object.entries(buckets).map(([range, count]) => ({ range, count }));
  
  state.stats = { overall, byChampion, byLane, winRateOverTime, kdaDistribution };
}

function renderStats() {
  if (!state.stats) return;
  
  const s = state.stats.overall;
  
  document.getElementById('statWinRate').textContent = `${s.winRate}%`;
  document.getElementById('statWinRateProgress').style.width = `${s.winRate}%`;
  document.getElementById('statWL').textContent = `${s.wins}W / ${s.losses}L`;
  document.getElementById('statKDR').textContent = s.avgKDR.toFixed(2);
  document.getElementById('statCSPerMin').textContent = s.avgCSPerMin.toFixed(2);
  document.getElementById('statAvgDuration').textContent = `${s.avgDuration} min`;
  document.getElementById('statAvgKills').textContent = s.avgKills.toFixed(1);
  document.getElementById('statAvgDeaths').textContent = s.avgDeaths.toFixed(1);
  document.getElementById('statAvgAssists').textContent = s.avgAssists.toFixed(1);
  document.getElementById('statKDA').textContent = `${((s.avgKills + s.avgAssists) / Math.max(s.avgDeaths, 1)).toFixed(2)}:1`;
}

function renderCharts() {
  if (!state.stats) return;
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    }
  };
  
  if (winRateChart) winRateChart.destroy();
  const winRateCtx = document.getElementById('winRateChart').getContext('2d');
  winRateChart = new Chart(winRateCtx, {
    type: 'line',
    data: {
      labels: state.stats.winRateOverTime.map(d => new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })),
      datasets: [{
        data: state.stats.winRateOverTime.map(d => d.winRate),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      ...chartOptions,
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
  
  if (kdrChart) kdrChart.destroy();
  const kdrCtx = document.getElementById('kdrChart').getContext('2d');
  kdrChart = new Chart(kdrCtx, {
    type: 'bar',
    data: {
      labels: state.stats.kdaDistribution.map(d => d.range),
      datasets: [{
        data: state.stats.kdaDistribution.map(d => d.count),
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }]
    },
    options: {
      ...chartOptions,
      scales: {
        y: {
          beginAtZero: true
        }
      }
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
      case 'games':
        aVal = a.games;
        bVal = b.games;
        break;
      case 'winRate':
        aVal = a.winRate;
        bVal = b.winRate;
        break;
      case 'avgKills':
        aVal = a.avgKills;
        bVal = b.avgKills;
        break;
      case 'avgDeaths':
        aVal = a.avgDeaths;
        bVal = b.avgDeaths;
        break;
      case 'avgAssists':
        aVal = a.avgAssists;
        bVal = b.avgAssists;
        break;
      case 'avgCS':
        aVal = a.avgCS;
        bVal = b.avgCS;
        break;
      case 'avgCSPerMin':
        aVal = a.avgCSPerMin;
        bVal = b.avgCSPerMin;
        break;
      case 'avgKDR':
        aVal = a.avgKDR;
        bVal = b.avgKDR;
        break;
      case 'surviveRate':
        aVal = a.surviveRate;
        bVal = b.surviveRate;
        break;
      case 'csConsistency':
        aVal = a.csConsistency;
        bVal = b.csConsistency;
        break;
      default:
        return 0;
    }
    
    if (typeof aVal === 'string') {
      return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    
    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
  });
}

function renderChampions() {
  const tbody = document.getElementById('championsTableBody');
  
  if (!state.stats || state.stats.byChampion.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-12 text-muted-foreground">
          Nessuna statistica disponibile
        </td>
      </tr>
    `;
    return;
  }
  
  const sorted = getSortedChampions(state.stats.byChampion, state.championsSort);
  
  tbody.innerHTML = sorted.map(champ => `
    <tr>
      <td>
        <div class="flex items-center gap-2">
          <img src="${getChampionImageUrl(champ.championName)}" 
               alt="${champ.championName}" 
               class="w-8 h-8 rounded"
               onerror="this.style.display='none'">
          <span class="font-medium">${champ.championName}</span>
        </div>
      </td>
      <td class="text-center">${champ.games}</td>
      <td class="text-center">
        <span class="badge ${champ.winRate >= 50 ? 'badge-default' : 'badge-destructive'} ${champ.winRate >= 50 ? 'bg-green-500' : ''}">
          ${champ.winRate.toFixed(0)}%
        </span>
      </td>
      <td class="text-center">
        <span class="text-green-500">${champ.avgKills.toFixed(1)}</span>
        <span class="text-muted-foreground">/</span>
        <span class="text-red-500">${champ.avgDeaths.toFixed(1)}</span>
        <span class="text-muted-foreground">/</span>
        <span class="text-blue-500">${champ.avgAssists.toFixed(1)}</span>
      </td>
      <td class="text-center">${champ.avgCS.toFixed(0)}</td>
      <td class="text-center">${champ.avgCSPerMin.toFixed(2)}</td>
      <td class="text-center">
        <span class="${champ.avgKDR >= 0 ? 'text-green-500' : 'text-red-500'}">
          ${champ.avgKDR.toFixed(2)}
        </span>
      </td>
      <td class="text-center">
        <span class="${champ.surviveRate >= 50 ? 'text-green-500' : champ.surviveRate >= 30 ? 'text-yellow-500' : 'text-red-500'}">
          ${champ.surviveRate}%
        </span>
      </td>
      <td class="text-center">
        <span class="${champ.csConsistency >= 70 ? 'text-green-500' : champ.csConsistency >= 40 ? 'text-yellow-500' : 'text-red-500'}">
          ${champ.csConsistency}%
        </span>
      </td>
    </tr>
  `).join('');
}

function renderLanes() {
  const grid = document.getElementById('lanesGrid');
  
  if (!state.stats || state.stats.byLane.length === 0) {
    grid.innerHTML = '<div class="text-center py-12 text-muted-foreground w-full">Nessuna statistica disponibile</div>';
    return;
  }
  
  grid.innerHTML = state.stats.byLane.map(lane => `
    <div class="lane-card">
      <div class="lane-card-header">
        ${LANE_ICONS[lane.lane] || ''}
        <span class="lane-card-title" style="color: ${LANE_COLORS[lane.lane] || '#888'}">${lane.lane}</span>
      </div>
      <p class="lane-card-description">${lane.games} partite</p>
      <div class="lane-card-content">
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span>Win Rate</span>
            <span class="font-medium">${lane.winRate.toFixed(1)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${lane.winRate}%"></div>
          </div>
        </div>
        
        <div class="lane-stats">
          <div>
            <p class="lane-stat-value text-green-500">${lane.avgKills.toFixed(1)}</p>
            <p class="lane-stat-label">Kills</p>
          </div>
          <div>
            <p class="lane-stat-value text-red-500">${lane.avgDeaths.toFixed(1)}</p>
            <p class="lane-stat-label">Deaths</p>
          </div>
          <div>
            <p class="lane-stat-value text-blue-500">${lane.avgAssists.toFixed(1)}</p>
            <p class="lane-stat-label">Assists</p>
          </div>
        </div>
        
        <div class="separator"></div>
        
        <div class="lane-stats">
          <div>
            <p class="font-medium">${lane.avgCSPerMin.toFixed(2)}</p>
            <p class="lane-stat-label">CS/min</p>
          </div>
          <div>
            <p class="font-medium ${lane.avgKDR >= 0 ? 'text-green-500' : 'text-red-500'}">${lane.avgKDR.toFixed(2)}</p>
            <p class="lane-stat-label">KDR</p>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderDrills() {
  const tbody = document.getElementById('drillsTableBody');
  const drills = state.drills.filter(d => d.summonerId === state.selectedSummonerId);
  
  if (drills.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-12">
          <div class="text-muted-foreground">
            <svg class="icon-lg mx-auto mb-4" style="width:48px;height:48px;opacity:0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6.5 6.5L17.5 17.5"/>
              <path d="M7 2h10"/>
              <path d="M2 7v10"/>
              <path d="M22 7v10"/>
            </svg>
            <p>Nessun drill registrato</p>
            <p class="text-sm">Aggiungi una sessione di allenamento</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = drills.map(drill => `
    <tr>
      <td>${new Date(drill.date).toLocaleDateString('it-IT')}</td>
      <td>${drill.champion || '-'}</td>
      <td class="text-center">${drill.csDrill || '-'}</td>
      <td class="text-center">${drill.minute || '-'}</td>
      <td class="text-center">
        ${drill.csDrill && drill.minute ? (drill.csDrill / drill.minute).toFixed(2) : '-'}
      </td>
      <td>${drill.focus || '-'}</td>
      <td>${drill.mode || '-'}</td>
      <td>
        <div class="flex gap-1">
          <button class="btn btn-icon btn-sm text-blue-500" data-action="edit-drill" data-id="${drill.id}" title="Modifica">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn btn-icon btn-sm text-red-500" data-action="delete-drill" data-id="${drill.id}" title="Elimina">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  document.querySelectorAll('[data-action="edit-drill"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const drill = state.drills.find(d => d.id === btn.dataset.id);
      if (drill) {
        document.getElementById('editDrillId').value = drill.id;
        document.getElementById('editDrillCS').value = drill.csDrill || '';
        document.getElementById('editDrillMinutes').value = drill.minute || '';
        document.getElementById('editDrillMode').value = drill.mode || 'Practice Tool';
        document.getElementById('editDrillChampion').value = drill.champion || '';
        document.getElementById('editDrillFocus').value = drill.focus || '';
        document.getElementById('editDrillRunes').value = drill.runes || '';
        document.getElementById('editDrillRuneShard').value = drill.runeShard || '';
        document.getElementById('editDrillNotes').value = drill.notes || '';
        openModal('editDrillModal');
      }
    });
  });
  
  document.querySelectorAll('[data-action="delete-drill"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.drills = state.drills.filter(d => d.id !== btn.dataset.id);
      saveSummoners();
      renderDrills();
      showToast('Drill eliminato');
    });
  });
}

function renderSettings() {
  const grid = document.getElementById('settingsGrid');
  
  state.laneSettings = { ...state.settings };
  
  grid.innerHTML = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'].map(lane => {
    const killKey = `${lane.toLowerCase()}KillMultiplier`;
    const assistKey = `${lane.toLowerCase()}AssistMultiplier`;
    return `
      <div class="settings-card">
        <div class="settings-card-header">
          ${LANE_ICONS[lane]}
          <span style="color: ${LANE_COLORS[lane]}">${lane}</span>
        </div>
        <div class="settings-card-content">
          <div class="form-group">
            <label class="form-label text-xs">Moltiplicatore Kill</label>
            <input type="number" class="input" step="0.05" value="${state.laneSettings[killKey]}" data-key="${killKey}">
          </div>
          <div class="form-group">
            <label class="form-label text-xs">Moltiplicatore Assist</label>
            <input type="number" class="input" step="0.05" value="${state.laneSettings[assistKey]}" data-key="${assistKey}">
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('#settingsGrid input').forEach(input => {
    input.addEventListener('change', () => {
      state.laneSettings[input.dataset.key] = parseFloat(input.value) || 0.5;
    });
  });
}

function selectSummoner(id) {
  state.selectedSummonerId = id;
  renderSummoners();
  updateDashboard();
}

function calculateConsistency(values) {
  if (values.length < 2) return 100;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;
  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
}

function renderProgress() {
  const trackedChampions = new Set(state.matches.map(m => m.championName));
  const totalChampions = Object.keys(CHAMPION_ROLES).length;
  const completion = totalChampions > 0 ? Math.round((trackedChampions.size / totalChampions) * 100) : 0;
  
  document.getElementById('progressChampionsTracked').textContent = trackedChampions.size;
  document.getElementById('progressChampionsTotal').textContent = totalChampions;
  document.getElementById('progressCompletion').textContent = `${completion}%`;
  document.getElementById('progressBar').style.width = `${completion}%`;
  
  const doneCount = trackedChampions.size;
  const missingCount = totalChampions - trackedChampions.size;
  const availableCount = trackedChampions.size;
  
  document.getElementById('statusDone').textContent = doneCount;
  document.getElementById('statusMissing').textContent = missingCount;
  document.getElementById('statusAvailable').textContent = availableCount;
  
  const drills = state.drills.filter(d => d.summonerId === state.selectedSummonerId);
  const totalSessions = drills.length;
  const totalCS = drills.reduce((sum, d) => sum + (d.csDrill || 0), 0);
  const totalMinutes = drills.reduce((sum, d) => sum + (d.minute || 0), 0);
  const avgCSMin = totalMinutes > 0 ? (totalCS / totalMinutes).toFixed(2) : '0.00';
  
  document.getElementById('drillTotalSessions').textContent = totalSessions;
  document.getElementById('drillAvgCSMin').textContent = avgCSMin;
  document.getElementById('drillTotalCS').textContent = totalCS.toLocaleString();
  document.getElementById('drillTotalMinutes').textContent = totalMinutes;
  
  const lanes = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const rolesGrid = document.getElementById('rolesGrid');
  
  rolesGrid.innerHTML = lanes.map(lane => {
    const laneChampions = Object.entries(CHAMPION_ROLES)
      .filter(([_, roles]) => roles.primary === lane || roles.secondary === lane)
      .map(([name]) => name);
    const trackedInLane = laneChampions.filter(c => trackedChampions.has(c)).length;
    return `
      <div class="role-card">
        <div class="role-card-header">
          ${LANE_ICONS[lane] || ''}
          <span class="role-card-title" style="color: ${LANE_COLORS[lane]}">${lane}</span>
        </div>
        <p class="role-card-count">${trackedInLane}/${laneChampions.length}</p>
        <p class="role-card-champions">campioni tracciati</p>
      </div>
    `;
  }).join('');
}

let drillCSPerMinChart = null;
let drillCSChart = null;
let drillModeChart = null;
let drillChampionChart = null;

function renderDrillCharts() {
  const drills = state.drills.filter(d => d.summonerId === state.selectedSummonerId);
  const sortedDrills = [...drills].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (sortedDrills.length === 0) {
    if (drillCSPerMinChart) drillCSPerMinChart.destroy();
    if (drillCSChart) drillCSChart.destroy();
    if (drillModeChart) drillModeChart.destroy();
    if (drillChampionChart) drillChampionChart.destroy();
    document.getElementById('csConsistencyBar').style.width = '0%';
    document.getElementById('csConsistencyValue').textContent = '0%';
    document.getElementById('csMinConsistencyBar').style.width = '0%';
    document.getElementById('csMinConsistencyValue').textContent = '0%';
    document.getElementById('kdrConsistencyBar').style.width = '0%';
    document.getElementById('kdrConsistencyValue').textContent = '0%';
    document.getElementById('goldConsistencyBar').style.width = '0%';
    document.getElementById('goldConsistencyValue').textContent = '0%';
    return;
  }
  
  const csPerMinValues = sortedDrills.map(d => d.csDrill && d.minute ? d.csDrill / d.minute : 0);
  const csValues = sortedDrills.map(d => d.csDrill || 0);
  
  if (drillCSPerMinChart) drillCSPerMinChart.destroy();
  const csPerMinCtx = document.getElementById('drillCSPerMinChart').getContext('2d');
  drillCSPerMinChart = new Chart(csPerMinCtx, {
    type: 'line',
    data: {
      labels: sortedDrills.map(d => new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })),
      datasets: [{
        label: 'CS/min',
        data: csPerMinValues,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
  
  if (drillCSChart) drillCSChart.destroy();
  const csCtx = document.getElementById('drillCSChart').getContext('2d');
  drillCSChart = new Chart(csCtx, {
    type: 'bar',
    data: {
      labels: sortedDrills.map(d => new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })),
      datasets: [{
        label: 'CS Totali',
        data: csValues,
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
  
  const modeCounts = {};
  drills.forEach(d => {
    const mode = d.mode || 'Unknown';
    modeCounts[mode] = (modeCounts[mode] || 0) + 1;
  });
  
  if (drillModeChart) drillModeChart.destroy();
  const modeCtx = document.getElementById('drillModeChart').getContext('2d');
  drillModeChart = new Chart(modeCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(modeCounts),
      datasets: [{
        data: Object.values(modeCounts),
        backgroundColor: ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
  
  const championCounts = {};
  drills.forEach(d => {
    const champ = d.champion || 'Unknown';
    championCounts[champ] = (championCounts[champ] || 0) + 1;
  });
  const sortedChampions = Object.entries(championCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  if (drillChampionChart) drillChampionChart.destroy();
  const champCtx = document.getElementById('drillChampionChart').getContext('2d');
  drillChampionChart = new Chart(champCtx, {
    type: 'bar',
    data: {
      labels: sortedChampions.map(c => c[0]),
      datasets: [{
        label: 'Sessioni',
        data: sortedChampions.map(c => c[1]),
        backgroundColor: '#a855f7',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: { x: { beginAtZero: true } }
    }
  });
  
  const csConsistency = calculateConsistency(csValues.filter(v => v > 0));
  const csMinConsistency = calculateConsistency(csPerMinValues.filter(v => v > 0));
  
  document.getElementById('csConsistencyBar').style.width = `${csConsistency}%`;
  document.getElementById('csConsistencyValue').textContent = `${csConsistency}%`;
  document.getElementById('csMinConsistencyBar').style.width = `${csMinConsistency}%`;
  document.getElementById('csMinConsistencyValue').textContent = `${csMinConsistency}%`;
  
  const kdrValues = state.matches.map(m => m.kdr || 0);
  const goldValues = state.matches.map(m => m.goldPerMin || 0);
  const kdrConsistency = calculateConsistency(kdrValues);
  const goldConsistency = calculateConsistency(goldValues);
  
  document.getElementById('kdrConsistencyBar').style.width = `${kdrConsistency}%`;
  document.getElementById('kdrConsistencyValue').textContent = `${kdrConsistency}%`;
  document.getElementById('goldConsistencyBar').style.width = `${goldConsistency}%`;
  document.getElementById('goldConsistencyValue').textContent = `${goldConsistency}%`;
}

function renderPerformance() {
  const drills = state.drills.filter(d => d.summonerId === state.selectedSummonerId);
  const validDrills = drills.filter(d => d.csDrill && d.minute);
  
  const totalCS = validDrills.reduce((sum, d) => sum + d.csDrill, 0);
  const totalMinutes = validDrills.reduce((sum, d) => sum + d.minute, 0);
  const overallCSMin = totalMinutes > 0 ? (totalCS / totalMinutes).toFixed(2) : '0.00';
  
  document.getElementById('perfOverallCSMin').textContent = overallCSMin;
  
  const targetCSPerMin = 8;
  const avgCSMin = totalMinutes > 0 ? totalCS / totalMinutes : 0;
  const csRate = targetCSPerMin > 0 ? Math.min(100, Math.round((avgCSMin / targetCSPerMin) * 100)) : 0;
  document.getElementById('perfAvgCSRate').textContent = `${csRate}%`;
  
  const matches = state.matches;
  const zeroDeathGames = matches.filter(m => m.deaths === 0).length;
  const surviveRate = matches.length > 0 ? Math.round((zeroDeathGames / matches.length) * 100) : 0;
  document.getElementById('perfSurviveRate').textContent = `${surviveRate}%`;
  
  const avgKDR = matches.length > 0 ? (matches.reduce((sum, m) => sum + (m.kdr || 0), 0) / matches.length).toFixed(2) : '0.00';
  document.getElementById('perfKDR').textContent = avgKDR;
  
  const runeCounts = {};
  drills.forEach(d => {
    if (d.runes) {
      runeCounts[d.runes] = (runeCounts[d.runes] || 0) + 1;
    }
  });
  
  const runesSummary = document.getElementById('runesSummary');
  if (Object.keys(runeCounts).length > 0) {
    runesSummary.innerHTML = Object.entries(runeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([rune, count]) => `<span class="rune-badge">${rune} (${count})</span>`)
      .join('');
  } else {
    runesSummary.innerHTML = '<p class="text-muted-foreground">Nessuna runa registrata</p>';
  }
}

function renderMetadata() {
  const created = localStorage.getItem('lol-tracker-created');
  const lastAccess = localStorage.getItem('lol-tracker-last-access');
  
  document.getElementById('metaCreated').textContent = created 
    ? new Date(created).toLocaleDateString('it-IT') 
    : '-';
  document.getElementById('metaLastAccess').textContent = lastAccess 
    ? new Date(lastAccess).toLocaleDateString('it-IT') 
    : '-';
  
  let totalSize = 0;
  for (let key in localStorage) {
    if (key.startsWith('lol-tracker-')) {
      totalSize += localStorage[key].length * 2;
    }
  }
  const storageMB = (totalSize / (1024 * 1024)).toFixed(2);
  document.getElementById('metaStorageUsed').textContent = `${storageMB} MB`;
  
  document.getElementById('metaSummoners').textContent = state.summoners.length;
  document.getElementById('metaMatches').textContent = state.matches.length;
  document.getElementById('metaDrills').textContent = state.drills.length;
  
  const uniqueChampions = new Set(state.matches.map(m => m.championName));
  document.getElementById('metaChampions').textContent = uniqueChampions.size;
  document.getElementById('metaDDVersion').textContent = DD_VERSION;
}

function renderDrillInstructions() {
  const grid = document.getElementById('drillInstructionsGrid');
  
  grid.innerHTML = DRILL_CATEGORIES.map(category => {
    const categoryDrills = DRILL_INSTRUCTIONS.filter(d => d.category === category);
    return `
      <div class="drill-instruction-category">
        <h4 class="drill-instruction-category-title">${category}</h4>
        ${categoryDrills.map(drill => `
          <div class="drill-instruction-card">
            <div class="drill-instruction-header">
              <h5 class="drill-instruction-name">${drill.drill}</h5>
              <div class="drill-instruction-conditions">
                ${drill.conditions.map(c => `<span class="drill-condition">${c}</span>`).join('')}
              </div>
            </div>
            <p class="drill-instruction-setup"><strong>Setup:</strong> ${drill.setup}</p>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function renderChampionList() {
  const tbody = document.getElementById('championListTableBody');
  const filter = document.getElementById('championListFilter').value;
  
  let champions = Object.entries(CHAMPION_ROLES);
  
  if (filter !== 'ALL') {
    champions = champions.filter(([_, roles]) => 
      roles.primary === filter || roles.secondary === filter
    );
  }
  
  champions.sort((a, b) => a[0].localeCompare(b[0]));
  
  tbody.innerHTML = champions.map(([name, roles]) => `
    <tr>
      <td>
        <div class="flex items-center gap-2">
          <img src="${getChampionImageUrl(name)}" 
               alt="${name}" 
               class="w-8 h-8 rounded"
               onerror="this.style.display='none'">
          <span class="font-medium">${name}</span>
        </div>
      </td>
      <td>
        <span class="badge badge-outline" style="border-color: ${LANE_COLORS[roles.primary] || '#888'}; color: ${LANE_COLORS[roles.primary] || '#888'}">
          ${LANE_ICONS[roles.primary] || ''}
          <span class="ml-1">${roles.primary}</span>
        </span>
      </td>
      <td>
        ${roles.secondary 
          ? `<span class="badge badge-outline" style="border-color: ${LANE_COLORS[roles.secondary] || '#888'}; color: ${LANE_COLORS[roles.secondary] || '#888'}">
              ${LANE_ICONS[roles.secondary] || ''}
              <span class="ml-1">${roles.secondary}</span>
            </span>`
          : '<span class="text-muted-foreground">-</span>'
        }
      </td>
    </tr>
  `).join('');
}

function updateDashboard() {
  const dashboard = document.getElementById('dashboard');
  const emptyState = document.getElementById('emptyState');
  
  if (!state.selectedSummonerId) {
    dashboard.classList.add('hidden');
    emptyState.classList.remove('hidden');
  } else {
    dashboard.classList.remove('hidden');
    emptyState.classList.add('hidden');
    calculateStats();
    renderChampionFilter();
    renderMatches();
    renderStats();
    renderChampions();
    renderLanes();
    renderDrills();
    renderProgress();
    renderMetadata();
    
    if (!localStorage.getItem('lol-tracker-created')) {
      localStorage.setItem('lol-tracker-created', new Date().toISOString());
    }
    localStorage.setItem('lol-tracker-last-access', new Date().toISOString());
  }
}



async function init() {
  await loadSummoners();
  
  if (state.summoners.length === 0) {
    state.selectedSummonerId = null;
  } else if (!state.selectedSummonerId) {
    state.selectedSummonerId = state.summoners[0].id;
  }
  
  state.matches.forEach(match => {
    if (!match.kdr) {
      match.kdr = calculateKDR(match.kills, match.deaths, match.assists, match.lane);
      match.csPerMin = calculateCSPerMin(match.cs, match.gameDuration);
      match.goldPerMin = calculateGoldPerMin(match.gold, match.gameDuration);
      match.durationMinutes = Math.round(match.gameDuration / 60);
      match.durationFormatted = formatDuration(match.gameDuration);
    }
  });
  
  state.matches.sort((a, b) => new Date(b.gameCreation) - new Date(a.gameCreation));
  
  renderSummoners();
  updateDashboard();
  
  document.querySelectorAll('.tabs-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => switchTab(trigger.dataset.tab));
  });
  
  document.getElementById('addSummonerBtn').addEventListener('click', () => openModal('addSummonerModal'));
  document.getElementById('emptyAddBtn').addEventListener('click', () => openModal('addSummonerModal'));
  
  document.getElementById('cancelAddSummoner').addEventListener('click', () => closeModal('addSummonerModal'));
  document.getElementById('confirmAddSummoner').addEventListener('click', async () => {
    const name = document.getElementById('summonerName').value.trim();
    const tag = document.getElementById('summonerTag').value.trim().toUpperCase();
    
    if (!name || !tag) {
      showToast('Inserisci nome e tag dell\'evocatore', 'error');
      return;
    }
    
    const exists = state.summoners.find(s => s.summonerName.toLowerCase() === name.toLowerCase() && s.tagLine.toLowerCase() === tag.toLowerCase());
    if (exists) {
      showToast('Evocatore già esistente', 'error');
      return;
    }
    
    try {
      showToast('Recupero dati evocatore...');
      
      const summonerData = await fetchSummonerData(name, tag);
      
      const newSummoner = {
        id: `s-${Date.now()}`,
        riotPuuid: summonerData.puuid,
        summonerName: summonerData.name,
        tagLine: tag,
        profileIconId: summonerData.profileIconId,
        summonerLevel: summonerData.summonerLevel,
        lastSyncAt: null,
        lastMatchTime: null,
        _count: { matches: 0 }
      };
      
      state.summoners.unshift(newSummoner);
      state.selectedSummonerId = newSummoner.id;
      
      saveSummoners();
      renderSummoners();
      updateDashboard();
      closeModal('addSummonerModal');
      
      document.getElementById('summonerName').value = '';
      document.getElementById('summonerTag').value = '';
      
      showToast(`Evocatore ${name}#${tag} aggiunto!`);
    } catch (error) {
      showToast(`Errore: ${error.message}`, 'error');
    }
  });
  
  document.getElementById('cancelDelete').addEventListener('click', () => closeModal('deleteModal'));
  document.getElementById('confirmDelete').addEventListener('click', () => {
    if (state.deleteConfirmId) {
      state.summoners = state.summoners.filter(s => s.id !== state.deleteConfirmId);
      if (state.selectedSummonerId === state.deleteConfirmId) {
        state.selectedSummonerId = state.summoners[0]?.id || null;
      }
      if (state.selectedSummonerId) {
        const selected = state.summoners.find(s => s.id === state.selectedSummonerId);
        state.matches = state.matches.filter(m => m.summoner?.summonerName !== selected?.summonerName || m.summoner?.tagLine !== selected?.tagLine);
      }
      saveSummoners();
      renderSummoners();
      updateDashboard();
      closeModal('deleteModal');
      showToast('Evocatore rimosso');
    }
  });
  
  document.getElementById('settingsBtn').addEventListener('click', () => {
    renderSettings();
    document.getElementById('syncDays').value = state.settings.defaultSyncDays;
    openModal('settingsModal');
  });
  
  document.getElementById('cancelSettings').addEventListener('click', () => closeModal('settingsModal'));
  document.getElementById('saveSettings').addEventListener('click', () => {
    state.settings = {
      ...state.settings,
      ...state.laneSettings,
      defaultSyncDays: parseInt(document.getElementById('syncDays').value) || 30
    };
    
    state.matches.forEach(match => {
      match.kdr = calculateKDR(match.kills, match.deaths, match.assists, match.lane);
    });
    
    calculateStats();
    renderStats();
    renderChampions();
    renderLanes();
    
    closeModal('settingsModal');
    showToast('Impostazioni salvate');
  });
  
  document.getElementById('syncBtn').addEventListener('click', () => {
    document.getElementById('syncDaysModal').value = state.settings.defaultSyncDays;
    document.getElementById('syncDaysLabel').textContent = state.settings.defaultSyncDays;
    openModal('syncModal');
  });
  
  document.getElementById('syncDaysModal').addEventListener('change', (e) => {
    document.getElementById('syncDaysLabel').textContent = e.target.value;
  });
  
  document.getElementById('syncFull').addEventListener('click', async () => {
    const summoner = state.summoners.find(s => s.id === state.selectedSummonerId);
    if (!summoner) {
      showToast('Nessun evocatore selezionato', 'error');
      return;
    }
    
    if (!summoner.summonerName || !summoner.tagLine) {
      showToast('Dati evocatore incompleti', 'error');
      console.error('Invalid summoner data:', summoner);
      return;
    }
    
    closeModal('syncModal');
    const days = parseInt(document.getElementById('syncDaysModal').value) || 30;
    
    try {
      await syncSummoner(summoner, days);
      renderSummoners();
      updateDashboard();
    } catch (e) {
      console.error('Sync failed:', e);
    }
  });
  
  document.getElementById('syncIncremental').addEventListener('click', async () => {
    const summoner = state.summoners.find(s => s.id === state.selectedSummonerId);
    if (!summoner) {
      showToast('Nessun evocatore selezionato', 'error');
      return;
    }
    
    if (!summoner.summonerName || !summoner.tagLine) {
      showToast('Dati evocatore incompleti', 'error');
      console.error('Invalid summoner data:', summoner);
      return;
    }
    
    closeModal('syncModal');
    
    try {
      await syncIncremental(summoner);
      renderSummoners();
      updateDashboard();
    } catch (e) {
      console.error('Sync failed:', e);
    }
  });
  
  document.getElementById('laneFilter').addEventListener('change', (e) => {
    state.selectedLane = e.target.value;
    calculateStats();
    renderMatches();
    renderStats();
    renderChampions();
    renderLanes();
  });
  
  document.getElementById('championFilter').addEventListener('change', (e) => {
    state.selectedChampion = e.target.value;
    calculateStats();
    renderMatches();
    renderStats();
    renderChampions();
    renderLanes();
  });
  
  document.getElementById('championListFilter').addEventListener('change', () => {
    renderChampionList();
  });
  
  document.querySelectorAll('.table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.championsSort.key === key) {
        if (state.championsSort.direction === 'desc') {
          state.championsSort.direction = 'asc';
        } else if (state.championsSort.direction === 'asc') {
          state.championsSort = { key: 'games', direction: 'desc' };
        }
      } else {
        state.championsSort = { key, direction: 'desc' };
      }
      
      document.querySelectorAll('.table th.sortable').forEach(header => {
        header.classList.toggle('active', header.dataset.sort === state.championsSort.key);
      });
      
      renderChampions();
    });
  });
  
  document.getElementById('addDrillBtn').addEventListener('click', () => openModal('addDrillModal'));
  
  document.getElementById('cancelAddDrill').addEventListener('click', () => closeModal('addDrillModal'));
  document.getElementById('confirmAddDrill').addEventListener('click', () => {
    const csDrill = document.getElementById('drillCS').value;
    const minute = document.getElementById('drillMinutes').value;
    const mode = document.getElementById('drillMode').value;
    const champion = document.getElementById('drillChampion').value;
    const focus = document.getElementById('drillFocus').value;
    const runes = document.getElementById('drillRunes').value;
    const runeShard = document.getElementById('drillRuneShard').value;
    const notes = document.getElementById('drillNotes').value;
    
    const newDrill = {
      id: `d-${Date.now()}`,
      summonerId: state.selectedSummonerId,
      date: new Date().toISOString(),
      csDrill: csDrill ? parseInt(csDrill) : null,
      minute: minute ? parseInt(minute) : null,
      mode: mode || null,
      champion: champion || null,
      focus: focus || null,
      runes: runes || null,
      runeShard: runeShard || null,
      notes: notes || null,
      createdAt: new Date().toISOString()
    };
    
    state.drills.unshift(newDrill);
    saveSummoners();
    renderDrills();
    closeModal('addDrillModal');
    
    document.getElementById('drillCS').value = '';
    document.getElementById('drillMinutes').value = '10';
    document.getElementById('drillChampion').value = '';
    document.getElementById('drillFocus').value = '';
    document.getElementById('drillRunes').value = '';
    document.getElementById('drillRuneShard').value = '';
    document.getElementById('drillNotes').value = '';
    
    showToast('Drill aggiunto!');
  });
  
  document.getElementById('cancelEditDrill').addEventListener('click', () => closeModal('editDrillModal'));
  document.getElementById('saveEditDrill').addEventListener('click', () => {
    const drillId = document.getElementById('editDrillId').value;
    const drill = state.drills.find(d => d.id === drillId);
    
    if (drill) {
      drill.csDrill = document.getElementById('editDrillCS').value ? parseInt(document.getElementById('editDrillCS').value) : null;
      drill.minute = document.getElementById('editDrillMinutes').value ? parseInt(document.getElementById('editDrillMinutes').value) : null;
      drill.mode = document.getElementById('editDrillMode').value || null;
      drill.champion = document.getElementById('editDrillChampion').value || null;
      drill.focus = document.getElementById('editDrillFocus').value || null;
      drill.runes = document.getElementById('editDrillRunes').value || null;
      drill.runeShard = document.getElementById('editDrillRuneShard').value || null;
      drill.notes = document.getElementById('editDrillNotes').value || null;
      
      saveSummoners();
      renderDrills();
      closeModal('editDrillModal');
      showToast('Drill modificato!');
    }
  });
  
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
