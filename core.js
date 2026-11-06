'use strict';
/* =====================================================================
   NÚCLEO: utilidades, estado, dados, cálculos, layout, modal e gráficos
   ===================================================================== */

/* ---------- utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const isoDe = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoje = () => isoDe(new Date());
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MESES_C = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
const nomeMes = ym => { const [y, m] = ym.split('-').map(Number); return `${cap(MESES[m - 1])} de ${y}`; };
const mesCurto = ym => { const [y, m] = ym.split('-').map(Number); return `${MESES_C[m - 1]}/${String(y).slice(2)}`; };
function somaMeses(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const alvo = new Date(y, m - 1 + n, 1);
  const ult = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  return `${alvo.getFullYear()}-${pad(alvo.getMonth() + 1)}-${pad(Math.min(d || 1, ult))}`;
}
const somaDias = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoDe(new Date(y, m - 1, d + n)); };
const diasNoMes = ym => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
const fimMes = ym => `${ym}-${pad(diasNoMes(ym))}`;
const diffDias = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
const dataBR = d => d ? d.slice(0, 10).split('-').reverse().join('/') : '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = v => S.ocultar ? 'R$ ••••' : brl.format(Number(v) || 0);
const fmtS = v => { if (S.ocultar) return 'R$ ••••'; const n = Number(v) || 0; return (n > 0 ? '+' : '') + brl.format(n); };
function fmtK(v) {
  if (S.ocultar) return '•••';
  const a = Math.abs(v), s = v < 0 ? '-' : '';
  const f = x => x.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  if (a >= 1e6) return `${s}R$ ${f(a / 1e6)} mi`;
  if (a >= 1e3) return `${s}R$ ${f(a / 1e3)} mil`;
  return `${s}R$ ${Math.round(a)}`;
}
const pct = v => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
const soma = (a, f = x => x) => a.reduce((t, x) => t + (Number(f(x)) || 0), 0);
const cls = v => v < 0 ? 'neg' : v > 0 ? 'pos' : '';
function quantil(arr, q) {
  const a = arr.filter(v => v != null).sort((x, y) => x - y); if (!a.length) return null;
  const p = (a.length - 1) * q, b = Math.floor(p), r = p - b;
  return a[b + 1] !== undefined ? a[b] + r * (a[b + 1] - a[b]) : a[b];
}
const ls = {
  get(k, d) { try { const v = localStorage.getItem('fin_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('fin_' + k, JSON.stringify(v)); } catch { } }
};
function parseNum(s) {
  if (typeof s === 'number') return s;
  let t = String(s || '').replace(/[R$\s ]/g, '');
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (t.endsWith('-')) { neg = true; t = t.slice(0, -1); }
  const ic = t.lastIndexOf(','), ip = t.lastIndexOf('.');
  if (ic > ip) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(/,/g, '');
  const n = parseFloat(t);
  return isNaN(n) ? null : (neg ? -Math.abs(n) : n);
}
function parseData(s) {
  s = String(s || '').trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${pad(m[2])}-${pad(m[1])}`;
  }
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

/* ---------- ícones (traço) ---------- */
const IC = {
  inicio: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  transacoes: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  contas: '<path d="M3 10h18M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 21h18M12 3l9 5H3z"/>',
  importar: '<path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  relatorios: '<path d="M4 20V11M10 20V5M16 20v-8M22 20H2"/>',
  patrimonio: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>',
  orcamentos: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 7l11-3.5V7M16.5 13.5h.01"/>',
  metas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  recorrentes: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
  categorias: '<path d="M3 3h8l10 10-8 8L3 11zM7.5 7.5h.01"/>',
  pessoas: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  grupos: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M6 8.5v7M18 8.5a7 7 0 0 1-7 7H8.5"/>',
  regras: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  olhoX: '<path d="M2 12s3.6-7 10-7c2 0 3.7.7 5.1 1.6M22 12s-3.6 7-10 7c-2 0-3.7-.7-5.1-1.6M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
  lixo: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  checkC: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  arquivo: '<path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4"/>',
  pausa: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  esq: '<path d="M15 18l-6-6 6-6"/>',
  dir: '<path d="M9 18l6-6-6-6"/>',
  baixo: '<path d="M6 9l6 6 6-6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  colunas: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
  atualizar: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>',
  transf: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  sair: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  filtro: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
  alerta: '<path d="M12 3 2 20h20zM12 10v4M12 17h.01"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  copiar: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  chave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'
};
const ic = (n, s = 18) => `<svg class="i" viewBox="0 0 24 24" style="width:${s}px;height:${s}px">${IC[n] || ''}</svg>`;

