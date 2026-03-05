const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/data';
const ADMIN_PIN = process.env.ADMIN_PIN || 'scorewire-admin';

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const profilesFile = () => path.join(DATA_DIR, 'profiles.json');
const dataFile = (id) => path.join(DATA_DIR, `player_${id}.json`);

function loadProfiles() {
  if (!fs.existsSync(profilesFile())) return [];
  try { return JSON.parse(fs.readFileSync(profilesFile(), 'utf8')); }
  catch(e) { return []; }
}

function saveProfiles(p) {
  fs.writeFileSync(profilesFile(), JSON.stringify(p, null, 2));
}

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

function verifyPlayer(req, res, next) {
  const id  = req.headers['playerid'];
  const pin = req.headers['pin'];
  if (!id || !pin) return res.status(401).json({ error: 'playerid and pin headers required' });
  const profile = loadProfiles().find(p => p.id === id);
  if (!profile) return res.status(404).json({ error: 'Player not found' });
  if (profile.pinHash !== hashPin(pin)) return res.status(401).json({ error: 'Wrong PIN' });
  req.playerId = id;
  req.profile  = profile;
  next();
}

function verifyAdmin(req, res, next) {
  const pin = req.headers['admin-pin'];
  if (!pin || pin !== ADMIN_PIN) return res.status(401).json({ error: 'Invalid admin PIN' });
  next();
}

// ── PUBLIC: look up player by name only (returns id, no PIN info)
// This lets users type their name and get their ID to then enter PIN
app.post('/api/profiles/find', (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return res.status(400).json({ error: 'playerName required' });
  const profile = loadProfiles().find(
    p => p.playerName.toLowerCase() === playerName.trim().toLowerCase()
  );
  // Only return id — no name confirmation to avoid enumeration
  if (!profile) return res.status(404).json({ error: 'Not found' });
  res.json({ id: profile.id });
});

// ── PUBLIC: login with id + pin
app.post('/api/profiles/login', (req, res) => {
  const { id, pin } = req.body;
  const profile = loadProfiles().find(p => p.id === id);
  if (!profile) return res.status(404).json({ error: 'Not found' });
  if (profile.pinHash !== hashPin(pin)) return res.status(401).json({ error: 'Wrong PIN' });
  res.json({ id: profile.id, playerName: profile.playerName, teamName: profile.teamName });
});

// ── PUBLIC: create new player
app.post('/api/profiles', (req, res) => {
  const { playerName, teamName, pin } = req.body;
  if (!playerName || !pin) return res.status(400).json({ error: 'playerName and pin required' });
  if (String(pin).length < 4) return res.status(400).json({ error: 'PIN must be at least 4 digits' });
  const profiles = loadProfiles();
  if (profiles.find(p => p.playerName.toLowerCase() === playerName.trim().toLowerCase()))
    return res.status(409).json({ error: 'Player name already taken' });
  const id = Date.now().toString();
  profiles.push({ id, playerName: playerName.trim(), teamName: (teamName||'').trim(), pinHash: hashPin(pin) });
  saveProfiles(profiles);
  fs.writeFileSync(dataFile(id), JSON.stringify({ games: [] }, null, 2));
  res.json({ id, playerName: playerName.trim(), teamName: (teamName||'').trim() });
});

// ── PLAYER: get own data
app.get('/api/data', verifyPlayer, (req, res) => {
  const file = dataFile(req.playerId);
  if (!fs.existsSync(file)) return res.json({ games: [] });
  try { res.json(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch(e) { res.json({ games: [] }); }
});

// ── PLAYER: save own data
app.post('/api/data', verifyPlayer, (req, res) => {
  fs.writeFileSync(dataFile(req.playerId),
    JSON.stringify({ ...req.body, updated: new Date().toISOString() }, null, 2));
  res.json({ ok: true });
});

// ── ADMIN: list all profiles
app.get('/api/admin/profiles', verifyAdmin, (req, res) => {
  const profiles = loadProfiles();
  // Return full info except pinHash
  res.json(profiles.map(p => ({
    id: p.id,
    playerName: p.playerName,
    teamName: p.teamName,
    created: p.created || null
  })));
});

// ── ADMIN: delete a profile + their data
app.delete('/api/admin/profiles/:id', verifyAdmin, (req, res) => {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  profiles.splice(idx, 1);
  saveProfiles(profiles);
  const file = dataFile(req.params.id);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

// ── ADMIN: verify pin
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (!pin || pin !== ADMIN_PIN) return res.status(401).json({ error: 'Invalid admin PIN' });
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true, version: '2.1' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log('⚾  ScoreWire v2.1 running on port ' + PORT);
  console.log('   Data: ' + DATA_DIR);
  console.log('   Admin PIN env var: ADMIN_PIN (set via docker -e ADMIN_PIN=yourpin)');
});
