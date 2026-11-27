import './tv.css';
import { buscarRanking, buscarFotos, fotoDe, esc, configOk } from './supabase.js';

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURAÇÃO
═══════════════════════════════════════════════════════════════════════════ */
const POLL_RANKING_MS = 5000;        // atualização dos números
const POLL_FOTOS_MS = 60000;         // atualização das fotos
const CHECK_VERSAO_MS = 5 * 60000;   // procura deploy novo na Vercel
const DURATION = 20000;              // tempo de cada tela

const CP = ['#118F40', '#A2BD30', '#3d7a52', '#7a4fae', '#2f7da6', '#b5394f', '#4f8f6f', '#9a5fae', '#3f6fae', '#5fa68f', '#ae4f7a', '#6f8f3f', '#7f5f3f', '#2f9a6a', '#6fae4f'];
const CE = ['#DC931A', '#e8a838', '#f0c060', '#c8790a', '#f0d090', '#d0891a', '#e8b048', '#c86e00', '#f0a840'];

let FOTOS = {};

function horseSVG(jersey) {
  return `
      <ellipse cx="50" cy="78" rx="34" ry="8" fill="rgba(0,0,0,0.25)"/>
      <path d="M30 55 Q20 35 32 18 Q40 6 50 10 Q56 2 64 8 Q72 4 76 14 Q84 18 80 30 Q90 36 82 46 Q86 58 70 60 Q66 72 50 70 Q34 74 30 60 Z" fill="#c08a52"/>
      <path d="M34 22 Q26 10 36 6 Q42 12 40 24 Z" fill="#a8723e"/>
      <path d="M58 14 Q60 2 70 4 Q72 14 64 20 Z" fill="#a8723e"/>
      <path d="M34 22 Q28 12 36 9 Q40 14 38 23 Z" fill="#dba87a"/>
      <path d="M58 14 Q62 4 68 6 Q68 14 62 18 Z" fill="#dba87a"/>
      <path d="M30 13 Q24 4 18 8 Q22 16 28 20 Z" fill="#7a5230"/>
      <path d="M40 6 Q36 -2 30 2 Q33 9 38 13 Z" fill="#7a5230"/>
      <path d="M48 8 Q44 -1 38 4 Q41 10 46 14 Z" fill="#7a5230"/>
      <ellipse cx="80" cy="36" rx="13" ry="11" fill="#e8cda3"/>
      <ellipse cx="86" cy="40" rx="4.5" ry="3.5" fill="#7a5230"/>
      <circle cx="46" cy="30" r="9" fill="white"/>
      <circle cx="48" cy="31" r="5" fill="#2a2018"/>
      <circle cx="46.5" cy="29.5" r="1.6" fill="white"/>
      <path d="M38 22 Q46 17 54 22" stroke="#7a5230" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M65 44 Q78 50 78 56 Q70 58 60 52 Z" fill="#e8536b"/>
      <path d="M64 44 Q72 47 72 52" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
      <rect x="20" y="56" width="40" height="16" rx="3" fill="${jersey}"/>
      <rect x="20" y="56" width="40" height="16" rx="3" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
      <rect x="27" y="56" width="4" height="16" fill="rgba(255,255,255,0.35)"/>
      <rect x="38" y="56" width="4" height="16" fill="rgba(255,255,255,0.35)"/>
      <rect x="49" y="56" width="4" height="16" fill="rgba(255,255,255,0.35)"/>`;
}

const eo = (t) => 1 - Math.pow(1 - t, 3);
const $ = (id) => document.getElementById(id);