/* ---------- constantes ---------- */
const TIPOS_CONTA = {
  corrente: { nome: 'Conta corrente', icone: '🏦', disp: true },
  poupanca: { nome: 'Poupança', icone: '🐷', disp: true },
  carteira: { nome: 'Carteira / dinheiro', icone: '👛', disp: true },
  investimento: { nome: 'Investimento', icone: '📈', disp: false },
  cartao: { nome: 'Cartão de crédito', icone: '💳', disp: false },
  outro: { nome: 'Outro', icone: '📁', disp: false }
};
const TIPOS_ITEM = {
  imovel: 'Imóvel', veiculo: 'Veículo', investimento: 'Investimento', outro: 'Outro bem',
  financiamento: 'Financiamento', emprestimo: 'Empréstimo', divida: 'Outra dívida'
};
const FREQS = { semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal', anual: 'Anual' };
const CORES = ['#7b7ff6', '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5a3c', '#64748b'];
const EMOJIS = ['🛒', '🏠', '🚗', '⛽', '💊', '🏥', '📚', '🎉', '🍽️', '☕', '💡', '📺', '📱', '🛍️', '👕', '✈️', '🐶', '🎁', '🙏', '🔧', '💳', '🏦', '🐷', '👛', '📈', '💰', '💼', '🧾', '🎯', '🏖️', '🚀', '❤️', '👶', '🎓', '🏋️', '🚌', '🅿️', '🧹', '💇', '📦'];

/* ---------- estado ---------- */
const S = {
  user: null, contas: [], categorias: [], pessoas: [], grupos: [], tx: [], recorrentes: [],
  orcamentos: [], metas: [], patrimonio: [], patValores: [], regras: [],
  mes: hoje().slice(0, 7), grupo: ls.get('grupo', ''), ocultar: ls.get('ocultar', false),
  rota: 'inicio', sideMais: false,
  f: { busca: '', tipo: '', conta: '', categoria: '', pessoa: '', status: '', min: '', max: '' },
  txView: 'lista', txDia: null, txSel: new Set(), txOrd: { c: 'data', d: -1 }, txFiltros: false,
  cols: ls.get('cols', { categoria: true, conta: true, pessoa: false, situacao: true }),
  mC: new Map(), mCat: new Map(), mP: new Map()
};

/* ---------- Supabase / dados ---------- */
let sb = null;
function msgErro(e) {
  const m = e?.message || String(e);
  if (e?.code === '42P01' || /does not exist|schema cache|Could not find the table/i.test(m)) return 'Tabelas não encontradas. Rode o schema.sql no SQL Editor do Supabase.';
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/already registered/i.test(m)) return 'Este e-mail já está cadastrado.';
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
  if (/Signups not allowed/i.test(m)) return 'Novos cadastros estão desativados.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem conexão com o servidor.';
  return m;
}
async function q(p) { const { data, error } = await p; if (error) { toast(msgErro(error), true); throw error; } return data; }
async function tudo(tabela, ordem = 'criado_em') {
  const out = [];
  for (let i = 0; ; i += 1000) {
    const d = await q(sb.from(tabela).select('*').order(ordem, { ascending: true }).order('id').range(i, i + 999));
    out.push(...d); if (d.length < 1000) break;
  }
  return out;
}
const ins = (t, reg) => q(sb.from(t).insert(reg).select());
const upd = (t, id, reg) => q(sb.from(t).update(reg).eq('id', id));
const updIn = (t, ids, reg) => q(sb.from(t).update(reg).in('id', ids));
const del = (t, id) => q(sb.from(t).delete().eq('id', id));
const delIn = (t, ids) => q(sb.from(t).delete().in('id', ids));
async function insLotes(t, regs) { for (let i = 0; i < regs.length; i += 500) await q(sb.from(t).insert(regs.slice(i, i + 500))); }

async function carregar() {
  const [contas, categorias, pessoas, grupos, tx, recorrentes, orcamentos, metas, patrimonio, patValores, regras] = await Promise.all([
    tudo('contas'), tudo('categorias', 'nome'), tudo('pessoas', 'nome'), tudo('grupos', 'nome'), tudo('transacoes', 'data'),
    tudo('recorrentes', 'proxima_data'), tudo('orcamentos'), tudo('metas'), tudo('patrimonio'), tudo('patrimonio_valores', 'data'), tudo('regras')
  ]);
  tx.sort((a, b) => a.data.localeCompare(b.data)); patValores.sort((a, b) => a.data.localeCompare(b.data) || (a.criado_em || '').localeCompare(b.criado_em || ''));
  Object.assign(S, { contas, categorias, pessoas, grupos, tx, recorrentes, orcamentos, metas, patrimonio, patValores, regras });
  if (S.grupo && !grupos.some(g => g.id === S.grupo)) { S.grupo = ''; ls.set('grupo', ''); }
  indexar();
}
function indexar() {
  S.mC = new Map(S.contas.map(c => [c.id, c]));
  S.mCat = new Map(S.categorias.map(c => [c.id, c]));
  S.mP = new Map(S.pessoas.map(p => [p.id, p]));
}
async function recarregar() { await carregar(); render(); }

