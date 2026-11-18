// Uji beban: 10 lapangan, 100 pemain, 10 device bersamaan, N ronde per lapangan.
// Menjalankan KODE ASLI dari index.html di atas server tiruan dengan semantik yang sama
// seperti Supabase: update ... WHERE updated_at = <nilai saat dibaca> (optimistic lock).
const fs = require('fs'), vm = require('vm');

const FILE   = process.env.FILE   || 'next.html';
const ROUNDS = +process.env.ROUNDS || 6;
const COURTS = +process.env.COURTS || 10;
const NPLAY  = +process.env.PLAYERS || 100;
const TAP_MS = +process.env.TAP_MS || 900;          // jeda ketuk skor per device (manusia ~2-4 dtk; ini 3x lebih cepat)
const RTT    = +process.env.RTT || 120;             // ms
const DOWN   = (+process.env.DOWN_MBPS || 2.5) * 1e6; // byte/dtk
const UP     = (+process.env.UP_MBPS || 1.0) * 1e6;
const OLD_EVENTS = +process.env.OLD_EVENTS || 0;    // event lama yang menumpuk di registry
const PROFILE = process.env.PROFILE || 'custom';

const html = fs.readFileSync(FILE, 'utf8');
const src = html.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)
  .map(x => x.replace(/<\/?script[^>]*>/g, '')).sort((a, b) => b.length - a.length)[0];

function grab(name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(src);
  if (!m) throw new Error('fungsi tidak ditemukan: ' + name);
  let p = m.index + m[0].length, depth = 1;
  while (depth && p < src.length) { const c = src[p++]; if (c === '(') depth++; else if (c === ')') depth--; }
  let j = src.indexOf('{', p), d = 0;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (!d) { j++; break; } } }
  return src.slice(m.index, j);
}
const FUNCS = ['cloneJSON','stripNestedRegistry','getEventRegistryFromSettings','ensureEventAttendance','activeEvent',
  'applyPlayerStatsSnapshot','applyRotationSnapshot','shuffleArray','levelScore','findBalancedTeams','evaluateMatchBalance',
  'getPlayerConsecutiveRounds','buildGeneratedMatchesForView','courtNumOf','rebuildRotationForView','roundMixAllCourtNames',
  'previewPlayerIds','applyCourtReferee','fillEmptyCourtsInView','refreshNextPreviewsInView','generateMatches',
  'safeRoundMixMutationCore','safeRoundMixMutation','safeApplyToServer','flushScoreBatch','queueScoreOp','updateScore',
  'finishMatch','requestRefresh','runRefresh','_sleep'];
let fcode = ''; for (const f of FUNCS) fcode += grab(f) + '\n';

// ---------- SERVER TIRUAN ----------
const stats = { cat: { score: { ok: 0, fail: 0 }, mutate: { ok: 0, fail: 0 } }, notif: 0, reads: 0, writes: 0, casFail: 0, bytesDown: 0, bytesUp: 0, maxRow: 0, writeBytes: [], readBytes: [] };
const violations = [];
const server = { row: null };
let devsRef = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const jitter = () => RTT * (0.6 + Math.random() * 0.8);

function checkInvariants(row, who) {
  try {
    const reg = row.rr_settings.__eventRegistry; const ev = reg.events.find(e => e.id === reg.activeEventId);
    const am = ev.snapshot.activeMatches;
    const ids = am.flatMap(m => [...m.teamA, ...m.teamB].map(p => p.id));
    if (new Set(ids).size !== ids.length) violations.push(`[${who}] pemain ganda di lapangan aktif`);
    const courts = am.map(m => m.courtName);
    if (new Set(courts).size !== courts.length) violations.push(`[${who}] 2 match di lapangan yang sama: ${courts.join(',')}`);
    const pv = ev.snapshot.roundMixPreview || [];
    const pids = pv.flatMap(m => [...m.teamA, ...m.teamB].map(p => p.id));
    if (new Set(pids).size !== pids.length) violations.push(`[${who}] pemain ganda di susunan NEXT`);
    if (pids.some(id => ids.includes(id))) violations.push(`[${who}] pemain NEXT sedang bermain di lapangan lain`);
  } catch (e) { violations.push('invariant error ' + e.message); }
}