/* ═══════════════════════════════════════════════════════════════════════════
   CORRIDA (telas 1 e 2) — mesmo motor da versão original
═══════════════════════════════════════════════════════════════════════════ */
function ChartEngine(cfg) {
  const C = {};
  C.id = cfg.id;
  C.colors = cfg.colors;
  C.ch = $('ch' + cfg.id);
  C.ss = $('ss' + cfg.id);
  C.tw = $('tw' + cfg.id);
  C.data = [];
  C.maxVal = 1;
  C.animId = null;
  C.ROW_H = 50;
  C.el = (p, i) => $(p + C.id + '-' + i);

  // Cor fixa por posição em "ordem" (não muda quando o ranking muda)
  C.colorFor = (i) => C.colors[i % C.colors.length];
  C.sorted = () =>
    C.data.map((d, i) => ({ i, v: d.value })).sort((a, b) => b.v - a.v || a.i - b.i).map((x) => x.i);

  C.buildRows = function () {
    const chH = C.ch.offsetHeight || 600;
    const n = Math.max(1, C.data.length);
    const rawRH = (chH - 8) / (n + 0.25);
    C.ROW_H = Math.max(38, Math.min(96, Math.round(rawRH)));
    const silkSz = Math.max(26, Math.min(58, Math.round(C.ROW_H * 0.82)));
    const silkOver = Math.round(silkSz * 0.6);
    const trackH = Math.max(16, Math.round(C.ROW_H * 0.44));
    C.ss.style.height = silkOver + 'px';
    C.tw.innerHTML = '';
    C.data.forEach((d, i) => {
      const color = C.colorFor(i);
      const av = fotoDe(FOTOS, d.name);
      const row = document.createElement('div');
      row.className = 'row';
      row.id = 'r' + C.id + '-' + i;
      row.style.top = i * C.ROW_H + 'px';
      row.style.height = C.ROW_H + 'px';
      const silkHtml = av
        ? `<div class="silk" id="si${C.id}-${i}" style="width:${silkSz}px;height:${silkSz}px;background-image:url('${av}');border-color:${color};left:0"></div>`
        : `<div class="silksvg" id="si${C.id}-${i}" style="left:0"><svg viewBox="0 0 100 100" style="width:${silkSz}px;height:${silkSz}px">${horseSVG(color)}</svg></div>`;
      row.innerHTML =
        `<div class="rpos" id="rp${C.id}-${i}"></div>` +
        `<div class="rname" id="rn${C.id}-${i}">${esc(d.name)}</div>` +
        `<div class="rtrack" id="rt${C.id}-${i}" style="height:${trackH}px">` +
        `<div class="rbar" id="rb${C.id}-${i}" style="--bc:${color}"></div>${silkHtml}</div>` +
        `<div class="rval" id="rv${C.id}-${i}"></div>`;
      C.tw.appendChild(row);
    });
  };

  C.setPos = function (animate) {
    C.sorted().forEach((di, rank) => {
      const row = C.el('r', di);
      const rp = C.el('rp', di);
      if (!row) return;
      row.style.transition = animate ? 'top .7s cubic-bezier(.4,0,.2,1)' : 'none';
      row.style.top = rank * C.ROW_H + 'px';
      if (rp) rp.textContent = rank + 1 + 'º';
    });
  };

  C.revealLabels = function () {
    C.sorted().forEach((di, rank) => {
      setTimeout(() => {
        const rn = C.el('rn', di);
        const rp = C.el('rp', di);
        if (rn) { rn.style.opacity = 1; rn.style.transform = 'translateX(0)'; }
        if (rp) rp.style.opacity = 1;
      }, rank * 45);
    });
  };

  C.animBars = function (fv, tv, dur) {
    if (C.animId) cancelAnimationFrame(C.animId);
    const t0 = performance.now();
    const fr = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = eo(t);
      C.data.forEach((d, i) => {
        const cur = (fv[i] || 0) + (tv[i] - (fv[i] || 0)) * e;
        const pct = C.maxVal > 0 ? (cur / C.maxVal) * 100 : 0;
        const rb = C.el('rb', i), si = C.el('si', i), rt = C.el('rt', i), rv = C.el('rv', i);
        if (rb) rb.style.width = pct + '%';
        if (si && rt) si.style.left = Math.max(0, rt.offsetWidth * (pct / 100)) + 'px';
        if (rv) { rv.style.opacity = e > 0.04 ? 1 : 0; rv.textContent = Math.round(cur); }
      });
      if (t < 1) C.animId = requestAnimationFrame(fr);
      else C.data.forEach((d, i) => { const rv = C.el('rv', i); if (rv) rv.textContent = d.value; });
    };
    C.animId = requestAnimationFrame(fr);
  };

  C.calcMax = () => { C.maxVal = Math.max(1, ...C.data.map((d) => d.value || 0)); };

  C.runRace = function () {
    C.calcMax();
    C.buildRows();
    C.setPos(false);
    setTimeout(C.revealLabels, 70);
    C.animBars(C.data.map(() => 0), C.data.map((d) => d.value), 2200);
  };

  // Atualização suave: só mexe nas barras/posições quando os nomes são os mesmos
  C.applyUpdate = function () {
    const oldMax = C.maxVal;
    const fv = C.data.map((d, i) => {
      const rb = C.el('rb', i);
      return rb ? ((parseFloat(rb.style.width) || 0) / 100) * oldMax : 0;
    });
    C.calcMax();
    C.setPos(true);
    C.revealLabels();
    C.animBars(fv, C.data.map((d) => d.value), 950);
  };

  /** Recebe os dados novos; visivel=true anima na hora. */
  C.setData = function (arr, visivel) {
    const sameNames = arr.length === C.data.length && arr.every((d, i) => d.name === C.data[i].name);
    C.data = arr.map((d) => ({ name: d.name, value: d.value }));
    if (!visivel) return;
    if (sameNames && C.tw.children.length) C.applyUpdate();
    else C.runRace();
  };

  return C;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TELA 3 — GRÁFICO DE BARRAS (Presencial × EAD)
