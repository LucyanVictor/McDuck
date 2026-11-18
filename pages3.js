'use strict';
/* =====================================================================
   VERSÃO 2: Início novo, Cartões/Faturas, Contas a pagar, Tags,
   Ajustes, Dicas automáticas, 50/30/20, Assinaturas detectadas
   ===================================================================== */

/* ---------- utilidades de cartão / fatura ---------- */
function cicloFatura(c, data) {
  const fech = +c.dia_fechamento || 0, venc = +c.dia_vencimento || 0;
  if (!fech) {
    const ym = data.slice(0, 7), prox = somaMeses(ym + '-01', 1).slice(0, 7);
    return { fecha: fimMes(ym), vence: `${prox}-${pad(Math.min(venc || 10, diasNoMes(prox)))}` };
  }
  const fd = m => Math.min(fech, diasNoMes(m));
  let ymF = data.slice(0, 7);
  if (+data.slice(8) > fd(ymF)) ymF = somaMeses(ymF + '-01', 1).slice(0, 7);
  const v = venc || Math.min(fech + 7, 28);
  const ymV = v > fech ? ymF : somaMeses(ymF + '-01', 1).slice(0, 7);
  return { fecha: `${ymF}-${pad(fd(ymF))}`, vence: `${ymV}-${pad(Math.min(v, diasNoMes(ymV)))}` };
}
function faturasDoCartao(c) {
  const map = new Map();
  const get = ci => { if (!map.has(ci.vence)) map.set(ci.vence, { ...ci, itens: [], total: 0, pagos: 0, pags: [] }); return map.get(ci.vence); };
  for (const t of S.tx) {
    if (t.conta_id !== c.id) continue;
    const f = get(cicloFatura(c, t.data)); f.itens.push(t);
    f.total += t.tipo === 'receita' ? -t.valor : +t.valor;
  }
  const h = hoje();
  get(cicloFatura(c, h)); // garante a fatura atual
  const fs = [...map.values()].sort((a, b) => a.vence.localeCompare(b.vence));
  S.tx.filter(t => t.tipo === 'transferencia' && t.conta_destino_id === c.id).forEach(p => {
    const f = fs.find(f => p.data > f.fecha && p.data <= somaDias(f.vence, 20)) || fs.find(f => f.vence >= p.data);
    if (f) { f.pagos += +p.valor; f.pags.push(p); }
  });
  fs.forEach(f => {
    f.total = Math.round(f.total * 100) / 100;
    f.status = h <= f.fecha ? 'aberta' : (f.total <= 0.01 || f.pagos >= f.total - 0.01) ? 'paga' : h <= f.vence ? 'fechada' : 'encerrada';
    f.futura = f.itens.length && f.itens.every(t => t.data > h);
  });
  return fs;
}
const faturaAtual = fs => fs.find(f => f.status === 'aberta') || fs.at(-1);
const nomeFat = f => cap(MESES[+f.vence.slice(5, 7) - 1]);
const ST_FAT = { aberta: ['pr', 'Aberta'], fechada: ['av', 'Fechada'], paga: ['ok', 'Paga'], encerrada: ['nt', 'Encerrada'] };

/* ---------- previsões de recorrências (ainda não lançadas) ---------- */
function previstas(ate) {
  const ids = idsVis(), out = [], h = hoje();
  for (const r of S.recorrentes) {
    if (!r.ativo || (filtrando() && !ids.has(r.conta_id))) continue;
    let d = r.proxima_data, n = 0;
    while (d <= ate && n < 60) { if (!(r.auto && d <= h)) out.push({ virtual: true, rec: r, id: 'prev:' + r.id + ':' + d, tipo: r.tipo, descricao: r.descricao, valor: +r.valor, data: d, conta_id: r.conta_id, categoria_id: r.categoria_id, primeira: n === 0 }); d = avancarRec(r, d); n++; }
  }
  return out;
}

/* ---------- dicas automáticas ---------- */
const limpaDesc = s => norm(s).replace(/\(\d+\/\d+\)/g, '').replace(/\d{2}\/\d{2}(\/\d{2,4})?/g, '').replace(/\s+/g, ' ').trim();
function assinaturasQueSubiram() {
  const h = hoje(), ym = h.slice(0, 7), meses = [0, 1, 2, 3].map(k => somaMeses(ym + '-01', -k).slice(0, 7));
  const g = new Map();
  txVis().forEach(t => {
    if (t.tipo !== 'despesa' || !meses.includes(t.data.slice(0, 7))) return;
    const k = limpaDesc(t.descricao); if (k.length < 3) return;
    if (!g.has(k)) g.set(k, new Map()); const m = g.get(k); const mm = t.data.slice(0, 7);
    if (!m.has(mm)) m.set(mm, { v: +t.valor, d: t.descricao, n: 1 }); else m.get(mm).n++;
  });
  const out = [];
  for (const [k, m] of g) {
    if (m.size < 3 || [...m.values()].some(x => x.n > 1)) continue;
    const ord = [...m.keys()].sort().reverse(); const ult = m.get(ord[0]), antes = ord.slice(1).map(k2 => m.get(k2).v);
    const fixo = Math.max(...antes) <= Math.min(...antes) * 1.03; // preço fixo nos meses anteriores (assinatura, plano)
    if (fixo && ult.v > antes[0] * 1.02 && ult.v - antes[0] >= 1 && ord[0] >= meses[1]) out.push({ desc: ult.d, de: antes[0], para: ult.v });
  }
  return out;
}
function gerarDicas() {
  const d = [], h = hoje(), ym = h.slice(0, 7), sal = saldosEm();
  const mesAt = txPeriodo(ym + '-01', fimMes(ym)), r = resumo(mesAt);
  assinaturasQueSubiram().slice(0, 2).forEach(a => d.push({ n: 'av', i: 'sobe', t: `${a.desc} ficou mais caro`, x: `Subiu de ${fmt(a.de)} para ${fmt(a.para)} (+${pct(a.para / a.de - 1)}). Vale revisar o plano.`, a: 'buscaTx', v: a.desc }));
  // categoria que mais cresceu vs média dos 3 meses anteriores
  const media = new Map();
  for (let k = 1; k <= 3; k++) { const mm = somaMeses(ym + '-01', -k).slice(0, 7); txPeriodo(mm + '-01', fimMes(mm)).filter(t => t.tipo === 'despesa' && t.categoria_id).forEach(t => media.set(t.categoria_id, (media.get(t.categoria_id) || 0) + t.valor / 3)); }
  const atual = new Map(); mesAt.filter(t => t.tipo === 'despesa' && t.categoria_id).forEach(t => atual.set(t.categoria_id, (atual.get(t.categoria_id) || 0) + +t.valor));
  const cresc = [...atual].map(([id, v]) => ({ id, v, m: media.get(id) || 0 })).filter(x => x.m >= 50 && x.v > x.m * 1.3 && x.v - x.m > 80).sort((a, b) => (b.v - b.m) - (a.v - a.m))[0];
  if (cresc) d.push({ n: 'av', i: 'alerta', t: `${S.mCat.get(cresc.id)?.nome} acima do normal`, x: `${fmt(cresc.v)} este mês contra média de ${fmt(cresc.m)} nos últimos 3 meses.`, a: 'verCat', v: cresc.id });
  // gastos pequenos
  const peq = mesAt.filter(t => t.tipo === 'despesa' && +t.valor < 30);
  if (peq.length >= 6 && soma(peq, t => t.valor) >= 100) d.push({ n: 'in', i: 'lampada', t: 'Gastos invisíveis', x: `${peq.length} compras pequenas (até R$ 30) somam ${fmt(soma(peq, t => t.valor))} este mês.`, a: 'buscaPeq' });
  // orçamentos
  const g = gastosMes(ym);
  const est = S.orcamentos.filter(o => (g.get(o.categoria_id) || 0) > +o.valor);
  if (est.length) d.push({ n: 'er', i: 'alerta', t: `${est.length} orçamento(s) estourado(s)`, x: est.slice(0, 3).map(o => S.mCat.get(o.categoria_id)?.nome).join(', ') + ' passaram do limite do mês.', a: 'ir', v: 'orcamentos' });
  // cartões
  contasGrupo().filter(c => c.tipo === 'cartao' && !c.arquivada && +c.limite > 0).forEach(c => {
    const u = Math.max(0, -(sal.get(c.id) || 0)) / +c.limite;
    if (u >= .8) d.push({ n: 'er', i: 'cartao', t: `${c.nome}: ${pct(u)} do limite`, x: `Disponível: ${fmt(+c.limite - Math.max(0, -(sal.get(c.id) || 0)))}.`, a: 'verCartao', v: c.id });
  });
  contasGrupo().filter(c => c.tipo === 'cartao' && !c.arquivada).forEach(c => {
    const f = faturasDoCartao(c).find(f => f.status === 'fechada');
    if (f && diffDias(h, f.vence) <= 5) d.push({ n: 'av', i: 'cal', t: `Fatura ${c.nome} vence ${diffDias(h, f.vence) === 0 ? 'hoje' : `em ${diffDias(h, f.vence)} dia(s)`}`, x: `Valor: ${fmt(f.total - f.pagos)} · vencimento ${dataBR(f.vence)}.`, a: 'verCartao', v: c.id });
  });
  // sem categoria
  const semCat = mesAt.filter(t => t.tipo !== 'transferencia' && !t.categoria_id).length;
  if (semCat >= 3) d.push({ n: 'in', i: 'categorias', t: `${semCat} transações sem categoria`, x: 'Categorize para os relatórios e o orçamento ficarem certos.', a: 'verCat', v: '' });
  // metas atrasadas
  S.metas.filter(m => m.status === 'ativa').forEach(m => { const im = infoMeta(m, sal); if (im.atrasado) d.push({ n: 'av', i: 'metas', t: `Meta “${m.nome}” atrasada`, x: im.mensal != null ? `Guarde ${fmt(im.mensal)}/mês para chegar no prazo.` : 'Revise o valor ou o prazo.', a: 'ir', v: 'metas' }); });
  // positivo
  if (r.rec > 0 && r.res / r.rec >= .2) d.push({ n: 'ok', i: 'ok', t: 'Mês no azul 👏', x: `Você guardou ${pct(r.res / r.rec)} do que entrou até agora.`, a: 'ir', v: 'relatorios' });
  return d;
}
A.buscaTx = el => { filtrarPor('', ''); S.f.busca = el.dataset.v; };
A.buscaPeq = () => { filtrarPor('max', '30'); S.f.tipo = 'despesa'; };
A.verCartao = el => { S.cartaoSel = el.dataset.id; S.fatSel = null; ir('cartoes'); };
const dicaHtml = x => `<div class="dica ${x.n}" data-a="${x.a}" ${x.v != null ? `data-v="${esc(x.v)}" data-id="${esc(x.v)}" data-r="${esc(x.v)}"` : ''}><span class="ico">${ic(x.i, 18)}</span><div><b>${esc(x.t)}</b><p>${esc(x.x)}</p></div></div>`;

