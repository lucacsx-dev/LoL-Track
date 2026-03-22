const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = 'RGAPI-97d4cecb-ec4f-43d3-a824-8d28709bb640';

const DD_VERSION = '14.1.1';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

async function riotApiRequest(url) {
    const response = await fetch(url, {
        headers: {
            'X-Riot-Token': API_KEY
        }
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Riot API Error: ${response.status} - ${error}`);
    }
    
    return response.json();
}

const REGION_ROUTING = {
    EUW: 'europe',
    EUNE: 'europe',
    NA: 'americas',
    KR: 'asia',
    BR: 'americas',
    LAN: 'americas',
    LAS: 'americas',
    OCE: 'americas',
    TR: 'europe',
    RU: 'europe',
    JP: 'asia',
    PH: 'asia',
    SG: 'asia',
    TH: 'asia',
    TW: 'asia',
    VN: 'asia',
};

const PLATFORM_ROUTING = {
    EUW: 'euw1',
    EUNE: 'eun1',
    NA: 'na1',
    KR: 'kr',
    BR: 'br1',
    LAN: 'la1',
    LAS: 'la2',
    OCE: 'oc1',
    TR: 'tr1',
    RU: 'ru',
    JP: 'jp1',
    PH: 'ph2',
    SG: 'sg2',
    TH: 'th2',
    TW: 'tw2',
    VN: 'vn2',
};

function getRegionFromTag(tagLine) {
    const tag = tagLine.toUpperCase();
    return REGION_ROUTING[tag] || 'europe';
}

function getPlatformFromTag(tagLine) {
    const tag = tagLine.toUpperCase();
    return PLATFORM_ROUTING[tag] || 'euw1';
}

async function getSummonerByNameTag(gameName, tagLine) {
    const region = getRegionFromTag(tagLine);
    const platform = getPlatformFromTag(tagLine);
    
    const accountResponse = await riotApiRequest(
        `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?force=true`
    );
    
    const puuid = accountResponse.puuid;
    
    const summonerResponse = await riotApiRequest(
        `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`
    );
    
    return {
        id: summonerResponse.id,
        accountId: summonerResponse.accountId,
        puuid: puuid,
        name: summonerResponse.name,
        profileIconId: summonerResponse.profileIconId,
        summonerLevel: summonerResponse.summonerLevel,
        revisionDate: summonerResponse.revisionDate
    };
}

async function getMatchIds(puuid, tagLine, startTime, endTime, queue, count) {
    const region = getRegionFromTag(tagLine);
    let url = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
    
    if (startTime) url += `&startTime=${startTime}`;
    if (endTime) url += `&endTime=${endTime}`;
    if (queue) url += `&queue=${queue}`;
    
    return riotApiRequest(url);
}

async function getMatchDetails(matchId, tagLine) {
    const region = getRegionFromTag(tagLine);
    return riotApiRequest(
        `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`
    );
}

function processMatch(matchData, puuid) {
    const participant = matchData.info.participants.find(p => p.puuid === puuid);
    if (!participant) return null;
    
    const team = matchData.info.teams.find(t => t.teamId === participant.teamId);
    
    return {
        id: matchData.matchId,
        riotMatchId: matchData.metadata.matchId,
        championId: participant.championId,
        championName: participant.championName,
        lane: participant.lane || participant.role || 'MID',
        role: participant.role,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
        gold: participant.goldEarned,
        win: team ? team.win : false,
        gameDuration: matchData.info.gameDuration,
        gameCreation: matchData.info.gameStartTimestamp,
        gameMode: matchData.info.gameMode,
        queueId: matchData.info.queueId
    };
}

app.get('/api/version', (req, res) => {
    res.json({ version: DD_VERSION });
});

app.get('/api/summoner/:name/:tag', async (req, res) => {
    try {
        const { name, tag } = req.params;
        const summoner = await getSummonerByNameTag(decodeURIComponent(name), decodeURIComponent(tag));
        res.json(summoner);
    } catch (error) {
        console.error('Error fetching summoner:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/summoner/:name/:tag/matches', async (req, res) => {
    try {
        const { name, tag } = req.params;
        const { days = '30', queue } = req.query;
        
        const startTime = Math.floor(Date.now() / 1000) - (parseInt(days) * 24 * 60 * 60);
        
        const summoner = await getSummonerByNameTag(decodeURIComponent(name), decodeURIComponent(tag));
        const matchIds = await getMatchIds(summoner.puuid, tag, startTime, null, queue, 100);
        
        const matches = [];
        for (const matchId of matchIds) {
            try {
                const matchData = await getMatchDetails(matchId, tag);
                const processed = processMatch(matchData, summoner.puuid);
                if (processed) {
                    processed.summoner = { summonerName: summoner.name, tagLine: tag };
                    matches.push(processed);
                }
            } catch (e) {
                console.warn(`Failed to fetch match ${matchId}:`, e.message);
            }
        }
        
        matches.sort((a, b) => new Date(b.gameCreation) - new Date(a.gameCreation));
        
        res.json({
            summoner,
            matches,
            matchCount: matches.length
        });
    } catch (error) {
        console.error('Error fetching matches:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/summoner/:name/:tag/matches/incremental', async (req, res) => {
    try {
        const { name, tag } = req.params;
        const { after } = req.query;
        
        const summoner = await getSummonerByNameTag(decodeURIComponent(name), decodeURIComponent(tag));
        
        let startTime = null;
        if (after) {
            startTime = Math.floor(new Date(after).getTime() / 1000);
        }
        
        const matchIds = await getMatchIds(summoner.puuid, tag, startTime, null, null, 20);
        
        const matches = [];
        for (const matchId of matchIds) {
            try {
                const matchData = await getMatchDetails(matchId, tag);
                const processed = processMatch(matchData, summoner.puuid);
                if (processed) {
                    processed.summoner = { summonerName: summoner.name, tagLine: tag };
                    matches.push(processed);
                }
            } catch (e) {
                console.warn(`Failed to fetch match ${matchId}:`, e.message);
            }
        }
        
        matches.sort((a, b) => new Date(b.gameCreation) - new Date(a.gameCreation));
        
        res.json({
            summoner,
            matches,
            matchCount: matches.length
        });
    } catch (error) {
        console.error('Error fetching incremental matches:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`LoL Tracker server running at http://localhost:${PORT}`);
});