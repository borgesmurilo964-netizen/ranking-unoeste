// Acesso ao Supabase via REST (PostgREST), sem dependências extras.
// URL e chave vêm das variáveis de ambiente do Vite (.env.local / Vercel).

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const configOk = Boolean(SUPABASE_URL && SUPABASE_KEY);

export async function api(path, opt = {}) {
  if (!configOk) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas');
  }
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    cache: 'no-store',
    ...opt,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(opt.headers || {}),
    },
  });
  if (!resp.ok) throw new Error(`Supabase ${resp.status}: ${await resp.text()}`);
  if (resp.status === 204) return null;
  const txt = await resp.text();
  return txt ? JSON.parse(txt) : null;
}

/** Linhas ativas do ranking, em ordem estável (ordem, id). */
export function buscarRanking() {
  return api('ranking?select=id,nome,valor,tipo,ordem,ativo&ativo=eq.true&order=ordem.asc,id.asc');
}

/** Mapa nome → foto (data URI ou URL). */
export async function buscarFotos() {
  const rows = await api('fotos?select=nome,foto');
  const map = {};
  for (const r of rows || []) if (r.nome && r.foto) map[r.nome] = r.foto;
  return map;
}

/** Normaliza nomes para casar "Murillo"/"Murilo", espaços extras, maiúsculas etc. */
export function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/([a-z])\1+/g, '$1');
}

/** Procura a foto pelo nome exato e, se não achar, pelo nome normalizado. */
export function fotoDe(fotos, nome) {
  if (fotos[nome]) return fotos[nome];
  const n = norm(nome);
  for (const k of Object.keys(fotos)) if (norm(k) === n) return fotos[k];
  return null;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