/* =====================================================================
   INÍCIO
   ===================================================================== */
function pgInicio(el) {
  const ym = S.mes, ini = ym + '-01', fim = fimMes(ym), h = hoje(), ids = idsVis(), sal = saldosEm();
  const emp = S.perfil === 'empresa';
  const r = resumo(txPeriodo(ini, fim));
  const hora = new Date().getHours(), saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const contas = contasGrupo().filter(c => !c.arquivada);
  const disp = contas.filter(c => TIPOS_CONTA[c.tipo]?.disp), saldoDisp = soma(disp, c => sal.get(c.id));
  const cartoes = contas.filter(c => c.tipo === 'cartao');
  const devendo = soma(cartoes, c => Math.max(0, -(sal.get(c.id) || 0)));
  const fats = cartoes.map(c => ({ c, fs: faturasDoCartao(c) }));
  const proxVenc = fats.flatMap(({ c, fs }) => fs.filter(f => f.status === 'fechada' || f.status === 'aberta').map(f => ({ c, f }))).sort((a, b) => a.f.vence.localeCompare(b.f.vence))[0];
  // saldo projetado até o fim do mês corrente
  const fimAtual = fimMes(h.slice(0, 7)), dispIds = new Set(disp.map(c => c.id));
  const pend = txVis().filter(t => !t.pago && t.data <= fimAtual);
  const prev = previstas(fimAtual);
  let proj = saldoDisp;
  [...pend, ...prev].forEach(t => { if (!dispIds.has(t.conta_id)) return; proj += t.tipo === 'receita' ? +t.valor : -t.valor; });
  fats.forEach(({ fs }) => fs.filter(f => (f.status === 'fechada' || f.status === 'aberta') && f.vence > h && f.vence <= fimAtual).forEach(f => proj -= Math.max(0, f.total - f.pagos)));
  // pendências
  const atrasadas = txVis().filter(t => !t.pago && t.data < h);
  const lim30 = somaDias(h, 30), fut = [...txVis().filter(t => !t.pago && t.data >= h && t.data <= lim30), ...previstas(lim30)];
  const aPagar = fut.filter(t => t.tipo !== 'receita'), aReceber = fut.filter(t => t.tipo === 'receita');
  const pctGasto = r.rec > 0 ? r.desp / r.rec : (r.desp > 0 ? 1 : 0);

  // gastos por categoria (com variação)
  const antYm = somaMeses(ini, -1).slice(0, 7);
  const agrupa = l => { const m = new Map(); l.filter(t => t.tipo === 'despesa').forEach(t => m.set(t.categoria_id || '', (m.get(t.categoria_id || '') || 0) + +t.valor)); return m; };
  const gA = agrupa(txPeriodo(ini, fim)), gP = agrupa(txPeriodo(antYm + '-01', fimMes(antYm)));
  const cats = [...gA].map(([id, v]) => ({ id, v, a: gP.get(id) || 0 })).sort((a, b) => b.v - a.v);
  const linhasCat = cats.slice(0, 8).map(c => {
    const k = S.mCat.get(c.id), vr = c.a ? (c.v - c.a) / c.a : null;
    const badge = vr == null ? '<span class="var nv">novo</span>' : Math.abs(vr) < .0005 ? '<span class="var nv">0%</span>' : vr > 0 ? `<span class="var up">↑${pct(vr)}</span>` : `<span class="var dn">↓${pct(-vr)}</span>`;
    return `<div class="linha-cat" style="cursor:pointer" data-a="verCat" data-id="${c.id}">${k ? tile(k.icone, k.cor, 'sm') : tile('?', '#3f3f4a', 'sm')}<span class="nm">${esc(k?.nome || 'Sem categoria')}<div class="barra" style="margin-top:.35rem;height:5px"><div style="width:${cats[0] ? c.v / cats[0].v * 100 : 0}%;background:${esc(k?.cor || '#64748b')}"></div></div></span><span class="vl">${fmt(c.v)}</span>${badge}</div>`;
  }).join('') || vazio('Nenhum gasto neste mês.');
  const donutItens = topN(cats.map(c => ({ nome: S.mCat.get(c.id)?.nome || 'Sem categoria', valor: c.v, cor: S.mCat.get(c.id)?.cor || '#64748b' })), 6);

  // orçamento
  let orcHtml = vazio(`Nenhum orçamento definido. <button class="lnk" data-a="ir" data-r="orcamentos">Criar orçamento</button>`);
  if (S.orcamentos.length) {
    const g = gastosMes(ym), tot = soma(S.orcamentos, o => o.valor), gasto = soma(S.orcamentos, o => g.get(o.categoria_id) || 0), p = tot ? gasto / tot : 0;
    const linhas = S.orcamentos.map(o => ({ o, c: S.mCat.get(o.categoria_id), g: g.get(o.categoria_id) || 0 })).filter(x => x.c).sort((a, b) => b.g / b.o.valor - a.g / a.o.valor).slice(0, 4);
    orcHtml = `<div style="padding:1rem 1.2rem .4rem"><div style="display:flex;align-items:baseline;gap:.5rem;flex-wrap:wrap"><span class="val-m" style="margin:0">${fmt(gasto)}</span><small>de ${fmt(tot)} · ${pct(p)}</small></div>
      <div class="barra ${p >= 1 ? 'er' : p >= .8 ? 'av' : 'ok'}" style="margin:.6rem 0 .3rem;height:8px"><div style="width:${Math.min(100, p * 100)}%"></div></div>
      <small>${S.orcamentos.filter(o => (g.get(o.categoria_id) || 0) > +o.valor).length ? `<span class="neg">${S.orcamentos.filter(o => (g.get(o.categoria_id) || 0) > +o.valor).length} categoria(s) estourou</span>` : 'Tudo dentro do limite'}</small></div>
      ${linhas.map(x => { const q = x.g / x.o.valor; return `<div class="linha-cat" style="padding:.6rem 1.2rem">${tile(x.c.icone, x.c.cor, 'sm')}<span class="nm">${esc(x.c.nome)}<div class="barra ${q >= 1 ? 'er' : q >= .8 ? 'av' : 'ok'}" style="margin-top:.35rem;height:5px"><div style="width:${Math.min(100, q * 100)}%"></div></div></span><small style="white-space:nowrap">${fmt(x.g)} / ${fmt(x.o.valor)}</small></div>`; }).join('')}`;
  }

  // próximos 30 dias
  const prox = [...atrasadas, ...fut].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 8);
  const proxHtml = prox.map(t => {
    const c = S.mCat.get(t.categoria_id), v = t.tipo === 'receita' ? +t.valor : -t.valor, dd = diffDias(h, t.data);
    return `<li ${t.virtual ? '' : `data-a="editTx" data-id="${t.id}" style="cursor:pointer"`}><span class="tile sm fixo" style="background:var(--card2);color:var(--txt);flex-direction:column;line-height:1"><b style="font-size:.8rem">${t.data.slice(8)}</b><small style="font-size:.55rem">${MESES_C[+t.data.slice(5, 7) - 1]}</small></span>
      <span class="cr"><b>${esc(t.descricao)}</b><small class="${dd < 0 ? 'neg' : ''}">${dd < 0 ? `atrasada há ${-dd} dia(s)` : dd === 0 ? 'hoje' : `em ${dd} dia(s)`} · ${esc(c?.nome || (t.tipo === 'transferencia' ? 'Transferência' : 'Sem categoria'))}${t.virtual ? ' · <span class="tag">previsto</span>' : ''}</small></span>
      <b class="${cls(v)}" style="white-space:nowrap">${fmtS(v)}</b>
      ${t.virtual ? (t.primeira ? `<button class="btn mini" data-a="lancarRec" data-id="${t.rec.id}" title="Lançar">${ic('check', 13)}</button>` : '') : `<button class="btn mini" data-a="pagarTx" data-id="${t.id}" title="Marcar como pago">${ic('check', 13)}</button>`}</li>`;
  }).join('') || `<li class="vazio" style="justify-content:center">Nada para os próximos 30 dias. 🎉</li>`;

  // resumo do ano (12 meses)
  const meses12 = Array.from({ length: 12 }, (_, i) => somaMeses(ym + '-01', i - 11).slice(0, 7));
  const rs12 = meses12.map(m => resumo(txPeriodo(m + '-01', fimMes(m))));
  const comMov = rs12.filter(x => x.rec || x.desp);
  const melhor = comMov.length ? meses12[rs12.indexOf(comMov.reduce((a, b) => b.res > a.res ? b : a))] : null;

  // metas
  const metas = S.metas.filter(m => m.status === 'ativa');
  const metasHtml = metas.slice(0, 4).map(m => {
    const im = infoMeta(m, sal);
    return `<div class="meta-dash"><div class="lt"><span style="display:flex;align-items:center;gap:.6rem">${tile(m.icone, m.cor, 'sm')}<b>${esc(m.nome)}</b>${im.atrasado ? '<span class="badge av">Atrasada</span>' : ''}</span><b style="font-size:.85rem">${Math.round(im.p * 100)}%</b></div>
      <div class="barra ${im.p >= 1 ? 'ok' : ''}"><div style="width:${Math.min(100, im.p * 100)}%;${im.p < 1 ? `background:${esc(m.cor)}` : ''}"></div></div>
      <div class="lt" style="margin:.4rem 0 0;font-size:.75rem"><span class="sub">${fmt(im.atual)} de ${fmt(im.alvo)}</span><span class="sub">${im.mensal != null ? `${fmt(im.mensal)}/mês` : 'sem prazo'}</span></div></div>`;
  }).join('') || vazio('Nenhuma meta ativa. <button class="lnk" data-a="ir" data-r="metas">Criar meta</button>');

  const dicas = gerarDicas();
  const taxa = r.rec > 0 ? r.res / r.rec : null, mesN = MESES[+ym.slice(5) - 1], mesC = MESES_C[+h.slice(5, 7) - 1];
  const masc = humorDoMes(r.rec > 0 ? r.res / r.rec : (r.desp > 0 ? -1 : null));
  const pat = patrimonioEm(h).liquido;
  const dispOrd = disp.slice().sort((a, b) => (sal.get(b.id) || 0) - (sal.get(a.id) || 0));

  // cada card do painel (o usuário escolhe tamanho, ordem e quais aparecem)
  const W = {
    saldo: () => `<div class="hero hero-saldo"><div class="hero-flex"><div>
        <div class="rot">${ic('contas', 15)} Saldo disponível em contas</div>
        <div class="big ${saldoDisp < 0 ? 'neg' : ''}">${fmtN(saldoDisp)}</div>
        <div class="chips-contas">${dispOrd.map(c => { const v = sal.get(c.id) || 0; return `<button class="chip-conta" data-a="ir" data-r="contas">${tile(c.icone, c.cor, 'xs')}<span>${esc(c.nome)}</span><b class="${v < 0 ? 'neg' : ''}">${fmt(v)}</b></button>`; }).join('') || '<small>Nenhuma conta disponível.</small>'}</div>
      </div>${masc ? `<img class="mascote" src="${masc}" alt="">` : ''}</div>
      <div class="hero-rodape"><span>${ic('relatorios', 14)} Projetado fim de ${mesC}: <b class="${proj < 0 ? 'neg' : ''}">${fmt(proj)}</b></span><span>${ic('cartao', 14)} Faturas: <b class="${devendo ? 'neg' : ''}">${fmt(devendo)}</b>${proxVenc ? ` · vence ${dataBR(proxVenc.f.vence).slice(0, 5)}` : ''}</span><span>${disp.length} conta(s) · ${fmt(soma(contas, c => sal.get(c.id)))} no total</span></div></div>`,
    mes: () => `<div class="card mes-card"><div class="hero-flex"><div>
        <div class="rot">${emp ? ic('empresa', 14) + ' Lucro de' : 'Sobrou em'} ${mesN}</div>
        <div class="v ${r.res < 0 ? 'neg' : ''}">${fmtN(r.res)}</div>
        <div class="linha2"><div><small>${ic('desce', 13)} ${emp ? 'Faturamento' : 'Entrou'}</small><b class="pos">${fmtN(r.rec)}</b></div><div><small>${ic('sobe', 13)} ${emp ? 'Custos' : 'Saiu'}</small><b class="neg">${fmtN(r.desp)}</b></div></div>
      </div>${medidor(taxa)}</div>
      <div class="prog"><div style="width:${Math.min(100, pctGasto * 100)}%"></div></div>
      <small class="sub">${r.rec > 0 ? `Você gastou <b>${pct(pctGasto)}</b> do que entrou.` : r.desp > 0 ? 'Ainda não entrou dinheiro este mês.' : 'Sem movimentação ainda neste mês.'}</small></div>`,
    faturas: () => `<div class="mcard" data-a="ir" data-r="cartoes"><span class="t">${ic('cartao', 15)} Faturas</span><span class="v ${devendo ? 'neg' : ''}">${fmtN(devendo)}</span><small>${proxVenc ? `vence ${dataBR(proxVenc.f.vence).slice(0, 5)}` : 'nenhum cartão'}</small></div>`,
    projetado: () => `<div class="mcard" data-a="ir" data-r="pendencias"><span class="t">${ic('relatorios', 15)} Projetado</span><span class="v ${proj < 0 ? 'neg' : ''}">${fmtN(proj)}</span><small>fim de ${mesC}</small></div>`,
    patrimonio: () => `<div class="mcard" data-a="ir" data-r="patrimonio"><span class="t">${ic('patrimonio', 15)} Patrimônio líquido</span><span class="v ${pat < 0 ? 'neg' : ''}">${fmtN(pat)}</span><small>bens + contas − dívidas</small></div>`,
    pendencias: () => `<div class="pend3">
      <button data-a="ir" data-r="pendencias"><small><span class="dot" style="background:var(--verm)"></span>Atrasadas</small><b class="${atrasadas.length ? 'neg' : ''}">${fmt(soma(atrasadas, t => t.valor))}</b><small>${atrasadas.length} item(ns)</small></button>
      <button data-a="ir" data-r="pendencias"><small><span class="dot" style="background:var(--amar)"></span>A pagar · 30 dias</small><b>${fmt(soma(aPagar, t => t.valor))}</b><small>${aPagar.length} item(ns)</small></button>
      <button data-a="ir" data-r="pendencias"><small><span class="dot" style="background:var(--verde)"></span>A receber · 30 dias</small><b class="pos">${fmt(soma(aReceber, t => t.valor))}</b><small>${aReceber.length} item(ns)</small></button></div>`,
    dicas: () => dicas.length ? `<div><div class="sec-h"><h2>${ic('lampada', 17)} Dicas para você</h2></div><div class="dicas">${dicas.slice(0, 6).map(dicaHtml).join('')}</div></div>` : '',
    gastos: () => `<div class="card p0"><div class="card-cab"><h2>Gastos por categoria</h2><div class="seg"><button class="${S.vistaGastos !== 'moedas' ? 'on' : ''}" data-a="vistaGastos" data-v="lista">Lista</button><button class="${S.vistaGastos === 'moedas' ? 'on' : ''}" data-a="vistaGastos" data-v="moedas">🪙 Moedas</button></div></div>
        ${S.vistaGastos === 'moedas' ? pilhasMoedas(cats.slice(0, 6)) : `<div class="rolagem">${linhasCat}</div>`}</div>`,
    destino: () => `<div class="card"><div class="graf-cab"><h2>Pra onde foi o dinheiro</h2><small>${nomeMes(ym)}</small></div>${donutItens.length ? grafDonut({ itens: donutItens, titulo: 'Gastos do mês', valor: fmtK(r.desp), max: 230 }) : vazio('Sem gastos no mês.')}</div>`,
    orcamento: () => `<div class="card p0"><div class="card-cab"><h2>Orçamento de ${mesN}</h2><button class="lnk" data-a="ir" data-r="orcamentos">Ajustar</button></div>${orcHtml}</div>`,
    proximos: () => `<div class="card p0"><div class="card-cab"><h2>Próximos 30 dias</h2><button class="lnk" data-a="ir" data-r="pendencias">Ver tudo →</button></div><ul class="lst">${proxHtml}</ul></div>`,
    ano: () => `<div class="card"><div class="graf-cab"><div><h2>Resumo do ano</h2><small>Últimos 12 meses</small></div>
      <div class="resumo-linha" style="margin:0"><span>Sobrou no período<b class="${cls(soma(rs12, x => x.res))}">${fmtS(soma(rs12, x => x.res))}</b></span>${melhor ? `<span>Melhor mês<b>${nomeMes(melhor)}</b></span>` : ''}</div></div>
      ${grafBarras({ labels: meses12.map(mesCurto), series: [{ nome: emp ? 'Faturamento' : 'Entradas', cor: PAL.rec, valores: rs12.map(x => x.rec) }, { nome: emp ? 'Custos' : 'Saídas', cor: PAL.desp, valores: rs12.map(x => x.desp) }], linha: { nome: 'Sobrou', cor: S.acento, valores: rs12.map(x => x.res) }, h: 270 })}
      ${legenda([[emp ? 'Faturamento' : 'Entradas', PAL.rec], [emp ? 'Custos' : 'Saídas', PAL.desp], ['Sobrou no mês', S.acento]])}</div>`,
    evolucao: () => evolucaoSaldoCard(ym, ini, fim, ids),
    metas: () => `<div class="card p0"><div class="card-cab"><h2>Metas</h2><button class="lnk" data-a="ir" data-r="metas">Ver todas →</button></div>${metasHtml}</div>`
  };
  const lay = layoutInicio(), ed = !!S.editLayout;
  const vis = lay.filter(x => !x.oculto), ocultos = lay.filter(x => x.oculto);
  const bloco = x => {
    const html = W[x.id] ? W[x.id]() : '';
    if (!html && !ed) return '';
    const nome = PAINEL[x.id].nome;
    return `<section class="wd" data-wid="${x.id}" style="--w:${x.w}" ${ed ? `aria-label="${esc(nome)}"` : ''}>
      ${ed ? `<div class="wd-barra"><span class="wd-pega" data-pega title="Arraste para mudar de lugar">${ic('grip', 16)}</span><b>${esc(nome)}</b>
        <span class="wd-acts"><button data-a="wdMover" data-id="${x.id}" data-d="-1" title="Mover para antes">←</button><button data-a="wdMover" data-id="${x.id}" data-d="1" title="Mover para depois">→</button>
        <button data-a="wdTam" data-id="${x.id}" data-d="-1" title="Diminuir">−</button><span class="wd-tam">${TAM_NOME[x.w] || x.w + '/12'}</span><button data-a="wdTam" data-id="${x.id}" data-d="1" title="Aumentar">+</button>
        <button data-a="wdOcultar" data-id="${x.id}" title="Ocultar card">${ic('olhoX', 14)}</button></span></div>` : ''}
      <div class="wd-corpo">${html || `<div class="card">${vazio('Sem conteúdo agora (aparece quando houver).')}</div>`}</div>
      ${ed ? '<span class="wd-alca" data-alca title="Arraste para aumentar ou diminuir"></span>' : ''}</section>`;
  };

  el.innerHTML = `
    <div class="pcab"><div><div class="sup">${saud}, ${esc(nomeUsuario().split(' ')[0])} 👋</div><h1>${nomeMes(ym)}</h1></div>
      <div class="pacoes">${navMes()}<button class="btn ico" data-a="recarregar" title="Atualizar">${ic('atualizar', 16)}</button>
      <button class="btn ${ed ? 'pri' : ''}" data-a="editarLayout" title="Organizar os cards">${ed ? ic('check', 15) + ' Concluir' : ic('layout', 15) + ' Organizar'}</button></div></div>
    ${ed ? `<div class="wd-aviso">${ic('layout', 16)}<span><b>Organizando o painel.</b> Arraste a borda direita de um card para mudar o tamanho, ou use <b>−</b> e <b>+</b>. Arraste pela alça ou use <b>← →</b> para mudar a ordem.</span>
      <span class="wd-ocultos">${ocultos.map(x => `<button class="chip-conta" data-a="wdMostrar" data-id="${x.id}">+ ${esc(PAINEL[x.id].nome)}</button>`).join('')}</span>
      <button class="lnk" data-a="wdPadrao">Restaurar padrão</button></div>` : ''}
    <div class="painel ${ed ? 'editando' : ''}">${vis.map(bloco).join('')}</div>`;
  if (ed) ligarPainel(el);
}