class Q {
  constructor(dev) { this.dev = dev; this.op = 'select'; this.f = []; }
  select(c) { if (this.op === 'update') this.ret = c || '*'; else this.cols = c || '*'; return this; }
  update(p) { this.op = 'update'; this.patch = p; return this; }
  eq(c, v) { this.f.push(['eq', c, v]); return this; }
  is(c, v) { this.f.push(['is', c, v]); return this; }
  single() { this.sing = true; return this; }
  then(a, b) { return this.run().then(a, b); }
  async run() {
    if (this.op === 'select') {
      await sleep(jitter() / 2);
      const row = server.row;
      const cols = this.cols === '*' ? Object.keys(row) : this.cols.split(',').map(s => s.trim());
      const out = {}; cols.forEach(c => out[c] = row[c]);
      const json = JSON.stringify(out);
      stats.reads++; stats.bytesDown += json.length; stats.readBytes.push(json.length);
      await sleep(jitter() / 2 + json.length / DOWN * 1000);
      return { data: JSON.parse(json), error: null };
    }
    const body = JSON.stringify(this.patch);
    stats.bytesUp += body.length; stats.writeBytes.push(body.length);
    await sleep(jitter() / 2 + body.length / UP * 1000);
    // --- atomik di server: WHERE updated_at = X ---
    const cat = ('players' in this.patch) ? 'mutate' : 'score';
    const row = server.row; let match = true;
    for (const [k, c, v] of this.f) {
      if (k === 'eq' && row[c] !== v) match = false;
      if (k === 'is' && !(row[c] == null && v === null)) match = false;
    }
    let data = [];
    if (match) {
      Object.assign(row, JSON.parse(body)); stats.writes++;
      const sz = JSON.stringify(row).length; stats.maxRow = Math.max(stats.maxRow, sz);
      checkInvariants(row, 'write');
      data = [{ id: row.id, updated_at: row.updated_at }];
      stats.cat[cat].ok++;
      const up = row.updated_at;
      if (process.env.REALTIME !== '0') for (const d of devsRef) if (d !== this.dev) setTimeout(() => {
        try { d.run(`(function(){ if(lastSyncedRow&&lastSyncedRow.updated_at===${JSON.stringify(up)}) return; requestRefresh(); })()`); stats.notif++; } catch (e) {}
      }, jitter() / 2);
    } else { stats.casFail++; stats.cat[cat].fail++; }
    await sleep(jitter() / 2);
    return { data, error: null };
  }
}

