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
  let topo = cab('Patrimônio e fluxo', 'Análises', `<div class="seg">${pers.map(([v, n]) => `<button class="${r.per === v ? 'on' : ''}" data-a="relPer" data-v="${v}">${n}</button>`).join('')}</div>
    ${r.per === 'custom' ? `<input type="date" value="${ini}" data-c="relIni" style="width:auto"><input type="date" value="${fim}" data-c="relFim" style="width:auto">` : ''}`);
  topo += `<div class="abas-sub">${[['pl', 'Patrimônio Líquido'], ['rd', 'Receitas vs Despesas'], ['fc', 'Fluxo de Caixa'], ['mapa', 'Mapa do Dinheiro']].map(([v, n]) => `<button class="${r.aba === v ? 'on' : ''}" data-a="relAba" data-v="${v}">${n}</button>`).join('')}</div>`;
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
        ${grafLinhas({ labels, series: [{ nome: 'Patrimônio líquido', cor: '#7b7ff6', valores: pts.map(p => p.liquido), area: true }], h: 300, w: 1100 })}</div>
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
      return `<div class="card p0"><div class="card-cab"><h2>${titulo}</h2><b>${fmt(t)}</b></div><div class="rolagem">${itens.map(i => `<div class="linha-cat" style="cursor:pointer" data-a="verCat" data-id="${i.id}">${tile(i.icone, i.cor, 'sm')}<div class="nm">${esc(i.nome)}<div class="barra" style="margin-top:.35rem"><div style="width:${t ? i.valor / t * 100 : 0}%;background:${esc(i.cor)}"></div></div></div><span class="vl">${fmt(i.valor)}</span><small style="width:44px;text-align:right">${t ? pct(i.valor / t) : ''}</small></div>`).join('') || vazio('Sem dados.')}</div></div>`;
    };
    c = `<div class="card mb"><div class="kpis" style="border:none;margin:0;padding:0">
        <div><div class="lbl-k">Receitas</div><div class="val-m pos">${fmt(tot.rec)}</div></div><div><div class="lbl-k">Despesas</div><div class="val-m neg">${fmt(tot.desp)}</div></div>
        <div><div class="lbl-k">Resultado</div><div class="val-m ${cls(tot.res)}">${fmtS(tot.res)}</div></div><div><div class="lbl-k">Taxa de economia · média de gastos/mês</div><div class="val-m">${taxa == null ? '—' : pct(taxa)} · ${fmt(tot.desp / Math.max(1, meses.length))}</div></div></div></div>
      <div class="card mb"><h2 style="margin-bottom:.8rem">Receitas vs despesas por mês</h2>
        ${grafBarras({ labels, series: [{ nome: 'Receitas', cor: '#22c55e', valores: rs.map(x => x.rec) }, { nome: 'Despesas', cor: '#f43f5e', valores: rs.map(x => x.desp) }], linha: { nome: 'Resultado', cor: '#7b7ff6', valores: rs.map(x => x.res) }, w: 1100, h: 300 })}
        ${legenda([['Receitas', '#22c55e'], ['Despesas', '#f43f5e'], ['Resultado', '#7b7ff6']])}</div>
      <div class="g mb" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">${bloco('despesa', 'Despesas por categoria')}${bloco('receita', 'Receitas por categoria')}</div>
      <div class="card p0"><div class="tabela-wrap"><table><thead><tr><th>Mês</th><th class="num">Receitas</th><th class="num">Despesas</th><th class="num">Resultado</th><th class="num">Economia</th></tr></thead>
        <tbody>${meses.map((m, i) => ({ m, x: rs[i] })).reverse().map(({ m, x }) => `<tr><td>${nomeMes(m)}</td><td class="num pos">${fmt(x.rec)}</td><td class="num neg">${fmt(x.desp)}</td><td class="num vl ${cls(x.res)}">${fmtS(x.res)}</td><td class="num">${x.rec ? pct(x.res / x.rec) : '—'}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

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
        ${grafBarras({ labels, series: [{ nome: 'Resultado do mês', valores: rs, cores: rs.map(v => v >= 0 ? '#22c55e' : '#f43f5e') }], linha: { nome: 'Acumulado', cor: '#7b7ff6', valores: acum }, w: 1100, h: 300 })}
        ${legenda([['Resultado positivo', '#22c55e'], ['Resultado negativo', '#f43f5e'], ['Acumulado no período', '#7b7ff6']])}</div>
      <div class="card mb"><h2 style="margin-bottom:.8rem">Saldo disponível no fim de cada mês</h2>${grafLinhas({ labels, series: [{ nome: 'Saldo disponível', cor: '#0ea5e9', valores: sal, area: true }], h: 260, w: 1100 })}</div>
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
function pgPatrimonio(el) {
  const h = hoje(), ativos = S.patrimonio.filter(p => p.natureza !== 'passivo'), passivos = S.patrimonio.filter(p => p.natureza === 'passivo');
  const tA = soma(ativos, p => valorItem(p.id, h)), tP = soma(passivos, p => valorItem(p.id, h));
  const cores = ['#6366f1', '#f43f5e', '#14b8a6', '#f59e0b', '#84cc16', '#0ea5e9', '#ec4899', '#a855f7'];
  let c = '';
  if (S.patAba === 'carteira') {
    const primeira = S.patValores.filter(v => ativos.some(a => a.id === v.item_id)).map(v => v.data).sort()[0];
    let graf = vazio('Adicione bens (imóveis, veículos…) para acompanhar a evolução.');
    if (primeira) {
      let meses = mesesEntre(primeira, h);
      if (meses.length > 60) { const passo = Math.ceil(meses.length / 60); meses = meses.filter((_, i) => i % passo === 0 || i === meses.length - 1); }
      const series = ativos.map((p, i) => ({ nome: p.nome, cor: cores[i % cores.length], valores: meses.map(m => valorItem(p.id, fimMes(m) < h ? fimMes(m) : h)), area: true, semPontos: meses.length > 16 }));
      graf = grafLinhas({ labels: meses.map(mesCurto), series, empilhado: S.patModo === 'emp', h: 300, w: 1100 }) + legenda(series.map(s => [s.nome, s.cor]));
    }
    const linha = (p, tot) => {
      const v = valorItem(p.id, h), ult = S.patValores.filter(x => x.item_id === p.id).at(-1);
      return `<tr><td><div class="tdesc">${tile(p.icone, p.natureza === 'passivo' ? '#7f1d1d' : '#1e1b4b', 'sm')}<div><div class="d1">${esc(p.nome)}</div><div class="obs">${esc(TIPOS_ITEM[p.tipo] || p.tipo)}${ult ? ` · atualizado em ${dataBR(ult.data)}` : ''}</div></div></div></td>
        <td class="num vl">${fmt(v)}</td><td class="num">${tot ? pct(v / tot) : '—'}</td>
        <td class="num" style="white-space:nowrap"><button class="btn mini" data-a="valorItem" data-id="${p.id}">${ic('atualizar', 13)} Atualizar valor</button>
          <button class="icobtn" data-a="editItem" data-id="${p.id}" title="Editar">${ic('editar', 16)}</button><button class="icobtn perigo" data-a="delItem" data-id="${p.id}" title="Excluir">${ic('lixo', 16)}</button></td></tr>`;
    };
    const tabela = (lista, tot, titulo) => `<div class="sec-tit"><span>${titulo}</span><span>${fmt(tot)}</span></div>
      <div class="card p0 mb"><div class="tabela-wrap"><table><thead><tr><th>Item</th><th class="num">Valor</th><th class="num">% do total</th><th></th></tr></thead>
      <tbody>${lista.map(p => linha(p, tot)).join('') || `<tr><td colspan="4">${vazio('Nenhum item.')}</td></tr>`}</tbody></table></div></div>`;
    c = `<div class="card mb"><div class="graf-cab"><div><h2>Valor do patrimônio</h2>
        <div class="seg" style="margin-top:.5rem"><button class="${S.patModo === 'emp' ? 'on' : ''}" data-a="patModo" data-v="emp">Empilhado</button><button class="${S.patModo === 'lin' ? 'on' : ''}" data-a="patModo" data-v="lin">Linhas</button></div></div>
        <div style="text-align:right"><div class="lbl-k">Total em bens</div><div class="val-m">${fmt(tA)}</div>${tP ? `<small>Dívidas: <span class="neg">${fmt(tP)}</span></small>` : ''}</div></div>${graf}</div>
      ${tabela(ativos, tA, 'Ativos')}${tabela(passivos, tP, 'Passivos (dívidas, financiamentos)')}`;
  } else {
    const hist = [...S.patValores].sort((a, b) => b.data.localeCompare(a.data));
    c = `<div class="card p0"><div class="tabela-wrap"><table><thead><tr><th>Data</th><th>Item</th><th>Observação</th><th class="num">Valor</th><th></th></tr></thead><tbody>
      ${hist.map(v => { const p = S.patrimonio.find(x => x.id === v.item_id); return `<tr><td>${dataBR(v.data)}</td><td>${esc(p?.icone || '')} ${esc(p?.nome || '?')}</td><td class="sub">${esc(v.observacao || '')}</td><td class="num vl">${fmt(v.valor)}</td><td class="num"><button class="icobtn perigo" data-a="delValor" data-id="${v.id}">${ic('lixo', 16)}</button></td></tr>`; }).join('') || `<tr><td colspan="5">${vazio('Sem histórico.')}</td></tr>`}
      </tbody></table></div></div>`;
  }
  el.innerHTML = cab('Patrimônio', 'Análises', `<button class="btn pri" data-a="novoItem">${ic('mais', 15)} Adicionar item</button>`) +
    `<div class="abas"><button class="aba ${S.patAba === 'carteira' ? 'on' : ''}" data-a="patAba" data-v="carteira">Carteira</button><button class="aba ${S.patAba === 'hist' ? 'on' : ''}" data-a="patAba" data-v="hist">Histórico de valores</button></div>` + c +
    `<p class="nota">Saldos de contas (inclusive investimentos e cartões) entram automaticamente no patrimônio líquido em Relatórios. Aqui ficam bens e dívidas que não são contas.</p>`;
}
A.patAba = el => { S.patAba = el.dataset.v; render(); };
A.patModo = el => { S.patModo = el.dataset.v; render(); };
A.novoItem = () => modalItem();
A.editItem = el => modalItem(S.patrimonio.find(p => p.id === el.dataset.id));
A.valorItem = el => modalValor(S.patrimonio.find(p => p.id === el.dataset.id));
A.delItem = async el => { const p = S.patrimonio.find(x => x.id === el.dataset.id); if (!confirm(`Excluir "${p.nome}" e todo o histórico de valores?`)) return; await del('patrimonio', p.id); toast('Item excluído.'); recarregar(); };
A.delValor = async el => { if (!confirm('Excluir este registro de valor?')) return; await del('patrimonio_valores', el.dataset.id); recarregar(); };
function modalItem(p = null) {
  modal({
    titulo: p ? 'Editar item' : 'Adicionar item ao patrimônio',
    corpo: `<label>Nome<input name="nome" required maxlength="80" value="${esc(p?.nome || '')}" placeholder="Ex.: Apartamento, Ford Ka 2019, Financiamento"></label>
      <div class="g2"><label>Natureza<select name="natureza"><option value="ativo" ${p?.natureza !== 'passivo' ? 'selected' : ''}>Ativo (bem)</option><option value="passivo" ${p?.natureza === 'passivo' ? 'selected' : ''}>Passivo (dívida)</option></select></label>
      <label>Tipo<select name="tipo">${optsObj(TIPOS_ITEM, p?.tipo || 'imovel')}</select></label></div>
      ${p ? '' : `<div class="g2"><label>Valor atual (R$)<input name="valor" inputmode="decimal" required placeholder="0,00"></label><label>Data do valor<input type="date" name="data" value="${hoje()}" required></label></div>
        <p class="ajuda">Dica: para ver a evolução, cadastre um valor antigo (ex.: preço de compra) e depois use “Atualizar valor”.</p>`}
      <label>Ícone${pickIcone('icone', p?.icone || '🏠')}</label>`,
    onSubmit: async f => {
      const reg = { nome: f.nome.value.trim(), natureza: f.natureza.value, tipo: f.tipo.value, icone: f.icone.value.trim() || '🏠' };
      if (p) await upd('patrimonio', p.id, reg);
      else { const [n] = await ins('patrimonio', reg); await ins('patrimonio_valores', { item_id: n.id, data: f.data.value, valor: parseNum(f.valor.value) || 0, observacao: 'Valor inicial' }); }
      toast('Item salvo!'); await recarregar();
    }
  });
}
function modalValor(p) {
  modal({
    titulo: `Atualizar valor · ${esc(p.nome)}`,
    corpo: `<div class="g2"><label>Novo valor (R$)<input name="valor" inputmode="decimal" required value="${valorItem(p.id).toFixed(2).replace('.', ',')}"></label><label>Data<input type="date" name="data" value="${hoje()}" required></label></div>
      <label>Observação<input name="observacao" maxlength="200" placeholder="Ex.: avaliação FIPE, reforma, amortização"></label>`,
    onSubmit: async f => { await ins('patrimonio_valores', { item_id: p.id, data: f.data.value, valor: parseNum(f.valor.value) || 0, observacao: f.observacao.value.trim() || null }); toast('Valor atualizado!'); await recarregar(); }
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
A.metaSt = async el => { await upd('metas', el.dataset.id, { status: el.dataset.s }); toast('Meta atualizada.'); recarregar(); };
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
      <label>Cor${pickCor('cor', c?.cor || CORES[Math.floor(Math.random() * CORES.length)])}</label><label>Ícone${pickIcone('icone', c?.icone || '🏷️')}</label>`,
    onSubmit: async f => {
      const reg = { nome: f.nome.value.trim(), tipo: f.tipo.value, cor: corDe(f, 'cor'), icone: f.icone.value.trim() || '🏷️' };
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
        <div class="chips">${cs.map(c => `<span class="chip"><span class="mini-tile" style="background:${esc(c.cor)}">${esc(c.icone)}</span>${esc(c.nome)}</span>`).join('')}</div>
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
      ${S.contas.map(c => `<label class="chk" style="margin:.45rem 0"><input type="checkbox" name="contas" value="${c.id}" ${g?.conta_ids.includes(c.id) ? 'checked' : ''}> ${esc(c.icone)} ${esc(c.nome)} <small>${c.arquivada ? '(arquivada)' : ''}</small></label>`).join('')}`,
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
    <div class="card p0">${S.regras.map(r => { const c = S.mCat.get(r.categoria_id), p = S.mP.get(r.pessoa_id); return `<div class="linha-cat"><span class="tile sm" style="background:var(--card3)">${ic('regras', 16)}</span>
      <div class="nm" style="font-weight:400">Se a descrição contém <b>“${esc(r.termo)}”</b> ${ic('seta', 14)} ${c ? `<span class="chip" style="cursor:default">${esc(c.icone)} <b>${esc(c.nome)}</b></span>` : ''} ${p ? `<span class="chip" style="cursor:default">👤 <b>${esc(p.nome)}</b></span>` : ''}</div>
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
  add('Páginas', Object.entries(ROTAS).filter(([k, v]) => !t || norm(v[0]).includes(t)).slice(0, t ? 13 : 6).map(([k, v]) => bt('pg', k, `<span class="tile sm" style="background:var(--card3)">${ic(k, 15)}</span>`, v[0])));
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
