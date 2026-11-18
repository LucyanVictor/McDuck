'use strict';
/* =====================================================================
   PÁGINAS: Relatórios, Patrimônio, Orçamentos, Metas, Recorrentes,
            Categorias, Pessoas, Grupos, Regras, Busca e Perfil
   ===================================================================== */

/* =====================================================================
   RELATÓRIOS
   ===================================================================== */
S.rel = { aba: 'pl', per: '1A', ini: '', fim: '', comp: 'pl' };
function periodoRel() {
  const h = hoje(), ym = h.slice(0, 7), r = S.rel;
  switch (r.per) {
    case 'mes': return [ym + '-01', fimMes(ym)];
    case 'ant': { const a = somaMeses(ym + '-01', -1).slice(0, 7); return [a + '-01', fimMes(a)]; }
    case '6M': return [somaMeses(ym + '-01', -5), fimMes(ym)];
    case 'YTD': return [h.slice(0, 4) + '-01-01', fimMes(ym)];
    case '2A': return [somaMeses(ym + '-01', -24), fimMes(ym)];
    case 'custom': return [r.ini || somaMeses(ym + '-01', -11), r.fim || fimMes(ym)];
    default: return [somaMeses(ym + '-01', -12), fimMes(ym)];
  }
}
function mesesEntre(ini, fim) { const out = []; let m = ini.slice(0, 7); while (m <= fim.slice(0, 7) && out.length < 240) { out.push(m); m = somaMeses(m + '-01', 1).slice(0, 7); } return out; }
const topN = (arr, n, nomeOutros = 'Outros') => { const s = [...arr].sort((a, b) => b.valor - a.valor); if (s.length <= n) return s; const r = s.slice(0, n); r.push({ nome: nomeOutros, valor: soma(s.slice(n), x => x.valor), cor: '#64748b' }); return r; };
function porCategoria(lista, tipo) {
  const m = new Map(); lista.filter(t => t.tipo === tipo).forEach(t => m.set(t.categoria_id || '', (m.get(t.categoria_id || '') || 0) + +t.valor));
  return [...m].map(([id, valor]) => { const c = S.mCat.get(id); return { id, nome: c?.nome || 'Sem categoria', cor: c?.cor || '#64748b', icone: c?.icone || '?', valor }; });
}

