import './admin.css';
import { api, buscarRanking, buscarFotos, fotoDe, esc } from './supabase.js';

let dados = [];          // linhas do ranking
let originais = {};      // id → valor salvo no Supabase
let fotos = {};
let fotoAlvo = null;     // nome do consultor que vai receber a foto

const $ = (id) => document.getElementById(id);

function st(msg, cls = '') {
  const el = $('status');
  el.className = 'status ' + cls;
  el.textContent = msg;
}

const alterados = () => dados.filter((c) => originais[c.id] !== c.valor);

function marcarSujo() {
  $('salvar').classList.toggle('dirty', alterados().length > 0);
}

async function carregar() {
  if (alterados().length && !confirm('Há alterações não salvas. Recarregar mesmo assim?')) return;
  try {
    st('Carregando dados...');
    const [rows, f] = await Promise.all([buscarRanking(), buscarFotos().catch(() => ({}))]);
    dados = rows.map((r) => ({ ...r, valor: parseInt(r.valor, 10) || 0 }));
    originais = Object.fromEntries(dados.map((c) => [c.id, c.valor]));
    fotos = f;
    render('presencial');
    render('ead');
    marcarSujo();
    st('Dados carregados. Faça as alterações e clique em Salvar.', 'ok');
  } catch (e) {
    console.error(e);
    st('Erro ao carregar: ' + e.message, 'err');
  }
}

function render(tipo) {
  const arr = dados.filter((x) => x.tipo === tipo).sort((a, b) => a.ordem - b.ordem || a.id - b.id);
  $('tot-' + tipo).textContent = arr.reduce((s, c) => s + c.valor, 0) + ' matrículas';
  $(tipo).innerHTML = arr
    .map((c, i) => {
      const nome = (c.nome || '').trim();
      const foto = nome ? fotoDe(fotos, nome) : null;
      const av = foto
        ? `<button class="av" data-foto="${esc(nome)}" title="Trocar foto" style="background-image:url('${foto}')"></button>`
        : `<button class="av" data-foto="${esc(nome)}" title="Enviar foto" ${nome ? '' : 'disabled'}>📷</button>`;
      return `<div class="row ${originais[c.id] !== c.valor ? 'changed' : ''}">
        <div class="rank">${i + 1}º</div>${av}
        <div class="name ${nome ? '' : 'sem'}">${nome ? esc(nome) : `(sem nome — id ${c.id})`}</div>
        <button class="mini minus" data-inc="-1" data-id="${c.id}">−</button>
        <input class="val" type="number" min="0" value="${c.valor}" data-id="${c.id}">
        <button class="mini plus" data-inc="1" data-id="${c.id}">+</button>
      </div>`;
    })
    .join('');
}

function porId(id) {
  return dados.find((x) => x.id === Number(id));
}

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  if (b.dataset.inc) {
    const c = porId(b.dataset.id);
    if (!c) return;
    c.valor = Math.max(0, c.valor + Number(b.dataset.inc));
    render(c.tipo);
    marcarSujo();
  } else if (b.dataset.foto) {
    fotoAlvo = b.dataset.foto;
    $('arquivo').value = '';
    $('arquivo').click();
  }
});

document.addEventListener('change', (ev) => {
  const inp = ev.target;
  if (!inp.classList.contains('val')) return;
  const c = porId(inp.dataset.id);
  if (!c) return;
  c.valor = Math.max(0, parseInt(inp.value, 10) || 0);
  render(c.tipo);
  marcarSujo();
});

async function salvarTudo() {
  const lista = alterados();
  if (!lista.length) return st('Nada para salvar.', 'ok');
  const btn = $('salvar');
  btn.disabled = true;
  try {
    st(`Salvando ${lista.length} alteração(ões)...`);
    for (const c of lista) {
      await api('ranking?id=eq.' + c.id, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ valor: c.valor }),
      });
      originais[c.id] = c.valor;
    }
    render('presencial');
    render('ead');
    marcarSujo();
    st('✅ Salvo! A TV deve atualizar em até 5 segundos.', 'ok');
  } catch (e) {
    console.error(e);
    st('Erro ao salvar: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
  }
}

/* ── Upload de foto: reduz para 160×160 (recorte quadrado central) em WebP ── */
function reduzirImagem(file, lado = 160) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const cv = document.createElement('canvas');
      cv.width = cv.height = lado;
      cv.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, lado, lado);
      URL.revokeObjectURL(img.src);
      let url = cv.toDataURL('image/webp', 0.85);
      if (!url.startsWith('data:image/webp')) url = cv.toDataURL('image/jpeg', 0.85);
      resolve(url);
    };
    img.onerror = () => reject(new Error('Não consegui ler a imagem'));
    img.src = URL.createObjectURL(file);
  });
}

$('arquivo').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  if (!file || !fotoAlvo) return;
  const nome = fotoAlvo;
  try {
    st(`Enviando foto de ${nome}...`);
    const foto = await reduzirImagem(file);
    // Upsert pela chave única "nome" (ver supabase.sql)
    await api('fotos?on_conflict=nome', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ nome, foto }),
    });
    fotos[nome] = foto;
    render('presencial');
    render('ead');
    st(`✅ Foto de ${nome} salva. A TV mostra em até 1 minuto.`, 'ok');
  } catch (e) {
    console.error(e);
    st('Erro ao enviar foto: ' + e.message + ' — rodou o supabase.sql?', 'err');
  }
});

$('salvar').addEventListener('click', salvarTudo);
$('recarregar').addEventListener('click', carregar);
window.addEventListener('beforeunload', (e) => {
  if (alterados().length) e.preventDefault();
});

carregar();