/* ---------- cálculos ---------- */
const contasAtivas = () => S.contas.filter(c => !c.arquivada);
function contasGrupo() { const g = S.grupos.find(g => g.id === S.grupo); return g ? S.contas.filter(c => g.conta_ids.includes(c.id)) : S.contas; }
const idsVis = () => new Set(contasGrupo().map(c => c.id));
function txVis() { if (!S.grupo) return S.tx; const ids = idsVis(); return S.tx.filter(t => ids.has(t.conta_id) || ids.has(t.conta_destino_id)); }
// valor com sinal, do ponto de vista das contas visíveis
function sinalTx(t, ids = null) {
  if (t.tipo === 'receita') return +t.valor;
  if (t.tipo === 'despesa') return -t.valor;
  if (!ids) return 0;
  return (ids.has(t.conta_destino_id) ? +t.valor : 0) - (ids.has(t.conta_id) ? +t.valor : 0);
}
function saldosEm(ate = null) {
  const m = new Map(S.contas.map(c => [c.id, +c.saldo_inicial]));
  const add = (id, v) => { if (id && m.has(id)) m.set(id, m.get(id) + v); };
  for (const t of S.tx) {
    if (!t.pago || (ate && t.data > ate)) continue;
    const v = +t.valor;
    if (t.tipo === 'receita') add(t.conta_id, v);
    else if (t.tipo === 'despesa') add(t.conta_id, -v);
    else { add(t.conta_id, -v); add(t.conta_destino_id, v); }
  }
  return m;
}
function valorItem(id, ate = hoje()) { let v = 0; for (const x of S.patValores) if (x.item_id === id && x.data <= ate) v = +x.valor; return v; }
function patrimonioEm(ate) {
  const sal = saldosEm(ate), ids = idsVis();
  let contas = 0, contasNeg = 0, ativos = 0, passivos = 0;
  for (const c of S.contas) { if (!ids.has(c.id)) continue; const v = sal.get(c.id) || 0; if (v >= 0) contas += v; else contasNeg -= v; }
  for (const p of S.patrimonio) { const v = valorItem(p.id, ate); if (p.natureza === 'passivo') passivos += v; else ativos += v; }
  return { contas, ativos, passivos: passivos + contasNeg, liquido: contas + ativos - passivos - contasNeg };
}
const txPeriodo = (ini, fim, soPagos = true) => txVis().filter(t => t.data >= ini && t.data <= fim && (!soPagos || t.pago));
function resumo(lista) {
  let rec = 0, desp = 0;
  for (const t of lista) { if (t.tipo === 'receita') rec += +t.valor; else if (t.tipo === 'despesa') desp += +t.valor; }
  return { rec, desp, res: rec - desp };
}
function aplicarRegra(desc) { const d = norm(desc); if (!d) return null; return S.regras.find(r => r.termo && d.includes(norm(r.termo))) || null; }
function infoMeta(m, sal) {
  const atual = m.conta_id && S.mC.has(m.conta_id) ? Math.max(0, sal.get(m.conta_id) || 0) : +m.valor_atual;
  const alvo = +m.valor_alvo, p = alvo > 0 ? atual / alvo : 0;
  let dias = null, mensal = null, atrasado = false, vencida = false;
  if (m.prazo) {
    dias = diffDias(hoje(), m.prazo);
    vencida = dias < 0 && p < 1;
    const meses = Math.max(1, Math.ceil(dias / 30.44));
    mensal = Math.max(0, (alvo - atual) / meses);
    const ini = (m.criado_em || hoje()).slice(0, 10), tot = diffDias(ini, m.prazo), pas = diffDias(ini, hoje());
    const esperado = tot > 0 ? Math.min(1, Math.max(0, pas / tot)) * alvo : alvo;
    atrasado = p < 1 && atual + 0.01 < esperado;
  }
  return { atual, alvo, p, dias, mensal, atrasado, vencida };
}
function avancarRec(r, data) {
  if (r.frequencia === 'semanal') return somaDias(data, 7);
  if (r.frequencia === 'quinzenal') return somaDias(data, 14);
  const n = r.frequencia === 'anual' ? 12 : 1;
  const base = somaMeses(data.slice(0, 8) + '01', n);
  const dia = Math.min(r.dia || +data.slice(8), diasNoMes(base.slice(0, 7)));
  return base.slice(0, 8) + pad(dia);
}
// cria lançamentos pendentes das recorrências automáticas que já venceram
async function gerarRecorrentes() {
  const novos = [], atualiza = [];
  for (const r of S.recorrentes) {
    if (!r.ativo || !r.auto) continue;
    let d = r.proxima_data, n = 0;
    while (d <= hoje() && n < 36) {
      novos.push({ tipo: r.tipo, descricao: r.descricao, valor: r.valor, data: d, conta_id: r.conta_id, categoria_id: r.categoria_id, pessoa_id: r.pessoa_id, pago: false, recorrente_id: r.id });
      d = avancarRec(r, d); n++;
    }
    if (n) atualiza.push([r.id, d]);
  }
  if (!novos.length) return false;
  await insLotes('transacoes', novos);
  for (const [id, d] of atualiza) await upd('recorrentes', id, { proxima_data: d });
  toast(`${novos.length} lançamento(s) recorrente(s) gerado(s) como pendente.`);
  return true;
}