/* ---------- painel do Início: cards redimensionáveis ---------- */
const PAINEL = {
  saldo: { nome: 'Saldo disponível', w: 8 }, mes: { nome: 'Resumo do mês', w: 4 },
  faturas: { nome: 'Faturas', w: 4 }, projetado: { nome: 'Projetado', w: 4 }, patrimonio: { nome: 'Patrimônio líquido', w: 4 },
  pendencias: { nome: 'Pendências', w: 12 }, dicas: { nome: 'Dicas', w: 12 },
  gastos: { nome: 'Gastos por categoria', w: 6 }, destino: { nome: 'Pra onde foi o dinheiro', w: 6 },
  orcamento: { nome: 'Orçamento', w: 6 }, proximos: { nome: 'Próximos 30 dias', w: 6 },
  ano: { nome: 'Resumo do ano', w: 12 }, evolucao: { nome: 'Evolução no mês', w: 6 }, metas: { nome: 'Metas', w: 6 }
};
const TAMANHOS = [3, 4, 6, 8, 9, 12];
const TAM_NOME = { 3: '¼', 4: '⅓', 6: '½', 8: '⅔', 9: '¾', 12: 'Inteiro' };
S.layout = ls.get('layoutInicio', null);
function layoutInicio() {
  const salvo = Array.isArray(S.layout) ? S.layout.filter(x => PAINEL[x.id]) : [];
  const ids = new Set(salvo.map(x => x.id));
  const novos = Object.keys(PAINEL).filter(id => !ids.has(id)).map(id => ({ id, w: PAINEL[id].w }));
  return [...salvo.map(x => ({ id: x.id, w: TAMANHOS.includes(+x.w) ? +x.w : PAINEL[x.id].w, oculto: !!x.oculto })), ...novos];
}
function salvarLayout(l) { S.layout = l.map(x => ({ id: x.id, w: x.w, ...(x.oculto ? { oculto: true } : {}) })); ls.set('layoutInicio', S.layout); salvarPrefs(); }
A.editarLayout = () => { S.editLayout = !S.editLayout; render(); };
A.wdTam = el => { const l = layoutInicio(), x = l.find(y => y.id === el.dataset.id); const i = TAMANHOS.indexOf(x.w); x.w = TAMANHOS[Math.max(0, Math.min(TAMANHOS.length - 1, i + +el.dataset.d))]; salvarLayout(l); render(); };
A.wdMover = el => { const l = layoutInicio(), vis = l.filter(x => !x.oculto), i = vis.findIndex(x => x.id === el.dataset.id), j = i + +el.dataset.d; if (j < 0 || j >= vis.length) return; [vis[i], vis[j]] = [vis[j], vis[i]]; salvarLayout([...vis, ...l.filter(x => x.oculto)]); render(); };
A.wdOcultar = el => { const l = layoutInicio(); l.find(x => x.id === el.dataset.id).oculto = true; salvarLayout(l); render(); };
A.wdMostrar = el => { const l = layoutInicio(), x = l.find(y => y.id === el.dataset.id); x.oculto = false; salvarLayout([...l.filter(y => y !== x), x]); render(); };
A.wdPadrao = () => { salvarLayout(Object.keys(PAINEL).map(id => ({ id, w: PAINEL[id].w }))); render(); };
// arrastar: borda direita muda o tamanho; alça muda a ordem
function ligarPainel(el) {
  const painel = $('.painel', el); if (!painel) return;
  painel.addEventListener('pointerdown', ev => {
    const alca = ev.target.closest('[data-alca]'), pega = ev.target.closest('[data-pega]');
    if (!alca && !pega) return;
    const wd = ev.target.closest('.wd'); ev.preventDefault();
    const cols = getComputedStyle(painel).gridTemplateColumns.split(' ').length;
    const gap = parseFloat(getComputedStyle(painel).columnGap) || 0, col = (painel.clientWidth - gap * (cols - 1)) / cols;
    painel.setPointerCapture(ev.pointerId); wd.classList.add('arrastando');
    if (alca) {
      const esq = wd.getBoundingClientRect().left; let w = +wd.style.getPropertyValue('--w');
      const mv = e => { const n = Math.round((e.clientX - esq + gap) / (col + gap) * (12 / cols)); const t = TAMANHOS.reduce((a, b) => Math.abs(b - n) < Math.abs(a - n) ? b : a); if (t !== w) { w = t; wd.style.setProperty('--w', w); const tt = $('.wd-tam', wd); if (tt) tt.textContent = TAM_NOME[w]; } };
      const up = () => { painel.removeEventListener('pointermove', mv); painel.removeEventListener('pointerup', up); painel.removeEventListener('pointercancel', up); const l = layoutInicio(); l.find(x => x.id === wd.dataset.wid).w = w; salvarLayout(l); render(); };
      painel.addEventListener('pointermove', mv); painel.addEventListener('pointerup', up); painel.addEventListener('pointercancel', up);
    } else {
      const mv = e => {
        const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest('.wd');
        if (!alvo || alvo === wd || alvo.parentNode !== painel) return;
        const r = alvo.getBoundingClientRect(), depois = (e.clientY > r.bottom - r.height / 3) || (e.clientX > r.left + r.width / 2 && e.clientY > r.top + r.height / 3);
        painel.insertBefore(wd, depois ? alvo.nextSibling : alvo);
      };
      const up = () => { painel.removeEventListener('pointermove', mv); painel.removeEventListener('pointerup', up); painel.removeEventListener('pointercancel', up);
        const l = layoutInicio(), ordem = $$('.wd', painel).map(x => x.dataset.wid); salvarLayout([...ordem.map(id => l.find(x => x.id === id)), ...l.filter(x => x.oculto)]); render(); };
      painel.addEventListener('pointermove', mv); painel.addEventListener('pointerup', up); painel.addEventListener('pointercancel', up);
    }
  });
}
S.vistaGastos = ls.get('vistaGastos', 'lista');
A.vistaGastos = el => { S.vistaGastos = el.dataset.v; ls.set('vistaGastos', S.vistaGastos); render(); };
// infográfico: medidor circular da taxa de economia
function medidor(p) {
  const r = 46, C = 2 * Math.PI * r, v = p == null ? 0 : Math.max(0, Math.min(1, p));
  const cor = p == null ? 'var(--sub2)' : p >= .2 ? 'var(--verde)' : p >= 0 ? 'var(--amar)' : 'var(--verm)';
  return `<div class="medidor" title="Taxa de economia: quanto da renda sobrou"><svg viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="color-mix(in srgb,var(--txt) 10%,transparent)" stroke-width="11"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${cor}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${fixo(C)}" stroke-dashoffset="${fixo(C * (1 - v))}" transform="rotate(-90 60 60)" class="anim-anel" style="--c:${fixo(C)}"/>
    <text x="60" y="62" class="t1">${p == null ? '—' : Math.round(p * 100) + '%'}</text><text x="60" y="77" class="t2">economizado</text></svg></div>`;
}
// infográfico: pilhas de moedas por categoria
function pilhasMoedas(cats) {
  if (!cats.length) return vazio('Nenhum gasto neste mês.');
  const max = cats[0].v, M = 14;
  return `<div class="pilhas">${cats.map((c, k) => {
    const cat = S.mCat.get(c.id), n = Math.max(1, Math.round(c.v / max * M)), H = M * 7 + 26;
    let moedas = '';
    for (let i = 0; i < n; i++) { const y = H - 14 - i * 7; moedas += `<g class="moeda-pilha" style="animation-delay:${k * 90 + i * 45}ms"><ellipse cx="35" cy="${y + 3}" rx="26" ry="7" fill="#a96a06"/><ellipse cx="35" cy="${y}" rx="26" ry="7" fill="url(#gm${k})"/><ellipse cx="35" cy="${y}" rx="19" ry="4.6" fill="none" stroke="#b47509" stroke-width="1" opacity=".7"/></g>`; }
    return `<div class="pilha" data-a="verCat" data-id="${c.id}" style="cursor:pointer" title="${esc(cat?.nome || 'Sem categoria')}: ${fmt(c.v)}"><span class="vv">${fmtK(c.v)}</span>
      <svg viewBox="0 0 70 ${H}"><defs><linearGradient id="gm${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3bf"/><stop offset=".45" stop-color="#f8cb4a"/><stop offset="1" stop-color="#d48f12"/></linearGradient></defs>${moedas}</svg>
      <span class="tile sm" style="--c:${esc(cat?.cor || '#3f3f4a')};background:${esc(cat?.cor || '#3f3f4a')}">${icoHtml(cat?.icone || '?')}</span><span class="lb">${esc(cat?.nome || 'Sem categoria')}</span></div>`;
  }).join('')}</div>`;
}
function evolucaoSaldoCard(ym, ini, fim, ids) {
  const h = hoje(); S.comp = S.comp || ls.get('comp', 3);
  const serie = mm => { const n = diasNoMes(mm), a = new Array(n).fill(0); for (const t of txVis()) if (t.pago && t.data.startsWith(mm)) a[+t.data.slice(8) - 1] += sinalTx(t, filtrando() ? ids : null); for (let i = 1; i < n; i++) a[i] += a[i - 1]; return a; };
  const n = diasNoMes(ym); let atual = serie(ym);
  if (ym === h.slice(0, 7)) atual = atual.map((v, i) => i + 1 <= +h.slice(8) ? v : null); else if (ym > h.slice(0, 7)) atual = atual.map(() => null);
  const prevs = []; for (let k = 1; k <= S.comp; k++) prevs.push(serie(somaMeses(ini, -k).slice(0, 7)));
  const em = i => prevs.map(p => p[Math.min(i, p.length - 1)]);
  const q = qq => Array.from({ length: n }, (_, i) => quantil(em(i), qq));
  const med = q(.5), ult = atual.map((v, i) => v == null ? -1 : i).filter(i => i >= 0).at(-1);
  const variacao = ult != null ? atual[ult] : 0;
  const nota = ult != null ? (() => { const d = atual[ult] - med[ult]; return `Dia ${ult + 1}: ${fmt(Math.abs(d))} ${d >= 0 ? 'acima' : 'abaixo'} da mediana dos meses anteriores.`; })() : 'Sem movimentação ainda.';
  return `<div class="card"><div class="graf-cab"><div><h2>Evolução no mês</h2><small>vs. ${S.comp} meses anteriores</small></div>
    <select class="pill-sel" data-c="comp">${[3, 6, 12].map(k => `<option value="${k}" ${k === S.comp ? 'selected' : ''}>${k} meses</option>`).join('')}</select>
    <b class="${cls(variacao)}">${fmtS(variacao)}</b></div>
    ${grafLinhas({ labels: Array.from({ length: n }, (_, i) => String(i + 1)), series: [{ nome: 'Mês atual', cor: PAL.rec, valores: atual, area: true, semPontos: true }, { nome: 'Mediana', cor: '#a1a1b5', valores: med, larg: 1.6, semPontos: true }], banda: { low: q(.25), high: q(.75) }, h: 230 })}
    <div class="nota">${nota}</div></div>`;
}