// ---------- DATA AWAL ----------
function buildInitialRow() {
  const players = Array.from({ length: NPLAY }, (_, i) => ({
    id: 'p' + (i + 1), name: 'Pemain ' + (i + 1), gender: i % 2 ? 'F' : 'M', level: [1, 2, 3, 4][i % 4], status: 'active',
    photoUrl: 'https://xyzcompany.supabase.co/storage/v1/object/public/player-photos/' + 'x'.repeat(40) + (i + 1) + '.jpg',
    deposit: 100000, birthDate: '1995-01-01',
    stats: { played: 0, wins: 0, points: 0, out: 0, fault: 0, errors: 0 },
    careerStats: { played: 20, wins: 9, points: 300, out: 12, fault: 8, errors: 20 }, lastPartners: [], lastOpponents: []
  }));
  const att = {}; players.forEach(p => att[p.id] = true);
  const mk = (id, name, hist) => ({
    id, name, mode: 'match', status: 'finished', attendance: att, updatedAt: new Date().toISOString(),
    snapshot: {
      playerStats: Object.fromEntries(players.map(p => [p.id, { played: 5, wins: 2, points: 40, out: 1, fault: 1, errors: 2 }])),
      rotation: Object.fromEntries(players.map(p => [p.id, { lastPartners: ['p1', 'p2', 'p3'], lastOpponents: ['p4', 'p5', 'p6', 'p7'] }])),
      attendance: att, roundMixPreview: [], activeMatches: [], rrTeams: [], rrMatches: [], rrSettings: { totalCourts: 10, teamSize: 2 }, rrPhase: 'setup', rrBracket: [],
      matchesHistory: Array.from({ length: hist }, (_, k) => ({
        id: 'h' + id + k, round: Math.floor(k / 10) + 1, courtName: 'Lapangan ' + (k % 10 + 1), scoreA: 21, scoreB: 15, time: 800, finishedAt: new Date().toISOString(), matchFee: 0,
        teamA: [0, 1].map(j => ({ ...players[(k * 4 + j) % NPLAY], matchPoints: 10, matchOuts: 1, matchFaults: 0 })),
        teamB: [2, 3].map(j => ({ ...players[(k * 4 + j) % NPLAY], matchPoints: 7, matchOuts: 0, matchFaults: 1 }))
      }))
    }
  });
  const events = [];
  for (let i = 0; i < OLD_EVENTS; i++) events.push(mk('old' + i, 'Event lama ' + i, 150));
  const cur = mk('ev1', 'Mabar Uji Beban', 0); cur.status = 'draft'; cur.snapshot.playerStats = Object.fromEntries(players.map(p => [p.id, { played: 0, wins: 0, points: 0, out: 0, fault: 0, errors: 0 }])); cur.snapshot.rotation = Object.fromEntries(players.map(p => [p.id, { lastPartners: [], lastOpponents: [] }])); events.push(cur);
  return {
    id: 1, players, matches_history: [], active_matches: [], finance_transactions: [], finance_settings: { payPerPlay: 0 },
    rr_settings: { totalCourts: 10, teamSize: 2, __eventRegistry: { activeEventId: 'ev1', events } },
    rr_matches: [], rr_teams: [], rr_phase: 'setup', rr_bracket: [], updated_at: new Date().toISOString()
  };
}

// ---------- DEVICE ----------
function makeDevice(idx) {
  const dev = { idx, errors: [], syncErr: 0, taps: 0, expect: {}, finished: 0, opLat: [], finishLat: [] };
  const client = { from: () => new Q(dev), channel() { return { on() { return this; }, subscribe() {} }; } };
  const sandbox = {
    console: { log() {}, warn() {}, error: (...a) => dev.errors.push(a.map(x => String(x && x.message || x)).join(' ').slice(0, 140)) },
    setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, Promise, Object, Array, Map, Set, Number, String, Error, parseInt, parseFloat, isFinite, Boolean,
    supabaseClient: client, STATE_ROW_ID: 1, window: { scoreDashboardOpen: false, scoreDashboardMatchId: null },
    document: { getElementById: id => ({ value: id === 'totalCourts' ? String(COURTS) : '2' }) },
    timers: {}, roundMixTimerRuntime: {}, syncRoundMixTimerRuntime() {}, roundMixElapsed: (id, t) => t, syncTimers() {},
    markSyncSaving() {}, markSyncSuccess() {}, markSyncError() { dev.syncErr++; },
    renderCourts() {}, renderQueue() {}, renderStandings() {}, renderHistory() {}, renderScoreDashboard() {},
    closeScoreDashboard() {}, openScoreDashboard() {}, alert() {}, pickRoundMixReferee: () => null,
    STATE_COLUMNS: ['players', 'matches_history', 'active_matches', 'finance_transactions', 'finance_settings', 'rr_settings', 'rr_matches', 'rr_teams', 'rr_phase', 'rr_bracket']
  };
  vm.createContext(sandbox);
  vm.runInContext(`
    var players=[],matchesHistory=[],activeMatches=[],roundMixPreview=[],financeTransactions=[],financeSettings={payPerPlay:0},
        rrTeams=[],rrMatches=[],rrSettings={},rrPhase='setup',rrBracket=[],eventRegistry={activeEventId:null,events:[]},
        stateLoaded=true,pendingScoreOps=0,saveInFlight=false,savePending=false,refreshRunning=false,refreshTimer=null,
        lastSyncedRow=null,scoreFlushDelay=250,lastApplyAttempts=1,applyCycleEma=500,lastRoundMixFailReason='',scoreOpQueue=Promise.resolve(),scoreBatch=[],scoreBatchTimer=null,
        roundMixMutationQueue=Promise.resolve(),currentEventMode='match';
    ${fcode}
    function restoreEvent(ev){
      eventRegistry.activeEventId=ev.id; const s=ev.snapshot||{};
      applyPlayerStatsSnapshot(s.playerStats||{}); applyRotationSnapshot(s.rotation||{}); ensureEventAttendance(ev,true);
      if(s.attendance) ev.attendance=cloneJSON(s.attendance);
      matchesHistory=cloneJSON(s.matchesHistory||[]); activeMatches=cloneJSON(s.activeMatches||[]); roundMixPreview=cloneJSON(s.roundMixPreview||[]);
    }
    function applyServerRow(data){
      lastSyncedRow={}; STATE_COLUMNS.forEach(c=>{lastSyncedRow[c]=cloneJSON(data[c]??null);}); lastSyncedRow.updated_at=data.updated_at;
      const localActiveId=eventRegistry?eventRegistry.activeEventId:null;
      players=data.players||[]; financeTransactions=data.finance_transactions||[]; rrSettings=data.rr_settings||{};
      eventRegistry=getEventRegistryFromSettings(data.rr_settings||{});
      const active=localActiveId?eventRegistry.events.find(e=>e.id===localActiveId):null;
      if(active) restoreEvent(active); else eventRegistry.activeEventId=null;
    }
  `, sandbox);
  dev.ctx = sandbox;
  dev.run = code => vm.runInContext(code, sandbox);
  return dev;
}