function pgRelatorios(el) {
  const [ini, fim] = periodoRel(), meses = mesesEntre(ini, fim), labels = meses.map(mesCurto), r = S.rel, h = hoje();
  const pers = [['mes', 'Este mês'], ['ant', 'Mês passado'], ['6M', '6M'], ['YTD', 'YTD'], ['1A', '1A'], ['2A', '2A'], ['custom', 'Personalizado']];
  let topo = cab('Patrimônio e fluxo', 'Análises', r.aba === 'cmp' ? '' : `<div class="seg">${pers.map(([v, n]) => `<button class="${r.per === v ? 'on' : ''}" data-a="relPer" data-v="${v}">${n}</button>`).join('')}</div>
    ${r.per === 'custom' ? `<input type="date" value="${ini}" data-c="relIni" style="width:auto"><input type="date" value="${fim}" data-c="relFim" style="width:auto">` : ''}`);
  topo += `<div class="abas-sub">${[['pl', 'Patrimônio Líquido'], ['rd', 'Receitas vs Despesas'], ['cat', 'Categorias'], ['cmp', 'Comparar períodos'], ['fc', 'Fluxo de Caixa'], ['mapa', 'Mapa do Dinheiro']].map(([v, n]) => `<button class="${r.aba === v ? 'on' : ''}" data-a="relAba" data-v="${v}">${n}</button>`).join('')}</div>`;
  let c = '';

  if (r.aba === 'pl') {
    const pts = meses.map(m => patrimonioEm(fimMes(m) < h ? fimMes(m) : h));
    const at = pts.at(-1), pr = pts[0], dv = at.liquido - pr.liquido, dp = pr.liquido ? dv / Math.abs(pr.liquido) : null;
    const sal = saldosEm(h), ids = idsVis();
    let itens;
    if (r.comp === 'pl') itens = [{ nome: 'Contas', valor: at.contas, cor: '#6366f1' }, { nome: 'Ativos', valor: at.ativos, cor: '#f59e0b' }, { nome: 'Passivos', valor: at.passivos, cor: '#f43f5e' }];
    else if (r.comp === 'ativos') itens = [...S.contas.filter(x => ids.has(x.id) && (sal.get(x.id) || 0) > 0).map(x => ({ nome: x.nome, valor: sal.get(x.id), cor: x.cor })),
    ...S.patrimonio.filter(p => p.natureza === 'ativo').map((p, i) => ({ nome: p.nome, valor: valorItem(p.id, h), cor: ['#14b8a6', '#84cc16', '#f59e0b', '#ec4899', '#0ea5e9'][i % 5] }))];
    else itens = [...S.contas.filter(x => ids.has(x.id) && (sal.get(x.id) || 0) < 0).map(x => ({ nome: x.nome, valor: -sal.get(x.id), cor: x.cor })),
    ...S.patrimonio.filter(p => p.natureza === 'passivo').map(p => ({ nome: p.nome, valor: valorItem(p.id, h), cor: '#f43f5e' }))];
    itens = topN(itens.filter(i => i.valor > 0), 7);
    c = `<div class="card mb"><div class="graf-cab" style="margin:0"><div><div class="lbl-k">PATRIMÔNIO LÍQUIDO</div>
        <div style="display:flex;align-items:baseline;gap:.6rem"><span class="val-g" style="margin:0">${fmt(at.liquido)}</span>${dp != null ? `<b class="${cls(dv)}">${dv >= 0 ? '+' : ''}${pct(dp)}</b>` : ''}</div>
        <small>${fmtS(dv)} vs início do período</small></div>
        <div class="kpis" style="border:none;margin:0;padding:0;grid-template-columns:repeat(3,auto);gap:1.4rem">
          <div style="border:none;padding:0"><div class="lbl-k">● Contas</div><div class="val-m">${fmt(at.contas)}</div></div>
          <div style="border:none;padding:0"><div class="lbl-k" style="color:#f59e0b">● Ativos</div><div class="val-m">${fmt(at.ativos)}</div></div>
          <div style="border:none;padding:0"><div class="lbl-k" style="color:var(--verm)">● Passivos</div><div class="val-m">${fmt(at.passivos)}</div></div></div></div></div>
      <div class="card mb"><h2 style="margin-bottom:.8rem">Patrimônio líquido ao longo do tempo</h2>
        ${grafLinhas({ labels, series: [{ nome: 'Patrimônio líquido', cor: '#7b7ff6', valores: pts.map(p => p.liquido), area: true }], h: 300  })}</div>
      <div class="g" style="grid-template-columns:minmax(0,1fr) minmax(0,2fr)">
        <div class="card"><div class="graf-cab"><h2>Composição</h2><div class="seg">${[['pl', 'Patrimônio'], ['ativos', 'Ativos e contas'], ['passivos', 'Passivos']].map(([v, n]) => `<button class="${r.comp === v ? 'on' : ''}" data-a="relComp" data-v="${v}">${n}</button>`).join('')}</div></div>
          ${itens.length ? grafDonut({ itens, titulo: r.comp === 'passivos' ? 'Passivos' : r.comp === 'ativos' ? 'Ativos e contas' : 'Patrimônio líquido', valor: r.comp === 'pl' ? fmtK(at.liquido) : fmtK(soma(itens, i => i.valor)) }) : vazio('Nada para mostrar.')}</div>
        <div class="card"><h2 style="margin-bottom:.8rem">Evolução</h2>
          ${grafBarras({ labels, empilhado: true, series: [{ nome: 'Contas', cor: '#6366f1', valores: pts.map(p => p.contas) }, { nome: 'Ativos', cor: '#f59e0b', valores: pts.map(p => p.ativos) }, { nome: 'Passivos', cor: '#f43f5e', valores: pts.map(p => -p.passivos) }], linha: { nome: 'Patrimônio líquido', cor: '#22c55e', valores: pts.map(p => p.liquido), tracejada: true } })}
          ${legenda([['Patrimônio líquido', '#22c55e'], ['Contas', '#6366f1'], ['Ativos', '#f59e0b'], ['Passivos', '#f43f5e']])}</div></div>`;
  }

  if (r.aba === 'rd') {
    const rs = meses.map(m => resumo(txPeriodo(m + '-01', fimMes(m))));
    const tot = resumo(txPeriodo(ini, fim)), taxa = tot.rec ? tot.res / tot.rec : null;
    const lista = txPeriodo(ini, fim);
    const bloco = (tipo, titulo) => {
      const itens = porCategoria(lista, tipo).sort((a, b) => b.valor - a.valor), t = soma(itens, i => i.valor);
      return `<div class="card p0"><div class="card-cab"><h2>${titulo}</h2><b>${fmt(t)}</b></div><div class="rolagem">${itens.map(i => `<div class="linha-cat" style="cursor:pointer" data-a="relCat" data-id="${i.id}" data-tipo="${tipo}" data-ini="${ini}" data-fim="${fim}">${tile(i.icone, i.cor, 'sm')}<div class="nm">${esc(i.nome)}<div class="barra" style="margin-top:.35rem"><div style="width:${t ? i.valor / t * 100 : 0}%;background:${esc(i.cor)}"></div></div></div><span class="vl">${fmt(i.valor)}</span><small style="width:44px;text-align:right">${t ? pct(i.valor / t) : ''}</small></div>`).join('') || vazio('Sem dados.')}</div></div>`;
    };
    c = `<div class="card mb"><div class="kpis" style="border:none;margin:0;padding:0">
        <div><div class="lbl-k">Receitas</div><div class="val-m pos">${fmt(tot.rec)}</div></div><div><div class="lbl-k">Despesas</div><div class="val-m neg">${fmt(tot.desp)}</div></div>
        <div><div class="lbl-k">Resultado</div><div class="val-m ${cls(tot.res)}">${fmtS(tot.res)}</div></div><div><div class="lbl-k">Taxa de economia · média de gastos/mês</div><div class="val-m">${taxa == null ? '—' : pct(taxa)} · ${fmt(tot.desp / Math.max(1, meses.length))}</div></div></div></div>
      <div class="card mb"><h2 style="margin-bottom:.8rem">Receitas vs despesas por mês</h2>
        ${grafBarras({ labels, series: [{ nome: 'Receitas', cor: '#22c55e', valores: rs.map(x => x.rec) }, { nome: 'Despesas', cor: '#f43f5e', valores: rs.map(x => x.desp) }], linha: { nome: 'Resultado', cor: '#7b7ff6', valores: rs.map(x => x.res) } , h: 300 })}
        ${legenda([['Receitas', '#22c55e'], ['Despesas', '#f43f5e'], ['Resultado', '#7b7ff6']])}</div>
      <div class="g mb" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
        <div class="card"><div class="graf-cab"><h2>Despesas por categoria</h2><small>clique numa fatia</small></div>${grafPizza({ itens: topN(porCategoria(lista, 'despesa'), 8, 'Demais categorias'), tipo: 'despesa', ini, fim })}</div>
        <div class="card"><div class="graf-cab"><h2>Receitas por categoria</h2><small>clique numa fatia</small></div>${grafPizza({ itens: topN(porCategoria(lista, 'receita'), 8, 'Demais categorias'), tipo: 'receita', ini, fim })}</div></div>
      <div class="g mb" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">${bloco('despesa', 'Despesas por categoria')}${bloco('receita', 'Receitas por categoria')}</div>
      <div class="card p0"><div class="tabela-wrap"><table><thead><tr><th>Mês</th><th class="num">Receitas</th><th class="num">Despesas</th><th class="num">Resultado</th><th class="num">Economia</th></tr></thead>
        <tbody>${meses.map((m, i) => ({ m, x: rs[i] })).reverse().map(({ m, x }) => `<tr><td>${nomeMes(m)}</td><td class="num pos">${fmt(x.rec)}</td><td class="num neg">${fmt(x.desp)}</td><td class="num vl ${cls(x.res)}">${fmtS(x.res)}</td><td class="num">${x.rec ? pct(x.res / x.rec) : '—'}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  if (r.aba === 'cat') c = abaCategorias(ini, fim, meses, labels);
  if (r.aba === 'cmp') c = abaComparar();

  if (r.aba === 'fc') {
    const rs = meses.map(m => resumo(txPeriodo(m + '-01', fimMes(m))).res);
    let ac = 0; const acum = rs.map(v => ac += v);
    const sal = meses.map(m => { const s = saldosEm(fimMes(m) < h ? fimMes(m) : h), ids = idsVis(); return soma(contasGrupo().filter(c => TIPOS_CONTA[c.tipo]?.disp), c => ids.has(c.id) ? s.get(c.id) : 0); });
    c = `<div class="card mb"><div class="kpis" style="border:none;margin:0;padding:0">
        <div><div class="lbl-k">Fluxo líquido do período</div><div class="val-m ${cls(ac)}">${fmtS(ac)}</div></div>
        <div><div class="lbl-k">Melhor mês</div><div class="val-m pos">${rs.length ? fmtS(Math.max(...rs)) : '—'}</div></div>
        <div><div class="lbl-k">Pior mês</div><div class="val-m ${rs.length && Math.min(...rs) < 0 ? 'neg' : ''}">${rs.length ? fmtS(Math.min(...rs)) : '—'}</div></div>
        <div><div class="lbl-k">Meses positivos</div><div class="val-m">${rs.filter(v => v > 0).length} de ${rs.length}</div></div></div></div>
      <div class="card mb"><h2 style="margin-bottom:.8rem">Resultado mensal e acumulado</h2>
        ${grafBarras({ labels, series: [{ nome: 'Resultado do mês', valores: rs, cores: rs.map(v => v >= 0 ? '#22c55e' : '#f43f5e') }], linha: { nome: 'Acumulado', cor: '#7b7ff6', valores: acum } , h: 300 })}
        ${legenda([['Resultado positivo', '#22c55e'], ['Resultado negativo', '#f43f5e'], ['Acumulado no período', '#7b7ff6']])}</div>
      <div class="card mb"><h2 style="margin-bottom:.8rem">Saldo disponível no fim de cada mês</h2>${grafLinhas({ labels, series: [{ nome: 'Saldo disponível', cor: '#0ea5e9', valores: sal, area: true }], h: 260  })}</div>
      <div class="card p0"><div class="tabela-wrap"><table><thead><tr><th>Mês</th><th class="num">Resultado</th><th class="num">Acumulado</th><th class="num">Saldo disponível</th></tr></thead>
        <tbody>${meses.map((m, i) => i).reverse().map(i => `<tr><td>${nomeMes(meses[i])}</td><td class="num vl ${cls(rs[i])}">${fmtS(rs[i])}</td><td class="num ${cls(acum[i])}">${fmtS(acum[i])}</td><td class="num">${fmt(sal[i])}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  if (r.aba === 'mapa') {
    const lista = txPeriodo(ini, fim), tr = resumo(lista);
    const esq = topN(porCategoria(lista, 'receita'), 7, 'Outras receitas');
    const dir = topN(porCategoria(lista, 'despesa'), 9, 'Outras despesas');
    if (tr.rec > tr.desp) dir.push({ nome: 'Economia', valor: tr.rec - tr.desp, cor: '#22c55e' });
    else if (tr.desp > tr.rec) esq.push({ nome: 'Déficit (tirado do saldo)', valor: tr.desp - tr.rec, cor: '#f43f5e' });
    c = `<div class="card"><div class="graf-cab"><div><h2>Para onde foi o dinheiro</h2><small>${dataBR(ini)} → ${dataBR(fim)}</small></div>
      <div class="resumo-linha" style="margin:0"><span>Receitas<b class="pos">${fmt(tr.rec)}</b></span><span>Despesas<b class="neg">${fmt(tr.desp)}</b></span></div></div>
      ${grafSankey({ esq, dir, centro: 'Renda' })}</div>`;
  }
  el.innerHTML = topo + c;
  if (innerWidth < 860) $$('.g', el).forEach(g => g.style.gridTemplateColumns = '1fr');
}
A.relPer = el => { S.rel.per = el.dataset.v; render(); };
A.relAba = el => { S.rel.aba = el.dataset.v; render(); };
A.relComp = el => { S.rel.comp = el.dataset.v; render(); };
C.relIni = el => { S.rel.ini = el.value; render(); };
C.relFim = el => { S.rel.fim = el.value; render(); };

/* =====================================================================
   PATRIMÔNIO (bens e dívidas fora das contas)
   ===================================================================== */
S.patAba = 'carteira'; S.patModo = 'emp';
S.patVisao = ls.get('patVisao', 'liquido');
function pgPatrimonio(el) {
  const h = hoje(), ativos = S.patrimonio.filter(p => p.natureza !== 'passivo'), passivos = S.patrimonio.filter(p => p.natureza === 'passivo');
  const liq = S.patVisao === 'liquido';
  const tBens = soma(ativos, p => valorItem(p.id, h)), tFalta = soma(ativos, p => devedorItem(p.id, h)), tDiv = soma(passivos, p => valorItem(p.id, h));
  const tLiq = tBens - tFalta - tDiv;
  const cores = ['#6366f1', '#f43f5e', '#14b8a6', '#f59e0b', '#84cc16', '#0ea5e9', '#ec4899', '#a855f7'];
  let c = '';
  if (S.patAba === 'carteira') {
    const primeira = S.patValores.filter(v => ativos.some(a => a.id === v.item_id)).map(v => v.data).sort()[0];
    let graf = vazio('Adicione bens (imóveis, veículos…) para acompanhar a evolução.');
    if (primeira) {
      let meses = mesesEntre(primeira, h);
      if (meses.length > 60) { const passo = Math.ceil(meses.length / 60); meses = meses.filter((_, i) => i % passo === 0 || i === meses.length - 1); }
      const dt = m => fimMes(m) < h ? fimMes(m) : h;
      const series = ativos.map((p, i) => ({ nome: p.nome, cor: cores[i % cores.length], valores: meses.map(m => valorItem(p.id, dt(m)) - (liq ? devedorItem(p.id, dt(m)) : 0)), area: true, semPontos: meses.length > 16 }));
      graf = grafLinhas({ labels: meses.map(mesCurto), series, empilhado: S.patModo === 'emp', h: 280 }) + legenda(series.map(s => [s.nome, s.cor]));
    }
    const linhaAtivo = p => {
      const v = valorItem(p.id, h), d = devedorItem(p.id, h), l = v - d, q = v > 0 ? Math.max(0, Math.min(1, l / v)) : 1, ult = S.patValores.filter(x => x.item_id === p.id).at(-1);
      return `<tr><td><div class="tdesc">${tile(p.icone, 'var(--card3)', 'sm')}<div><div class="d1">${esc(p.nome)} ${d > 0 ? '<span class="badge av">Pagando</span>' : '<span class="badge ok">Quitado</span>'}</div><div class="obs">${esc(TIPOS_ITEM[p.tipo] || p.tipo)}${ult ? ` · atualizado em ${dataBR(ult.data)}` : ''}</div></div></div></td>
        <td class="num">${fmt(v)}</td><td class="num ${d > 0 ? 'neg' : 'neu'}">${d > 0 ? fmt(d) : '—'}</td><td class="num vl">${fmt(l)}</td>
        <td style="min-width:130px"><div class="barra ok" style="height:6px"><div style="width:${q * 100}%"></div></div><small>${pct(q)} quitado</small></td>
        <td class="num" style="white-space:nowrap"><button class="btn mini" data-a="valorItem" data-id="${p.id}">${ic('atualizar', 13)} Atualizar</button>
          <button class="icobtn" data-a="editItem" data-id="${p.id}" title="Editar">${ic('editar', 16)}</button><button class="icobtn perigo" data-a="delItem" data-id="${p.id}" title="Excluir">${ic('lixo', 16)}</button></td></tr>`;
    };
    const linhaPass = p => { const v = valorItem(p.id, h); return `<tr><td><div class="tdesc">${tile(p.icone, '#7f1d1d', 'sm')}<div><div class="d1">${esc(p.nome)}</div><div class="obs">${esc(TIPOS_ITEM[p.tipo] || p.tipo)}</div></div></div></td><td class="num neg vl">${fmt(v)}</td>
      <td class="num" style="white-space:nowrap"><button class="btn mini" data-a="valorItem" data-id="${p.id}">${ic('atualizar', 13)} Atualizar</button><button class="icobtn" data-a="editItem" data-id="${p.id}">${ic('editar', 16)}</button><button class="icobtn perigo" data-a="delItem" data-id="${p.id}">${ic('lixo', 16)}</button></td></tr>`; };
    c = `<div class="kpis-pat mb">
        <div class="mcard"><span class="t">${ic('patrimonio', 15)} Valor dos bens</span><span class="v">${fmtN(tBens)}</span><small>${ativos.length} bem(ns)</small></div>
        <div class="mcard"><span class="t">${ic('pendencias', 15)} Falta pagar</span><span class="v ${tFalta + tDiv > 0 ? 'neg' : ''}">${fmtN(tFalta + tDiv)}</span><small>financiamentos e dívidas</small></div>
        <div class="mcard destaque"><span class="t">${ic('dinheiro', 15)} Patrimônio líquido</span><span class="v ${tLiq < 0 ? 'neg' : 'pos'}">${fmtN(tLiq)}</span><small>${tBens ? pct(Math.max(0, tLiq) / tBens) + ' já é seu' : 'bens − o que falta pagar'}</small></div>
      </div>
      <div class="card mb"><div class="graf-cab"><div><h2>Evolução do patrimônio ${liq ? 'líquido' : 'bruto'}</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem"><div class="seg"><button class="${liq ? 'on' : ''}" data-a="patVisao" data-v="liquido">Líquido</button><button class="${!liq ? 'on' : ''}" data-a="patVisao" data-v="bruto">Bruto</button></div>
        <div class="seg"><button class="${S.patModo === 'emp' ? 'on' : ''}" data-a="patModo" data-v="emp">Empilhado</button><button class="${S.patModo === 'lin' ? 'on' : ''}" data-a="patModo" data-v="lin">Linhas</button></div></div></div>
        <div style="text-align:right"><div class="lbl-k">${liq ? 'Bens − falta pagar' : 'Valor de mercado dos bens'}</div><div class="val-m">${fmt(liq ? tBens - tFalta : tBens)}</div></div></div>${graf}</div>
      <div class="sec-tit"><span>Bens</span><span>${fmt(tBens)}</span></div>
      <div class="card p0 mb"><div class="tabela-wrap"><table><thead><tr><th>Bem</th><th class="num">Valor do bem</th><th class="num">Falta pagar</th><th class="num">Líquido (seu)</th><th>Quitação</th><th></th></tr></thead>
      <tbody>${ativos.map(linhaAtivo).join('') || `<tr><td colspan="6">${vazio('Nenhum bem cadastrado.')}</td></tr>`}</tbody>
      ${ativos.length ? `<tfoot><tr><td>Total</td><td class="num">${fmt(tBens)}</td><td class="num">${fmt(tFalta)}</td><td class="num">${fmt(tBens - tFalta)}</td><td colspan="2"></td></tr></tfoot>` : ''}</table></div></div>
      ${passivos.length ? `<div class="sec-tit"><span>Outras dívidas (sem bem vinculado)</span><span>${fmt(tDiv)}</span></div><div class="card p0 mb"><div class="tabela-wrap"><table><thead><tr><th>Dívida</th><th class="num">Saldo devedor</th><th></th></tr></thead><tbody>${passivos.map(linhaPass).join('')}</tbody></table></div></div>` : ''}`;
  } else {
    const hist = [...S.patValores].sort((a, b) => b.data.localeCompare(a.data));
    c = `<div class="card p0"><div class="tabela-wrap"><table><thead><tr><th>Data</th><th>Item</th><th>Observação</th><th class="num">Valor</th><th class="num">Falta pagar</th><th></th></tr></thead><tbody>
      ${hist.map(v => { const p = S.patrimonio.find(x => x.id === v.item_id); return `<tr><td>${dataBR(v.data)}</td><td>${icoHtml(p?.icone || '')} ${esc(p?.nome || '?')}</td><td class="sub">${esc(v.observacao || '')}</td><td class="num vl">${fmt(v.valor)}</td><td class="num ${+v.devedor ? 'neg' : 'neu'}">${+v.devedor ? fmt(v.devedor) : '—'}</td><td class="num"><button class="icobtn perigo" data-a="delValor" data-id="${v.id}">${ic('lixo', 16)}</button></td></tr>`; }).join('') || `<tr><td colspan="6">${vazio('Sem histórico.')}</td></tr>`}
      </tbody></table></div></div>`;
  }
  el.innerHTML = cab('Patrimônio', 'Análises', `<div class="seg"><button class="${liq ? 'on' : ''}" data-a="patVisao" data-v="liquido">${ic('dinheiro', 14)} Patrimônio líquido</button><button class="${!liq ? 'on' : ''}" data-a="patVisao" data-v="bruto">Bruto</button></div><button class="btn pri" data-a="novoItem">${ic('mais', 15)} Adicionar bem</button>`) +
    `<div class="abas"><button class="aba ${S.patAba === 'carteira' ? 'on' : ''}" data-a="patAba" data-v="carteira">Carteira</button><button class="aba ${S.patAba === 'hist' ? 'on' : ''}" data-a="patAba" data-v="hist">Histórico de valores</button></div>` + c +
    `<p class="nota">Patrimônio líquido = valor dos bens − o que ainda falta pagar. Os saldos das contas entram automaticamente no patrimônio líquido total em Relatórios.</p>`;
}
A.patAba = el => { S.patAba = el.dataset.v; render(); };
A.patModo = el => { S.patModo = el.dataset.v; render(); };
A.patVisao = el => { S.patVisao = el.dataset.v; ls.set('patVisao', S.patVisao); render(); };
A.novoItem = () => modalItem();
A.editItem = el => modalItem(S.patrimonio.find(p => p.id === el.dataset.id));
A.valorItem = el => modalValor(S.patrimonio.find(p => p.id === el.dataset.id));
A.delItem = async el => { const p = S.patrimonio.find(x => x.id === el.dataset.id); if (!confirm(`Excluir "${p.nome}" e todo o histórico de valores?`)) return; await del('patrimonio', p.id); toast('Item excluído.'); recarregar(); };
A.delValor = async el => { if (!confirm('Excluir este registro de valor?')) return; await del('patrimonio_valores', el.dataset.id); recarregar(); };
const campoQuitacao = (devedor = 0) => `<div class="g2"><label>Situação<select name="situacao"><option value="quitado" ${devedor > 0 ? '' : 'selected'}>Quitado (já é todo meu)</option><option value="pagando" ${devedor > 0 ? 'selected' : ''}>Ainda estou pagando</option></select></label>
  <label class="so-pagando ${devedor > 0 ? '' : 'hidden'}">Quanto falta pagar (R$)<input name="devedor" inputmode="decimal" value="${devedor > 0 ? (+devedor).toFixed(2).replace('.', ',') : ''}" placeholder="saldo devedor"></label></div>`;
const ligarQuitacao = f => { if (!f.situacao) return; const at = () => $('.so-pagando', f).classList.toggle('hidden', f.situacao.value !== 'pagando'); f.situacao.addEventListener('change', at); at(); };
const lerDevedor = f => f.situacao && f.situacao.value === 'pagando' ? Math.max(0, parseNum(f.devedor.value) || 0) : 0;
function modalItem(p = null) {
  modal({
    titulo: p ? 'Editar bem' : 'Adicionar bem ao patrimônio',
    corpo: `<label>Nome<input name="nome" required maxlength="80" value="${esc(p?.nome || '')}" placeholder="Ex.: Apartamento, Ford Ka 2019"></label>
      <div class="g2"><label>Natureza<select name="natureza"><option value="ativo" ${p?.natureza !== 'passivo' ? 'selected' : ''}>Bem (ativo)</option><option value="passivo" ${p?.natureza === 'passivo' ? 'selected' : ''}>Dívida avulsa (sem bem)</option></select></label>
      <label>Tipo<select name="tipo">${optsObj(TIPOS_ITEM, p?.tipo || 'imovel')}</select></label></div>
      ${p ? `<p class="ajuda">Para mudar o valor ou quanto falta pagar, use “Atualizar” na lista (assim fica o histórico).</p>` : `<div class="g2"><label>Valor do bem (R$)<input name="valor" inputmode="decimal" required placeholder="0,00"></label><label>Data<input type="date" name="data" value="${hoje()}" required></label></div>
        <div class="so-ativo">${campoQuitacao(0)}</div>
        <p class="ajuda">Ex.: apartamento de R$ 220.000 financiado, faltando R$ 150.000 → seu patrimônio líquido nele é R$ 70.000.</p>`}
      <label>Ícone${pickIcone('icone', p?.icone || '🏠')}</label>`,
    onOpen: f => { ligarQuitacao(f); const at = () => { const s = $('.so-ativo', f); if (s) s.classList.toggle('hidden', f.natureza.value === 'passivo'); }; f.natureza.addEventListener('change', at); at(); },
    onSubmit: async f => {
      const reg = { nome: f.nome.value.trim(), natureza: f.natureza.value, tipo: f.tipo.value, icone: f.icone.value.trim() || '🏠' };
      if (p) await upd('patrimonio', p.id, reg);
      else { const [n] = await ins('patrimonio', reg); await ins('patrimonio_valores', { item_id: n.id, data: f.data.value, valor: parseNum(f.valor.value) || 0, devedor: reg.natureza === 'ativo' ? lerDevedor(f) : 0, observacao: 'Valor inicial' }); }
      toast('Bem salvo!'); await recarregar();
    }
  });
}
function modalValor(p) {
  const ativo = p.natureza !== 'passivo';
  modal({
    titulo: `Atualizar · ${esc(p.nome)}`,
    corpo: `<div class="g2"><label>${ativo ? 'Valor do bem (R$)' : 'Saldo devedor (R$)'}<input name="valor" inputmode="decimal" required value="${valorItem(p.id).toFixed(2).replace('.', ',')}"></label><label>Data<input type="date" name="data" value="${hoje()}" required></label></div>
      ${ativo ? campoQuitacao(devedorItem(p.id)) : ''}
      <label>Observação<input name="observacao" maxlength="200" placeholder="Ex.: avaliação FIPE, parcela paga, amortização"></label>`,
    onOpen: ligarQuitacao,
    onSubmit: async f => { await ins('patrimonio_valores', { item_id: p.id, data: f.data.value, valor: parseNum(f.valor.value) || 0, devedor: ativo ? lerDevedor(f) : 0, observacao: f.observacao.value.trim() || null }); toast('Atualizado!'); await recarregar(); }
  });
}

/* =====================================================================
   ORÇAMENTOS
   ===================================================================== */
function gastosMes(ym) { const m = new Map(); txPeriodo(ym + '-01', fimMes(ym), false).filter(t => t.tipo === 'despesa').forEach(t => m.set(t.categoria_id || '', (m.get(t.categoria_id || '') || 0) + +t.valor)); return m; }
function pgOrcamentos(el) {
  const g = gastosMes(S.mes);
  const linhas = S.orcamentos.map(o => { const c = S.mCat.get(o.categoria_id), gasto = g.get(o.categoria_id) || 0; return { o, c, gasto, p: gasto / +o.valor }; }).filter(x => x.c).sort((a, b) => b.p - a.p);
  const tot = soma(linhas, x => x.o.valor), gasto = soma(linhas, x => x.gasto), p = tot ? gasto / tot : 0;
  const ym = S.mes, h = hoje(), diasPass = ym === h.slice(0, 7) ? +h.slice(8) : ym < h.slice(0, 7) ? diasNoMes(ym) : 0, fracMes = diasPass / diasNoMes(ym);
  const sem = [...g].filter(([id, v]) => id && !S.orcamentos.some(o => o.categoria_id === id) && v > 0).map(([id, v]) => ({ c: S.mCat.get(id), v })).filter(x => x.c).sort((a, b) => b.v - a.v);
  const st = x => x.p >= 1 ? ['er', 'Estourado'] : x.p >= .8 ? ['av', 'Atenção'] : ['ok', 'No limite'];
  el.innerHTML = cab('Orçamentos', 'Configuração', `${navMes()}<button class="btn" data-a="sugerirOrc">${ic('relatorios', 15)} Sugerir pela média</button><button class="btn pri" data-a="novoOrc">${ic('mais', 15)} Novo orçamento</button>`) +
    `<div class="card mb"><div class="kpis" style="border:none;margin:0;padding:0">
      <div><div class="lbl-k">Orçado</div><div class="val-m">${fmt(tot)}</div></div><div><div class="lbl-k">Gasto</div><div class="val-m neg">${fmt(gasto)}</div></div>
      <div><div class="lbl-k">Restante</div><div class="val-m ${cls(tot - gasto)}">${fmt(tot - gasto)}</div></div>
      <div><div class="lbl-k">Usado / mês decorrido</div><div class="val-m">${pct(p)} <small>/ ${pct(fracMes)}</small></div></div></div>
      <div class="barra ${p >= 1 ? 'er' : p >= .8 ? 'av' : 'ok'}" style="margin-top:1rem"><div style="width:${Math.min(100, p * 100)}%"></div></div></div>
    <div class="card p0 mb">${linhas.map(x => { const [k, n] = st(x); return `<div class="linha-cat">${tile(x.c.icone, x.c.cor)}<div class="nm"><div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap"><span>${esc(x.c.nome)} <span class="badge ${k}">${n}</span></span><span style="font-weight:600">${fmt(x.gasto)} <small>de ${fmt(x.o.valor)}</small></span></div>
        <div class="barra ${k}" style="margin:.45rem 0 .3rem"><div style="width:${Math.min(100, x.p * 100)}%"></div></div><small>${x.p >= 1 ? `<span class="neg">${fmt(x.gasto - x.o.valor)} acima do limite</span>` : `Restam ${fmt(x.o.valor - x.gasto)}`} · ${pct(x.p)}</small></div>
        <span class="ma" style="display:flex"><button class="icobtn" data-a="verCat" data-id="${x.c.id}" title="Ver transações">${ic('lista', 16)}</button><button class="icobtn" data-a="editOrc" data-id="${x.o.id}" title="Editar">${ic('editar', 16)}</button><button class="icobtn perigo" data-a="delOrc" data-id="${x.o.id}" title="Excluir">${ic('lixo', 16)}</button></span></div>`; }).join('') || vazio('Nenhum orçamento. Defina um limite mensal por categoria de despesa.')}</div>
    ${sem.length ? `<div class="card p0"><div class="card-cab"><h2>Gastos sem orçamento neste mês</h2></div>${sem.map(x => `<div class="linha-cat">${tile(x.c.icone, x.c.cor, 'sm')}<span class="nm">${esc(x.c.nome)}</span><span class="vl">${fmt(x.v)}</span><button class="btn mini" data-a="novoOrc" data-cat="${x.c.id}">${ic('mais', 13)} Orçar</button></div>`).join('')}</div>` : ''}`;
}
A.novoOrc = el => modalOrc(null, el.dataset.cat);
A.editOrc = el => modalOrc(S.orcamentos.find(o => o.id === el.dataset.id));
A.delOrc = async el => { if (!confirm('Excluir este orçamento?')) return; await del('orcamentos', el.dataset.id); recarregar(); };
function modalOrc(o = null, catId = null) {
  const livres = S.categorias.filter(c => c.tipo === 'despesa' && (!S.orcamentos.some(x => x.categoria_id === c.id) || c.id === o?.categoria_id));
  if (!livres.length) return toast('Todas as categorias de despesa já têm orçamento.', true);
  const media = id => { let t = 0; for (let k = 1; k <= 3; k++) t += gastosMes(somaMeses(S.mes + '-01', -k).slice(0, 7)).get(id) || 0; return t / 3; };
  modal({
    titulo: o ? 'Editar orçamento' : 'Novo orçamento',
    corpo: `<label>Categoria<select name="categoria_id" ${o ? 'disabled' : ''}>${opts(livres, o?.categoria_id || catId)}</select></label>
      <label>Limite mensal (R$)<input name="valor" inputmode="decimal" required value="${o ? (+o.valor).toFixed(2).replace('.', ',') : ''}"></label><p class="ajuda" id="orc-media"></p>`,
    onOpen: f => { const at = () => { $('#orc-media').textContent = `Média dos últimos 3 meses: ${fmt(media(f.categoria_id.value))}`; }; f.categoria_id.addEventListener('change', at); at(); },
    onSubmit: async f => {
      const valor = parseNum(f.valor.value); if (!(valor > 0)) { toast('Informe um valor maior que zero.', true); return false; }
      o ? await upd('orcamentos', o.id, { valor }) : await ins('orcamentos', { categoria_id: f.categoria_id.value, valor });
      toast('Orçamento salvo!'); await recarregar();
    }
  });
}
A.sugerirOrc = async () => {
  const sug = [];
  S.categorias.filter(c => c.tipo === 'despesa' && !S.orcamentos.some(o => o.categoria_id === c.id)).forEach(c => {
    let t = 0; for (let k = 1; k <= 3; k++) t += gastosMes(somaMeses(S.mes + '-01', -k).slice(0, 7)).get(c.id) || 0;
    const m = Math.ceil(t / 3 / 10) * 10; if (m > 0) sug.push({ categoria_id: c.id, valor: m, nome: c.nome });
  });
  if (!sug.length) return toast('Sem histórico suficiente (3 meses) para sugerir.', true);
  if (!confirm(`Criar ${sug.length} orçamento(s) com base na média dos últimos 3 meses?\n\n${sug.map(s => `• ${s.nome}: ${fmt(s.valor)}`).join('\n')}`)) return;
  await ins('orcamentos', sug.map(({ nome, ...r }) => r)); toast('Orçamentos criados!'); recarregar();
};

/* =====================================================================
   METAS
   ===================================================================== */
S.metaAba = 'ativa';
function pgMetas(el) {
  const sal = saldosEm(), abas = [['ativa', 'Ativa'], ['concluida', 'Concluída'], ['pausada', 'Pausada'], ['arquivada', 'Arquivada'], ['todas', 'Todas']];
  const lista = S.metas.filter(m => S.metaAba === 'todas' || m.status === S.metaAba);
  const nomesSt = { ativa: ['ok', 'Ativa'], concluida: ['pr', 'Concluída'], pausada: ['nt', 'Pausada'], arquivada: ['nt', 'Arquivada'] };
  const linha = m => {
    const im = infoMeta(m, sal), [k, n] = nomesSt[m.status];
    const info = [`${fmt(im.atual)} / ${fmt(im.alvo)}`, im.mensal != null && m.status === 'ativa' ? `${fmt(im.mensal)}/mês` : null,
    im.dias != null ? (im.dias >= 0 ? `${im.dias} dias restantes` : `prazo vencido há ${-im.dias} dias`) : 'Sem prazo', m.conta_id ? `🔗 ${esc(S.mC.get(m.conta_id)?.nome || '')}` : null].filter(Boolean);
    return `<div class="meta-l">${tile(m.icone, m.cor, 'lg')}<div class="mc">
      <div class="mt">${esc(m.nome)} <span class="badge ${k}">${n}</span>${m.status === 'ativa' && im.atrasado ? '<span class="badge av">Atrasado</span>' : ''}${im.p >= 1 ? '<span class="badge ok">🎉 Alcançada</span>' : ''}</div>
      <div class="barra ${im.p >= 1 ? 'ok' : ''}"><div style="width:${Math.min(100, im.p * 100)}%;${im.p < 1 ? `background:${esc(m.cor)}` : ''}"></div></div>
      <div class="mi">${info.map(i => `<span>${i}</span>`).join('')}</div></div>
      <span class="mp">${Math.round(im.p * 100)}%</span>
      <span class="ma">${!m.conta_id ? `<button class="icobtn" data-a="aporteMeta" data-id="${m.id}" title="Adicionar valor">${ic('mais', 16)}</button>` : ''}
        ${m.status === 'pausada' ? `<button class="icobtn" data-a="metaSt" data-s="ativa" data-id="${m.id}" title="Retomar">${ic('play', 16)}</button>` : m.status === 'ativa' ? `<button class="icobtn" data-a="metaSt" data-s="pausada" data-id="${m.id}" title="Pausar">${ic('pausa', 16)}</button>` : ''}
        ${m.status !== 'concluida' ? `<button class="icobtn" data-a="metaSt" data-s="concluida" data-id="${m.id}" title="Concluir">${ic('checkC', 16)}</button>` : `<button class="icobtn" data-a="metaSt" data-s="ativa" data-id="${m.id}" title="Reativar">${ic('play', 16)}</button>`}
        ${m.status !== 'arquivada' ? `<button class="icobtn" data-a="metaSt" data-s="arquivada" data-id="${m.id}" title="Arquivar">${ic('arquivo', 16)}</button>` : ''}
        <button class="icobtn" data-a="editMeta" data-id="${m.id}" title="Editar">${ic('editar', 16)}</button><button class="icobtn perigo" data-a="delMeta" data-id="${m.id}" title="Excluir">${ic('lixo', 16)}</button></span></div>`;
  };
  el.innerHTML = cab('Metas', 'Metas') + `<div class="abas">${abas.map(([v, n]) => `<button class="aba ${S.metaAba === v ? 'on' : ''}" data-a="metaAba" data-v="${v}">${n}</button>`).join('')}</div>
    <div class="card p0"><div class="card-cab"><h2>Metas</h2><button class="btn pri" data-a="novaMeta">${ic('mais', 15)} Adicionar Meta</button></div>
    ${lista.map(linha).join('') || vazio('Nenhuma meta aqui.')}</div>`;
}
A.metaAba = el => { S.metaAba = el.dataset.v; render(); };
A.novaMeta = () => modalMeta();
A.editMeta = el => modalMeta(S.metas.find(m => m.id === el.dataset.id));
A.metaSt = async el => { await upd('metas', el.dataset.id, { status: el.dataset.s }); toast(el.dataset.s === 'concluida' ? 'Meta concluída! 🏆' : 'Meta atualizada.'); await recarregar(); if (el.dataset.s === 'concluida') chuvaMoedas(30); };
A.delMeta = async el => { if (!confirm('Excluir esta meta?')) return; await del('metas', el.dataset.id); recarregar(); };
A.aporteMeta = el => {
  const m = S.metas.find(x => x.id === el.dataset.id);
  modal({
    titulo: `Movimentar · ${esc(m.nome)}`, corpo: `<p class="sub" style="margin-top:0">Valor atual: <b>${fmt(m.valor_atual)}</b></p><label>Valor a adicionar (use negativo para retirar)<input name="v" inputmode="decimal" required placeholder="0,00"></label>`,
    onSubmit: async f => { const v = parseNum(f.v.value) || 0; await upd('metas', m.id, { valor_atual: Math.max(0, +m.valor_atual + v) }); toast('Meta atualizada!'); await recarregar(); }
  });
};
function modalMeta(m = null) {
  modal({
    titulo: m ? 'Editar meta' : 'Nova meta',
    corpo: `<label>Nome<input name="nome" required maxlength="80" value="${esc(m?.nome || '')}" placeholder="Ex.: Reserva de emergência, Viagem"></label>
      <div class="g2"><label>Valor alvo (R$)<input name="alvo" inputmode="decimal" required value="${m ? (+m.valor_alvo).toFixed(2).replace('.', ',') : ''}"></label>
      <label>Prazo (opcional)<input type="date" name="prazo" value="${m?.prazo || ''}"></label></div>
      <label>Acompanhar pelo saldo de uma conta (opcional)<select name="conta_id">${opts(S.contas, m?.conta_id, 'Não — vou informar os valores manualmente')}</select></label>
      <label class="manual">Valor já guardado (R$)<input name="atual" inputmode="decimal" value="${m ? (+m.valor_atual).toFixed(2).replace('.', ',') : '0,00'}"></label>
      <label>Cor${pickCor('cor', m?.cor || '#f59e0b')}</label><label>Ícone${pickIcone('icone', m?.icone || '🎯')}</label>`,
    onOpen: f => { const at = () => $('.manual', f).classList.toggle('hidden', !!f.conta_id.value); f.conta_id.addEventListener('change', at); at(); },
    onSubmit: async f => {
      const alvo = parseNum(f.alvo.value); if (!(alvo > 0)) { toast('Informe o valor alvo.', true); return false; }
      const reg = { nome: f.nome.value.trim(), valor_alvo: alvo, prazo: f.prazo.value || null, conta_id: f.conta_id.value || null, valor_atual: parseNum(f.atual.value) || 0, cor: corDe(f, 'cor'), icone: f.icone.value.trim() || '🎯' };
      m ? await upd('metas', m.id, reg) : await ins('metas', reg); toast('Meta salva!'); await recarregar();
    }
  });
}

/* =====================================================================
   RECORRENTES
   ===================================================================== */
const FATOR = { semanal: 52 / 12, quinzenal: 26 / 12, mensal: 1, anual: 1 / 12 };
function pgRecorrentes(el) {
  const h = hoje(), lista = [...S.recorrentes].sort((a, b) => (b.ativo - a.ativo) || a.proxima_data.localeCompare(b.proxima_data));
  const at = lista.filter(r => r.ativo);
  const mRec = soma(at.filter(r => r.tipo === 'receita'), r => r.valor * FATOR[r.frequencia]), mDesp = soma(at.filter(r => r.tipo === 'despesa'), r => r.valor * FATOR[r.frequencia]);
  el.innerHTML = cab('Recorrentes', 'Configuração', `<button class="btn pri" data-a="novaRec">${ic('mais', 15)} Nova recorrência</button>`) +
    `<div class="card mb"><div class="kpis" style="border:none;margin:0;padding:0"><div><div class="lbl-k">Receitas fixas / mês</div><div class="val-m pos">${fmt(mRec)}</div></div>
      <div><div class="lbl-k">Despesas fixas / mês</div><div class="val-m neg">${fmt(mDesp)}</div></div><div><div class="lbl-k">Saldo fixo / mês</div><div class="val-m ${cls(mRec - mDesp)}">${fmtS(mRec - mDesp)}</div></div>
      <div><div class="lbl-k">Recorrências ativas</div><div class="val-m">${at.length}</div></div></div>
      <p class="nota">Com “gerar automaticamente” ligado, quando a data chega o lançamento é criado como <b>pendente</b> para você confirmar.</p></div>
    <div class="card p0">${lista.map(r => {
      const c = S.mCat.get(r.categoria_id), v = r.tipo === 'despesa' ? -r.valor : +r.valor;
      return `<div class="linha-cat" style="${r.ativo ? '' : 'opacity:.5'}">${tile(c?.icone || '🔁', c?.cor || '#3f3f4a')}<div class="nm">${esc(r.descricao)}<div><small>${FREQS[r.frequencia]} · ${esc(S.mC.get(r.conta_id)?.nome || 'sem conta')}${r.auto ? ' · automática' : ''}</small></div></div>
        <span><small>Próxima</small><br><span class="badge ${r.ativo && r.proxima_data < h ? 'er' : 'nt'}">${dataBR(r.proxima_data)}</span></span>
        <span class="vl ${cls(v)}" style="min-width:110px;text-align:right">${fmtS(v)}</span>
        <label class="switch" title="Ativa"><input type="checkbox" data-c="togRec" data-id="${r.id}" ${r.ativo ? 'checked' : ''}><span></span></label>
        <span style="display:flex"><button class="icobtn" data-a="lancarRec" data-id="${r.id}" title="Lançar agora (como pago)">${ic('check', 16)}</button><button class="icobtn" data-a="editRec" data-id="${r.id}" title="Editar">${ic('editar', 16)}</button><button class="icobtn perigo" data-a="delRec" data-id="${r.id}" title="Excluir">${ic('lixo', 16)}</button></span></div>`;
    }).join('') || vazio('Nenhuma recorrência. Cadastre salário, aluguel, assinaturas… ou use “Tornar recorrente” em uma transação.')}</div>`;
}
A.novaRec = () => modalRec();
A.editRec = el => modalRec(S.recorrentes.find(r => r.id === el.dataset.id));
A.delRec = async el => { if (!confirm('Excluir esta recorrência? (os lançamentos já criados continuam)')) return; await del('recorrentes', el.dataset.id); recarregar(); };
C.togRec = async el => { await upd('recorrentes', el.dataset.id, { ativo: el.checked }); recarregar(); };
A.lancarRec = async el => {
  const r = S.recorrentes.find(x => x.id === el.dataset.id);
  if (!confirm(`Lançar "${r.descricao}" de ${dataBR(r.proxima_data)} (${fmt(r.valor)}) como pago?`)) return;
  await ins('transacoes', { tipo: r.tipo, descricao: r.descricao, valor: r.valor, data: r.proxima_data, conta_id: r.conta_id, categoria_id: r.categoria_id, pessoa_id: r.pessoa_id, pago: true, recorrente_id: r.id });
  await upd('recorrentes', r.id, { proxima_data: avancarRec(r, r.proxima_data) });
  toast('Lançado! Próxima data atualizada.'); recarregar();
};
function modalRec(r = null, base = null) {
  const b = r || base || {}, tipo = b.tipo || 'despesa';
  modal({
    titulo: r ? 'Editar recorrência' : 'Nova recorrência',
    corpo: `<div class="tipo3" style="grid-template-columns:1fr 1fr">${[['despesa', 'Despesa'], ['receita', 'Receita']].map(([v, n]) => `<label><input type="radio" name="tipo" value="${v}" ${v === tipo ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
      <label>Descrição<input name="descricao" required maxlength="200" value="${esc(b.descricao || '')}" placeholder="Ex.: Aluguel, Salário, Netflix"></label>
      <div class="g2"><label>Valor (R$)<input name="valor" inputmode="decimal" required value="${b.valor ? (+b.valor).toFixed(2).replace('.', ',') : ''}"></label>
      <label>Frequência<select name="frequencia">${optsObj(FREQS, b.frequencia || 'mensal')}</select></label></div>
      <div class="g2"><label>Próxima data<input type="date" name="proxima_data" required value="${b.proxima_data || hoje()}"></label>
      <label>Conta<select name="conta_id" required>${opts(contasAtivas(), b.conta_id || contasAtivas()[0]?.id)}</select></label></div>
      <div class="g2"><label>Categoria<select name="categoria_id"></select></label><label>Pessoa<select name="pessoa_id">${opts(S.pessoas, b.pessoa_id, 'Ninguém')}</select></label></div>
      <label class="chk"><input type="checkbox" name="auto" ${b.auto !== false ? 'checked' : ''}> Gerar lançamento pendente automaticamente na data</label>`,
    onOpen: f => { const at = () => { const cur = f.categoria_id.value || b.categoria_id; f.categoria_id.innerHTML = opts(S.categorias.filter(c => c.tipo === f.tipo.value), cur, 'Sem categoria'); }; f.addEventListener('change', e => { if (e.target.name === 'tipo') at(); }); at(); },
    onSubmit: async f => {
      const valor = parseNum(f.valor.value); if (!(valor > 0)) { toast('Informe um valor maior que zero.', true); return false; }
      const reg = { tipo: f.tipo.value, descricao: f.descricao.value.trim(), valor, frequencia: f.frequencia.value, proxima_data: f.proxima_data.value, dia: +f.proxima_data.value.slice(8), conta_id: f.conta_id.value || null, categoria_id: f.categoria_id.value || null, pessoa_id: f.pessoa_id.value || null, auto: f.auto.checked };
      r ? await upd('recorrentes', r.id, reg) : await ins('recorrentes', reg);
      await carregar(); if (await gerarRecorrentes()) await carregar(); render(); toast('Recorrência salva!');
    }
  });
}

/* =====================================================================
   CATEGORIAS
   ===================================================================== */
S.catAba = 'despesa';
function pgCategorias(el) {
  const ym = S.mes, lista = S.categorias.filter(c => c.tipo === S.catAba);
  const cont = new Map(), mes = new Map();
  S.tx.forEach(t => { if (!t.categoria_id) return; cont.set(t.categoria_id, (cont.get(t.categoria_id) || 0) + 1); if (t.data.startsWith(ym)) mes.set(t.categoria_id, (mes.get(t.categoria_id) || 0) + +t.valor); });
  el.innerHTML = cab('Categorias', 'Configuração', `${navMes()}<button class="btn pri" data-a="novaCat">${ic('mais', 15)} Nova categoria</button>`) +
    `<div class="abas"><button class="aba ${S.catAba === 'despesa' ? 'on' : ''}" data-a="catAba" data-v="despesa">Despesas (${S.categorias.filter(c => c.tipo === 'despesa').length})</button><button class="aba ${S.catAba === 'receita' ? 'on' : ''}" data-a="catAba" data-v="receita">Receitas (${S.categorias.filter(c => c.tipo === 'receita').length})</button></div>
    <div class="grade-cartoes">${lista.map(c => `<div class="ccard"><div class="ct">${tile(c.icone, c.cor, 'lg')}<div class="nm"><b>${esc(c.nome)}</b><small>${cont.get(c.id) || 0} transação(ões)</small></div><div style="text-align:right"><small>${MESES_C[+ym.slice(5) - 1]}</small><div style="font-weight:700">${fmt(mes.get(c.id) || 0)}</div></div></div>
      <div class="cr"><button class="btn mini" data-a="verCat" data-id="${c.id}">${ic('lista', 13)} Transações</button><span style="flex:1"></span><button class="icobtn" data-a="editCat" data-id="${c.id}" title="Editar">${ic('editar', 16)}</button><button class="icobtn perigo" data-a="delCat" data-id="${c.id}" title="Excluir">${ic('lixo', 16)}</button></div></div>`).join('') || `<div class="card">${vazio('Nenhuma categoria.')}</div>`}</div>`;
}
A.catAba = el => { S.catAba = el.dataset.v; render(); };
A.novaCat = () => modalCat(null, S.catAba);
A.editCat = el => modalCat(S.mCat.get(el.dataset.id));
A.delCat = async el => {
  const c = S.mCat.get(el.dataset.id), n = S.tx.filter(t => t.categoria_id === c.id).length;
  if (!confirm(`Excluir a categoria "${c.nome}"?${n ? `\n\n${n} transação(ões) ficarão sem categoria.` : ''} Orçamentos e regras desta categoria também serão removidos.`)) return;
  await del('categorias', c.id); toast('Categoria excluída.'); recarregar();
};
function modalCat(c = null, tipo = 'despesa') {
  modal({
    titulo: c ? 'Editar categoria' : 'Nova categoria',
    corpo: `<div class="g2"><label>Nome<input name="nome" required maxlength="60" value="${esc(c?.nome || '')}"></label>
      <label>Tipo<select name="tipo">${optsObj({ despesa: 'Despesa', receita: 'Receita' }, c?.tipo || tipo)}</select></label></div>
      <label>Grupo na regra 50/30/20 (só despesas)<select name="grupo503020"><option value="">Automático</option>${Object.entries(G503).map(([k, v]) => `<option value="${k}" ${c?.grupo503020 === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></label>
      <label>Cor${pickCor('cor', c?.cor || CORES[Math.floor(Math.random() * CORES.length)])}</label><label>Ícone${pickIcone('icone', c?.icone || '🏷️')}</label>`,
    onSubmit: async f => {
      const reg = { nome: f.nome.value.trim(), tipo: f.tipo.value, cor: corDe(f, 'cor'), icone: f.icone.value.trim() || '🏷️', grupo503020: f.tipo.value === 'despesa' ? (f.grupo503020.value || sugerirGrupo(f.nome.value)) : null };
      c ? await upd('categorias', c.id, reg) : await ins('categorias', reg); toast('Categoria salva!'); await recarregar();
    }
  });
}

/* =====================================================================
   PESSOAS
   ===================================================================== */
function pgPessoas(el) {
  const ym = S.mes;
  el.innerHTML = cab('Pessoas', 'Configuração', `${navMes()}<button class="btn pri" data-a="novaPessoa">${ic('mais', 15)} Nova pessoa</button>`) +
    `<p class="sub" style="margin-top:-.4rem">Marque em cada transação quem gastou ou recebeu (ex.: você, cônjuge, filhos) e acompanhe os totais por pessoa.</p>
    <div class="grade-cartoes">${S.pessoas.map(p => {
      const tx = S.tx.filter(t => t.pessoa_id === p.id), m = resumo(tx.filter(t => t.data.startsWith(ym) && t.pago)), g = resumo(tx.filter(t => t.pago));
      return `<div class="ccard"><div class="ct"><span class="avatar" style="background:${esc(p.cor)};width:42px;height:42px;font-size:1.05rem">${esc(p.nome[0]?.toUpperCase() || '?')}</span><div class="nm"><b>${esc(p.nome)}</b><small>${tx.length} transação(ões)</small></div></div>
        <div class="info"><span>${nomeMes(ym)}</span><span><span class="pos">+${fmt(m.rec)}</span> &nbsp; <span class="neg">-${fmt(m.desp)}</span></span></div>
        <div class="info"><span>Total geral</span><span><span class="pos">+${fmt(g.rec)}</span> &nbsp; <span class="neg">-${fmt(g.desp)}</span></span></div>
        <div class="cr"><button class="btn mini" data-a="verPessoa" data-id="${p.id}">${ic('lista', 13)} Transações</button><span style="flex:1"></span><button class="icobtn" data-a="editPessoa" data-id="${p.id}">${ic('editar', 16)}</button><button class="icobtn perigo" data-a="delPessoa" data-id="${p.id}">${ic('lixo', 16)}</button></div></div>`;
    }).join('') || `<div class="card">${vazio('Nenhuma pessoa cadastrada.')}</div>`}</div>`;
}
A.novaPessoa = () => modalPessoa();
A.editPessoa = el => modalPessoa(S.mP.get(el.dataset.id));
A.delPessoa = async el => { const p = S.mP.get(el.dataset.id); if (!confirm(`Excluir "${p.nome}"? As transações continuam, só perdem a marcação.`)) return; await del('pessoas', p.id); recarregar(); };
function modalPessoa(p = null) {
  modal({
    titulo: p ? 'Editar pessoa' : 'Nova pessoa',
    corpo: `<label>Nome<input name="nome" required maxlength="60" value="${esc(p?.nome || '')}"></label><label>Cor${pickCor('cor', p?.cor || '#8b5cf6')}</label>`,
    onSubmit: async f => { const reg = { nome: f.nome.value.trim(), cor: corDe(f, 'cor') }; p ? await upd('pessoas', p.id, reg) : await ins('pessoas', reg); toast('Pessoa salva!'); await recarregar(); }
  });
}

/* =====================================================================
   GRUPOS DE CONTAS
   ===================================================================== */
function pgGrupos(el) {
  const sal = saldosEm();
  el.innerHTML = cab('Grupos', 'Configuração', `<button class="btn pri" data-a="novoGrupo">${ic('mais', 15)} Novo grupo</button>`) +
    `<p class="sub" style="margin-top:-.4rem">Agrupe contas (ex.: “Pessoal”, “Empresa”, “Casal”) e escolha o grupo no seletor <b>VENDO</b> no topo para filtrar todo o sistema.</p>
    <div class="grade-cartoes">${S.grupos.map(g => {
      const cs = S.contas.filter(c => g.conta_ids.includes(c.id));
      return `<div class="ccard"><div class="ct">${tile('🗂️', '#4338ca')}<div class="nm"><b>${esc(g.nome)}</b><small>${cs.length} conta(s)</small></div><div class="cv">${fmt(soma(cs, c => sal.get(c.id)))}</div></div>
        <div class="chips">${cs.map(c => `<span class="chip"><span class="mini-tile" style="background:${esc(c.cor)}">${icoHtml(c.icone)}</span>${esc(c.nome)}</span>`).join('')}</div>
        <div class="cr"><button class="btn mini ${S.grupo === g.id ? 'ativo' : ''}" data-a="usarGrupo" data-id="${g.id}">${ic('olho', 13)} ${S.grupo === g.id ? 'Em uso' : 'Visualizar'}</button><span style="flex:1"></span><button class="icobtn" data-a="editGrupo" data-id="${g.id}">${ic('editar', 16)}</button><button class="icobtn perigo" data-a="delGrupo" data-id="${g.id}">${ic('lixo', 16)}</button></div></div>`;
    }).join('') || `<div class="card">${vazio('Nenhum grupo criado.')}</div>`}</div>`;
}
A.usarGrupo = el => { S.grupo = S.grupo === el.dataset.id ? '' : el.dataset.id; ls.set('grupo', S.grupo); render(); };
A.novoGrupo = () => modalGrupo();
A.editGrupo = el => modalGrupo(S.grupos.find(g => g.id === el.dataset.id));
A.delGrupo = async el => { if (!confirm('Excluir este grupo? (as contas não são afetadas)')) return; await del('grupos', el.dataset.id); if (S.grupo === el.dataset.id) { S.grupo = ''; ls.set('grupo', ''); } recarregar(); };
function modalGrupo(g = null) {
  modal({
    titulo: g ? 'Editar grupo' : 'Novo grupo',
    corpo: `<label>Nome<input name="nome" required maxlength="60" value="${esc(g?.nome || '')}"></label><div class="lbl-k" style="margin-bottom:.4rem">Contas do grupo</div>
      ${S.contas.map(c => `<label class="chk" style="margin:.45rem 0"><input type="checkbox" name="contas" value="${c.id}" ${g?.conta_ids.includes(c.id) ? 'checked' : ''}> ${icoHtml(c.icone)} ${esc(c.nome)} <small>${c.arquivada ? '(arquivada)' : ''}</small></label>`).join('')}`,
    onSubmit: async f => {
      const conta_ids = $$('input[name=contas]:checked', f).map(i => i.value);
      if (!conta_ids.length) { toast('Escolha pelo menos uma conta.', true); return false; }
      const reg = { nome: f.nome.value.trim(), conta_ids }; g ? await upd('grupos', g.id, reg) : await ins('grupos', reg); toast('Grupo salvo!'); await recarregar();
    }
  });
}

/* =====================================================================
   REGRAS
   ===================================================================== */
function pgRegras(el) {
  el.innerHTML = cab('Regras', 'Configuração', `<button class="btn" data-a="aplicarRegras">${ic('check', 15)} Aplicar às transações sem categoria</button><button class="btn pri" data-a="novaRegra">${ic('mais', 15)} Nova regra</button>`) +
    `<p class="sub" style="margin-top:-.4rem">Quando a descrição contém o texto, a categoria (e a pessoa) são preenchidas automaticamente ao digitar uma transação e ao importar extratos. Maiúsculas e acentos não importam.</p>
    <div class="card p0">${S.regras.map(r => { const c = S.mCat.get(r.categoria_id), p = S.mP.get(r.pessoa_id); return `<div class="linha-cat"><span class="tile sm fixo" style="background:var(--card3)">${ic('regras', 16)}</span>
      <div class="nm" style="font-weight:400">Se a descrição contém <b>“${esc(r.termo)}”</b> ${ic('seta', 14)} ${c ? `<span class="chip" style="cursor:default">${icoHtml(c.icone)} <b>${esc(c.nome)}</b></span>` : ''} ${p ? `<span class="chip" style="cursor:default">👤 <b>${esc(p.nome)}</b></span>` : ''}</div>
      <span style="display:flex"><button class="icobtn" data-a="editRegra" data-id="${r.id}">${ic('editar', 16)}</button><button class="icobtn perigo" data-a="delRegra" data-id="${r.id}">${ic('lixo', 16)}</button></span></div>`; }).join('') || vazio('Nenhuma regra. Ex.: “IFOOD” → Restaurantes, “UBER” → Transporte.')}</div>`;
}
A.novaRegra = () => modalRegra();
A.editRegra = el => modalRegra(S.regras.find(r => r.id === el.dataset.id));
A.delRegra = async el => { if (!confirm('Excluir esta regra?')) return; await del('regras', el.dataset.id); recarregar(); };
function modalRegra(r = null) {
  modal({
    titulo: r ? 'Editar regra' : 'Nova regra',
    corpo: `<label>Se a descrição contém<input name="termo" required maxlength="80" value="${esc(r?.termo || '')}" placeholder="Ex.: IFOOD, POSTO, NETFLIX"></label>
      <label>Categoria<select name="categoria_id" required><option value="">Escolha…</option><optgroup label="Despesas">${opts(S.categorias.filter(c => c.tipo === 'despesa'), r?.categoria_id)}</optgroup><optgroup label="Receitas">${opts(S.categorias.filter(c => c.tipo === 'receita'), r?.categoria_id)}</optgroup></select></label>
      <label>Pessoa (opcional)<select name="pessoa_id">${opts(S.pessoas, r?.pessoa_id, 'Não alterar')}</select></label>`,
    onSubmit: async f => { const reg = { termo: f.termo.value.trim(), categoria_id: f.categoria_id.value || null, pessoa_id: f.pessoa_id.value || null }; r ? await upd('regras', r.id, reg) : await ins('regras', reg); toast('Regra salva!'); await recarregar(); }
  });
}
A.aplicarRegras = async () => {
  const porCat = new Map(), porPes = new Map();
  S.tx.forEach(t => {
    if (t.tipo === 'transferencia') return;
    const r = aplicarRegra(t.descricao); if (!r) return;
    const c = S.mCat.get(r.categoria_id);
    if (!t.categoria_id && c && c.tipo === t.tipo) { if (!porCat.has(c.id)) porCat.set(c.id, []); porCat.get(c.id).push(t.id); }
    if (!t.pessoa_id && r.pessoa_id) { if (!porPes.has(r.pessoa_id)) porPes.set(r.pessoa_id, []); porPes.get(r.pessoa_id).push(t.id); }
  });
  const nC = soma([...porCat.values()], l => l.length), nP = soma([...porPes.values()], l => l.length);
  if (!nC && !nP) return toast('Nenhuma transação sem categoria corresponde às regras.');
  if (!confirm(`${nC} transação(ões) serão categorizadas${nP ? ` e ${nP} receberão pessoa` : ''}. Continuar?`)) return;
  for (const [cat, ids] of porCat) for (let i = 0; i < ids.length; i += 200) await updIn('transacoes', ids.slice(i, i + 200), { categoria_id: cat });
  for (const [p, ids] of porPes) for (let i = 0; i < ids.length; i += 200) await updIn('transacoes', ids.slice(i, i + 200), { pessoa_id: p });
  toast('Regras aplicadas!'); recarregar();
};

/* =====================================================================
   BUSCA GLOBAL (Ctrl+K)
   ===================================================================== */
A.busca = () => {
  modal({
    titulo: 'Buscar em tudo', largura: 'min(620px,94vw)',
    corpo: `<input id="busca-in" placeholder="Transações, contas, categorias, páginas…" autocomplete="off" data-i="buscaG"><div class="busca-res" id="busca-res" style="margin-top:.6rem"></div>`,
    onOpen: () => { const i = $('#busca-in'); i.focus(); I.buscaG(i); i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#busca-res button')?.click(); } }); }
  });
};
I.buscaG = el => {
  const t = norm(el.value), res = [];
  const add = (grp, itens) => { if (itens.length) res.push(`<div class="grp">${grp}</div>` + itens.join('')); };
  const bt = (tipo, id, icone, titulo, sub = '', dir = '') => `<button type="button" data-a="bgo" data-t="${tipo}" data-id="${id}">${icone}<span style="flex:1;min-width:0"><b style="display:block;font-weight:600">${esc(titulo)}</b>${sub ? `<small>${sub}</small>` : ''}</span>${dir}</button>`;
  add('Páginas', Object.entries(ROTAS).filter(([k, v]) => !t || norm(v[0]).includes(t)).slice(0, t ? 13 : 6).map(([k, v]) => bt('pg', k, `<span class="tile sm fixo" style="background:var(--card3)">${ic(k, 15)}</span>`, v[0])));
  if (t) {
    add('Contas', S.contas.filter(c => norm(c.nome).includes(t)).slice(0, 5).map(c => bt('conta', c.id, tile(c.icone, c.cor, 'sm'), c.nome, TIPOS_CONTA[c.tipo]?.nome || '')));
    add('Categorias', S.categorias.filter(c => norm(c.nome).includes(t)).slice(0, 5).map(c => bt('cat', c.id, tile(c.icone, c.cor, 'sm'), c.nome, c.tipo === 'receita' ? 'Receita' : 'Despesa')));
    add('Pessoas', S.pessoas.filter(p => norm(p.nome).includes(t)).slice(0, 5).map(p => bt('pes', p.id, `<span class="avatar" style="background:${esc(p.cor)};width:30px;height:30px">${esc(p.nome[0])}</span>`, p.nome)));
    add('Metas', S.metas.filter(m => norm(m.nome).includes(t)).slice(0, 4).map(m => bt('pg', 'metas', tile(m.icone, m.cor, 'sm'), m.nome, 'Meta')));
    const txs = S.tx.filter(x => norm(x.descricao + ' ' + (x.observacao || '')).includes(t)).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 25);
    add('Transações', txs.map(x => { const c = S.mCat.get(x.categoria_id); const v = x.tipo === 'transferencia' ? null : sinalTx(x); return bt('tx', x.id, x.tipo === 'transferencia' ? tile('⇄', '#2563eb', 'sm') : tile(c?.icone || '?', c?.cor || '#3f3f4a', 'sm'), x.descricao, `${dataBR(x.data)} · ${esc(S.mC.get(x.conta_id)?.nome || '')}`, `<b class="${v == null ? 'neu' : cls(v)}">${v == null ? fmt(x.valor) : fmtS(v)}</b>`); }));
  }
  $('#busca-res').innerHTML = res.join('') || vazio('Nada encontrado.');
};
A.bgo = el => {
  const { t, id } = el.dataset; $('#modal').close();
  if (t === 'pg') return ir(id);
  if (t === 'conta') return filtrarPor('conta', id);
  if (t === 'cat') return filtrarPor('categoria', id);
  if (t === 'pes') return filtrarPor('pessoa', id);
  if (t === 'tx') { const x = S.tx.find(y => y.id === id); S.mes = x.data.slice(0, 7); filtrarPor('', ''); setTimeout(() => modalTx(x), 50); }
};

/* =====================================================================
   PERFIL
   ===================================================================== */
A.perfil = () => {
  modal({
    titulo: 'Perfil',
    corpo: `<label>Seu nome<input name="nome" maxlength="60" value="${esc(S.user.user_metadata?.nome || '')}" placeholder="${esc(nomeUsuario())}"></label>
      <label>E-mail<input value="${esc(S.user.email)}" disabled></label>
      <label>Nova senha (deixe em branco para não alterar)<input type="password" name="senha" minlength="6" autocomplete="new-password"></label>
      <div class="lbl-k" style="margin:.4rem 0">Seus dados</div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem"><button type="button" class="btn" data-a="backup">${ic('download', 15)} Baixar backup (JSON)</button><button type="button" class="btn" data-a="txCSVTudo">${ic('download', 15)} Todas as transações (CSV)</button></div>`,
    extra: `<button type="button" class="btn perigo" data-a="sair">${ic('sair', 15)} Sair</button>`,
    onSubmit: async f => {
      const dados = {}; if (f.nome.value.trim() !== (S.user.user_metadata?.nome || '')) dados.data = { nome: f.nome.value.trim() };
      if (f.senha.value) dados.password = f.senha.value;
      if (!Object.keys(dados).length) return;
      const { data, error } = await sb.auth.updateUser(dados);
      if (error) { toast(msgErro(error), true); return false; }
      S.user = data.user; toast('Perfil atualizado!'); render();
    }
  });
};
A.sair = async () => { $('#modal').close(); await sb.auth.signOut(); };
A.backup = () => {
  const d = {}; ['contas', 'categorias', 'pessoas', 'grupos', 'tx', 'recorrentes', 'orcamentos', 'metas', 'patrimonio', 'patValores', 'regras'].forEach(k => d[k] = S[k]);
  baixar(`financas-backup-${hoje()}.json`, JSON.stringify({ versao: 1, exportado_em: new Date().toISOString(), ...d }, null, 2), 'application/json');
};
A.txCSVTudo = () => {
  const qt = s => `"${String(s ?? '').replace(/"/g, '""')}"`, L = [['Data', 'Descrição', 'Tipo', 'Categoria', 'Conta', 'Conta destino', 'Pessoa', 'Valor', 'Situação', 'Observação'].join(';')];
  [...S.tx].sort((a, b) => a.data.localeCompare(b.data)).forEach(t => L.push([dataBR(t.data), qt(t.descricao), t.tipo, qt(S.mCat.get(t.categoria_id)?.nome), qt(S.mC.get(t.conta_id)?.nome), qt(S.mC.get(t.conta_destino_id)?.nome), qt(S.mP.get(t.pessoa_id)?.nome), (t.tipo === 'transferencia' ? +t.valor : sinalTx(t)).toFixed(2).replace('.', ','), t.pago ? 'Pago' : 'Pendente', qt(t.observacao)].join(';')));
  baixar(`todas-transacoes-${hoje()}.csv`, '\ufeff' + L.join('\r\n'), 'text/csv;charset=utf-8');
};

/* =====================================================================
   RELATÓRIOS: pizza, detalhe da categoria, aba Categorias e Comparar
   ===================================================================== */
// pizza clicável: cada fatia abre o detalhe da categoria no mesmo período
function grafPizza({ itens, tipo = 'despesa', ini, fim, max = 230 }) {
  itens = itens.filter(i => i.valor > 0);
  const tot = soma(itens, i => i.valor);
  if (!tot) return vazio('Sem lançamentos no período.');
  const R = 92, cx = 100, cy = 100; let a0 = -Math.PI / 2, s = '';
  const attrs = it => it.id !== undefined ? `data-a="relCat" data-id="${it.id}" data-tipo="${tipo}" data-ini="${ini}" data-fim="${fim}"` : '';
  itens.forEach(it => {
    const f = it.valor / tot, a1 = a0 + f * Math.PI * 2, am = (a0 + a1) / 2;
    const d = f > .9999 ? `M${cx} ${cy - R}A${R} ${R} 0 1 1 ${cx - .01} ${cy - R}Z`
      : `M${cx} ${cy}L${fixo(cx + R * Math.cos(a0))} ${fixo(cy + R * Math.sin(a0))}A${R} ${R} 0 ${f > .5 ? 1 : 0} 1 ${fixo(cx + R * Math.cos(a1))} ${fixo(cy + R * Math.sin(a1))}Z`;
    s += `<path d="${d}" fill="${esc(it.cor)}" class="fatia ${it.id !== undefined ? 'clic' : ''}" style="--dx:${fixo(Math.cos(am) * 5)}px;--dy:${fixo(Math.sin(am) * 5)}px" ${attrs(it)}><title>${esc(it.nome)}: ${fmt(it.valor)} (${pct(f)})</title></path>`;
    if (f >= .07) s += `<text x="${fixo(cx + R * .64 * Math.cos(am))}" y="${fixo(cy + R * .64 * Math.sin(am) + 4)}" class="pz-pct">${Math.round(f * 100)}%</text>`;
    a0 = a1;
  });
  return `<div class="pizza-box"><svg viewBox="0 0 200 200" class="pizza anim-fade" style="max-width:${max}px">${s}</svg>
    <div class="pz-leg">${itens.map(it => `<div class="pz-it ${it.id !== undefined ? 'clic' : ''}" ${attrs(it)}><i style="background:${esc(it.cor)}"></i><span>${esc(it.nome)}</span><b>${fmt(it.valor)}</b><small>${pct(it.valor / tot)}</small></div>`).join('')}</div></div>`;
}

// tela com todos os lançamentos de uma categoria no período escolhido
A.relCat = el => modalCategoria(el.dataset.id || '', el.dataset.tipo || 'despesa', el.dataset.ini, el.dataset.fim);
function modalCategoria(id, tipo, ini, fim) {
  const cat = S.mCat.get(id), nome = cat?.nome || 'Sem categoria';
  const lista = txPeriodo(ini, fim).filter(t => t.tipo === tipo && (t.categoria_id || '') === id).sort((a, b) => b.data.localeCompare(a.data));
  const meses = mesesEntre(ini, fim), tot = soma(lista, t => +t.valor);
  const porMes = meses.map(m => soma(lista.filter(t => t.data.startsWith(m)), t => +t.valor));
  const maior = lista.reduce((m, t) => +t.valor > +(m?.valor || 0) ? t : m, null);
  const lugares = new Map(); lista.forEach(t => { const k = semParcela(t.descricao).trim(); const o = lugares.get(k) || { nome: k, valor: 0, n: 0 }; o.valor += +t.valor; o.n++; lugares.set(k, o); });
  const top = [...lugares.values()].sort((a, b) => b.valor - a.valor).slice(0, 6);
  const cor = cat?.cor || '#64748b';
  modal({
    titulo: `<span style="display:inline-flex;align-items:center;gap:.6rem">${tile(cat?.icone || '?', cor, 'sm')}${esc(nome)}</span>`, largura: '760px',
    corpo: `<div class="cat-per">${dataBR(ini)} a ${dataBR(fim)} · ${tipo === 'receita' ? 'receitas' : 'despesas'}</div>
      <div class="kpis cat-kpis"><div><div class="lbl-k">Total</div><div class="val-m ${tipo === 'receita' ? 'pos' : 'neg'}">${fmt(tot)}</div></div>
        <div><div class="lbl-k">Média por mês</div><div class="val-m">${fmt(tot / Math.max(1, meses.length))}</div></div>
        <div><div class="lbl-k">Lançamentos</div><div class="val-m">${lista.length}</div></div>
        <div><div class="lbl-k">Maior</div><div class="val-m">${maior ? fmt(maior.valor) : '—'}</div></div></div>
      ${meses.length > 1 ? `<h3 class="cat-h">Mês a mês</h3>${grafBarras({ labels: meses.map(mesCurto), series: [{ nome: nome, cor, valores: porMes }], h: 190 })}` : ''}
      ${top.length > 1 ? `<h3 class="cat-h">Onde mais ${tipo === 'receita' ? 'recebeu' : 'gastou'}</h3><div class="cat-top">${top.map(o => `<div><span>${esc(o.nome)}</span><small>${o.n}x</small><div class="barra"><div style="width:${top[0].valor ? o.valor / top[0].valor * 100 : 0}%;background:${esc(cor)}"></div></div><b>${fmt(o.valor)}</b></div>`).join('')}</div>` : ''}
      <h3 class="cat-h">Lançamentos (${lista.length})</h3>
      <div class="tabela-wrap cat-lista"><table><tbody>${lista.map(t => `<tr class="clic" data-a="editTx" data-id="${t.id}"><td style="white-space:nowrap;color:var(--sub)">${dataBR(t.data)}</td><td>${esc(t.descricao)}<div class="obs">${esc(S.mC.get(t.conta_id)?.nome || '')}</div></td><td class="num vl">${fmt(t.valor)}</td></tr>`).join('') || `<tr><td>${vazio('Nada neste período.')}</td></tr>`}</tbody></table></div>`,
    extra: `<button type="button" class="btn" data-a="catNasTx" data-id="${id}" data-ini="${ini}" data-fim="${fim}">${ic('transacoes', 15)} Abrir em Transações</button>`,
    onOpen: () => desenharGraficos($('#modal'))
  });
}
A.catNasTx = el => {
  $('#modal').close();
  filtrarPor('categoria', el.dataset.id || '_sem', { ini: el.dataset.ini, fim: el.dataset.fim });
};

// aba Categorias: evolução das principais categorias, dia da semana e maiores gastos
function abaCategorias(ini, fim, meses, labels) {
  const lista = txPeriodo(ini, fim), desp = lista.filter(t => t.tipo === 'despesa');
  const cats = porCategoria(lista, 'despesa').sort((a, b) => b.valor - a.valor), top = cats.slice(0, 6);
  const series = top.map(c => ({ nome: c.nome, cor: c.cor, valores: meses.map(m => soma(desp.filter(t => (t.categoria_id || '') === c.id && t.data.startsWith(m)), t => +t.valor)) }));
  const outros = meses.map(m => soma(desp.filter(t => t.data.startsWith(m) && !top.some(c => c.id === (t.categoria_id || ''))), t => +t.valor));
  if (outros.some(v => v)) series.push({ nome: 'Outras', cor: '#64748b', valores: outros });
  const DS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], porDia = DS.map(() => 0);
  desp.forEach(t => { porDia[new Date(t.data + 'T12:00').getDay()] += +t.valor; });
  const maiores = [...desp].sort((a, b) => b.valor - a.valor).slice(0, 10);
  const nm = Math.max(1, meses.length);
  return `<div class="card mb"><div class="graf-cab"><h2>Principais categorias mês a mês</h2><small>${dataBR(ini)} a ${dataBR(fim)}</small></div>
      ${grafBarras({ labels, empilhado: true, series, h: 300 })}${legenda(series.map(x => [x.nome, x.cor]))}</div>
    <div class="g mb" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
      <div class="card"><div class="graf-cab"><h2>Gastos por dia da semana</h2></div>${grafBarras({ labels: DS, series: [{ nome: 'Gastos', valores: porDia, cores: porDia.map(v => v === Math.max(...porDia) ? '#f43f5e' : '#7b7ff6') }], h: 240 })}</div>
      <div class="card p0"><div class="card-cab"><h2>Média mensal por categoria</h2></div><div class="rolagem">${cats.map(i => `<div class="linha-cat clic" data-a="relCat" data-id="${i.id}" data-tipo="despesa" data-ini="${ini}" data-fim="${fim}">${tile(i.icone, i.cor, 'sm')}<div class="nm">${esc(i.nome)}</div><span class="vl">${fmt(i.valor / nm)}<small style="color:var(--sub);font-weight:400">/mês</small></span></div>`).join('') || vazio('Sem dados.')}</div></div></div>
    <div class="card p0"><div class="card-cab"><h2>10 maiores despesas do período</h2></div><div class="tabela-wrap"><table><tbody>${maiores.map(t => { const c = S.mCat.get(t.categoria_id); return `<tr class="clic" data-a="editTx" data-id="${t.id}"><td style="white-space:nowrap;color:var(--sub)">${dataBR(t.data)}</td><td><div class="tdesc">${c ? tile(c.icone, c.cor, 'sm') : tile('?', '#3f3f4a', 'sm')}<div><div class="d1">${esc(t.descricao)}</div><div class="obs">${esc(c?.nome || 'Sem categoria')}</div></div></div></td><td class="num vl neg">${fmt(t.valor)}</td></tr>`; }).join('') || `<tr><td>${vazio('Sem despesas.')}</td></tr>`}</tbody></table></div></div>`;
}

// aba Comparar: mês x mês ou ano x ano
S.rel.cmp = S.rel.cmp || { modo: 'mes' };
function abaComparar() {
  const o = S.rel.cmp, h = hoje(), ym = h.slice(0, 7), ano = +h.slice(0, 4);
  const datas = S.tx.map(t => t.data).sort(), prim = (datas[0] || h).slice(0, 7);
  const mesesTodos = mesesEntre(prim + '-01', fimMes(ym)).reverse(), anos = []; for (let a = ano; a >= Math.min(+prim.slice(0, 4), ano - 1); a--) anos.push(String(a));
  if (o.modo === 'mes') { o.a = o.a && mesesTodos.includes(o.a) ? o.a : somaMeses(ym + '-01', -1).slice(0, 7); o.b = o.b && mesesTodos.includes(o.b) ? o.b : ym; }
  else { o.a = o.a && anos.includes(o.a) ? o.a : String(ano - 1); o.b = o.b && anos.includes(o.b) ? o.b : String(ano); }
  const per = v => o.modo === 'mes' ? [v + '-01', fimMes(v)] : [v + '-01-01', v + '-12-31'];
  const nomeP = v => o.modo === 'mes' ? nomeMes(v) : v;
  const [ia, fa] = per(o.a), [ib, fb] = per(o.b), LA = txPeriodo(ia, fa), LB = txPeriodo(ib, fb), ra = resumo(LA), rb = resumo(LB);
  const CA = '#94a3b8', CB = S.acento || '#3b82f6';
  const sel = (k, v) => `<select data-c="cmpSel" data-k="${k}">${(o.modo === 'mes' ? mesesTodos.map(m => [m, nomeMes(m)]) : anos.map(a => [a, a])).map(([x, n]) => `<option value="${x}" ${x === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  const delta = (a, b, bomSubir) => { if (!a) return b ? '<span class="dl">novo</span>' : ''; const d = (b - a) / Math.abs(a); if (Math.abs(d) < .005) return '<span class="dl">= igual</span>'; return `<span class="dl ${(d >= 0) === bomSubir ? 'bom' : 'ruim'}">${d >= 0 ? '▲' : '▼'} ${pct(Math.abs(d))}</span>`; };
  const kpi = (n, a, b, bom, f = fmt) => `<div class="cmp-k"><div class="lbl-k">${n}</div><div class="cmp-v"><span style="color:${CA}">${f(a)}</span><span>→</span><b>${f(b)}</b></div>${delta(a, b, bom)}</div>`;
  const ta = ra.rec ? ra.res / ra.rec : 0, tb = rb.rec ? rb.res / rb.rec : 0;
  // categorias lado a lado
  const linhasCat = tipo => {
    const ma = new Map(porCategoria(LA, tipo).map(c => [c.id, c])), mb = new Map(porCategoria(LB, tipo).map(c => [c.id, c]));
    const ids = [...new Set([...ma.keys(), ...mb.keys()])].map(id => ({ id, c: mb.get(id) || ma.get(id), a: ma.get(id)?.valor || 0, b: mb.get(id)?.valor || 0 })).sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b));
    const mx = Math.max(1, ...ids.map(x => Math.max(x.a, x.b)));
    return ids.map(x => `<div class="cmp-cat clic" data-a="relCat" data-id="${x.id}" data-tipo="${tipo}" data-ini="${ia < ib ? ia : ib}" data-fim="${fa > fb ? fa : fb}">${tile(x.c.icone, x.c.cor, 'sm')}
      <div class="nm"><div class="cmp-cat-t"><span>${esc(x.c.nome)}</span>${delta(x.a, x.b, tipo === 'receita')}</div>
      <div class="cmp-bar"><i style="width:${x.a / mx * 100}%;background:${CA}"></i><small>${fmt(x.a)}</small></div><div class="cmp-bar"><i style="width:${x.b / mx * 100}%;background:${CB}"></i><small>${fmt(x.b)}</small></div></div></div>`).join('') || vazio('Sem dados.');
  };
  let graf = '';
  if (o.modo === 'ano') {
    const M = MESES_C.map((_, i) => String(i + 1).padStart(2, '0'));
    const mesA = M.map(m => resumo(LA.filter(t => t.data.slice(5, 7) === m))), mesB = M.map(m => resumo(LB.filter(t => t.data.slice(5, 7) === m)));
    let ac = 0; const acA = mesA.map(x => ac += x.res); ac = 0; const acB = mesB.map((x, i) => (o.b + '-' + M[i]) > ym ? null : ac += x.res);
    graf = `<div class="g mb" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
      <div class="card"><div class="graf-cab"><h2>Despesas mês a mês</h2></div>${grafBarras({ labels: MESES_C, series: [{ nome: o.a, cor: CA, valores: mesA.map(x => x.desp) }, { nome: o.b, cor: CB, valores: mesB.map(x => x.desp) }], h: 250 })}${legenda([[o.a, CA], [o.b, CB]])}</div>
      <div class="card"><div class="graf-cab"><h2>Receitas mês a mês</h2></div>${grafBarras({ labels: MESES_C, series: [{ nome: o.a, cor: CA, valores: mesA.map(x => x.rec) }, { nome: o.b, cor: CB, valores: mesB.map(x => x.rec) }], h: 250 })}${legenda([[o.a, CA], [o.b, CB]])}</div></div>
      <div class="card mb"><div class="graf-cab"><h2>Quanto sobrou, acumulado no ano</h2></div>${grafLinhas({ labels: MESES_C, series: [{ nome: o.a, cor: CA, valores: acA }, { nome: o.b, cor: CB, valores: acB }], h: 260 })}${legenda([[o.a, CA], [o.b, CB]])}</div>`;
  } else {
    const dias = Array.from({ length: 31 }, (_, i) => i + 1);
    const acum = (L, ym2) => { let ac = 0; const lim = ym2 === ym ? +h.slice(8) : +fimMes(ym2).slice(8); return dias.map(d => d > lim ? null : (ac += soma(L.filter(t => t.tipo === 'despesa' && +t.data.slice(8) === d), t => +t.valor))); };
    graf = `<div class="card mb"><div class="graf-cab"><h2>Gasto acumulado ao longo do mês</h2><small>dia a dia</small></div>${grafLinhas({ labels: dias.map(String), series: [{ nome: nomeP(o.a), cor: CA, valores: acum(LA, o.a) }, { nome: nomeP(o.b), cor: CB, valores: acum(LB, o.b) }], h: 260 })}${legenda([[nomeP(o.a), CA], [nomeP(o.b), CB]])}</div>`;
  }
  return `<div class="card mb cmp-topo"><div class="seg"><button class="${o.modo === 'mes' ? 'on' : ''}" data-a="cmpModo" data-v="mes">Mês × Mês</button><button class="${o.modo === 'ano' ? 'on' : ''}" data-a="cmpModo" data-v="ano">Ano × Ano</button></div>
      <div class="cmp-sel"><span class="pt" style="background:${CA}"></span>${sel('a', o.a)}<b>×</b><span class="pt" style="background:${CB}"></span>${sel('b', o.b)}</div></div>
    <div class="card mb"><div class="cmp-kpis">${kpi('Receitas', ra.rec, rb.rec, true)}${kpi('Despesas', ra.desp, rb.desp, false)}${kpi('Resultado', ra.res, rb.res, true, fmtS)}${kpi('Taxa de economia', ta, tb, true, pct)}</div></div>
    ${graf}
    <div class="g mb" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
      <div class="card"><div class="graf-cab"><h2>Despesas · ${esc(nomeP(o.a))}</h2></div>${grafPizza({ itens: topN(porCategoria(LA, 'despesa'), 7, 'Demais categorias'), ini: ia, fim: fa, max: 190 })}</div>
      <div class="card"><div class="graf-cab"><h2>Despesas · ${esc(nomeP(o.b))}</h2></div>${grafPizza({ itens: topN(porCategoria(LB, 'despesa'), 7, 'Demais categorias'), ini: ib, fim: fb, max: 190 })}</div></div>
    <div class="g" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
      <div class="card p0"><div class="card-cab"><h2>Despesas por categoria</h2><small class="cmp-leg"><i style="background:${CA}"></i>${esc(nomeP(o.a))} <i style="background:${CB}"></i>${esc(nomeP(o.b))}</small></div><div class="rolagem">${linhasCat('despesa')}</div></div>
      <div class="card p0"><div class="card-cab"><h2>Receitas por categoria</h2><small class="cmp-leg"><i style="background:${CA}"></i>${esc(nomeP(o.a))} <i style="background:${CB}"></i>${esc(nomeP(o.b))}</small></div><div class="rolagem">${linhasCat('receita')}</div></div></div>`;
}
A.cmpModo = el => { S.rel.cmp = { modo: el.dataset.v }; render(); };
C.cmpSel = el => { S.rel.cmp[el.dataset.k] = el.value; render(); };