/* =====================================================================
   CARTÕES E FATURAS
   ===================================================================== */
function pgCartoes(el) {
  const sal = saldosEm(), cartoes = contasGrupo().filter(c => c.tipo === 'cartao' && (!c.arquivada || c.id === S.cartaoSel));
  if (!cartoes.length) { el.innerHTML = cab('Cartões', 'Dia a dia') + `<div class="card">${vazio('Nenhum cartão de crédito cadastrado. <button class="lnk" data-a="novaConta">Adicionar cartão</button> (tipo “Cartão de crédito”).')}</div>`; return; }
  if (!cartoes.some(c => c.id === S.cartaoSel)) S.cartaoSel = cartoes[0].id;
  const c = S.mC.get(S.cartaoSel), fs = faturasDoCartao(c), at = faturaAtual(fs), h = hoje();
  if (!fs.some(f => f.vence === S.fatSel)) S.fatSel = at.vence;
  const sel = fs.find(f => f.vence === S.fatSel);
  const deve = Math.max(0, -(sal.get(c.id) || 0)), lim = +c.limite || 0, uso = lim ? deve / lim : 0;
  const futuras = fs.filter(f => f.vence > at.vence), totFut = soma(futuras, f => f.total);
  const parcelas = S.tx.filter(t => t.conta_id === c.id && t.data > h && /\(\d+\/\d+\)/.test(t.descricao));
  const ultimas = fs.filter(f => f.vence <= at.vence).slice(-7);
  const abas = [...ultimas, ...futuras.slice(0, 6)];
  const [k, n] = ST_FAT[sel.status];
  const grad = `linear-gradient(135deg, ${esc(c.cor || '#4338ca')}, color-mix(in srgb, ${esc(c.cor || '#4338ca')} 45%, #000))`;
  const itens = [...sel.itens].sort((a, b) => b.data.localeCompare(a.data));
  const graf = grafBarras({ labels: abas.map(f => MESES_C[+f.vence.slice(5, 7) - 1]), series: [{ nome: 'Fatura', valores: abas.map(f => f.total), cores: abas.map(f => f.vence === S.fatSel ? S.acento : f.vence > at.vence ? '#64748b' : '#f43f5e') }], h: 180  });
  el.innerHTML = cab('Cartões', 'Fatura sem susto', `<button class="btn" data-a="editConta" data-id="${c.id}">${ic('editar', 15)} Editar cartão</button><button class="btn pri" data-a="novaTxCartao">${ic('mais', 15)} Compra no cartão</button>`) +
    (cartoes.length > 1 ? `<div class="seletor-cartoes">${cartoes.map(x => `<button class="${x.id === c.id ? 'on' : ''}" data-a="cartaoSel" data-id="${x.id}"><span class="mini-tile" style="background:${esc(x.cor)};width:20px;height:20px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:.7rem">${icoHtml(x.icone)}</span>${esc(x.nome)}<b class="${(sal.get(x.id) || 0) < 0 ? 'neg' : ''}">${fmt(sal.get(x.id))}</b></button>`).join('')}</div>` : '') +
    `<div class="fat-hero">
      <div class="cartao-visual" style="background:${grad}"><div style="display:flex;justify-content:space-between;align-items:center"><span class="nm">${icoHtml(c.icone)} ${esc(c.nome)}</span><span class="status-fat">${c.dia_vencimento ? `vence dia ${c.dia_vencimento}` : 'cartão'}</span></div>
        <div><small style="color:rgba(255,255,255,.75)">Fatura atual · ${nomeFat(at)}</small><div class="vl">${fmt(at.total)}</div></div>
        <div>${lim ? `<div style="display:flex;justify-content:space-between;font-size:.75rem;color:rgba(255,255,255,.85)"><span>Limite usado ${pct(uso)}</span><span>Disponível ${fmt(lim - deve)}</span></div><div style="height:6px;border-radius:99px;background:rgba(255,255,255,.25);margin-top:.35rem;overflow:hidden"><div style="height:100%;width:${Math.min(100, uso * 100)}%;background:#fff"></div></div>` : '<small style="color:rgba(255,255,255,.75)">Defina o limite em “Editar cartão”</small>'}</div></div>
      <div class="card"><div class="lbl-k">Total em aberto no cartão</div><div class="val-m ${deve ? 'neg' : ''}">${fmt(deve)}</div><small>Fecha dia ${c.dia_fechamento || '—'} · vence dia ${c.dia_vencimento || '—'}</small>
        <div style="margin-top:.8rem;display:flex;gap:.4rem;flex-wrap:wrap">${deve ? `<button class="btn mini pri" data-a="pagarFatura" data-id="${c.id}">${ic('dinheiro', 13)} Pagar fatura</button>` : ''}<button class="btn mini" data-a="verConta" data-id="${c.id}">${ic('lista', 13)} Extrato</button></div></div>
      <div class="card"><div class="lbl-k">Próximas faturas (parcelas e compras futuras)</div><div class="val-m">${fmt(totFut)}</div><small>${futuras.filter(f => f.total).length} fatura(s) · ${parcelas.length} parcela(s) a vencer</small>
        ${futuras.filter(f => f.total).slice(0, 3).map(f => `<div class="info" style="display:flex;justify-content:space-between;font-size:.78rem;margin-top:.35rem"><span>${nomeFat(f)}</span><b>${fmt(f.total)}</b></div>`).join('')}</div>
    </div>
    <div class="card mb"><div class="graf-cab"><h2>Faturas</h2><small>clique para ver os lançamentos</small></div>${graf}
      <div class="fat-tabs" style="margin-top:.6rem">${abas.map(f => `<button class="${f.vence === S.fatSel ? 'on' : ''}" data-a="fatSel" data-v="${f.vence}"><b>${nomeFat(f)} ${f.vence.slice(2, 4)}</b>${fmt(f.total)} · <span class="badge ${ST_FAT[f.status][0]}" style="padding:.05rem .35rem">${ST_FAT[f.status][1]}</span></button>`).join('')}</div></div>
    <div class="card p0"><div class="card-cab"><div><h2>Fatura de ${nomeFat(sel)} <span class="badge ${k}">${n}</span></h2><small>Fecha ${dataBR(sel.fecha)} · vence ${dataBR(sel.vence)}${sel.pagos ? ` · pago ${fmt(sel.pagos)}` : ''}</small></div><b class="val-m" style="margin:0">${fmt(sel.total)}</b></div>
      <ul class="lst">${itens.map(t => { const ct = S.mCat.get(t.categoria_id), v = t.tipo === 'receita' ? +t.valor : -t.valor; return `<li data-a="editTx" data-id="${t.id}" style="cursor:pointer">${ct ? tile(ct.icone, ct.cor, 'sm') : tile('?', '#3f3f4a', 'sm')}<span class="cr"><b>${esc(t.descricao)}</b><small>${dataBR(t.data)} · ${esc(ct?.nome || 'Sem categoria')}${(t.tags || []).map(g => ` <span class="tag">${esc(g)}</span>`).join('')}</small></span><b class="${cls(v)}">${fmtS(v)}</b></li>`; }).join('') || '<li class="vazio" style="justify-content:center">Nenhum lançamento nesta fatura.</li>'}</ul></div>`;
}
A.cartaoSel = el => { S.cartaoSel = el.dataset.id; S.fatSel = null; render(); };
A.fatSel = el => { S.fatSel = el.dataset.v; render(); };
A.novaTxCartao = () => modalTx(null, 'despesa', { tipo: 'despesa', conta_id: S.cartaoSel });