async function deviceLoop(dev, st) {
  const court = 'Lapangan ' + (dev.idx + 1);
  const seen = new Set();
  for (let r = 1; r <= ROUNDS; r++) {
    let m, waited = 0;
    while (!(m = dev.run('activeMatches').find(x => x.courtName === court && !seen.has(x.id)))) {
      await sleep(300); waited += 300;
      if (waited > 240000) { st.stuck.push(`${court} menunggu match ke-${r} > 240 dtk`); return; }
    }
    seen.add(m.id);
    dev.waitedForMatch = (dev.waitedForMatch || 0) + waited;
    const exp = { a: 0, b: 0, pl: {} }; dev.expect[m.id] = exp;
    while (true) {
      const lm = dev.run('activeMatches').find(x => x.id === m.id);
      if (!lm) break;
      const hi = Math.max(lm.scoreA, lm.scoreB), diff = Math.abs(lm.scoreA - lm.scoreB);
      if ((hi >= 21 && diff >= 2) || hi >= 30) break;
      const team = Math.random() < 0.5 ? 'teamA' : 'teamB', pi = Math.floor(Math.random() * 2), x = Math.random();
      const type = x < 0.86 ? 'point' : (x < 0.93 ? 'fault' : 'out');
      const key = team + pi; exp.pl[key] = exp.pl[key] || { point: 0, fault: 0, out: 0 }; exp.pl[key][type]++;
      if (type === 'point') (team === 'teamA' ? exp.a++ : exp.b++); else (team === 'teamA' ? exp.b++ : exp.a++);
      dev.run(`updateScore(${JSON.stringify(m.id)},${JSON.stringify(team)},${pi},${JSON.stringify(type)},false)`);
      dev.taps++;
      await sleep(TAP_MS * (0.6 + Math.random() * 0.8));
    }
    const t0 = Date.now();
    let ok = await dev.run(`finishMatch(${JSON.stringify(m.id)},false)`);
    let tries = 0;
    while (ok === false && tries < 6) { tries++; st.finishRetry++; await sleep(2500); await dev.run('runRefresh()').catch(() => {}); ok = await dev.run(`finishMatch(${JSON.stringify(m.id)},false)`); }
    dev.finishLat.push(Date.now() - t0);
    if (ok === false) st.finishFail++;
    dev.finished++;
  }
}