═══════════════════════════════════════════════════════════════════════════ */
function nomeCurto(nome) {
  const p = nome.trim().split(/\s+/);
  return p.length <= 2 ? p.join(' ') : p[0] + ' ' + p[p.length - 1];
}

const Grafico = {
  data: { presencial: [], ead: [] },
  set(d) { this.data = d; },
  render(animar) {
    const { presencial, ead } = this.data;
    const max = Math.max(1, ...presencial.map((d) => d.value), ...ead.map((d) => d.value));
    const n = Math.max(presencial.length, ead.length, 1);
    // Altura de linha e fonte derivadas da quantidade de consultores
    const box = $('gbp');
    const h = box.clientHeight || window.innerHeight * 0.65;
    const rh = Math.min(h / n, window.innerHeight * 0.085);
    const fs = Math.max(12, Math.min(34, rh * 0.5));
    for (const [id, arr] of [['gbp', presencial], ['gbe', ead]]) {
      const el = $(id);
      el.style.setProperty('--n', n);
      el.style.setProperty('--rh', rh + 'px');
      el.style.setProperty('--fs', fs + 'px');
      const rows = [...arr].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'pt-BR'));
      const prev = {};
      el.querySelectorAll('.gbr').forEach((r) => { prev[r.dataset.nome] = r.querySelector('.gbb').style.width; });
      el.innerHTML = rows.length
        ? rows.map((r, i) => `<div class="gbr" data-nome="${esc(r.name)}"><span class="gbn" title="${esc(r.name)}"><i>${i + 1}º</i>${esc(nomeCurto(r.name))}</span><span class="gbt"><span class="gbb" data-w="${(r.value / max) * 100}%"></span></span><span class="gbv">${r.value}</span></div>`).join('')
        : '<div class="gempty">Sem dados</div>';
      el.querySelectorAll('.gbr').forEach((r) => {
        const b = r.querySelector('.gbb');
        b.style.width = animar ? '0%' : prev[r.dataset.nome] || '0%';
      });
    }
    const tp = presencial.reduce((s, d) => s + d.value, 0);
    const te = ead.reduce((s, d) => s + d.value, 0);
    $('totp').textContent = tp;
    $('tote').textContent = te;
    $('totg').textContent = tp + te;
    // força reflow e aplica a largura final (a transição CSS anima)
    void document.body.offsetHeight;
    requestAnimationFrame(() => document.querySelectorAll('#sc2 .gbb').forEach((b) => { b.style.width = b.dataset.w; }));
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   DADOS DO SUPABASE
═══════════════════════════════════════════════════════════════════════════ */
const charts = [ChartEngine({ id: 0, colors: CP }), ChartEngine({ id: 1, colors: CE })];
let cur = 0;
let lastHash = '';
let lastFotosHash = '';

function separar(rows) {
  const out = { presencial: [], ead: [] };
  for (const r of rows || []) {
    const nome = String(r.nome || '').trim();
    if (!nome || !out[r.tipo]) continue; // ignora linhas sem nome
    out[r.tipo].push({ name: nome, value: Math.max(0, Math.round(Number(r.valor) || 0)) });
  }
  return out;
}