/* ---------- UI: toast, modal, ações ---------- */
let _tt;
function toast(msg, erro = false) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (erro ? ' erro' : '');
  clearTimeout(_tt); _tt = setTimeout(() => t.className = '', erro ? 5000 : 2600);
}
const A = {};   // ações de clique  (data-a)
const C = {};   // ações de change  (data-c)
const I = {};   // ações de input   (data-i)
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && A[el.dataset.a]) A[el.dataset.a](el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-c]'); if (el && C[el.dataset.c]) C[el.dataset.c](el, e); });
document.addEventListener('input', e => { const el = e.target.closest('[data-i]'); if (el && I[el.dataset.i]) I[el.dataset.i](el, e); });

function modal({ titulo, corpo, salvar = 'Salvar', onSubmit = null, largura = null, extra = '', onOpen = null, semCancelar = false }) {
  const d = $('#modal');
  d.style.width = largura || '';
  d.innerHTML = `<form class="mform" id="mform" novalidate>
    <div class="mhead"><h2>${titulo}</h2><button type="button" class="x" data-a="fecharModal">${ic('x')}</button></div>
    <div class="mbody">${corpo}</div>
    <div class="mfoot">${extra}<span style="flex:1"></span>
      ${semCancelar ? '' : `<button type="button" class="btn" data-a="fecharModal">${onSubmit ? 'Cancelar' : 'Fechar'}</button>`}
      ${onSubmit ? `<button class="btn pri" type="submit">${salvar}</button>` : ''}</div></form>`;
  const f = $('#mform');
  f.onsubmit = async e => {
    e.preventDefault();
    if (!f.checkValidity()) { f.reportValidity(); return; }
    const b = f.querySelector('[type=submit]'); if (b) b.disabled = true;
    try { const r = await onSubmit(f); if (r !== false) d.close(); }
    catch (err) { console.error(err); }
    if (b) b.disabled = false;
  };
  if (!d.open) d.showModal();
  onOpen && onOpen(f);
  return f;
}
A.fecharModal = () => $('#modal').close();

function ir(rota) { if (location.hash !== '#/' + rota) location.hash = '#/' + rota; else render(); }
A.ir = el => ir(el.dataset.r);
A.menu = () => document.body.classList.toggle('menu');
A.ocultar = () => { S.ocultar = !S.ocultar; ls.set('ocultar', S.ocultar); render(); };
A.mesAnt = () => { S.mes = somaMeses(S.mes + '-01', -1).slice(0, 7); S.txDia = null; render(); };
A.mesProx = () => { S.mes = somaMeses(S.mes + '-01', 1).slice(0, 7); S.txDia = null; render(); };
C.mesEsc = el => { if (el.value) { S.mes = el.value; S.txDia = null; render(); } };
C.grupo = el => { S.grupo = el.value; ls.set('grupo', S.grupo); render(); };
A.recarregar = async () => { await recarregar(); toast('Dados atualizados.'); };
A.sideMais = () => { S.sideMais = !S.sideMais; renderSide(); };
A.setEmoji = el => { const f = el.closest('form'); f.elements[el.dataset.alvo].value = el.dataset.v; };

/* ---------- componentes ---------- */
const tile = (icone, cor, tam = '') => `<span class="tile ${tam}" style="background:${esc(cor || '#3f3f4a')}">${esc(icone || '•')}</span>`;
const opts = (lista, sel, vazio, rot = x => x.nome) =>
  (vazio !== undefined ? `<option value="">${esc(vazio)}</option>` : '') +
  lista.map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(rot(x))}</option>`).join('');
const optsObj = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(typeof v === 'string' ? v : v.nome)}</option>`).join('');
const cab = (titulo, sup, direita = '') => `<div class="pcab"><div>${sup ? `<div class="sup">${esc(sup)}</div>` : ''}<h1>${esc(titulo)}</h1></div><div class="pacoes">${direita}</div></div>`;
const navMes = () => `<div class="navmes"><button class="btn ico" data-a="mesAnt" title="Mês anterior">${ic('esq', 16)}</button>
  <span class="lbl">${ic('cal', 15)} ${nomeMes(S.mes)}<input type="month" value="${S.mes}" data-c="mesEsc" aria-label="Escolher mês"></span>
  <button class="btn ico" data-a="mesProx" title="Próximo mês">${ic('dir', 16)}</button></div>`;
