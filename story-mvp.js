/* =====================================================================
   AURA SPORTS CLUB - Story MVP (1080 x 1920)
   File tambahan: menimpa fungsi generateStoryCard() bawaan index.html
   dengan desain "MVP - Player of the Day" (hitam + emas).
   Cara pasang: taruh file ini sejajar index.html, lalu tambahkan
   <script src="story-mvp.js"></script> tepat sebelum </body> di index.html
   ===================================================================== */
(function (root) {
    const W = 1080, H = 1920;
    const K = 1080 / 941;               // skala dari desain referensi (941px) ke 1080px
    const s = v => v * K;
    const GOLD = '#c89f4c', GOLD_L = '#f3d68a', GOLD_D = '#8a6a26';
    const FONT_HEAD = '"Montserrat", "Segoe UI", Arial, sans-serif';
    const FONT_BRUSH = '"Permanent Marker", "Impact", "Arial Black", sans-serif';

    // ---------- helper teks ----------
    function spacedWidth(ctx, text, sp) {
        let w = 0;
        for (const ch of text) w += ctx.measureText(ch).width + sp;
        return w - sp;
    }
    function spacedText(ctx, text, x, y, sp, align) {
        const total = spacedWidth(ctx, text, sp);
        let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
        ctx.save();
        ctx.textAlign = 'left';
        for (const ch of text) {
            ctx.fillText(ch, cx, y);
            cx += ctx.measureText(ch).width + sp;
        }
        ctx.restore();
    }
    // pilih ukuran font agar teks ber-letterspacing pas di lebar maxW
    function fitSpaced(ctx, text, weight, family, maxW, maxSize, spRatio) {
        let size = maxSize;
        ctx.font = `${weight} ${size}px ${family}`;
        let w = spacedWidth(ctx, text, size * spRatio);
        if (w > maxW) size = size * maxW / w;
        ctx.font = `${weight} ${size}px ${family}`;
        return { size, sp: size * spRatio };
    }

    // ---------- helper gambar vektor ----------
    function goldGradient(ctx, x0, y0, x1, y1) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, GOLD_L); g.addColorStop(0.5, GOLD); g.addColorStop(1, GOLD_D);
        return g;
    }
    function streak(ctx, x1, y1, x2, y2, w, alpha) {
        const g = ctx.createLinearGradient(x1, y1, x2, y2);
        g.addColorStop(0, `rgba(243,214,138,${alpha})`);
        g.addColorStop(0.5, `rgba(200,159,76,${alpha})`);
        g.addColorStop(1, 'rgba(200,159,76,0)');
        ctx.save();
        ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.restore();
    }
    function drawCrown(ctx, cx, cy, w) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = goldGradient(ctx, -w / 2, -w / 3, w / 2, w / 3);
        ctx.beginPath();
        ctx.moveTo(-w / 2, w * 0.32);
        ctx.lineTo(-w / 2, -w * 0.02);
        ctx.lineTo(-w / 4, w * 0.14);
        ctx.lineTo(0, -w * 0.30);
        ctx.lineTo(w / 4, w * 0.14);
        ctx.lineTo(w / 2, -w * 0.02);
        ctx.lineTo(w / 2, w * 0.32);
        ctx.closePath(); ctx.fill();
        [[-w / 2, -w * 0.02], [0, -w * 0.30], [w / 2, -w * 0.02]].forEach(([x, y]) => {
            ctx.beginPath(); ctx.arc(x, y - w * 0.04, w * 0.06, 0, Math.PI * 2); ctx.fill();
        });
        ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(1.5, w * 0.03);
        ctx.beginPath(); ctx.moveTo(-w / 2, w * 0.2); ctx.lineTo(w / 2, w * 0.2); ctx.stroke();
        ctx.restore();
    }
    function drawShuttle(ctx, cx, cy, size, fill, rot) {
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(rot || 0);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(-size * 0.14, size * 0.28);
        ctx.lineTo(-size * 0.34, -size * 0.48);
        ctx.quadraticCurveTo(0, -size * 0.62, size * 0.34, -size * 0.48);
        ctx.lineTo(size * 0.14, size * 0.28);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(0, size * 0.40, size * 0.17, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = Math.max(1, size * 0.035);
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath(); ctx.moveTo(i * size * 0.05, size * 0.26);
            ctx.lineTo(i * size * 0.16, -size * 0.5); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(-size * 0.26, -size * 0.15); ctx.lineTo(size * 0.26, -size * 0.15); ctx.stroke();
        ctx.restore();
    }
    function drawTrophy(ctx, cx, cy, size, fill) {
        ctx.save(); ctx.translate(cx, cy);
        ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = size * 0.08;
        ctx.beginPath();
        ctx.moveTo(-size * 0.30, -size * 0.42); ctx.lineTo(size * 0.30, -size * 0.42);
        ctx.lineTo(size * 0.30, -size * 0.10);
        ctx.quadraticCurveTo(size * 0.30, size * 0.16, 0, size * 0.20);
        ctx.quadraticCurveTo(-size * 0.30, size * 0.16, -size * 0.30, -size * 0.10);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(-size * 0.32, -size * 0.22, size * 0.14, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(size * 0.32, -size * 0.22, size * 0.14, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
        ctx.fillRect(-size * 0.05, size * 0.18, size * 0.10, size * 0.16);
        ctx.fillRect(-size * 0.2, size * 0.34, size * 0.4, size * 0.09);
        ctx.restore();
    }
    function drawTarget(ctx, cx, cy, size, fill) {
        ctx.save(); ctx.translate(cx, cy);
        ctx.strokeStyle = fill; ctx.fillStyle = fill; ctx.lineWidth = size * 0.07;
        [0.42, 0.27].forEach(r => { ctx.beginPath(); ctx.arc(0, 0, size * r, 0, Math.PI * 2); ctx.stroke(); });
        ctx.beginPath(); ctx.arc(0, 0, size * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = size * 0.06;
        ctx.beginPath(); ctx.moveTo(size * 0.04, -size * 0.04); ctx.lineTo(size * 0.5, -size * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(size * 0.5, -size * 0.5); ctx.lineTo(size * 0.5, -size * 0.32);
        ctx.moveTo(size * 0.5, -size * 0.5); ctx.lineTo(size * 0.32, -size * 0.5); ctx.stroke();
        ctx.restore();
    }

    // ---------- bingkai foto (heksagon miring) ----------
    function framePath(ctx) {
        const pts = [[215, 415], [538, 415], [478, 700], [478, 1010], [395, 1097], [62, 1097], [62, 520]];
        ctx.beginPath();
        pts.forEach(([x, y], i) => i ? ctx.lineTo(s(x), s(y)) : ctx.moveTo(s(x), s(y)));
        ctx.closePath();
    }
    function drawPhotoInFrame(ctx, img, player) {
        const bx = s(62), by = s(415), bw = s(538 - 62), bh = s(1097 - 415);
        ctx.save();
        framePath(ctx); ctx.clip();
        // dasar gelap + kabut emas
        ctx.fillStyle = '#050505'; ctx.fillRect(bx, by, bw, bh);
        const fog = ctx.createRadialGradient(bx + bw * 0.6, by + bh * 0.3, 10, bx + bw * 0.6, by + bh * 0.3, bw * 0.9);
        fog.addColorStop(0, 'rgba(200,159,76,0.35)'); fog.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fog; ctx.fillRect(bx, by, bw, bh);

        if (img) {
            const sc = Math.max(bw / img.width, bh / img.height);
            const dw = img.width * sc, dh = img.height * sc;
            const dx = bx + (bw - dw) / 2;
            const dy = by + (bh - dh) * 0.15;   // fokus ke bagian atas (wajah)
            ctx.drawImage(img, dx, dy, dw, dh);
        } else {
            // siluet pemain jika belum ada foto
            ctx.fillStyle = '#0b0b0b';
            const cx = bx + bw * 0.5, top = by + bh * 0.2;
            ctx.beginPath(); ctx.ellipse(cx, top + 90, 85, 105, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(bx, by + bh);
            ctx.quadraticCurveTo(bx + 20, top + 300, cx - 90, top + 250);
            ctx.lineTo(cx + 90, top + 250);
            ctx.quadraticCurveTo(bx + bw - 20, top + 300, bx + bw, by + bh);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(200,159,76,0.55)';
            ctx.font = `800 120px ${FONT_HEAD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(((player && player.name) || '?').trim().charAt(0).toUpperCase(), cx, top + 95);
            ctx.textBaseline = 'alphabetic';
        }
        // vinyet gelap di tepi bawah agar menyatu dengan latar
        const vg = ctx.createLinearGradient(0, by + bh * 0.6, 0, by + bh);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = vg; ctx.fillRect(bx, by, bw, bh);
        ctx.restore();

        // garis bingkai emas + glow
        ctx.save();
        framePath(ctx);
        ctx.shadowColor = 'rgba(243,214,138,0.8)'; ctx.shadowBlur = 22;
        ctx.strokeStyle = goldGradient(ctx, bx, by, bx + bw, by + bh);
        ctx.lineWidth = 4; ctx.lineJoin = 'miter'; ctx.stroke();
        ctx.restore();
    }

    // ---------- latar ----------
    function drawBackground(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const g1 = ctx.createRadialGradient(300, 780, 20, 300, 780, 560);
        g1.addColorStop(0, 'rgba(200,159,76,0.16)'); g1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g1; ctx.fillRect(0, 300, W, 1000);
        const g2 = ctx.createRadialGradient(540, 150, 10, 540, 150, 420);
        g2.addColorStop(0, 'rgba(200,159,76,0.14)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, W, 700);

        // watermark "AURA" raksasa
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.028)';
        ctx.font = `800 380px ${FONT_HEAD}`; ctx.textAlign = 'center';
        ctx.fillText('AURA', W / 2, 440);
        ctx.restore();

        // goresan diagonal emas
        streak(ctx, -20, 340, 240, -20, 10, 0.75);
        streak(ctx, -20, 250, 160, -10, 4, 0.7);
        streak(ctx, 0, 130, 100, 0, 24, 0.35);
        streak(ctx, 940, -10, 1100, 170, 4, 0.6);
        streak(ctx, -20, 1580, 150, 1330, 7, 0.7);
        streak(ctx, -20, 1690, 210, 1360, 3, 0.55);
        streak(ctx, 0, 1440, 130, 1290, 16, 0.3);
        streak(ctx, 1100, 1420, 870, 1780, 9, 0.8);
        streak(ctx, 1100, 1540, 940, 1790, 3, 0.6);
        streak(ctx, 1100, 1320, 990, 1450, 5, 0.5);
    }
    function drawCourt(ctx) {
        // garis lapangan samar
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
        [[[0, 1640], [1080, 1580]], [[120, 1760], [1080, 1640]], [[0, 1820], [700, 1735]], [[380, 1590], [140, 1900]], [[800, 1585], [900, 1900]]]
            .forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
        ctx.restore();

        // net
        const x0 = 568, xT = 1080;
        const topY = x => 1355 + (x - x0) * (1265 - 1355) / (xT - x0);
        const botY = x => 1475 + (x - x0) * (1400 - 1475) / (xT - x0);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1;
        for (let x = x0; x <= xT; x += 13) { ctx.beginPath(); ctx.moveTo(x, topY(x)); ctx.lineTo(x, botY(x)); ctx.stroke(); }
        for (let i = 1; i < 8; i++) {
            const t = i / 8;
            ctx.beginPath(); ctx.moveTo(x0, topY(x0) + (botY(x0) - topY(x0)) * t);
            ctx.lineTo(xT, topY(xT) + (botY(xT) - topY(xT)) * t); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x0, topY(x0)); ctx.lineTo(xT, topY(xT)); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, botY(x0)); ctx.lineTo(xT, botY(xT)); ctx.stroke();
        // tiang
        ctx.fillStyle = '#161616'; ctx.fillRect(x0 - 5, 1345, 10, 250);
        ctx.strokeStyle = 'rgba(200,159,76,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(x0 - 5, 1345, 10, 250);
        ctx.restore();

        // fade ke hitam di bawah
        const fade = ctx.createLinearGradient(0, 1500, 0, 1800);
        fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = fade; ctx.fillRect(0, 1500, W, 420);
    }
    function drawBlurShuttles(ctx) {
        ctx.save();
        ctx.filter = 'blur(7px)'; ctx.globalAlpha = 0.6;
        drawShuttle(ctx, 1010, 200, 260, '#cfcfcf', 2.5);
        ctx.filter = 'blur(6px)'; ctx.globalAlpha = 0.55;
        drawShuttle(ctx, 90, 1830, 330, '#d8d8d8', -2.3);
        ctx.restore();
    }

    // ---------- kartu MVP utama ----------
    // opts: { logoImg, photoImg, sport, dateStr }
    function drawMVPStory(canvas, mvp, opts) {
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const { logoImg, photoImg } = opts;

        drawBackground(ctx);
        drawCourt(ctx);
        drawBlurShuttles(ctx);

        // ---- header ----
        const logoD = 150;
        if (logoImg) ctx.drawImage(logoImg, W / 2 - logoD / 2, s(130) - logoD / 2, logoD, logoD);
        ctx.fillStyle = GOLD;
        let f = fitSpaced(ctx, 'AURA SPORTS CLUB', 700, FONT_HEAD, s(388), 36, 0.30);
        spacedText(ctx, 'AURA SPORTS CLUB', W / 2, s(240), f.sp, 'center');
        // garis + ikon shuttle
        const ly = s(271);
        ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(s(231), ly); ctx.lineTo(W / 2 - 26, ly); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W / 2 + 26, ly); ctx.lineTo(s(711), ly); ctx.stroke();
        drawShuttle(ctx, W / 2, ly, 30, GOLD, -0.5);
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        const sessionTxt = `${opts.sport.toUpperCase()} SESSION`;
        f = fitSpaced(ctx, sessionTxt, 500, FONT_HEAD, s(300), 22, 0.32);
        spacedText(ctx, sessionTxt, W / 2, s(314), f.sp, 'center');

        // ---- foto + bingkai ----
        drawPhotoInFrame(ctx, photoImg, mvp);
        drawCrown(ctx, s(112), s(432), 78);

        // ---- "MVP" ----
        const mvpCX = s(677), mvpBase = s(692), targetH = s(212), maxW = s(384);
        ctx.save();
        ctx.font = `200px ${FONT_BRUSH}`;
        const m = ctx.measureText('MVP');
        const fs = 200 * Math.min(1, maxW / (m.width * 1.08));
        ctx.font = `${fs}px ${FONT_BRUSH}`;
        const m2 = ctx.measureText('MVP');
        const asc = m2.actualBoundingBoxAscent || fs * 0.75;
        const scaleY = Math.max(1, Math.min(1.7, targetH / asc));
        ctx.translate(mvpCX, mvpBase);
        ctx.transform(1, 0, -0.16, scaleY, 0, 0);   // miring + dipertinggi seperti desain
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(243,214,138,0.55)'; ctx.shadowBlur = 30;
        ctx.fillStyle = goldGradient(ctx, 0, -asc, 0, 0);
        ctx.fillText('MVP', 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
        drawCrown(ctx, s(606), s(474), 70);

        // ---- PLAYER OF THE DAY ----
        ctx.fillStyle = '#fff';
        f = fitSpaced(ctx, 'PLAYER OF THE DAY', 800, FONT_HEAD, s(340), 34, 0.14);
        spacedText(ctx, 'PLAYER OF THE DAY', s(506), s(732), f.sp, 'left');

        ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(s(507), s(760)); ctx.lineTo(s(889), s(760)); ctx.stroke();

        // ---- nama ----
        const nameTxt = (mvp.name || 'PEMAIN').toUpperCase();
        let nsize = 66;
        ctx.font = `800 ${nsize}px ${FONT_HEAD}`;
        const nmax = s(384);
        const nw = ctx.measureText(nameTxt).width;
        if (nw > nmax) { nsize = nsize * nmax / nw; ctx.font = `800 ${nsize}px ${FONT_HEAD}`; }
        ctx.fillStyle = '#f5f1e8'; ctx.textAlign = 'center';
        ctx.fillText(nameTxt, s(698), s(808) + nsize * 0.36);
        const lg = ctx.createLinearGradient(s(507), 0, s(889), 0);
        lg.addColorStop(0, GOLD); lg.addColorStop(0.6, 'rgba(200,159,76,0.6)'); lg.addColorStop(1, 'rgba(200,159,76,0)');
        ctx.strokeStyle = lg; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(s(507), s(858)); ctx.lineTo(s(889), s(858)); ctx.stroke();

        // ---- statistik ----
        const played = mvp.stats.played, wins = mvp.stats.wins;
        const wr = played > 0 ? Math.round(wins / played * 100) : 0;
        const cols = [
            { x: s(553), val: String(played), label: 'MATCHES', icon: 'shuttle' },
            { x: s(698), val: String(wins), label: 'WINS', icon: 'trophy' },
            { x: s(846), val: wr + '%', label: 'WIN RATE', icon: 'target' }
        ];
        cols.forEach(c => {
            const iy = s(925);
            if (c.icon === 'shuttle') drawShuttle(ctx, c.x, iy, 50, GOLD, -0.5);
            if (c.icon === 'trophy') drawTrophy(ctx, c.x, iy, 50, GOLD);
            if (c.icon === 'target') drawTarget(ctx, c.x, iy, 50, GOLD);
            ctx.textAlign = 'center';
            ctx.font = `800 ${s(46)}px ${FONT_HEAD}`;
            ctx.fillStyle = goldGradient(ctx, 0, s(960), 0, s(1010));
            ctx.fillText(c.val, c.x, s(1001));
            ctx.font = `500 ${s(15.5)}px ${FONT_HEAD}`;
            ctx.fillStyle = '#fff';
            spacedText(ctx, c.label, c.x, s(1034), 2, 'center');
        });
        ctx.strokeStyle = 'rgba(200,159,76,0.7)'; ctx.lineWidth = 1.5;
        [s(628), s(771)].forEach(x => { ctx.beginPath(); ctx.moveTo(x, s(922)); ctx.lineTo(x, s(1033)); ctx.stroke(); });

        // ---- footer ----
        const fl = ctx.createLinearGradient(s(387), 0, s(555), 0);
        fl.addColorStop(0, 'rgba(200,159,76,0)'); fl.addColorStop(0.5, GOLD); fl.addColorStop(1, 'rgba(200,159,76,0)');
        ctx.strokeStyle = fl; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(s(387) - 0, s(1452)); ctx.lineTo(s(555) + 0, s(1452)); ctx.stroke();
        ctx.fillStyle = GOLD;
        f = fitSpaced(ctx, 'AURA SPORTS CLUB', 700, FONT_HEAD, s(257), 26, 0.28);
        spacedText(ctx, 'AURA SPORTS CLUB', W / 2, s(1495), f.sp, 'center');
        ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(s(215), s(1490)); ctx.lineTo(s(252), s(1490));
        ctx.moveTo(s(692), s(1490)); ctx.lineTo(s(728), s(1490)); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        const footTxt = `${opts.dateStr}  \u00B7  ${opts.sport.toUpperCase()} SESSION`;
        f = fitSpaced(ctx, footTxt, 500, FONT_HEAD, s(402), 20, 0.18);
        spacedText(ctx, footTxt, W / 2, s(1526), f.sp, 'center');
        return canvas;
    }

    root.__drawMVPStory = drawMVPStory;
    if (typeof document === 'undefined') return;   // (mode test di luar browser)

    // ---------- integrasi ke aplikasi ----------
    function ensureFonts() {
        return new Promise(resolve => {
            let link = document.getElementById('aura-story-fonts');
            const done = () => {
                Promise.all([
                    document.fonts.load('200px "Permanent Marker"', 'MVP'),
                    document.fonts.load('800 30px "Montserrat"', 'AURA'),
                    document.fonts.load('700 30px "Montserrat"', 'AURA'),
                    document.fonts.load('500 30px "Montserrat"', 'AURA')
                ]).catch(() => { }).then(resolve);
            };
            if (link) return done();
            link = document.createElement('link');
            link.id = 'aura-story-fonts'; link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800&family=Permanent+Marker&display=swap';
            link.onload = done; link.onerror = resolve;
            document.head.appendChild(link);
            setTimeout(resolve, 5000);   // jangan menunggu selamanya
        });
    }
    function getSport() {
        const sel = document.getElementById('sportType');
        if (!sel) return 'Badminton';
        if (sel.value === 'Custom') {
            const c = document.getElementById('customSportName');
            return (c && c.value.trim()) || 'Custom';
        }
        return sel.value;
    }
    function download(canvas, name) {
        const a = document.createElement('a');
        a.download = name; a.href = canvas.toDataURL('image/png'); a.click();
    }

    const oldStory = root.generateStoryCard;   // simpan versi lama untuk Best Partner
    root.generateStoryCard = async function () {
        const mvp = computeMVP();
        if (!mvp) {
            alert('Belum ada data pertandingan selesai untuk dibuatkan story. Selesaikan minimal 1 match dulu.');
            return;
        }
        await ensureFonts();
        const [logoImg, photoImg] = await Promise.all([loadImageEl('logo-circle.png'), loadImageEl(mvp.photo)]);
        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
        const canvas = drawMVPStory(document.createElement('canvas'), mvp, { logoImg, photoImg, sport: getSport(), dateStr });
        download(canvas, `Aura_MVP_${mvp.name.replace(/\s+/g, '_')}_${Date.now()}.png`);
    };

    // Best Partner: sementara masih desain lama (tanpa bagian MVP) sampai desain barunya dibuat
    root.generateBestPartnerStory = async function () {
        const original = root.computeMVP;
        root.computeMVP = () => null;
        try { await oldStory(); } finally { root.computeMVP = original; }
    };

    function fixButtons() {
        const btn = document.querySelector('button[onclick="generateStoryCard()"]');
        if (!btn) return;
        btn.textContent = '\uD83D\uDC51 Story MVP';
        const b2 = document.createElement('button');
        b2.className = 'btn-success';
        b2.textContent = '\uD83E\uDD1D Story Best Partner';
        b2.setAttribute('onclick', 'generateBestPartnerStory()');
        btn.after(b2);
    }
    fixButtons();
})(typeof window !== 'undefined' ? window : globalThis);