async function carregarRanking() {
  try {
    const d = separar(await buscarRanking());
    $('offline').hidden = true;
    const h = JSON.stringify(d);
    if (h === lastHash) return;
    const primeira = !lastHash;
    lastHash = h;
    charts[0].setData(d.presencial, cur === 0 && !primeira);
    charts[1].setData(d.ead, cur === 1 && !primeira);
    Grafico.set(d);
    if (cur === 2) Grafico.render(false);
    if (primeira) mostrarTela(cur);
  } catch (e) {
    console.warn('Falha ao ler o ranking:', e.message);
    $('offline').hidden = false;
  }
}

async function carregarFotos() {
  try {
    const f = await buscarFotos();
    const h = Object.keys(f).sort().map((k) => k + f[k].length).join('|');
    if (h === lastFotosHash) return;
    lastFotosHash = h;
    FOTOS = f;
    if (cur < 2 && charts[cur].data.length) charts[cur].runRace();
  } catch (e) {
    console.warn('Falha ao ler as fotos:', e.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROTAÇÃO AUTOMÁTICA  Presencial → EAD → Gráfico → …
═══════════════════════════════════════════════════════════════════════════ */
const N_TELAS = 3;
const MSGS = [
  { txt: '🎓 Agora, o Ranking EAD!', bdg: 'EAD / Semipresencial' },              // 0 → 1
  { txt: '📊 Agora, o Placar Geral!', bdg: 'Presencial × EAD' },                // 1 → 2
  { txt: '🏆 Voltamos ao Ranking Presencial!', bdg: 'Matrículas Presenciais' }, // 2 → 0
];
const CC = ['#118F40', '#DC931A', 'linear-gradient(90deg,#118F40,#DC931A)'];
let t0 = null, cTm = null, cTk = null;
let novaVersao = false;

function mostrarTela(idx) {
  if (idx < 2) charts[idx].runRace();
  else Grafico.render(true);
}

function activateScreen(idx) {
  $('sc' + cur).classList.remove('on');
  cur = idx;
  $('sc' + cur).classList.add('on');
  mostrarTela(cur);
}

function doSwitch() {
  clearTimeout(cTm);
  clearInterval(cTk);
  if (novaVersao) { location.reload(); return; } // aplica deploy novo entre telas
  const nxt = (cur + 1) % N_TELAS;
  const m = MSGS[cur];
  $('tmsg').textContent = m.txt;
  $('tbdg').textContent = m.bdg;
  $('tov').classList.add('on');
  setTimeout(() => {
    activateScreen(nxt);
    setTimeout(() => { $('tov').classList.remove('on'); startCnt(); }, 650);
  }, 1500);
}

function startCnt() {
  clearTimeout(cTm);
  clearInterval(cTk);
  t0 = Date.now();
  $('cb').style.background = CC[cur];
  cTm = setTimeout(doSwitch, DURATION);
  cTk = setInterval(() => {
    const el = Date.now() - t0;
    $('cb').style.width = Math.min(100, (el / DURATION) * 100) + '%';
    $('ct').textContent = Math.max(0, Math.ceil((DURATION - el) / 1000)) + 's';
  }, 200);
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-ATUALIZAÇÃO DO APP: quando sai um deploy novo na Vercel, a TV recarrega
   sozinha (compara o nome do JS com hash gerado pelo Vite).
═══════════════════════════════════════════════════════════════════════════ */
function scriptAtual() {
  const s = document.querySelector('script[type="module"][src*="/assets/"]');
  return s ? new URL(s.src).pathname : null;
}
async function checarVersao() {
  const atual = scriptAtual();
  if (!atual) return; // modo dev
  try {
    const html = await (await fetch('/?v=' + Date.now(), { cache: 'no-store' })).text();
    const m = html.match(/src="([^"]*\/assets\/[^"]+\.js)"/);
    if (m && new URL(m[1], location.href).pathname !== atual) novaVersao = true;
  } catch { /* sem rede: tenta depois */ }
}

/* Redesenha se a janela mudar de tamanho (ex.: TV entrando em tela cheia) */
let rsz;
window.addEventListener('resize', () => {
  clearTimeout(rsz);
  rsz = setTimeout(() => mostrarTela(cur), 300);
});

/* INIT */
if (!configOk) {
  $('offline').hidden = false;
  $('offline').textContent = '⚠ Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY';
}
Promise.all([carregarFotos(), carregarRanking()]).finally(() => {
  startCnt();
  setInterval(carregarRanking, POLL_RANKING_MS);
  setInterval(carregarFotos, POLL_FOTOS_MS);
  setInterval(checarVersao, CHECK_VERSAO_MS);
});