const vazio = msg => `<div class="vazio">${msg}</div>`;
function pickCor(nome, valor) {
  const v = valor || CORES[0];
  return `<div class="cores">${CORES.map(c => `<label><input type="radio" name="${nome}" value="${c}" ${c === v ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}
    <input type="color" value="${CORES.includes(v) ? '#7b7ff6' : esc(v)}" data-c="corLivre" data-alvo="${nome}" title="Outra cor"></div>`;
}
C.corLivre = el => { const f = el.closest('form'); const r = f.querySelector(`input[name="${el.dataset.alvo}"][value="${el.value}"]`); $$(`input[name="${el.dataset.alvo}"]`, f).forEach(x => x.checked = false); if (r) r.checked = true; else { el.name = el.dataset.alvo; } };
const corDe = (f, nome) => { const r = f.querySelector(`input[name="${nome}"]:checked`); if (r) return r.value; const l = f.querySelector(`input[type=color][data-alvo="${nome}"]`); return l ? l.value : CORES[0]; };
const pickIcone = (nome, valor) => `<input name="${nome}" value="${esc(valor || '')}" maxlength="4" style="width:70px;text-align:center;font-size:1.1rem">
  <div class="emojis">${EMOJIS.map(e => `<button type="button" data-a="setEmoji" data-alvo="${nome}" data-v="${e}">${e}</button>`).join('')}</div>`;

/* ---------- layout (menu lateral e topo) ---------- */
const ROTAS = {
  inicio: ['Início', 'pgInicio'], transacoes: ['Transações', 'pgTransacoes'], contas: ['Contas', 'pgContas'], importar: ['Importar', 'pgImportar'],
  relatorios: ['Relatórios', 'pgRelatorios'], patrimonio: ['Patrimônio', 'pgPatrimonio'],
  orcamentos: ['Orçamentos', 'pgOrcamentos'], metas: ['Metas', 'pgMetas'], recorrentes: ['Recorrentes', 'pgRecorrentes'],
  categorias: ['Categorias', 'pgCategorias'], pessoas: ['Pessoas', 'pgPessoas'], grupos: ['Grupos', 'pgGrupos'], regras: ['Regras', 'pgRegras']
};
const MENU = [['Contas', ['transacoes', 'contas', 'importar']], ['Análise', ['relatorios', 'patrimonio']], ['Configuração', ['orcamentos', 'metas', 'recorrentes', 'categorias', 'pessoas', 'grupos', 'regras']]];
const nomeUsuario = () => S.user?.user_metadata?.nome || (S.user?.email || '').split('@')[0];

function renderSide() {
  const sal = saldosEm();
  const lista = contasGrupo().filter(c => !c.arquivada).map(c => ({ c, v: sal.get(c.id) || 0 })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const total = soma(lista, x => x.v);
  const mostrar = S.sideMais ? lista : lista.slice(0, 3);
  const item = r => `<button class="s-item ${S.rota === r ? 'ativo' : ''}" data-a="ir" data-r="${r}">${ic(r)}<span>${ROTAS[r][0]}</span>${r === 'transacoes' ? `<span class="mais" data-a="novaTx" title="Nova transação">${ic('mais', 14)}</span>` : ''}</button>`;
  $('#side').innerHTML = `
    <div class="s-top"><button class="s-logo" data-a="ir" data-r="inicio"><span class="logo-mark"></span>Finanças</button>
      <button class="icobtn" data-a="ocultar" title="${S.ocultar ? 'Mostrar valores' : 'Ocultar valores'}">${ic(S.ocultar ? 'olhoX' : 'olho')}</button></div>
    <div class="s-busca" data-a="busca">${ic('busca', 15)} Buscar em tudo… <kbd>Ctrl K</kbd></div>
    <div class="s-scroll">
      <button class="s-item ${S.rota === 'inicio' ? 'ativo' : ''}" data-a="ir" data-r="inicio">${ic('inicio')}<span>Início</span></button>
      ${MENU.map(([sec, rs]) => `<div class="s-sec">${sec}</div>${rs.map(item).join('')}`).join('')}
      <div class="s-contas-cab"><span>CONTAS</span><b class="${cls(total)}">${fmt(total)}</b></div>
      ${mostrar.map(({ c, v }) => `<button class="s-conta" data-a="verConta" data-id="${c.id}"><span><span class="n">${esc(c.nome)}</span><small>${esc(TIPOS_CONTA[c.tipo]?.nome || '')}</small></span><span class="v ${v < 0 ? 'neg' : ''}">${fmt(v)}</span></button>`).join('')}
      ${lista.length > 3 ? `<button class="lnk s-mostrar" data-a="sideMais">${S.sideMais ? 'Mostrar menos' : `Mostrar +${lista.length - 3}`}</button>` : ''}
    </div>
    <button class="s-perfil" data-a="perfil"><span class="avatar">${esc(nomeUsuario()[0]?.toUpperCase() || '?')}</span>
      <span style="min-width:0"><span class="n">${esc(nomeUsuario())}</span><small>${esc(S.user?.email || '')}</small></span></button>`;
}
function renderTopo() {
  $('#topo').innerHTML = `<button class="icobtn hamb" data-a="menu">${ic('menu', 20)}</button>
    <span class="vendo">VENDO</span>
    <select class="pill-sel" data-c="grupo"><option value="">Todas as contas</option>${opts(S.grupos, S.grupo)}</select>`;
}
function render() {
  if (!S.user) return;
  const r = ROTAS[S.rota] ? S.rota : 'inicio';
  S.rota = r;
  renderSide(); renderTopo();
  const el = $('#conteudo');
  window[ROTAS[r][1]](el);
  document.title = `${ROTAS[r][0]} · Finanças`;
  document.body.classList.remove('menu');
}
window.addEventListener('hashchange', () => { S.rota = location.hash.replace(/^#\/?/, '') || 'inicio'; render(); window.scrollTo(0, 0); });

/* =====================================================================
   GRÁFICOS (SVG, sem bibliotecas)
   ===================================================================== */
let _gid = 0;
function escalaY(min, max) {
  if (min === max) { max = min + 1; }
  const passo0 = (max - min) / 4, mag = Math.pow(10, Math.floor(Math.log10(passo0))), nr = passo0 / mag;
  const passo = (nr <= 1 ? 1 : nr <= 2 ? 2 : nr <= 2.5 ? 2.5 : nr <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / passo) * passo, hi = Math.ceil(max / passo) * passo, ticks = [];
  for (let v = lo; v <= hi + passo / 2; v += passo) ticks.push(Math.abs(v) < passo / 1e6 ? 0 : v);
  return { lo, hi, ticks };
}
function caminho(pts) { let d = '', novo = true; for (const p of pts) { if (!p) { novo = true; continue; } d += (novo ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ' '; novo = false; } return d; }
const fixo = n => (+n).toFixed(1);

function grafLinhas({ labels, series, banda = null, h = 260, empilhado = false, w = 800 }) {
  const W = w, H = h, pl = 72, pr = 14, pt = 14, pb = 30, n = labels.length;
  if (!n) return vazio('Sem dados no período.');
  let ser = series.map(s => ({ ...s, v: s.valores.slice() }));
  if (empilhado) { let ac = new Array(n).fill(0); ser = ser.map(s => { const base = ac.slice(); ac = ac.map((x, i) => x + (s.v[i] || 0)); return { ...s, base, v: ac.slice() }; }); }
  const vals = [0];
  ser.forEach(s => s.v.forEach(x => x != null && vals.push(x)));
  if (banda) vals.push(...banda.low.filter(v => v != null), ...banda.high.filter(v => v != null));
  const { lo, hi, ticks } = escalaY(Math.min(...vals), Math.max(...vals));
  const X = i => pl + (n === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (n - 1));
  const Y = v => pt + (hi - v) * (H - pt - pb) / ((hi - lo) || 1);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="graf">`;
  ticks.forEach(t => { s += `<line x1="${pl}" x2="${W - pr}" y1="${fixo(Y(t))}" y2="${fixo(Y(t))}" class="grid${t === 0 ? ' zero' : ''}"/><text x="${pl - 8}" y="${fixo(Y(t) + 4)}" class="ty">${fmtK(t)}</text>`; });
  const k = Math.ceil(n / 9);
  labels.forEach((l, i) => { if ((i % k === 0 && n - 1 - i >= k * 0.6) || i === n - 1) s += `<text x="${fixo(X(i))}" y="${H - 8}" class="tx">${esc(l)}</text>`; });
  if (banda) {
    const top = banda.high.map((v, i) => v == null ? null : `${fixo(X(i))},${fixo(Y(v))}`).filter(Boolean);
    const bot = banda.low.map((v, i) => v == null ? null : `${fixo(X(i))},${fixo(Y(v))}`).filter(Boolean).reverse();
    s += `<polygon points="${top.join(' ')} ${bot.join(' ')}" class="banda"/>`;
  }
  const base0 = Y(Math.max(lo, Math.min(0, hi)));
  [...ser].reverse().forEach(sr => {
    if (empilhado) {
      const top = sr.v.map((v, i) => `${fixo(X(i))},${fixo(Y(v))}`), bot = sr.base.map((v, i) => `${fixo(X(i))},${fixo(Y(v))}`).reverse();
      s += `<polygon points="${top.join(' ')} ${bot.join(' ')}" fill="${sr.cor}" fill-opacity=".28"/>`;
    } else if (sr.area) {
      const idx = sr.v.map((v, i) => v == null ? -1 : i).filter(i => i >= 0);
      if (idx.length) {
        const id = 'g' + (++_gid);
        s += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sr.cor}" stop-opacity=".35"/><stop offset="1" stop-color="${sr.cor}" stop-opacity="0"/></linearGradient></defs>
          <path d="${caminho(idx.map(i => [X(i), Y(sr.v[i])]))} L${fixo(X(idx.at(-1)))},${fixo(base0)} L${fixo(X(idx[0]))},${fixo(base0)} Z" fill="url(#${id})"/>`;
      }
    }
  });
  ser.forEach(sr => {
    s += `<path d="${caminho(sr.v.map((v, i) => v == null ? null : [X(i), Y(v)]))}" fill="none" stroke="${sr.cor}" stroke-width="${sr.larg || 2.2}" ${sr.tracejada ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
    if (n <= 16 && !sr.semPontos) sr.v.forEach((v, i) => { if (v != null) s += `<circle cx="${fixo(X(i))}" cy="${fixo(Y(v))}" r="2.8" fill="${sr.cor}"/>`; });
  });
  const lh = n > 1 ? (W - pl - pr) / (n - 1) : W - pl - pr;
  labels.forEach((l, i) => {
    const linhas = series.map(sr => `${sr.nome}: ${sr.valores[i] == null ? '—' : fmt(sr.valores[i])}`).join('\n');
    s += `<rect x="${fixo(X(i) - lh / 2)}" y="${pt}" width="${fixo(lh)}" height="${H - pt - pb}" class="hov"><title>${esc(l)}\n${esc(linhas)}</title></rect>`;
  });
  return s + '</svg>';
}

function grafBarras({ labels, series, empilhado = false, linha = null, h = 260, w = 800 }) {
  const W = w, H = h, pl = 72, pr = 14, pt = 14, pb = 30, n = labels.length;
  if (!n) return vazio('Sem dados no período.');
  const vals = [0];
  if (empilhado) for (let i = 0; i < n; i++) { let p = 0, g = 0; series.forEach(s => { const v = s.valores[i] || 0; v >= 0 ? p += v : g += v; }); vals.push(p, g); }
  else series.forEach(s => vals.push(...s.valores.map(v => v || 0)));
  if (linha) vals.push(...linha.valores.filter(v => v != null));
  const { lo, hi, ticks } = escalaY(Math.min(...vals), Math.max(...vals));
  const Y = v => pt + (hi - v) * (H - pt - pb) / ((hi - lo) || 1);
  const slot = (W - pl - pr) / n, X0 = i => pl + i * slot;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="graf">`;
  ticks.forEach(t => { s += `<line x1="${pl}" x2="${W - pr}" y1="${fixo(Y(t))}" y2="${fixo(Y(t))}" class="grid${t === 0 ? ' zero' : ''}"/><text x="${pl - 8}" y="${fixo(Y(t) + 4)}" class="ty">${fmtK(t)}</text>`; });
  const k = Math.ceil(n / 12);
  labels.forEach((l, i) => { if ((i % k === 0 && n - 1 - i >= k * 0.6) || i === n - 1) s += `<text x="${fixo(X0(i) + slot / 2)}" y="${H - 8}" class="tx">${esc(l)}</text>`; });
  const rect = (x, y0, y1, w, cor, tit) => `<rect x="${fixo(x)}" y="${fixo(Math.min(y0, y1))}" width="${fixo(w)}" height="${fixo(Math.max(0.5, Math.abs(y1 - y0)))}" rx="3" fill="${cor}"><title>${esc(tit)}</title></rect>`;
  for (let i = 0; i < n; i++) {
    if (empilhado) {
      const bw = Math.min(46, slot * 0.6); let up = 0, dn = 0;
      series.forEach(sr => {
        const v = sr.valores[i] || 0; if (!v) return;
        const a = v >= 0 ? up : dn, b = a + v; v >= 0 ? up = b : dn = b;
        s += rect(X0(i) + (slot - bw) / 2, Y(a), Y(b), bw, sr.cor, `${labels[i]} · ${sr.nome}: ${fmt(v)}`);
      });
    } else {
      const bw = Math.min(30, slot * 0.72 / series.length), g0 = X0(i) + (slot - bw * series.length) / 2;
      series.forEach((sr, j) => { const v = sr.valores[i] || 0; s += rect(g0 + j * bw + 1, Y(0), Y(v), bw - 2, sr.cores ? sr.cores[i] : sr.cor, `${labels[i]} · ${sr.nome}: ${fmt(v)}`); });
    }
  }
  if (linha) {
    s += `<path d="${caminho(linha.valores.map((v, i) => v == null ? null : [X0(i) + slot / 2, Y(v)]))}" fill="none" stroke="${linha.cor}" stroke-width="2" ${linha.tracejada ? 'stroke-dasharray="5 4"' : ''}/>`;
    linha.valores.forEach((v, i) => { if (v != null) s += `<circle cx="${fixo(X0(i) + slot / 2)}" cy="${fixo(Y(v))}" r="3" fill="${linha.cor}"><title>${esc(labels[i])} · ${esc(linha.nome)}: ${fmt(v)}</title></circle>`; });
  }
  return s + '</svg>';
}

function grafDonut({ itens, titulo, valor, max = 220 }) {
  const tot = soma(itens, i => Math.abs(i.valor));
  const r = 72, C = 2 * Math.PI * r; let off = 0;
  let s = `<svg viewBox="0 0 200 200" class="donut" style="max-width:${max}px"><circle cx="100" cy="100" r="${r}" fill="none" stroke="var(--card3)" stroke-width="22"/>`;
  itens.forEach(it => {
    const f = tot ? Math.abs(it.valor) / tot : 0, len = f * C;
    if (len > 0) s += `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${it.cor}" stroke-width="22" stroke-dasharray="${fixo(Math.max(0.5, len - 1.5))} ${fixo(C)}" stroke-dashoffset="${fixo(-off)}" transform="rotate(-90 100 100)"><title>${esc(it.nome)}: ${fmt(it.valor)} (${pct(f)})</title></circle>`;
    off += len;
  });
  s += `<text x="100" y="95" class="dt1">${esc(titulo)}</text><text x="100" y="116" class="dt2">${esc(valor)}</text></svg>`;
  s += `<div class="legenda">${itens.map(it => `<span><i style="background:${it.cor}"></i>${esc(it.nome)} <b style="color:var(--txt)">${tot ? pct(Math.abs(it.valor) / tot) : ''}</b></span>`).join('')}</div>`;
  return s;
}

