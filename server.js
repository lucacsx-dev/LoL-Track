/* ═══════════════════════════════════════════════════════════
   LoL Tracker — Node.js / Express Backend
   Riot API integration + SQLite storage (via sql.js)
   ═══════════════════════════════════════════════════════════ */

const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Configuration ───────────────────────────────────────
const PORT = process.env.PORT || 3000;
const RIOT_API_KEY = process.env.RIOT_API_KEY || 'RGAPI-e2a60f7e-0f62-4a85-b3d9-dca7de9fcc07';
const RIOT_REGION = process.env.RIOT_REGION || 'europe';
const RIOT_PLATFORM = process.env.RIOT_PLATFORM || 'euw1';
const DB_PATH = path.join(__dirname, 'lol-tracker.db');

// ─── Globals ─────────────────────────────────────────────
let db;
let ddVersion = '14.1.1';
let ddChampions = [];
const syncingSummoners = new Set();

// ─── Database Helpers ────────────────────────────────────
function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows[0] || null;
}

// ─── Riot API Helpers ────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function riotFetch(url) {
  await sleep(80);
  const res = await fetch(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
    console.log(`⏳ Rate limited — retrying in ${retryAfter}s …`);
    await sleep(retryAfter * 1000);
    return riotFetch(url);
  }

  if (res.status === 403) {
    throw new Error('API Key non valida o scaduta. Rigenera la chiave su developer.riotgames.com');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Riot API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

function mapLane(teamPosition) {
  const map = { TOP: 'TOP', JUNGLE: 'JUNGLE', MIDDLE: 'MID', BOTTOM: 'ADC', UTILITY: 'SUPPORT' };
  return map[teamPosition] || 'OTHER';
}

// ─── Data Helpers ────────────────────────────────────────
function getSettings() {
  return dbGet('SELECT * FROM settings WHERE id = 1');
}

function computeKDR(kills, deaths, assists, lane, settings) {
  const laneKey = lane.toLowerCase();
  const killMult = settings[`${laneKey}KillMultiplier`] ?? 0.5;
  const assistMult = settings[`${laneKey}AssistMultiplier`] ?? 0.85;
  return kills * killMult + assists * assistMult - deaths;
}

function formatMatch(m, settings) {
  const durationMin = m.duration / 60;
  const minutes = Math.floor(m.duration / 60);
  const seconds = m.duration % 60;
  return {
    ...m,
    win: !!m.win,
    durationFormatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    kdr: computeKDR(m.kills, m.deaths, m.assists, m.lane, settings),
    csPerMin: durationMin > 0 ? m.cs / durationMin : 0,
    goldPerMin: durationMin > 0 ? m.gold / durationMin : 0,
  };
}

function queryMatches(summonerId, lane, champion) {
  let sql = 'SELECT * FROM matches WHERE summonerId = ?';
  const params = [summonerId];
  if (lane && lane !== 'ALL') { sql += ' AND lane = ?'; params.push(lane); }
  if (champion && champion !== 'ALL') { sql += ' AND championName = ?'; params.push(champion); }
  sql += ' ORDER BY gameCreation DESC';
  return dbAll(sql, params);
}

function computeStats(rawMatches, settings) {
  const empty = {
    overall: { winRate: 0, wins: 0, losses: 0, avgKDR: 0, avgCSPerMin: 0, avgDuration: '0', avgKills: 0, avgDeaths: 0, avgAssists: 0 },
    winRateOverTime: [], kdaDistribution: [], byChampion: [], byLane: [], settings,
  };
  if (rawMatches.length === 0) return empty;

  const matches = rawMatches.map((m) => formatMatch(m, settings));
  const total = matches.length;
  const wins = matches.filter((m) => m.win).length;

  const overall = {
    winRate: (wins / total) * 100,
    wins,
    losses: total - wins,
    avgKDR: matches.reduce((s, m) => s + m.kdr, 0) / total,
    avgCSPerMin: matches.reduce((s, m) => s + m.csPerMin, 0) / total,
    avgDuration: Math.round(matches.reduce((s, m) => s + m.duration / 60, 0) / total).toString(),
    avgKills: matches.reduce((s, m) => s + m.kills, 0) / total,
    avgDeaths: matches.reduce((s, m) => s + m.deaths, 0) / total,
    avgAssists: matches.reduce((s, m) => s + m.assists, 0) / total,
  };

  // Win Rate Over Time
  const byDate = {};
  matches.forEach((m) => {
    const date = new Date(m.gameCreation).toISOString().slice(0, 10);
    if (!byDate[date]) byDate[date] = { wins: 0, total: 0 };
    byDate[date].total++;
    if (m.win) byDate[date].wins++;
  });
  const winRateOverTime = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, winRate: (d.wins / d.total) * 100 }));

  // KDR Distribution
  const ranges = [
    { range: '< −5', min: -Infinity, max: -5 },
    { range: '−5 ~ −3', min: -5, max: -3 },
    { range: '−3 ~ −1', min: -3, max: -1 },
    { range: '−1 ~ 0', min: -1, max: 0 },
    { range: '0 ~ 1', min: 0, max: 1 },
    { range: '1 ~ 3', min: 1, max: 3 },
    { range: '3 ~ 5', min: 3, max: 5 },
    { range: '> 5', min: 5, max: Infinity },
  ];
  const kdaDistribution = ranges.map((r) => ({
    range: r.range,
    count: matches.filter((m) => m.kdr >= r.min && m.kdr < r.max).length,
  }));

  // By Champion
  const champGroups = {};
  matches.forEach((m) => { (champGroups[m.championName] ??= []).push(m); });
  const byChampion = Object.entries(champGroups).map(([name, g]) => {
    const w = g.filter((m) => m.win).length;
    return {
      championName: name, games: g.length,
      winRate: (w / g.length) * 100,
      avgKills: g.reduce((s, m) => s + m.kills, 0) / g.length,
      avgDeaths: g.reduce((s, m) => s + m.deaths, 0) / g.length,
      avgAssists: g.reduce((s, m) => s + m.assists, 0) / g.length,
      avgCS: g.reduce((s, m) => s + m.cs, 0) / g.length,
      avgCSPerMin: g.reduce((s, m) => s + m.csPerMin, 0) / g.length,
      avgKDR: g.reduce((s, m) => s + m.kdr, 0) / g.length,
    };
  });

  // By Lane
  const laneGroups = {};
  matches.forEach((m) => { (laneGroups[m.lane] ??= []).push(m); });
  const byLane = Object.entries(laneGroups).map(([lane, g]) => {
    const w = g.filter((m) => m.win).length;
    return {
      lane, games: g.length,
      winRate: (w / g.length) * 100,
      avgKills: g.reduce((s, m) => s + m.kills, 0) / g.length,
      avgDeaths: g.reduce((s, m) => s + m.deaths, 0) / g.length,
      avgAssists: g.reduce((s, m) => s + m.assists, 0) / g.length,
      avgCSPerMin: g.reduce((s, m) => s + m.csPerMin, 0) / g.length,
      avgKDR: g.reduce((s, m) => s + m.kdr, 0) / g.length,
    };
  });

  return { overall, winRateOverTime, kdaDistribution, byChampion, byLane, settings };
}