/* =====================================================================
   CONTAS A PAGAR / RECEBER (pendências)
   ===================================================================== */
S.pendAba = 'pagar'; S.pendHor = 30;
function pgPendencias(el) {
  const h = hoje(), lim = S.pendHor ? somaDias(h, S.pendHor) : '9999-12-31';
  const todas = txVis().filter(t => !t.pago);
  const atr = todas.filter(t => t.data < h);
  const fut = [...todas.filter(t => t.data >= h && t.data <= lim), ...previstas(S.pendHor ? lim : somaDias(h, 365))];
  const pagar = fut.filter(t => t.tipo !== 'receita'), receber = fut.filter(t => t.tipo === 'receita');
  const ym = h.slice(0, 7), pagasMes = txVis().filter(t => t.pago && t.data.startsWith(ym) && t.tipo === 'despesa');
  const lista = { atrasadas: atr, pagar, receber }[S.pendAba] || pagar;
  const porData = new Map(); [...lista].sort((a, b) => a.data.localeCompare(b.data)).forEach(t => { if (!porData.has(t.data)) porData.set(t.data, []); porData.get(t.data).push(t); });
  const linha = t => {
    const c = S.mCat.get(t.categoria_id), v = t.tipo === 'receita' ? +t.valor : -t.valor;
    return `<li ${t.virtual ? '' : `data-a="editTx" data-id="${t.id}" style="cursor:pointer"`}>${t.tipo === 'transferencia' ? tile('⇄', '#2563eb', 'sm') : c ? tile(c.icone, c.cor, 'sm') : tile('?', '#3f3f4a', 'sm')}
      <span class="cr"><b>${esc(t.descricao)}</b><small>${esc(S.mC.get(t.conta_id)?.nome || '')} · ${esc(c?.nome || 'Sem categoria')}${t.virtual ? ' · <span class="tag">recorrente previsto</span>' : ''}</small></span>
      <b class="${t.tipo === 'transferencia' ? 'neu' : cls(v)}" style="white-space:nowrap">${t.tipo === 'transferencia' ? fmt(t.valor) : fmtS(v)}</b>
      ${t.virtual ? (t.primeira ? `<button class="btn mini" data-a="lancarRec" data-id="${t.rec.id}">${ic('check', 13)} Lançar</button>` : '<span style="width:70px"></span>') : `<button class="btn mini" data-a="pagarTx" data-id="${t.id}">${ic('check', 13)} ${t.tipo === 'receita' ? 'Recebi' : 'Paguei'}</button>`}</li>`;
  };
  el.innerHTML = cab('Contas a pagar e receber', 'Dia a dia', `<div class="seg">${[[7, '7 dias'], [30, '30 dias'], [90, '90 dias'], [0, 'Todas']].map(([v, n]) => `<button class="${S.pendHor === v ? 'on' : ''}" data-a="pendHor" data-v="${v}">${n}</button>`).join('')}</div><button class="btn pri" data-a="novaPend">${ic('mais', 15)} Nova conta a pagar</button>`) +
    `<div class="pend3 mb">
      <button data-a="pendAba" data-v="atrasadas" style="${S.pendAba === 'atrasadas' ? 'border-color:var(--verm)' : ''}"><small><span class="dot" style="background:var(--verm)"></span>Atrasadas</small><b class="${atr.length ? 'neg' : ''}">${fmt(soma(atr, t => t.valor))}</b><small>${atr.length} item(ns)</small></button>
      <button data-a="pendAba" data-v="pagar" style="${S.pendAba === 'pagar' ? 'border-color:var(--amar)' : ''}"><small><span class="dot" style="background:var(--amar)"></span>A pagar</small><b>${fmt(soma(pagar, t => t.valor))}</b><small>${pagar.length} item(ns)</small></button>
      <button data-a="pendAba" data-v="receber" style="${S.pendAba === 'receber' ? 'border-color:var(--verde)' : ''}"><small><span class="dot" style="background:var(--verde)"></span>A receber</small><b class="pos">${fmt(soma(receber, t => t.valor))}</b><small>${receber.length} item(ns)</small></button>
    </div>
    <div class="card p0">${[...porData].map(([d, ts]) => `<div class="agrupa-data">${d < h ? `<span class="neg">${dataBR(d)} · atrasada há ${diffDias(d, h)} dia(s)</span>` : d === h ? `Hoje · ${dataBR(d)}` : `${dataBR(d)} · ${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][new Date(d + 'T12:00').getDay()]}`}</div><ul class="lst">${ts.map(linha).join('')}</ul>`).join('') || vazio(S.pendAba === 'atrasadas' ? 'Nada atrasado. 🎉' : 'Nada pendente neste período.')}</div>
    <p class="nota">Pagas este mês: ${pagasMes.length} despesa(s) · ${fmt(soma(pagasMes, t => t.valor))}. Lançamentos “Pendentes” e recorrências aparecem aqui automaticamente.</p>`;
}
A.pendAba = el => { S.pendAba = el.dataset.v; render(); };
A.pendHor = el => { S.pendHor = +el.dataset.v; render(); };
A.novaPend = () => modalTx(null, 'despesa', { tipo: 'despesa', pago: false, data: somaDias(hoje(), 1) });