function grafSankey({ esq, dir, centro }) {
  const totE = soma(esq, x => x.valor), totD = soma(dir, x => x.valor), tot = Math.max(totE, totD);
  if (!tot) return vazio('Sem receitas ou despesas no período.');
  const W = 900, gap = 10, MIN = 26, xL = 210, xC = 443, xR = 676, nw = 14;
  const nmax = Math.max(esq.length, dir.length);
  const H0 = Math.max(320, nmax * 44 + 40), k = (H0 - 40 - (nmax - 1) * gap) / tot;
  const alt = list => list.map(it => Math.max(MIN, it.valor * k));
  const hL = alt(esq), hR = alt(dir), sL = soma(hL) + (esq.length - 1) * gap, sR = soma(hR) + (dir.length - 1) * gap;
  const H = Math.max(H0, sL + 50, sR + 50);
  const lay = (list, hs, tot2) => { let y = (H - tot2) / 2; return list.map((it, i) => { const o = { ...it, y, h: hs[i], fl: it.valor * k }; y += hs[i] + gap; return o; }); };
  const L = lay(esq, hL, sL), R = lay(dir, hR, sR), ch = tot * k, cy = (H - ch) / 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="graf">`;
  const banda = (x0, a0, a1, x1, b0, b1, cor, tit) => { const xm = (x0 + x1) / 2; return `<path d="M${x0},${fixo(a0)} C${xm},${fixo(a0)} ${xm},${fixo(b0)} ${x1},${fixo(b0)} L${x1},${fixo(b1)} C${xm},${fixo(b1)} ${xm},${fixo(a1)} ${x0},${fixo(a1)} Z" fill="${cor}" fill-opacity=".3"><title>${esc(tit)}</title></path>`; };
  let off = cy;
  L.forEach(nd => { const m = nd.y + (nd.h - nd.fl) / 2; s += banda(xL + nw, m, m + nd.fl, xC, off, off + nd.fl, nd.cor, `${nd.nome}: ${fmt(nd.valor)}`); off += nd.fl; });
  off = cy;
  R.forEach(nd => { const m = nd.y + (nd.h - nd.fl) / 2; s += banda(xC + nw, off, off + nd.fl, xR, m, m + nd.fl, nd.cor, `${nd.nome}: ${fmt(nd.valor)}`); off += nd.fl; });
  const rot = (nd, x, anc) => `<text x="${x}" y="${fixo(nd.y + nd.h / 2 - 2)}" class="lbl" text-anchor="${anc}">${esc(nd.nome.length > 28 ? nd.nome.slice(0, 27) + '…' : nd.nome)}</text><text x="${x}" y="${fixo(nd.y + nd.h / 2 + 12)}" class="lbl2" text-anchor="${anc}">${fmt(nd.valor)}</text>`;
  L.forEach(nd => { s += `<rect x="${xL}" y="${fixo(nd.y + (nd.h - Math.max(2, nd.fl)) / 2)}" width="${nw}" height="${fixo(Math.max(2, nd.fl))}" rx="3" fill="${nd.cor}"/>` + rot(nd, xL - 8, 'end'); });
  R.forEach(nd => { s += `<rect x="${xR}" y="${fixo(nd.y + (nd.h - Math.max(2, nd.fl)) / 2)}" width="${nw}" height="${fixo(Math.max(2, nd.fl))}" rx="3" fill="${nd.cor}"/>` + rot(nd, xR + nw + 8, 'start'); });
  s += `<rect x="${xC}" y="${fixo(cy)}" width="${nw}" height="${fixo(ch)}" rx="3" fill="#7b7ff6"/><text x="${xC + nw / 2}" y="${fixo(cy - 18)}" class="lbl" text-anchor="middle">${esc(centro)}</text><text x="${xC + nw / 2}" y="${fixo(cy - 5)}" class="lbl2" text-anchor="middle">${fmt(totE)}</text>`;
  return s + '</svg>';
}
const legenda = itens => `<div class="legenda">${itens.map(([n, c]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join('')}</div>`;
