// Dijalankan Vercel saat build (lihat vercel.json -> buildCommand).
// Mengganti penanda __AURA_DEPLOY_TIME__ di index.html dengan waktu deploy (WIB), supaya footer
// "Update: ..." selalu menunjukkan kapan versi yang sedang tayang di-deploy.
// Aman: kalau penanda tidak ada, build tetap lanjut tanpa error.
const fs = require('fs');

const TOKEN = '__AURA_DEPLOY_TIME__';
const parts = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
}).formatToParts(new Date());
const get = t => parts.find(p => p.type === t).value;
const stamp = `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} WIB`;

const file = 'index.html';
const html = fs.readFileSync(file, 'utf8');
if (!html.includes(TOKEN)) {
  console.warn('[stamp] Penanda ' + TOKEN + ' tidak ditemukan di ' + file + ' - dilewati.');
  process.exit(0);
}
fs.writeFileSync(file, html.split(TOKEN).join(stamp));
console.log('[stamp] Update: ' + stamp);