/* =====================================================================
   TAGS
   ===================================================================== */
function todasTags() { const m = new Map(); S.tx.forEach(t => (t.tags || []).forEach(g => m.set(g, (m.get(g) || 0) + 1))); return [...m].sort((a, b) => b[1] - a[1]).map(x => x[0]); }
function pgTags(el) {
  const m = new Map();
  txVis().forEach(t => (t.tags || []).forEach(g => {
    if (!m.has(g)) m.set(g, { n: 0, d: 0, r: 0, ini: t.data, fim: t.data, cats: new Map() });
    const x = m.get(g); x.n++; if (t.tipo === 'despesa') { x.d += +t.valor; x.cats.set(t.categoria_id, (x.cats.get(t.categoria_id) || 0) + +t.valor); } if (t.tipo === 'receita') x.r += +t.valor;
    if (t.data < x.ini) x.ini = t.data; if (t.data > x.fim) x.fim = t.data;
  }));
  const lista = [...m].sort((a, b) => b[1].d - a[1].d);
  el.innerHTML = cab('Tags', 'Análise') + `<p class="sub" style="margin-top:-.4rem">Marque transações com tags (ex.: <span class="tag">viagem</span> <span class="tag">casamento</span> <span class="tag">reforma</span>) e veja quanto custou cada projeto, mesmo que os gastos estejam em categorias e contas diferentes.</p>
    <div class="grade-cartoes">${lista.map(([g, x]) => {
      const top = [...x.cats].sort((a, b) => b[1] - a[1]).slice(0, 3);
      return `<div class="ccard"><div class="ct"><span class="tile fixo" style="background:var(--pri-bg);color:var(--pri)">#</span><div class="nm"><b>${esc(g)}</b><small>${x.n} transação(ões) · ${dataBR(x.ini)}${x.fim !== x.ini ? ` a ${dataBR(x.fim)}` : ''}</small></div><div class="cv neg">${fmt(x.d)}</div></div>
        ${top.length ? `<div style="display:flex;flex-direction:column;gap:.35rem">${top.map(([cid, v]) => { const c = S.mCat.get(cid); return `<div><div class="info"><span>${icoHtml(c?.icone || '')} ${esc(c?.nome || 'Sem categoria')}</span><span>${fmt(v)}</span></div><div class="barra" style="height:4px;margin-top:.2rem"><div style="width:${v / x.d * 100}%;background:${esc(c?.cor || '#64748b')}"></div></div></div>`; }).join('')}</div>` : ''}
        ${x.r ? `<div class="info"><span>Entradas com esta tag</span><span class="pos">+${fmt(x.r)}</span></div>` : ''}
        <div class="cr"><button class="btn mini" data-a="verTag" data-v="${esc(g)}">${ic('lista', 13)} Transações</button><span style="flex:1"></span><button class="icobtn" data-a="renTag" data-v="${esc(g)}" title="Renomear">${ic('editar', 16)}</button><button class="icobtn perigo" data-a="delTag" data-v="${esc(g)}" title="Remover tag">${ic('lixo', 16)}</button></div></div>`;
    }).join('') || `<div class="card">${vazio('Nenhuma tag ainda. Ao lançar ou editar uma transação, preencha o campo “Tags”.')}</div>`}</div>`;
}
A.verTag = el => { filtrarPor('tag', el.dataset.v); S.mes = (S.tx.filter(t => (t.tags || []).includes(el.dataset.v)).map(t => t.data).sort().at(-1) || hoje()).slice(0, 7); };
async function trocarTag(de, para) {
  const alvo = S.tx.filter(t => (t.tags || []).includes(de));
  for (const t of alvo) { const nv = [...new Set((t.tags || []).map(g => g === de ? para : g).filter(Boolean))]; await upd('transacoes', t.id, { tags: nv }); }
  return alvo.length;
}
A.renTag = async el => { const de = el.dataset.v, para = (prompt('Novo nome da tag:', de) || '').trim().replace(/^#/, ''); if (!para || para === de) return; const n = await trocarTag(de, para); toast(`${n} transação(ões) atualizada(s).`); recarregar(); };
A.delTag = async el => { if (!confirm(`Remover a tag “${el.dataset.v}” de todas as transações? (as transações continuam)`)) return; const n = await trocarTag(el.dataset.v, null); toast(`Tag removida de ${n} transação(ões).`); recarregar(); };
A.addTag = el => { const i = el.closest('form').tags; const cur = i.value.split(',').map(s => s.trim()).filter(Boolean); if (!cur.includes(el.dataset.v)) cur.push(el.dataset.v); i.value = cur.join(', '); };
const lerTags = v => [...new Set(String(v || '').split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 10);

/* =====================================================================
   AJUSTES (personalização, perfil, dados)
   ===================================================================== */
const ACENTOS = ['#3b82f6', '#2563eb', '#0ea5e9', '#06b6d4', '#7c3aed', '#a855f7', '#db2777', '#e0607e', '#ef4444', '#f97316', '#f5b82e', '#b23a2e', '#7b7ff6', '#3b82f6', '#0ea5e9', '#14b8a6', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#f43f5e', '#ec4899', '#a855f7', '#e2b04a'];
let _instalar = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); _instalar = e; });
function pgAjustes(el) {
  const iniciais = ['inicio', 'transacoes', 'pendencias', 'cartoes', 'orcamentos', 'relatorios'];
  const empresas = S.contas.filter(c => c.perfil === 'empresa');
  el.innerHTML = cab('Ajustes', 'Configuração') + `
    <div class="sec-tit"><span>Perfil</span></div>
    <div class="card p0 mb">
      <div class="ajuste"><div class="tx" style="display:flex;align-items:center;gap:.8rem"><span class="avatar" style="width:44px;height:44px;font-size:1.1rem">${esc(nomeUsuario()[0]?.toUpperCase() || '?')}</span><span><b>${esc(nomeUsuario())}</b><small>${esc(S.user?.email || '')}</small></span></div><button class="btn" data-a="perfil">${ic('usuario', 15)} Editar perfil e senha</button></div>
    </div>
    <div class="sec-tit"><span>Personalização</span></div>
    <div class="card p0 mb">
      <div class="ajuste" style="border-bottom:none;padding-bottom:0"><div class="tx"><b>Tema</b><small>Visual do McDuck — suas preferências ficam salvas na sua conta</small></div></div>
      <div class="temas" style="border-bottom:1px solid var(--borda)">${Object.entries(TEMAS).map(([k, t]) => `<button class="tema-op ${S.tema === k ? 'on' : ''}" data-a="setTema" data-v="${k}"><span class="prev" style="background:${t.prev[0]}"><i style="height:30px;background:${t.prev[1]}"></i><i style="height:48px;background:${t.prev[2]}"></i><i style="height:22px;background:${t.prev[3]}"></i><i style="height:38px;background:${t.prev[1]}"></i></span><span class="nm">${t.nome}<small style="color:var(--sub)">${t.desc}</small></span></button>`).join('')}</div>
      <div class="ajuste" style="border-bottom:none;padding-bottom:0"><div class="tx"><b>Estilo dos ícones</b><small>Como aparecem os ícones de categorias, contas, metas e bens</small></div></div>
      <div class="estilos-ico" style="border-bottom:1px solid var(--borda)">${Object.entries(ESTILOS_ICONE).map(([k, [n, d]]) => `<button class="estilo-op ico-prev-${k} ${S.estiloIcone === k ? 'on' : ''}" data-a="setEstiloIcone" data-v="${k}"><span class="amostra">${[['home', '🏠', '#8b5cf6'], ['school', '📚', '#3b82f6'], ['heartbeat', '💊', '#ef4444'], ['bolt', '💡', '#ca8a04'], ['tools-kitchen-2', '🍽️', '#f97316']].map(([i, e, c]) => `<span class="tile sm" style="--c:${c};background:${c}">${k === 'emoji' ? e : `<i class="ti ti-${i}" aria-hidden="true"></i>`}</span>`).join('')}</span><span class="nm">${n}<small>${d}</small></span></button>`).join('')}</div>
      <div class="ajuste"><div class="tx"><b>Cores dos gráficos</b><small>Receitas, despesas e resultado nos relatórios e na tela inicial</small></div>
        <div class="cores-graf">${[['rec', 'Receitas'], ['desp', 'Despesas'], ['res', 'Resultado']].map(([k, n]) => `<div class="rel"><button class="cg-btn" data-a="cgAbrir" data-k="${k}"><i style="background:${PAL[k]}"></i>${n}</button>
          <div class="popover pop-matriz hidden" id="pm-${k}"><b>${n}</b><div class="matriz">${MATRIZ_CORES.flat().map(cor => `<button style="background:${cor}" class="${PAL[k] === cor ? 'on' : ''}" data-a="cgCor" data-k="${k}" data-v="${cor}" title="${cor}"></button>`).join('')}</div>
          <label class="cg-livre">Outra cor <input type="color" value="${PAL[k]}" data-c="cgLivre" data-k="${k}"></label></div></div>`).join('')}
          ${S.coresGraf ? '<button class="lnk" data-a="cgPadrao">Restaurar</button>' : ''}</div></div>
      <div class="ajuste"><div class="tx"><b>Cor de destaque</b><small>Botões, gráficos e realces — ou escolha qualquer cor no “+”</small></div><div class="acentos">${[...new Set(ACENTOS)].map(c => `<button class="${S.acento === c ? 'on' : ''}" style="background:${c}" data-a="setAcento" data-v="${c}" title="${c}"></button>`).join('')}<label title="Escolher qualquer cor" style="margin:0;display:inline-flex;align-items:center;gap:.3rem;font-size:.75rem;cursor:pointer">${ic('mais', 14)}<input type="color" value="${S.acento}" data-c="acentoLivre" style="width:34px;height:28px;padding:1px;border-radius:7px"></label></div></div>
      <div class="ajuste"><div class="tx"><b>Tela inicial</b><small>Qual página abre primeiro</small></div><select class="pill-sel" data-c="setInicial">${iniciais.map(r => `<option value="${r}" ${S.inicial === r ? 'selected' : ''}>${ROTAS[r][0]}</option>`).join('')}</select></div>
      <div class="ajuste"><div class="tx"><b>Ocultar valores</b><small>Esconde os valores na tela (bom em público)</small></div><label class="switch"><input type="checkbox" data-c="setOcultar" ${S.ocultar ? 'checked' : ''}><span></span></label></div>
    </div>
    ${blocoIcones()}
    <div class="sec-tit"><span>Pessoal e Empresa</span></div>
    <div class="card p0 mb">
      <div class="ajuste"><div class="tx"><b>Contas da empresa</b><small>${empresas.length ? `${empresas.map(c => esc(c.nome)).join(', ')} · alterne em Tudo, Pessoal ou Empresa no topo` : 'Marque contas como “Empresa” para separar o dinheiro do negócio do dinheiro de casa.'}</small></div><button class="btn" data-a="ir" data-r="contas">Gerenciar contas</button></div>
    </div>
    <div class="sec-tit"><span>Aplicativo</span></div>
    <div class="card p0 mb">
      <div class="ajuste"><div class="tx"><b>Instalar no celular / computador</b><small>Abre como um app, com ícone na tela inicial. No iPhone: Safari › Compartilhar › “Adicionar à Tela de Início”.</small></div><button class="btn" data-a="instalar">${ic('download', 15)} Instalar</button></div>
      <div class="ajuste"><div class="tx"><b>Backup completo</b><small>Todos os seus dados em um arquivo JSON</small></div><button class="btn" data-a="backup">${ic('download', 15)} Baixar</button></div>
      <div class="ajuste"><div class="tx"><b>Exportar transações</b><small>Planilha CSV (abre no Excel)</small></div><button class="btn" data-a="txCSVTudo">${ic('download', 15)} CSV</button></div>
      <div class="ajuste"><div class="tx"><b>Importar extrato</b><small>OFX ou CSV do banco</small></div><button class="btn" data-a="ir" data-r="importar">${ic('importar', 15)} Importar</button></div>
      <div class="ajuste"><div class="tx"><b>Sair</b><small>Encerra a sessão neste aparelho</small></div><button class="btn perigo" data-a="sair">${ic('sair', 15)} Sair</button></div>
    </div>`;
}
A.setEstiloIcone = el => { S.estiloIcone = el.dataset.v; salvarPrefs(); render(); };
A.cgAbrir = el => { const p = $('#pm-' + el.dataset.k), aberto = !p.classList.contains('hidden'); $$('.pop-matriz').forEach(x => x.classList.add('hidden')); if (!aberto) p.classList.remove('hidden'); };
function definirCorGraf(k, v) { S.coresGraf = { ...(S.coresGraf || {}), [k]: v }; aplicarPaleta(); salvarPrefs(); render(); }
A.cgCor = el => definirCorGraf(el.dataset.k, el.dataset.v);
C.cgLivre = el => definirCorGraf(el.dataset.k, el.value);
A.cgPadrao = () => { S.coresGraf = null; aplicarPaleta(); salvarPrefs(); render(); };
A.setTema = el => { S.tema = el.dataset.v; S.acento = TEMAS[S.tema].acento; salvarPrefs(); render(); };
A.setAcento = el => { S.acento = el.dataset.v; salvarPrefs(); render(); };
C.acentoLivre = el => { S.acento = el.value; salvarPrefs(); render(); };
C.setInicial = el => { S.inicial = el.value; salvarPrefs(); toast('Tela inicial salva.'); };
C.setOcultar = el => { S.ocultar = el.checked; ls.set('ocultar', S.ocultar); render(); };
A.instalar = async () => {
  if (_instalar) { _instalar.prompt(); await _instalar.userChoice; _instalar = null; return; }
  if (matchMedia('(display-mode: standalone)').matches) return toast('O app já está instalado.');
  toast('No celular: menu do navegador › “Instalar app” ou “Adicionar à tela inicial”.');
};

/* =====================================================================
   ORÇAMENTOS + REGRA 50/30/20
   ===================================================================== */
const G503 = { necessidade: ['Necessidades', 50, '#3b82f6', 'Moradia, mercado, contas, saúde, transporte'], desejo: ['Desejos', 30, '#f59e0b', 'Lazer, restaurantes, compras, assinaturas'], poupanca: ['Poupança e investimentos', 20, '#22c55e', 'O que sobra + aportes e dívidas'] };
function sugerirGrupo(nome) {
  const n = norm(nome);
  if (/(mercado|aluguel|apart|morad|condom|energia|luz|agua|gas|internet|telef|saude|farm|medic|plano|transp|combust|uber|onibus|educa|escola|faculd|imposto|taxa|seguro|manuten|dizim)/.test(n)) return 'necessidade';
  if (/(invest|poupan|reserva|aplica|divida|emprest|financ)/.test(n)) return 'poupanca';
  return 'desejo';
}
function regra503020Html() {
  const ym = S.mes, lista = txPeriodo(ym + '-01', fimMes(ym)), r = resumo(lista);
  const desp = lista.filter(t => t.tipo === 'despesa');
  const tot = { necessidade: 0, desejo: 0, poupanca: 0 }; let semGrupo = 0;
  desp.forEach(t => { const g = S.mCat.get(t.categoria_id)?.grupo503020; if (g && tot[g] != null) tot[g] += +t.valor; else { tot.desejo += +t.valor; semGrupo++; } });
  tot.poupanca += Math.max(0, r.res);
  const base = r.rec || soma(Object.values(tot));
  const naoClass = S.categorias.filter(c => c.tipo === 'despesa' && !c.grupo503020);
  return `<div class="sec-h"><h2>Regra 50/30/20</h2><button class="btn mini" data-a="classif503">${ic('categorias', 13)} Classificar categorias${naoClass.length ? ` (${naoClass.length} sem grupo)` : ''}</button></div>
    <p class="sub" style="margin-top:-.4rem;font-size:.85rem">Da renda do mês (${fmt(r.rec)}): o ideal é até 50% para necessidades, 30% para desejos e pelo menos 20% guardado.</p>
    <div class="r503020 mb">${Object.entries(G503).map(([k, [nome, ideal, cor, ex]]) => {
      const v = tot[k], p = base ? v / base : 0, ok = k === 'poupanca' ? p * 100 >= ideal : p * 100 <= ideal;
      return `<div class="card"><div class="lbl-k">${nome}</div><div style="display:flex;align-items:baseline;gap:.5rem"><span class="pp" style="color:${cor}">${Math.round(p * 100)}%</span><small>ideal ${k === 'poupanca' ? '≥' : '≤'} ${ideal}%</small><span class="badge ${ok ? 'ok' : 'av'}" style="margin-left:auto">${ok ? 'Dentro' : k === 'poupanca' ? 'Abaixo' : 'Acima'}</span></div>
        <div class="alvo-barra"><div style="width:${Math.min(100, p * 100)}%;background:${cor}"></div><i style="left:${ideal}%"></i></div>
        <small>${fmt(v)} · ideal ${fmt(base * ideal / 100)}</small><div class="nota" style="font-size:.72rem">${ex}</div></div>`;
    }).join('')}</div>${semGrupo ? `<p class="nota">${semGrupo} gasto(s) em categorias sem grupo foram contados como “Desejos”.</p>` : ''}`;
}
function pgOrcamentos2(el) { pgOrcamentos(el); el.insertAdjacentHTML('beforeend', regra503020Html()); }
A.classif503 = () => {
  const cats = S.categorias.filter(c => c.tipo === 'despesa');
  modal({
    titulo: 'Classificar categorias (50/30/20)', largura: 'min(620px,94vw)',
    corpo: `<p class="sub" style="margin-top:0;font-size:.85rem">Categorias sem grupo vêm com uma sugestão automática. Ajuste e salve.</p>
      ${cats.map(c => `<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.45rem">${tile(c.icone, c.cor, 'sm')}<span style="flex:1">${esc(c.nome)}</span><select name="g_${c.id}" style="width:auto">${Object.entries(G503).map(([k, v]) => `<option value="${k}" ${(c.grupo503020 || sugerirGrupo(c.nome)) === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>`).join('')}`,
    onSubmit: async f => {
      const mud = cats.filter(c => f.elements['g_' + c.id].value !== c.grupo503020);
      const porG = {}; mud.forEach(c => (porG[f.elements['g_' + c.id].value] ||= []).push(c.id));
      for (const [g, ids] of Object.entries(porG)) await updIn('categorias', ids, { grupo503020: g });
      toast('Categorias classificadas!'); await recarregar();
    }
  });
};

/* =====================================================================
   RECORRENTES + ASSINATURAS DETECTADAS
   ===================================================================== */
function assinaturasDetectadas() {
  const h = hoje(), ym = h.slice(0, 7), meses = [1, 2, 3].map(k => somaMeses(ym + '-01', -k).slice(0, 7)).concat([ym]);
  const g = new Map();
  S.tx.forEach(t => {
    if (t.tipo === 'transferencia' || !meses.includes(t.data.slice(0, 7)) || /\(\d+\/\d+\)/.test(t.descricao)) return;
    const k = limpaDesc(t.descricao); if (k.length < 3) return;
    if (!g.has(k)) g.set(k, { ms: new Set(), ult: t, vals: [] });
    const x = g.get(k); x.ms.add(t.data.slice(0, 7)); x.vals.push(+t.valor); if (t.data > x.ult.data) x.ult = t;
  });
  const jaRec = new Set(S.recorrentes.map(r => limpaDesc(r.descricao)));
  return [...g].filter(([k, x]) => x.ms.size >= 3 && x.vals.length <= x.ms.size + 1 && !jaRec.has(k) && Math.max(...x.vals) <= Math.min(...x.vals) * 1.6)
    .map(([k, x]) => x.ult).sort((a, b) => b.valor - a.valor).slice(0, 12);
}
function pgRecorrentes2(el) {
  pgRecorrentes(el);
  const sug = assinaturasDetectadas(); if (!sug.length) return;
  el.insertAdjacentHTML('beforeend', `<div class="sec-h"><h2>${ic('lampada', 17)} Recorrências detectadas</h2><small>aparecem em 3+ meses seguidos</small></div>
    <div class="card p0">${sug.map(t => { const c = S.mCat.get(t.categoria_id); return `<div class="linha-cat">${c ? tile(c.icone, c.cor, 'sm') : tile('🔁', '#3f3f4a', 'sm')}<div class="nm">${esc(t.descricao)}<div><small>${esc(S.mC.get(t.conta_id)?.nome || '')} · último em ${dataBR(t.data)}</small></div></div><span class="vl ${t.tipo === 'receita' ? 'pos' : 'neg'}">${fmt(t.valor)}</span><button class="btn mini" data-a="txParaRec" data-id="${t.id}">${ic('mais', 13)} Criar recorrência</button></div>`; }).join('')}</div>`);
}
ROTAS.orcamentos[1] = 'pgOrcamentos2';
ROTAS.recorrentes[1] = 'pgRecorrentes2';

/* =====================================================================
   ÍCONES PERSONALIZADOS (enviados pelo usuário)
   ===================================================================== */
const SLOTS_ICONE = {
  logo: ['Logo (menu e topo)', 'Aparece no canto do sistema'],
  app: ['Ícone do app', 'Ícone na tela inicial do celular e na aba do navegador'],
  login: ['Tela de login', 'Imagem grande ao entrar'],
  carregando: ['Carregando', 'Enquanto os dados são buscados'],
  azul: ['Mês no azul', 'Economia acima de 20%'],
  ok: ['Mês equilibrado', 'Economia entre 0% e 20%'],
  vermelho: ['Mês no vermelho', 'Gastou mais do que entrou'],
  meta: ['Comemoração', 'Receita lançada e meta concluída'],
  vazio: ['Tela vazia', 'Quando não há dados para mostrar']
};
const ORDEM_PADRAO = { logo: 0, app: 2, login: 7, carregando: 3, azul: 1, ok: 0, vermelho: 8, meta: 5, vazio: 6 };
function icone(slot) {
  const ic = S.icones; if (!ic || !ic.lista?.length) return null;
  let i = ic.slots?.[slot]; if (i === undefined) i = ORDEM_PADRAO[slot] ?? 0;
  if (i === -1 || i === null) return null;
  return ic.lista[Math.min(i, ic.lista.length - 1)] || null;
}
const logoSrc = () => icone('logo') || 'logo.svg';
function humorDoMes(p) { if (p == null) return icone('ok'); return p >= .2 ? icone('azul') : p >= 0 ? icone('ok') : icone('vermelho'); }
function aplicarIcones() {
  const lg = logoSrc(), app = icone('app') || 'icone-192.png';
  $$('img.logo-img').forEach(i => { if (i.getAttribute('src') !== lg) i.src = lg; i.classList.toggle('personalizado', lg !== 'logo.svg'); });
  const fav = document.querySelector('link[rel=icon]'); if (fav) fav.href = icone('app') || 'logo.svg';
  const ap = document.querySelector('link[rel=apple-touch-icon]'); if (ap) ap.href = app;
  const lgn = $('#login-masc'); if (lgn) { const v = icone('login'); lgn.innerHTML = v ? `<img src="${v}" alt="">` : ''; }
  if (icone('app')) {
    const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    const m = { name: 'McDuck', short_name: 'McDuck', start_url: base, scope: base, display: 'standalone', background_color: '#08140c', theme_color: '#08140c', icons: [{ src: icone('app'), sizes: '256x256', type: icone('app').slice(5, icone('app').indexOf(';')) }] };
    const l = document.querySelector('link[rel=manifest]'); if (l && !l.dataset.dinamico) { l.href = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' })); l.dataset.dinamico = '1'; }
  }
}
async function carregarIcones() {
  try {
    const { data, error } = await sb.from('ajustes').select('*');
    if (!error && data && data[0] && data[0].icones?.lista) { S.icones = data[0].icones; ls.set('icones', S.icones); }
  } catch { }
}
async function salvarIcones() {
  ls.set('icones', S.icones);
  const { error } = await sb.from('ajustes').upsert({ user_id: S.user.id, icones: S.icones || {}, atualizado_em: new Date().toISOString() });
  if (error) toast(/does not exist|schema cache|Could not find/i.test(error.message) ? 'Rode o atualizar-banco.sql no Supabase para salvar os ícones na conta (por enquanto ficaram só neste aparelho).' : msgErro(error), true);
}
// recorte automático de uma grade de ícones
const carregarImg = file => new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = URL.createObjectURL(file); });
function detectarGrade(img) {
  const W = img.naturalWidth, H = img.naturalHeight, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0); const d = cx.getImageData(0, 0, W, H).data;
  const px = (x, y) => { const k = (y * W + x) * 4; return [d[k], d[k + 1], d[k + 2]]; };
  const amostras = [px(1, H - 2), px(W - 2, H - 2), px(1, Math.floor(H / 2)), px(W - 2, Math.floor(H / 2))];
  const fundo = [0, 1, 2].map(c => Math.round(soma(amostras, a => a[c]) / amostras.length));
  const col = new Array(W).fill(0), lin = new Array(H).fill(0);
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const k = (y * W + x) * 4; if (Math.abs(d[k] - fundo[0]) + Math.abs(d[k + 1] - fundo[1]) + Math.abs(d[k + 2] - fundo[2]) > 70) { col[x]++; lin[y]++; }
  }
  const faixas = (arr, tam, outro) => { const r = []; let ini = -1; for (let i = 0; i <= tam; i++) { const on = i < tam && arr[i] > outro * 0.06 / 2; if (on && ini < 0) ini = i; if (!on && ini >= 0) { if (i - ini > tam * 0.08) r.push([ini, i]); ini = -1; } } return r; };
  const cs = faixas(col, W, H), rs = faixas(lin, H, W);
  if (cs.length < 1 || rs.length < 1 || cs.length * rs.length > 36) return null;
  const caixas = []; rs.forEach(([y0, y1]) => cs.forEach(([x0, x1]) => caixas.push([x0, y0, x1 - x0, y1 - y0])));
  return caixas;
}
function gradeIgual(img, n) { const w = img.naturalWidth / n, h = img.naturalHeight / n, c = []; for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) c.push([k * w, r * h, w, h]); return c; }
function recortar(img, [x, y, w, h]) {
  const T = 256, cv = document.createElement('canvas'); cv.width = T; cv.height = T;
  const cx = cv.getContext('2d'), s = Math.min(T / w, T / h);
  cx.drawImage(img, x, y, w, h, (T - w * s) / 2, (T - h * s) / 2, w * s, h * s);
  const webp = cv.toDataURL('image/webp', 0.86);
  return webp.startsWith('data:image/webp') ? webp : cv.toDataURL('image/png');
}
C.icUpload = async el => {
  const files = [...el.files]; if (!files.length) return;
  const modo = $('#ic-modo')?.value || 'auto', novos = [];
  for (const f of files) {
    const img = await carregarImg(f);
    let caixas = modo === '1' ? [[0, 0, img.naturalWidth, img.naturalHeight]] : modo === 'auto' ? detectarGrade(img) : gradeIgual(img, +modo);
    if (!caixas) caixas = gradeIgual(img, 3);
    caixas.forEach(c => novos.push(recortar(img, c)));
  }
  const lista = [...(S.icones?.lista || []), ...novos].slice(0, 24);
  S.icones = { lista, slots: S.icones?.slots || {} };
  await salvarIcones(); toast(`${novos.length} ícone(s) adicionado(s)!`); render();
};
C.icSlot = async el => { S.icones.slots = { ...(S.icones.slots || {}), [el.dataset.slot]: el.value === '' ? undefined : +el.value }; if (el.value === '-1') S.icones.slots[el.dataset.slot] = -1; await salvarIcones(); render(); };
A.icDel = async el => {
  const i = +el.dataset.i; if (!confirm(`Remover o ícone ${i + 1}?`)) return;
  S.icones.lista.splice(i, 1);
  const sl = S.icones.slots || {}; Object.keys(sl).forEach(k => { if (sl[k] === i) delete sl[k]; else if (sl[k] > i) sl[k]--; });
  await salvarIcones(); render();
};
A.icLimpar = async () => { if (!confirm('Remover todos os ícones personalizados e voltar à moeda padrão?')) return; S.icones = { lista: [], slots: {} }; await salvarIcones(); render(); };
function blocoIcones() {
  const lista = S.icones?.lista || [];
  return `<div class="sec-tit"><span>Ícones do McDuck</span></div>
  <div class="card p0 mb">
    <div class="ajuste"><div class="tx"><b>Enviar ícones</b><small>Envie uma imagem com vários ícones em grade (o sistema recorta sozinho) ou imagens avulsas. Ficam salvos na sua conta.</small></div>
      <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap"><select id="ic-modo" class="pill-sel"><option value="auto">Grade: detectar</option><option value="3">Grade 3×3</option><option value="2">Grade 2×2</option><option value="4">Grade 4×4</option><option value="1">Imagem única</option></select>
      <label class="btn pri" style="margin:0;cursor:pointer">${ic('importar', 15)} Escolher imagem<input type="file" accept="image/*" multiple data-c="icUpload" style="display:none"></label></div></div>
    ${lista.length ? `<div class="ic-galeria">${lista.map((s, i) => `<div class="ic-item"><img src="${s}" alt="Ícone ${i + 1}"><span>${i + 1}</span><button class="icobtn perigo" data-a="icDel" data-i="${i}" title="Remover">${ic('x', 13)}</button></div>`).join('')}</div>
    ${Object.entries(SLOTS_ICONE).map(([k, [n, d]]) => { let v = S.icones.slots?.[k]; if (v === undefined) v = Math.min(ORDEM_PADRAO[k], lista.length - 1); const src = icone(k);
      return `<div class="ajuste"><div class="tx" style="display:flex;align-items:center;gap:.8rem">${src ? `<img src="${src}" class="ic-prev" alt="">` : `<span class="ic-prev vazio-ic">—</span>`}<span><b>${n}</b><small>${d}</small></span></div>
        <select class="pill-sel" data-c="icSlot" data-slot="${k}"><option value="-1" ${v === -1 ? 'selected' : ''}>${k === 'logo' || k === 'app' ? 'Moeda padrão' : 'Não mostrar'}</option>${lista.map((_, i) => `<option value="${i}" ${v === i ? 'selected' : ''}>Ícone ${i + 1}</option>`).join('')}</select></div>`; }).join('')}
    <div class="ajuste"><div class="tx"><b>Voltar ao padrão</b><small>Remove todos os ícones enviados</small></div><button class="btn perigo" data-a="icLimpar">${ic('lixo', 15)} Remover todos</button></div>` : ''}
  </div>`;
}