(async () => {
  server.row = buildInitialRow();
  const rowBase = JSON.stringify(server.row).length;
  const devs = Array.from({ length: COURTS }, (_, i) => makeDevice(i)); devsRef = devs;
  const st = { stuck: [], finishFail: 0, finishRetry: 0 };
  // semua device memuat state awal
  for (const d of devs) d.run(`applyServerRow(${JSON.stringify(server.row)}); eventRegistry.activeEventId='ev1'; restoreEvent(eventRegistry.events.find(e=>e.id==='ev1'));`);
  const T0 = Date.now();
  const gen = await devs[0].run('generateMatches()');
  const genMs = Date.now() - T0;
  for (const d of devs) await d.run('runRefresh()').catch(() => {});
  const startedCourts = devs[0].run('activeMatches').length;
  console.log(`[init] ukuran baris awal ${(rowBase / 1024).toFixed(0)} KB | generate ok=${gen} ${genMs}ms | lapangan terisi: ${startedCourts}/${COURTS}`);

  // log progres
  const prog = setInterval(() => {
    const done = devs.reduce((s, d) => s + d.finished, 0);
    process.stdout.write(`  ... ${((Date.now() - T0) / 1000).toFixed(0)}s  match selesai ${done}/${COURTS * ROUNDS}  CASgagal ${stats.casFail}  tulis ${stats.writes}\n`);
  }, 20000);

  await Promise.all(devs.map(d => deviceLoop(d, st)));
  // tunggu antrean skor tuntas
  for (const d of devs) await d.run('flushScoreBatch(); scoreOpQueue').catch(() => {});
  clearInterval(prog);
  const wall = (Date.now() - T0) / 1000;

  // ---------- LAPORAN ----------
  const reg = server.row.rr_settings.__eventRegistry, ev = reg.events.find(e => e.id === 'ev1');
  const hist = ev.snapshot.matchesHistory, act = ev.snapshot.activeMatches;
  console.log(`\n=== HASIL (${PROFILE}) ===`);
  console.log(`waktu total ${wall.toFixed(0)} dtk | match tersimpan di riwayat: ${hist.length}/${COURTS * ROUNDS} | match masih aktif: ${act.length}`);
  const perCourt = {}; hist.forEach(m => perCourt[m.courtName] = (perCourt[m.courtName] || 0) + 1);
  console.log('match/lapangan:', Object.keys(perCourt).sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''))).map(k => perCourt[k]).join(' '));

  // skor hilang?
  let lostTaps = 0, mismatchMatches = 0, plMismatch = 0, checked = 0;
  const byId = Object.fromEntries(hist.map(m => [m.id, m]));
  for (const d of devs) for (const [id, exp] of Object.entries(d.expect)) {
    const m = byId[id]; if (!m) continue; checked++;
    if (m.scoreA !== exp.a || m.scoreB !== exp.b) { mismatchMatches++; lostTaps += Math.abs(m.scoreA - exp.a) + Math.abs(m.scoreB - exp.b); }
    for (const [k, v] of Object.entries(exp.pl)) {
      const team = k.startsWith('teamA') ? m.teamA : m.teamB, p = team[+k.slice(-1)];
      if (!p || p.matchPoints !== v.point || p.matchFaults !== v.fault || p.matchOuts !== v.out) plMismatch++;
    }
  }
  console.log(`skor: match dicek ${checked} | skor tidak cocok: ${mismatchMatches} match (selisih total ${lostTaps} poin) | statistik pemain tidak cocok: ${plMismatch}`);

  // statistik pemain vs riwayat
  const recomputed = {}; hist.forEach(m => {
    const w = m.scoreA > m.scoreB ? 'A' : m.scoreB > m.scoreA ? 'B' : null;
    [['A', m.teamA], ['B', m.teamB]].forEach(([t, l]) => l.forEach(p => {
      const s = recomputed[p.id] = recomputed[p.id] || { played: 0, wins: 0, points: 0, out: 0, fault: 0 };
      s.played++; if (w === t) s.wins++; s.points += p.matchPoints; s.out += p.matchOuts; s.fault += p.matchFaults;
    }));
  });
  let statBad = 0, playedSum = 0;
  server.row.players.forEach(p => { const r = recomputed[p.id] || { played: 0, wins: 0, points: 0, out: 0, fault: 0 }; playedSum += p.stats.played;
    if (p.stats.played !== r.played || p.stats.wins !== r.wins || p.stats.points !== r.points) statBad++; });
  console.log(`statistik pemain (kolom players) tidak cocok dgn riwayat: ${statBad}/${NPLAY} pemain | total 'main' = ${playedSum} (seharusnya ${hist.length * 4})`);
  const snapBad = Object.entries(ev.snapshot.playerStats).filter(([id, s]) => (recomputed[id]?.played || 0) !== s.played).length;
  console.log(`snapshot event vs riwayat tidak cocok: ${snapBad}/${NPLAY}`);
  const colBad = server.row.matches_history.length !== hist.length;
  console.log(`kolom matches_history (${server.row.matches_history.length}) vs snapshot event (${hist.length}): ${colBad ? 'TIDAK SAMA' : 'sama'}`);
  const dupIds = hist.length - new Set(hist.map(m => m.id)).size;
  console.log(`match ganda di riwayat: ${dupIds}`);

  // pemerataan main
  const pl = server.row.players.map(p => p.stats.played);
  console.log(`pemerataan main: min ${Math.min(...pl)} max ${Math.max(...pl)} rata2 ${(pl.reduce((a, b) => a + b, 0) / pl.length).toFixed(2)}`);

  // jaringan & konflik
  const kb = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length / 1024).toFixed(0) : 0;
  const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))] : 0; };
  console.log(`server: baca ${stats.reads}x (rata2 ${kb(stats.readBytes)} KB) | tulis sukses ${stats.writes}x (rata2 ${kb(stats.writeBytes)} KB) | tulis ditolak konflik (CAS) ${stats.casFail}x (${(stats.casFail / (stats.casFail + stats.writes) * 100).toFixed(0)}%)`);
  console.log(`data: unduh ${(stats.bytesDown / 1e6).toFixed(1)} MB | unggah ${(stats.bytesUp / 1e6).toFixed(1)} MB | baris terbesar ${(stats.maxRow / 1024).toFixed(0)} KB`);
  console.log(`rincian tulis: skor ${stats.cat.score.ok} ok / ${stats.cat.score.fail} ditolak | selesai+generate ${stats.cat.mutate.ok} ok / ${stats.cat.mutate.fail} ditolak | notifikasi realtime ke device lain: ${stats.notif}x`);
  console.log(`tombol SELESAIKAN harus ditekan ulang: ${st.finishRetry}x`);
  const fl = devs.flatMap(d => d.finishLat);
  console.log(`latensi tombol SELESAIKAN MATCH: median ${pct(fl, .5)} ms | p90 ${pct(fl, .9)} ms | maks ${Math.max(...fl)} ms`);
  const wt = devs.map(d => (d.waitedForMatch || 0) / 1000);
  console.log(`total waktu device menunggu match baru muncul: rata2 ${(wt.reduce((a, b) => a + b, 0) / wt.length).toFixed(1)} dtk/device`);
  console.log(`error sinkron ditampilkan ke user (markSyncError): ${devs.reduce((s, d) => s + d.syncErr, 0)} | finishMatch gagal: ${st.finishFail} | device macet: ${st.stuck.length}`);
  st.stuck.forEach(s => console.log('  macet:', s));
  const errAgg = {}; devs.forEach(d => d.errors.forEach(e => errAgg[e] = (errAgg[e] || 0) + 1));
  Object.entries(errAgg).slice(0, 6).forEach(([e, n]) => console.log(`  console.error x${n}: ${e}`));
  console.log(`pelanggaran invarian di server (pemain ganda/lapangan ganda): ${violations.length}`);
  violations.slice(0, 5).forEach(v => console.log('  ', v));
  process.exit(0);
})();