// ─── Data Dragon ─────────────────────────────────────────
async function refreshDataDragon() {
  try {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await res.json();
    ddVersion = versions[0];
    dbRun('UPDATE settings SET dataDragonVersion = ? WHERE id = 1', [ddVersion]);

    const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/data/en_US/champion.json`);
    const champData = await champRes.json();
    ddChampions = Object.keys(champData.data).sort();
    console.log(`✓ Data Dragon ${ddVersion} — ${ddChampions.length} champions loaded`);
  } catch (err) {
    console.error('⚠ Data Dragon fetch failed:', err.message);
  }
}

// ═══ Express App ═════════════════════════════════════════
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname, { index: 'index.html' }));

// ─── GET /api/summoners ──
app.get('/api/summoners', (_req, res) => {
  const rows = dbAll(
    `SELECT s.*, (SELECT COUNT(*) FROM matches m WHERE m.summonerId = s.id) AS matchCount
     FROM summoners s ORDER BY s.createdAt DESC`
  );
  res.json(rows.map((r) => ({ ...r, _count: { matches: r.matchCount }, isSyncing: syncingSummoners.has(r.id) })));
});

// ─── POST /api/summoners ──
app.post('/api/summoners', async (req, res) => {
  try {
    const { gameName, tagLine } = req.body;
    if (!gameName || !tagLine) return res.status(400).json({ error: 'Nome e Tag obbligatori' });

    const existing = dbGet(
      'SELECT id FROM summoners WHERE LOWER(summonerName) = LOWER(?) AND LOWER(tagLine) = LOWER(?)',
      [gameName, tagLine]
    );
    if (existing) return res.status(400).json({ error: 'Evocatore già aggiunto' });

    const account = await riotFetch(
      `https://${RIOT_REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );
    const summoner = await riotFetch(
      `https://${RIOT_PLATFORM}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`
    );

    const id = crypto.randomUUID();
    dbRun(
      `INSERT INTO summoners (id, puuid, summonerName, tagLine, profileIconId, summonerLevel)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, account.puuid, account.gameName, account.tagLine, summoner.profileIconId, summoner.summonerLevel]
    );

    const created = dbGet('SELECT * FROM summoners WHERE id = ?', [id]);
    res.json({ ...created, _count: { matches: 0 } });
  } catch (err) {
    console.error('POST /api/summoners error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/summoners ──
app.delete('/api/summoners', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id obbligatorio' });
  dbRun('DELETE FROM matches WHERE summonerId = ?', [id]);
  dbRun('DELETE FROM drills WHERE summonerId = ?', [id]);
  dbRun('DELETE FROM summoners WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ─── GET /api/matches ──
app.get('/api/matches', (req, res) => {
  const { summonerId, lane, champion } = req.query;
  if (!summonerId) return res.json({ matches: [] });
  const settings = getSettings();
  const raw = queryMatches(summonerId, lane, champion);
  res.json({ matches: raw.map((m) => formatMatch(m, settings)) });
});

// ─── GET /api/stats ──
app.get('/api/stats', (req, res) => {
  const { summonerId, lane, champion } = req.query;
  if (!summonerId) return res.json(computeStats([], getSettings()));
  const settings = getSettings();
  const raw = queryMatches(summonerId, lane, champion);
  res.json(computeStats(raw, settings));
});

// ─── GET /api/settings ──
app.get('/api/settings', (_req, res) => {
  res.json(getSettings());
});

// ─── PUT /api/settings ──
app.put('/api/settings', (req, res) => {
  const fields = [
    'topKillMultiplier', 'topAssistMultiplier',
    'jungleKillMultiplier', 'jungleAssistMultiplier',
    'midKillMultiplier', 'midAssistMultiplier',
    'adcKillMultiplier', 'adcAssistMultiplier',
    'supportKillMultiplier', 'supportAssistMultiplier',
    'defaultSyncDays',
  ];
  const current = getSettings();
  const sets = fields.map((f) => `${f} = ?`).join(', ');
  const vals = fields.map((f) => req.body[f] ?? current[f]);
  dbRun(`UPDATE settings SET ${sets} WHERE id = 1`, vals);
  res.json(getSettings());
});

// ─── POST /api/sync ──
app.post('/api/sync', async (req, res) => {
  try {
    const { summonerId, count = 100, incremental, days } = req.body;

    const summoner = dbGet('SELECT * FROM summoners WHERE id = ?', [summonerId]);
    if (!summoner) return res.status(404).json({ error: 'Evocatore non trovato' });

    if (syncingSummoners.has(summonerId)) {
      return res.json({ message: 'Sincronizzazione già in corso.' });
    }

    let startTime;
    if (incremental) {
      const latest = dbGet(
        'SELECT gameCreation FROM matches WHERE summonerId = ? ORDER BY gameCreation DESC LIMIT 1',
        [summonerId]
      );
      if (latest) startTime = Math.floor(latest.gameCreation / 1000);
    } else if (days) {
      startTime = Math.floor(Date.now() / 1000) - days * 86400;
    }

    // Fetch match IDs
    let matchIds = [];
    let start = 0;
    while (matchIds.length < count) {
      const remaining = Math.min(count - matchIds.length, 100);
      let url = `https://${RIOT_REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${summoner.puuid}/ids?start=${start}&count=${remaining}`;
      if (startTime) url += `&startTime=${startTime}`;
      const ids = await riotFetch(url);
      if (ids.length === 0) break;
      matchIds.push(...ids);
      start += ids.length;
      if (ids.length < remaining) break;
    }

    // Filter already stored
    const existingRows = dbAll('SELECT id FROM matches WHERE summonerId = ?', [summonerId]);
    const existingSet = new Set(existingRows.map((r) => r.id));
    const newIds = matchIds.filter((id) => !existingSet.has(id));

    if (newIds.length === 0) {
      return res.json({ message: 'Nessuna nuova partita da sincronizzare.' });
    }

    res.json({ message: `Sincronizzazione avviata per ${newIds.length} nuove partite in background.` });

    syncingSummoners.add(summonerId);

    // Run in background
    (async () => {
      try {
        let stored = 0;
        for (const matchId of newIds) {
          try {
            const match = await riotFetch(`https://${RIOT_REGION}.api.riotgames.com/lol/match/v5/matches/${matchId}`);
            const p = match.info.participants.find((x) => x.puuid === summoner.puuid);
            if (!p) continue;

            const lane = mapLane(p.teamPosition);
            const cs = (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);

            dbRun(
              `INSERT OR IGNORE INTO matches (id, summonerId, championName, lane, win, kills, deaths, assists, cs, gold, duration, gameCreation)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [matchId, summonerId, p.championName, lane, p.win ? 1 : 0, p.kills, p.deaths, p.assists, cs, p.goldEarned, match.info.gameDuration, match.info.gameCreation]
            );
            stored++;
            if (stored % 5 === 0) console.log(`  ↳ ${stored} / ${newIds.length} matches stored …`);
          } catch (err) {
            console.error(`  ✗ ${matchId}: ${err.message}`);
          }
        }

        // Update summoner profile
        try {
          const summ = await riotFetch(`https://${RIOT_PLATFORM}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${summoner.puuid}`);
          dbRun('UPDATE summoners SET lastSyncAt = ?, profileIconId = ?, summonerLevel = ? WHERE id = ?',
            [new Date().toISOString(), summ.profileIconId, summ.summonerLevel, summonerId]);
        } catch {
          dbRun('UPDATE summoners SET lastSyncAt = ? WHERE id = ?', [new Date().toISOString(), summonerId]);
        }
        console.log(`✓ Sincronizzazione background completata per ${summoner.summonerName}`);
      } finally {
        syncingSummoners.delete(summonerId);
      }
    })();

  } catch (err) {
    console.error('POST /api/sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/drills ──
app.get('/api/drills', (req, res) => {
  const { summonerId } = req.query;
  if (!summonerId) return res.json([]);
  res.json(dbAll('SELECT * FROM drills WHERE summonerId = ? ORDER BY date DESC', [summonerId]));
});

// ─── POST /api/drills ──
app.post('/api/drills', (req, res) => {
  const { summonerId, csDrill, minute, mode, champion, focus, runes, runeShard, notes } = req.body;
  if (!summonerId) return res.status(400).json({ error: 'summonerId obbligatorio' });
  const id = crypto.randomUUID();
  dbRun(
    `INSERT INTO drills (id, summonerId, csDrill, minute, mode, champion, focus, runes, runeShard, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, summonerId, csDrill ?? null, minute ?? null, mode ?? null, champion ?? null, focus ?? null, runes ?? null, runeShard ?? null, notes ?? null]
  );
  res.json(dbGet('SELECT * FROM drills WHERE id = ?', [id]));
});

// ─── DELETE /api/drills ──
app.delete('/api/drills', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id obbligatorio' });
  dbRun('DELETE FROM drills WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ─── GET /api/datadragon ──
app.get('/api/datadragon', (_req, res) => {
  res.json({ champions: ddChampions, version: ddVersion });
});

// ─── GET /api/champions ──
app.get('/api/champions', (_req, res) => {
  const champions = dbAll('SELECT * FROM champions ORDER BY name ASC');
  res.json(champions);
});

// ─── POST /api/champions ──
app.post('/api/champions', (req, res) => {
  const { name, roles, tracked } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obbligatorio' });
  const id = crypto.randomUUID().slice(0, 8);
  dbRun(
    `INSERT INTO champions (name, roles, tracked) VALUES (?, ?, ?)`,
    [name, roles || '', tracked ? 1 : 0]
  );
  res.json(dbGet('SELECT * FROM champions WHERE id = ?', [id]));
});

// ─── PUT /api/champions/:id ──
app.put('/api/champions/:id', (req, res) => {
  const { id } = req.params;
  const { name, roles, tracked } = req.body;
  dbRun(
    `UPDATE champions SET name = COALESCE(?, name), roles = COALESCE(?, roles), tracked = COALESCE(?, tracked) WHERE id = ?`,
    [name, roles, tracked !== undefined ? (tracked ? 1 : 0) : null, id]
  );
  res.json(dbGet('SELECT * FROM champions WHERE id = ?', [id]));
});

// ─── DELETE /api/champions/:id ──
app.delete('/api/champions/:id', (req, res) => {
  const { id } = req.params;
  dbRun('DELETE FROM champions WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ─── POST /api/champions/sync ──
app.post('/api/champions/sync', async (req, res) => {
  try {
    // Fetch all champions from Data Dragon
    const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/data/en_US/champion.json`);
    const champData = await champRes.json();

    let synced = 0;
    for (const [key, data] of Object.entries(champData.data)) {
      const existing = dbGet('SELECT id FROM champions WHERE name = ?', [data.name]);
      if (!existing) {
        // Get roles from champion data if available
        const roles = data.tags ? data.tags.join(', ') : '';
        dbRun('INSERT INTO champions (name, roles, tracked) VALUES (?, ?, 0)', [data.name, roles]);
        synced++;
      }
    }
    res.json({ message: `Sincronizzati ${synced} nuovi campioni da Data Dragon` });
  } catch (err) {
    console.error('Error syncing champions:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/progress ──
app.get('/api/progress', (req, res) => {
  const { summonerId } = req.query;

  // Get all champions (both tracked and total)
  const allChampions = dbAll('SELECT * FROM champions ORDER BY name');

  // Get tracked champions (those with matches or drills)
  let trackedChampionNames = new Set();

  if (summonerId) {
    // Get champions from matches for this summoner
    const matchChamps = dbAll('SELECT DISTINCT championName FROM matches WHERE summonerId = ?', [summonerId]);
    matchChamps.forEach(m => trackedChampionNames.add(m.championName));

    // Get champions from drills for this summoner
    const drillChamps = dbAll('SELECT DISTINCT champion FROM drills WHERE summonerId = ? AND champion IS NOT NULL', [summonerId]);
    drillChamps.forEach(d => trackedChampionNames.add(d.champion));
  }

  // Count tracked champions from our champions table
  const trackedChampions = dbAll('SELECT COUNT(*) as count FROM champions WHERE tracked = 1');
  const trackedCount = trackedChampions[0]?.count || 0;

  // Champion available is total champions in our table
  const totalChampions = dbAll('SELECT COUNT(*) as count FROM champions');
  const championAvailable = totalChampions[0]?.count || 0;

  // Calculate done based on matches/drills for this summoner if provided
  let done = trackedChampionNames.size;
  if (summonerId) {
    // Also include champions marked as tracked
    done = trackedChampionNames.size;
  } else {
    done = trackedCount;
  }

  const missing = Math.max(0, championAvailable - done);
  const completion = championAvailable > 0 ? done / championAvailable : 0;

  res.json({
    completion: completion.toFixed(6),
    completionPercent: (completion * 100).toFixed(2),
    done,
    missing,
    championAvailable,
    trackedChampions: Array.from(trackedChampionNames),
  });
});

// ─── GET /api/rune-presets ──
app.get('/api/rune-presets', (_req, res) => {
  const presets = dbAll('SELECT * FROM runePresets ORDER BY name ASC');
  res.json(presets);
});

// ─── POST /api/rune-presets ──
app.post('/api/rune-presets', (req, res) => {
  const { name, primaryStyle, primaryRune1, primaryRune2, primaryRune3, primaryRune4, secondaryStyle, secondaryRune1, secondaryRune2, shard1, shard2, shard3 } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obbligatorio' });
  const id = crypto.randomUUID().slice(0, 8);
  dbRun(
    `INSERT INTO runePresets (name, primaryStyle, primaryRune1, primaryRune2, primaryRune3, primaryRune4, secondaryStyle, secondaryRune1, secondaryRune2, shard1, shard2, shard3) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, primaryStyle, primaryRune1, primaryRune2, primaryRune3, primaryRune4, secondaryStyle, secondaryRune1, secondaryRune2, shard1, shard2, shard3]
  );
  res.json(dbGet('SELECT * FROM runePresets WHERE id = ?', [id]));
});

// ─── DELETE /api/rune-presets/:id ──
app.delete('/api/rune-presets/:id', (req, res) => {
  const { id } = req.params;
  dbRun('DELETE FROM runePresets WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ─── GET /api/drill-categories ──
app.get('/api/drill-categories', (_req, res) => {
  const categories = dbAll('SELECT * FROM drillCategories ORDER BY name ASC');
  res.json(categories);
});

// ─── POST /api/drill-categories ──
app.post('/api/drill-categories', (req, res) => {
  const { name, description, rules } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obbligatorio' });
  const id = crypto.randomUUID().slice(0, 8);
  dbRun(
    `INSERT INTO drillCategories (name, description, rules) VALUES (?, ?, ?)`,
    [name, description, rules]
  );
  res.json(dbGet('SELECT * FROM drillCategories WHERE id = ?', [id]));
});

// ─── PUT /api/drill-categories/:id ──
app.put('/api/drill-categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, rules } = req.body;
  dbRun(
    `UPDATE drillCategories SET name = COALESCE(?, name), description = COALESCE(?, description), rules = COALESCE(?, rules) WHERE id = ?`,
    [name, description, rules, id]
  );
  res.json(dbGet('SELECT * FROM drillCategories WHERE id = ?', [id]));
});

// ─── DELETE /api/drill-categories/:id ──
app.delete('/api/drill-categories/:id', (req, res) => {
  const { id } = req.params;
  dbRun('DELETE FROM drillCategories WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ─── GET /api/performance ──
app.get('/api/performance', (req, res) => {
  const { summonerId } = req.query;
  if (!summonerId) return res.json({ performance: [] });

  // Get drills grouped by champion and focus
  const drills = dbAll(`
    SELECT champion, focus, csDrill, minute 
    FROM drills 
    WHERE summonerId = ? AND champion IS NOT NULL AND csDrill IS NOT NULL AND minute IS NOT NULL AND minute > 0
  `, [summonerId]);

  // Group by champion
  const byChampion = {};
  drills.forEach(d => {
    const champ = d.champion;
    if (!byChampion[champ]) byChampion[champ] = [];
    byChampion[champ].push(d);
  });

  // Calculate performance matrix
  const focusTypes = ['Timing Last-Hit (Lane)', 'Timing Last-Hit (DEF)', 'Push Efficiency', 'Farm Pressure', 'Survive Losing Lane', 'Spacing', 'Orbwalking', 'Kiting', 'Aiming'];

  const performance = Object.entries(byChampion).map(([champion, champDrills]) => {
    const result = { champion };

    // Calculate CS/Min for each drill
    const drillsWithCSMin = champDrills.map(d => ({
      ...d,
      csPerMin: d.csDrill / d.minute
    }));

    // Calculate average CS/Min overall for this champion
    const overallAvg = drillsWithCSMin.reduce((sum, d) => sum + d.csPerMin, 0) / drillsWithCSMin.length;
    result.overallTrainingCSMin = overallAvg || 0;

    // Calculate average by focus type
    focusTypes.forEach(focus => {
      const focusDrills = drillsWithCSMin.filter(d => d.focus === focus);
      if (focusDrills.length > 0) {
        result[focus] = focusDrills.reduce((sum, d) => sum + d.csPerMin, 0) / focusDrills.length;
      } else {
        result[focus] = 0;
      }
    });

    return result;
  });

  // Calculate totals
  const totals = {};
  focusTypes.forEach(focus => {
    const values = performance.map(p => p[focus]).filter(v => v > 0);
    totals[focus] = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  });

  res.json({ performance, totals });
});

// ─── GET /api/advanced-stats ──
app.get('/api/advanced-stats', (req, res) => {
  const { summonerId } = req.query;
  if (!summonerId) return res.json({ stats: [] });

  const settings = getSettings();
  const rawMatches = dbAll('SELECT * FROM matches WHERE summonerId = ? ORDER BY gameCreation DESC', [summonerId]);

  if (rawMatches.length === 0) return res.json({ stats: [] });

  const matches = rawMatches.map(m => formatMatch(m, settings));

  // Group by champion
  const champGroups = {};
  matches.forEach(m => {
    (champGroups[m.championName] ??= []).push(m);
  });

  const stats = Object.entries(champGroups).map(([championName, champMatches]) => {
    // Basic averages
    const avgCSPerMin = champMatches.reduce((sum, m) => sum + m.csPerMin, 0) / champMatches.length;
    const avgKDR = champMatches.reduce((sum, m) => sum + m.kdr, 0) / champMatches.length;
    const avgGPM = champMatches.reduce((sum, m) => sum + m.goldPerMin, 0) / champMatches.length;

    // CS Rate (normalized CS/Min - for now using avg as the benchmark)
    const avgCSRate = avgCSPerMin; // Would need external benchmark for true rate

    // CS/Min Consistency (coefficient of variation inverted)
    const csValues = champMatches.map(m => m.csPerMin);
    const csStdDev = calculateStdDev(csValues);
    const csMean = avgCSPerMin;
    const csCV = csMean > 0 ? csStdDev / csMean : 0;
    const csConsistency = Math.max(0, 1 - Math.min(csCV, 1)); // 0-1 scale, 1 = perfect consistency

    // KDR Consistency
    const kdrValues = champMatches.map(m => m.kdr);
    const kdrStdDev = calculateStdDev(kdrValues);
    const kdrMean = avgKDR;
    const kdrCV = Math.abs(kdrMean) > 0 ? kdrStdDev / Math.abs(kdrMean) : 0;
    const kdrConsistency = Math.max(0, 1 - Math.min(kdrCV, 1));

    // G/Min Consistency
    const gpmValues = champMatches.map(m => m.goldPerMin);
    const gpmStdDev = calculateStdDev(gpmValues);
    const gpmMean = avgGPM;
    const gpmCV = gpmMean > 0 ? gpmStdDev / gpmMean : 0;
    const gpmConsistency = Math.max(0, 1 - Math.min(gpmCV, 1));

    // Survive Rate (matches where deaths < kills or deaths < 3)
    const surviveMatches = champMatches.filter(m => m.deaths < m.kills || m.deaths < 3);
    const surviveRate = champMatches.length > 0 ? surviveMatches.length / champMatches.length : 0;

    // Win Rate
    const wins = champMatches.filter(m => m.win).length;
    const winRate = champMatches.length > 0 ? wins / champMatches.length : 0;

    return {
      championName,
      games: champMatches.length,
      avgCSPerMin,
      avgKDR,
      avgGPM,
      csRate: avgCSRate,
      csConsistency,
      kdrConsistency,
      gpmConsistency,
      surviveRate,
      winRate,
    };
  });

  res.json({ stats });
});

// Helper function to calculate standard deviation
function calculateStdDev(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(variance);
}

// ─── GET /api/export ──
app.get('/api/export', (_req, res) => {
  const summoners = dbAll('SELECT * FROM summoners ORDER BY createdAt DESC');
  const settings = getSettings();

  // Get all summoners' matches and drills
  const allData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    summoners: summoners.map(s => {
      const matches = dbAll('SELECT * FROM matches WHERE summonerId = ? ORDER BY gameCreation DESC', [s.id]);
      const drills = dbAll('SELECT * FROM drills WHERE summonerId = ? ORDER BY date DESC', [s.id]);
      return {
        ...s,
        matches,
        drills,
      };
    }),
    settings,
  };

  res.json(allData);
});

// ─── POST /api/import ──
app.post('/api/import', (req, res) => {
  const { summoners, settings } = req.body;

  if (!summoners || !Array.isArray(summoners)) {
    return res.status(400).json({ error: 'Formato dati non valido' });
  }

  let importedSummoners = 0;
  let importedMatches = 0;
  let importedDrills = 0;

  for (const s of summoners) {
    // Check if summoner already exists
    const existing = dbGet('SELECT id FROM summoners WHERE puuid = ?', [s.puuid]);

    if (!existing) {
      // Insert new summoner
      dbRun(
        `INSERT INTO summoners (id, puuid, summonerName, tagLine, profileIconId, summonerLevel, lastSyncAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.puuid, s.summonerName, s.tagLine, s.profileIconId || 29, s.summonerLevel || 0, s.lastSyncAt, s.createdAt]
      );
      importedSummoners++;
    }

    // Import matches
    if (s.matches && Array.isArray(s.matches)) {
      for (const m of s.matches) {
        const existingMatch = dbGet('SELECT id FROM matches WHERE id = ?', [m.id]);
        if (!existingMatch) {
          dbRun(
            `INSERT INTO matches (id, summonerId, championName, lane, win, kills, deaths, assists, cs, gold, duration, gameCreation, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [m.id, m.summonerId, m.championName, m.lane, m.win ? 1 : 0, m.kills, m.deaths, m.assists, m.cs, m.gold, m.duration, m.gameCreation, m.createdAt]
          );
          importedMatches++;
        }
      }
    }

    // Import drills
    if (s.drills && Array.isArray(s.drills)) {
      for (const d of s.drills) {
        const existingDrill = dbGet('SELECT id FROM drills WHERE id = ?', [d.id]);
        if (!existingDrill) {
          dbRun(
            `INSERT INTO drills (id, summonerId, csDrill, minute, mode, champion, focus, runes, runeShard, notes, date, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [d.id, s.id, d.csDrill, d.minute, d.mode, d.champion, d.focus, d.runes, d.runeShard, d.notes, d.date, d.createdAt]
          );
          importedDrills++;
        }
      }
    }
  }

  // Import settings if provided
  if (settings) {
    const fields = [
      'topKillMultiplier', 'topAssistMultiplier',
      'jungleKillMultiplier', 'jungleAssistMultiplier',
      'midKillMultiplier', 'midAssistMultiplier',
      'adcKillMultiplier', 'adcAssistMultiplier',
      'supportKillMultiplier', 'supportAssistMultiplier',
      'defaultSyncDays',
    ];
    const sets = fields.map((f) => `${f} = ?`).join(', ');
    const vals = fields.map((f) => settings[f] ?? 0.5);
    dbRun(`UPDATE settings SET ${sets} WHERE id = 1`, vals);
  }

  saveDb();

  res.json({
    message: `Import completato: ${importedSummoners} evocatori, ${importedMatches} partite, ${importedDrills} drill importati.`,
  });
});

// ─── Bootstrap ───────────────────────────────────────────
async function bootstrap() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('✓ Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('✓ Created new database');
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS summoners (
      id TEXT PRIMARY KEY,
      puuid TEXT UNIQUE NOT NULL,
      summonerName TEXT NOT NULL,
      tagLine TEXT NOT NULL,
      profileIconId INTEGER DEFAULT 29,
      summonerLevel INTEGER DEFAULT 0,
      lastSyncAt TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      summonerId TEXT NOT NULL,
      championName TEXT NOT NULL,
      lane TEXT NOT NULL,
      win INTEGER NOT NULL DEFAULT 0,
      kills INTEGER NOT NULL DEFAULT 0,
      deaths INTEGER NOT NULL DEFAULT 0,
      assists INTEGER NOT NULL DEFAULT 0,
      cs INTEGER NOT NULL DEFAULT 0,
      gold INTEGER NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL DEFAULT 0,
      gameCreation INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (summonerId) REFERENCES summoners(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS drills (
      id TEXT PRIMARY KEY,
      summonerId TEXT NOT NULL,
      csDrill INTEGER,
      minute INTEGER,
      mode TEXT,
      champion TEXT,
      focus TEXT,
      runes TEXT,
      runeShard TEXT,
      notes TEXT,
      date TEXT DEFAULT (datetime('now')),
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (summonerId) REFERENCES summoners(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      topKillMultiplier REAL DEFAULT 0.5,
      topAssistMultiplier REAL DEFAULT 0.85,
      jungleKillMultiplier REAL DEFAULT 0.5,
      jungleAssistMultiplier REAL DEFAULT 0.85,
      midKillMultiplier REAL DEFAULT 0.5,
      midAssistMultiplier REAL DEFAULT 0.85,
      adcKillMultiplier REAL DEFAULT 0.5,
      adcAssistMultiplier REAL DEFAULT 0.85,
      supportKillMultiplier REAL DEFAULT 0.5,
      supportAssistMultiplier REAL DEFAULT 0.85,
      defaultSyncDays INTEGER DEFAULT 30,
      dataDragonVersion TEXT DEFAULT '14.1.1'
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS champions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      roles TEXT NOT NULL DEFAULT '',
      tracked INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS runePresets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      primaryStyle TEXT,
      primaryRune1 TEXT,
      primaryRune2 TEXT,
      primaryRune3 TEXT,
      primaryRune4 TEXT,
      secondaryStyle TEXT,
      secondaryRune1 TEXT,
      secondaryRune2 TEXT,
      shard1 TEXT,
      shard2 TEXT,
      shard3 TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS drillCategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      rules TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run('INSERT OR IGNORE INTO settings (id) VALUES (1)');
  db.run('CREATE INDEX IF NOT EXISTS idx_matches_summoner ON matches(summonerId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_matches_creation ON matches(gameCreation DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_drills_summoner ON drills(summonerId)');
  saveDb();

  console.log('✓ Database tables ready');

  // Start server
  app.listen(PORT, async () => {
    console.log(`\n🎮 LoL Tracker running at  http://localhost:${PORT}\n`);
    await refreshDataDragon();
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
