'use strict';
/* =====================================================================
   PÁGINAS: Início, Transações, Contas, Importar
   ===================================================================== */

function filtrarPor(campo, valor) {
  S.f = { busca: '', tipo: '', conta: '', categoria: '', pessoa: '', status: '', min: '', max: '', tag: '' };
  if (campo) S.f[campo] = valor;
  S.txDia = null; S.txSel.clear(); S.txView = 'lista';
  ir('transacoes');
}
A.verConta = el => filtrarPor('conta', el.dataset.id);
A.verCat = el => filtrarPor('categoria', el.dataset.id || '_sem');
A.verPessoa = el => filtrarPor('pessoa', el.dataset.id);
A.verPendentes = () => filtrarPor('status', 'pend');
A.noop = () => { };

/* =====================================================================
   INÍCIO (dashboard)
   ===================================================================== */
A.gcOrd = () => { S.gcOrd = S.gcOrd === 'valor' ? 'var' : 'valor'; render(); };
C.comp = el => { S.comp = +el.value; ls.set('comp', S.comp); render(); };
A.pagarTx = async (el, e) => { e.stopPropagation(); await upd('transacoes', el.dataset.id, { pago: true }); toast('Marcado como pago.'); recarregar(); };

/* =====================================================================
   TRANSAÇÕES
   ===================================================================== */
function txFiltradas(ignorarDia = false) {
  const f = S.f, b = norm(f.busca);
  let l = f.tag ? txVis() : txVis().filter(t => t.data.startsWith(S.mes));
  if (S.txDia && !ignorarDia) l = l.filter(t => t.data === S.txDia);
  l = l.filter(t =>
    (!f.tipo || t.tipo === f.tipo) &&
    (!f.conta || t.conta_id === f.conta || t.conta_destino_id === f.conta) &&
    (!f.categoria || (f.categoria === '_sem' ? !t.categoria_id && t.tipo !== 'transferencia' : t.categoria_id === f.categoria)) &&
    (!f.pessoa || t.pessoa_id === f.pessoa) &&
    (!f.tag || (t.tags || []).includes(f.tag)) &&
    (!f.status || (f.status === 'pago') === t.pago) &&
    (f.min === '' || +t.valor >= parseNum(f.min)) &&
    (f.max === '' || +t.valor <= parseNum(f.max)) &&
    (!b || norm(`${t.descricao} ${t.observacao || ''} ${S.mCat.get(t.categoria_id)?.nome || ''} ${S.mC.get(t.conta_id)?.nome || ''} ${S.mP.get(t.pessoa_id)?.nome || ''} ${(t.tags || []).join(' ')}`).includes(b)));
  const { c, d } = S.txOrd;
  l.sort((x, y) => (c === 'valor' ? (+x.valor - +y.valor) : (x.data.localeCompare(y.data) || (x.criado_em || '').localeCompare(y.criado_em || ''))) * d);
  return l;
}

function pgTransacoes(el) {
  const f = S.f;
  const nAtivos = ['tipo', 'conta', 'categoria', 'pessoa', 'status', 'min', 'max'].filter(k => f[k]).length;
  const colsNomes = { categoria: 'Categoria', conta: 'Conta', pessoa: 'Pessoa', situacao: 'Situação' };
  const catsOpt = `<option value="">Todas</option><option value="_sem" ${f.categoria === '_sem' ? 'selected' : ''}>Sem categoria</option>
    <optgroup label="Despesas">${opts(S.categorias.filter(c => c.tipo === 'despesa'), f.categoria)}</optgroup><optgroup label="Receitas">${opts(S.categorias.filter(c => c.tipo === 'receita'), f.categoria)}</optgroup>`;
  el.innerHTML = cab('Transações', 'Financeiro', `${navMes()}
      <div class="seg"><button class="${S.txView === 'lista' ? 'on' : ''}" data-a="txView" data-v="lista">Lista</button><button class="${S.txView === 'cal' ? 'on' : ''}" data-a="txView" data-v="cal">Calendário</button></div>
      <div class="rel"><button class="btn" data-a="txCols">${ic('colunas', 15)} Colunas</button>
        <div id="pop-cols" class="popover hidden">${Object.entries(colsNomes).map(([k, n]) => `<label class="chk"><input type="checkbox" data-c="txCol" data-k="${k}" ${S.cols[k] ? 'checked' : ''}> ${n}</label>`).join('')}</div></div>
      <button class="btn ico" data-a="recarregar" title="Atualizar">${ic('atualizar', 15)}</button>
      <button class="btn" data-a="txCSV">${ic('download', 15)} Exportar CSV</button>
      <button class="btn" data-a="novaTransf">${ic('transf', 15)} Transferência</button>
      <button class="btn pri" data-a="novaTx">${ic('mais', 15)} Adicionar Transação</button>`) +
    `<div class="barra-busca"><div class="campo">${ic('busca', 16)}<input id="tx-busca" placeholder="Buscar transações…" value="${esc(f.busca)}" data-i="txBusca" autocomplete="off"></div>
      ${S.txDia ? `<span class="chip" data-a="txLimpaDia">Dia ${dataBR(S.txDia)} ✕</span>` : ''}${f.tag ? `<span class="chip" data-a="txLimpaTag"># ${esc(f.tag)} ✕</span>` : ''}
      <button class="btn ${S.txFiltros || nAtivos ? 'ativo' : ''}" data-a="txFiltros">${ic('filtro', 15)} Filtros${nAtivos ? ` (${nAtivos})` : ''}</button></div>
    ${S.txFiltros ? `<div class="painel-filtros">
      <label>Tipo<select data-c="txF" data-k="tipo"><option value="">Todos</option>${optsObj({ despesa: 'Despesas', receita: 'Receitas', transferencia: 'Transferências' }, f.tipo)}</select></label>
      <label>Conta<select data-c="txF" data-k="conta">${opts(S.contas, f.conta, 'Todas')}</select></label>
      <label>Categoria<select data-c="txF" data-k="categoria">${catsOpt}</select></label>
      <label>Pessoa<select data-c="txF" data-k="pessoa">${opts(S.pessoas, f.pessoa, 'Todas')}</select></label>
      <label>Situação<select data-c="txF" data-k="status"><option value="">Todas</option>${optsObj({ pago: 'Pagas', pend: 'Pendentes' }, f.status)}</select></label>
      <label>Valor mínimo<input data-c="txF" data-k="min" value="${esc(f.min)}" inputmode="decimal" placeholder="0,00"></label>
      <label>Valor máximo<input data-c="txF" data-k="max" value="${esc(f.max)}" inputmode="decimal" placeholder="0,00"></label>
      <div style="display:flex;align-items:flex-end"><button class="btn largo" data-a="txLimpaF">Limpar filtros</button></div></div>` : ''}
    <div id="tx-corpo"></div>`;
  renderTxCorpo();
}

function renderTxCorpo() {
  const box = $('#tx-corpo'); if (!box) return;
  const lista = txFiltradas(), ids = idsVis(), r = resumo(lista.filter(t => t.pago));
  const vis = new Set(lista.map(t => t.id));
  [...S.txSel].forEach(id => { if (!vis.has(id)) S.txSel.delete(id); });
  let h = `<div class="resumo-linha"><span>${lista.length} transação(ões)</span><span>Entradas<b class="pos">${fmt(r.rec)}</b></span><span>Saídas<b class="neg">${fmt(r.desp)}</b></span><span>Resultado<b class="${cls(r.res)}">${fmtS(r.res)}</b></span>${lista.some(t => !t.pago) ? `<span>Pendentes<b class="neu">${lista.filter(t => !t.pago).length}</b></span>` : ''}</div>`;
  if (S.txSel.size) {
    h += `<div class="lote"><b>${S.txSel.size} selecionada(s)</b>
      <select id="lote-cat"><option value="">Categorizar como…</option><optgroup label="Despesas">${opts(S.categorias.filter(c => c.tipo === 'despesa'))}</optgroup><optgroup label="Receitas">${opts(S.categorias.filter(c => c.tipo === 'receita'))}</optgroup></select>
      <button class="btn mini" data-a="loteCat">Aplicar</button>
      <select id="lote-pes"><option value="">Atribuir pessoa…</option>${opts(S.pessoas)}</select><button class="btn mini" data-a="lotePes">Aplicar</button>
      <button class="btn mini" data-a="lotePago">${ic('check', 13)} Marcar pago</button><button class="btn mini" data-a="lotePend">Marcar pendente</button>
      <button class="btn mini perigo" data-a="loteDel">${ic('lixo', 13)} Excluir</button><button class="lnk" data-a="loteLimpa">Limpar seleção</button></div>`;
  }
  if (S.txView === 'cal') { box.innerHTML = h + calendarioTx(); return; }
  if (!lista.length) { box.innerHTML = h + `<div class="card">${vazio('Nenhuma transação encontrada neste mês. <button class="lnk" data-a="novaTx">Adicionar transação</button>')}</div>`; return; }
  const cols = S.cols, todos = lista.every(t => S.txSel.has(t.id));
  const seta = c => S.txOrd.c === c ? (S.txOrd.d < 0 ? ' ↓' : ' ↑') : '';
  const linha = t => {
    const c = S.mCat.get(t.categoria_id), isT = t.tipo === 'transferencia', co = S.mC.get(t.conta_id), cd = S.mC.get(t.conta_destino_id), p = S.mP.get(t.pessoa_id);
    const v = isT ? (filtrando() ? sinalTx(t, ids) : null) : sinalTx(t);
    const icone = isT ? tile('⇄', '#2563eb', 'sm') : c ? tile(c.icone, c.cor, 'sm') : tile('?', '#3f3f4a', 'sm');
    return `<tr class="clic ${S.txSel.has(t.id) ? 'sel' : ''}" data-a="editTx" data-id="${t.id}">
      <td data-a="noop" style="width:36px"><input type="checkbox" data-a="selTx" data-id="${t.id}" ${S.txSel.has(t.id) ? 'checked' : ''}></td>
      <td style="white-space:nowrap;color:var(--sub)">${dataBR(t.data)}</td>
      <td><div class="tdesc">${icone}<div><div class="d1">${esc(t.descricao)}${isT ? `<span class="tbadge">⇄ Transferência</span>` : ''}${!t.pago && !cols.situacao ? '<span class="pend">Pendente</span>' : ''}${(t.tags || []).map(g => `<span class="tag">${esc(g)}</span>`).join('')}${t.recorrente_id ? `<span title="Recorrente" style="color:var(--sub);display:inline-flex">${ic('recorrentes', 13)}</span>` : ''}</div>${t.observacao ? `<div class="obs">${esc(t.observacao)}</div>` : ''}</div></div></td>
      ${cols.categoria ? `<td class="col-opc">${isT ? '<span class="semcat">—</span>' : c ? esc(c.nome) : '<span class="semcat">Sem categoria</span>'}</td>` : ''}
      ${cols.conta ? `<td class="col-opc"><span class="cel-conta">${isT ? `${esc(co?.nome || '?')} ${ic('seta', 13)} ${esc(cd?.nome || '?')}` : `${co ? `<span class="mini-tile" style="background:${esc(co.cor)};width:18px;height:18px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:.6rem">${icoHtml(co.icone)}</span>` : ''}${esc(co?.nome || '—')}`}</span></td>` : ''}
      ${cols.pessoa ? `<td class="col-opc">${p ? esc(p.nome) : '<span class="semcat">—</span>'}</td>` : ''}
      ${cols.situacao ? `<td class="col-opc">${t.pago ? '<span class="badge ok">Pago</span>' : `<span class="badge ${t.data < hoje() ? 'er' : 'av'}">${t.data < hoje() ? 'Vencido' : 'Pendente'}</span>`}</td>` : ''}
      <td class="num vl ${v == null ? 'neu' : cls(v)}">${v == null ? fmt(t.valor) : fmtS(v)}</td></tr>`;
  };
  box.innerHTML = h + `<div class="card p0"><div class="tabela-wrap"><table>
    <thead><tr><th style="width:36px"><input type="checkbox" data-a="selTodos" ${todos ? 'checked' : ''}></th>
      <th class="ord" data-a="txOrd" data-k="data">Data${seta('data')}</th><th>Descrição</th>
      ${cols.categoria ? '<th class="col-opc">Categoria</th>' : ''}${cols.conta ? '<th class="col-opc">Conta</th>' : ''}${cols.pessoa ? '<th class="col-opc">Pessoa</th>' : ''}${cols.situacao ? '<th class="col-opc">Situação</th>' : ''}
      <th class="num ord" data-a="txOrd" data-k="valor">Valor${seta('valor')}</th></tr></thead>
    <tbody>${lista.map(linha).join('')}</tbody></table></div></div>`;
}

function calendarioTx() {
  const ym = S.mes, [y, m] = ym.split('-').map(Number), primeiro = new Date(y, m - 1, 1).getDay(), n = diasNoMes(ym), h = hoje();
  const lista = txFiltradas(true), dia = {};
  lista.forEach(t => { const d = dia[t.data] ||= { r: 0, d: 0, q: 0 }; d.q++; if (t.tipo === 'receita') d.r += +t.valor; if (t.tipo === 'despesa') d.d += +t.valor; });
  let s = '<div class="cal">' + ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(x => `<div class="cab">${x}</div>`).join('');
  for (let i = 0; i < primeiro; i++) s += '<div class="cd fora"></div>';
  for (let d = 1; d <= n; d++) {
    const iso = `${ym}-${pad(d)}`, x = dia[iso];
    s += `<div class="cd ${iso === h ? 'hj' : ''}" data-a="calDia" data-d="${iso}"><span class="dn">${d}</span>
      ${x?.r ? `<span class="pos">+${fmt(x.r)}</span>` : ''}${x?.d ? `<span class="neg">-${fmt(x.d)}</span>` : ''}${x ? `<span class="qt">${x.q} lanç.</span>` : ''}</div>`;
  }
  const resto = (7 - (primeiro + n) % 7) % 7;
  for (let i = 0; i < resto; i++) s += '<div class="cd fora"></div>';
  return s + '</div>';
}

I.txBusca = el => { S.f.busca = el.value; renderTxCorpo(); };
C.txF = el => { S.f[el.dataset.k] = el.value; S.txSel.clear(); renderTxCorpo(); const b = $('[data-a=txFiltros]'); const n = ['tipo', 'conta', 'categoria', 'pessoa', 'status', 'min', 'max'].filter(k => S.f[k]).length; if (b) b.innerHTML = `${ic('filtro', 15)} Filtros${n ? ` (${n})` : ''}`; };
A.txFiltros = () => { S.txFiltros = !S.txFiltros; render(); };
A.txLimpaF = () => { Object.assign(S.f, { tipo: '', conta: '', categoria: '', pessoa: '', status: '', min: '', max: '' }); render(); };
A.txLimpaTag = () => { S.f.tag = ''; render(); };
A.txLimpaDia = () => { S.txDia = null; render(); };
A.txView = el => { S.txView = el.dataset.v; render(); };
A.txCols = () => $('#pop-cols').classList.toggle('hidden');
C.txCol = el => { S.cols[el.dataset.k] = el.checked; ls.set('cols', S.cols); renderTxCorpo(); };
A.txOrd = el => { const c = el.dataset.k; S.txOrd = { c, d: S.txOrd.c === c ? -S.txOrd.d : -1 }; renderTxCorpo(); };
A.calDia = el => { S.txDia = el.dataset.d; S.txView = 'lista'; render(); };
A.selTx = (el, e) => { e.stopPropagation(); const id = el.dataset.id; S.txSel.has(id) ? S.txSel.delete(id) : S.txSel.add(id); renderTxCorpo(); };
A.selTodos = () => { const l = txFiltradas(); const todos = l.every(t => S.txSel.has(t.id)); l.forEach(t => todos ? S.txSel.delete(t.id) : S.txSel.add(t.id)); renderTxCorpo(); };
A.loteLimpa = () => { S.txSel.clear(); renderTxCorpo(); };
A.loteCat = async () => {
  const cat = $('#lote-cat').value; if (!cat) return toast('Escolha uma categoria.', true);
  const tipo = S.mCat.get(cat).tipo;
  const ids = [...S.txSel].filter(id => S.tx.find(t => t.id === id)?.tipo !== 'transferencia');
  await updIn('transacoes', ids, { categoria_id: cat, tipo });
  S.txSel.clear(); toast(`${ids.length} transação(ões) categorizada(s).`); recarregar();
};
A.lotePes = async () => { const p = $('#lote-pes').value; if (!p) return toast('Escolha uma pessoa.', true); await updIn('transacoes', [...S.txSel], { pessoa_id: p }); S.txSel.clear(); toast('Pessoa atribuída.'); recarregar(); };
A.lotePago = async () => { await updIn('transacoes', [...S.txSel], { pago: true }); S.txSel.clear(); toast('Marcadas como pagas.'); recarregar(); };
A.lotePend = async () => { await updIn('transacoes', [...S.txSel], { pago: false }); S.txSel.clear(); toast('Marcadas como pendentes.'); recarregar(); };
A.loteDel = async () => { if (!confirm(`Excluir ${S.txSel.size} transação(ões)? Esta ação não pode ser desfeita.`)) return; await delIn('transacoes', [...S.txSel]); S.txSel.clear(); toast('Transações excluídas.'); recarregar(); };

A.txCSV = () => {
  const lista = txFiltradas(), qt = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const L = [['Data', 'Descrição', 'Tipo', 'Categoria', 'Conta', 'Conta destino', 'Pessoa', 'Valor', 'Situação', 'Observação'].join(';')];
  lista.forEach(t => L.push([dataBR(t.data), qt(t.descricao), t.tipo, qt(S.mCat.get(t.categoria_id)?.nome), qt(S.mC.get(t.conta_id)?.nome), qt(S.mC.get(t.conta_destino_id)?.nome), qt(S.mP.get(t.pessoa_id)?.nome),
    (t.tipo === 'transferencia' ? +t.valor : sinalTx(t)).toFixed(2).replace('.', ','), t.pago ? 'Pago' : 'Pendente', qt(t.observacao)].join(';')));
  baixar(`transacoes-${S.mes}.csv`, '\ufeff' + L.join('\r\n'), 'text/csv;charset=utf-8');
};
function baixar(nome, conteudo, tipo) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([conteudo], { type: tipo })), download: nome });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- modal de transação ---------- */
A.novaTx = (el, e) => { e?.stopPropagation(); modalTx(); };
A.novaTransf = () => modalTx(null, 'transferencia');
A.editTx = el => { const t = S.tx.find(x => x.id === el.dataset.id); if (t) modalTx(t); };

function modalTx(t = null, tipo0 = 'despesa', base = null) {
  const b = t || base || {}, tipo = b.tipo || tipo0, h = hoje();
  const contasOpc = S.contas.filter(c => !c.arquivada || c.id === b.conta_id || c.id === b.conta_destino_id);
  const contaPad = b.conta_id || S.f.conta || contasGrupo().filter(c => !c.arquivada)[0]?.id;
  const dataPad = b.data || (h.startsWith(S.mes) ? h : S.mes + '-01');
  const valorTxt = b.valor ? (+b.valor).toFixed(2).replace('.', ',') : '';
  const corpo = `
    <div class="tipo3">${[['despesa', 'Despesa'], ['receita', 'Receita'], ['transferencia', 'Transferência']].map(([v, n]) => `<label><input type="radio" name="tipo" value="${v}" ${v === tipo ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
    <label style="position:relative">Descrição<input name="descricao" required maxlength="200" value="${esc(b.descricao || '')}" autocomplete="off" ${!t ? 'placeholder="Digite para ver lançamentos anteriores…"' : ''}><div class="sug-tx hidden" id="sug-tx" role="listbox"></div></label>
    <div class="g2"><label>Valor (R$)<input name="valor" required inputmode="decimal" value="${valorTxt}" placeholder="0,00"></label>
      <label>Data<input type="date" name="data" required value="${dataPad}"></label></div>
    <div class="g2"><label><span id="lbl-conta">Conta</span><select name="conta_id" required>${opts(contasOpc, contaPad)}</select></label>
      <label class="so-tr">Conta de destino<select name="conta_destino_id">${opts(contasOpc.filter(c => c.id !== contaPad), b.conta_destino_id, 'Escolha…')}</select></label>
      <label class="nao-tr">Categoria<select name="categoria_id"></select></label></div>
    <div class="g2"><label class="nao-tr">Pessoa<select name="pessoa_id">${opts(S.pessoas, b.pessoa_id, 'Ninguém')}</select></label>
      <label>Situação<select name="pago"><option value="1" ${b.pago !== false ? 'selected' : ''}>Pago / recebido</option><option value="0" ${b.pago === false ? 'selected' : ''}>Pendente</option></select></label></div>
    ${!t ? `<div class="g2"><label>Repetir<select name="modo"><option value="">Não repetir</option><option value="parcelas">Parcelar (divide o valor)</option><option value="repetir">Repetir o valor todo mês</option></select></label>
      <label class="nrep hidden">Nº de meses<input type="number" name="n" min="2" max="120" value="2"></label></div>` : ''}
    <label>Tags <small>(separe por vírgula — ex.: viagem, casamento)</small><input name="tags" value="${esc((b.tags || []).join(', '))}" autocomplete="off" placeholder="opcional">
      ${todasTags().length ? `<div class="tags-in">${todasTags().slice(0, 12).map(g => `<button type="button" data-a="addTag" data-v="${esc(g)}">#${esc(g)}</button>`).join('')}</div>` : ''}</label>
    <label>Observação<textarea name="observacao" rows="2" maxlength="500">${esc(b.observacao || '')}</textarea></label>`;
  const extra = t ? `<button type="button" class="btn perigo" data-a="delTx" data-id="${t.id}">${ic('lixo', 15)} Excluir</button>
    <button type="button" class="btn" data-a="dupTx" data-id="${t.id}">${ic('copiar', 15)} Duplicar</button>
    ${t.tipo !== 'transferencia' ? `<button type="button" class="btn" data-a="txParaRec" data-id="${t.id}">${ic('recorrentes', 15)} Tornar recorrente</button>` : ''}` : '';
  modal({
    titulo: t ? 'Editar transação' : 'Nova transação', corpo, extra,
    onOpen: f => {
      const atualiza = () => {
        const tp = f.tipo.value;
        $$('.so-tr', f).forEach(e => e.classList.toggle('hidden', tp !== 'transferencia'));
        $$('.nao-tr', f).forEach(e => e.classList.toggle('hidden', tp === 'transferencia'));
        const cur = f.categoria_id.value || b.categoria_id;
        f.categoria_id.innerHTML = opts(S.categorias.filter(c => c.tipo === tp), cur, 'Sem categoria');
        $('#lbl-conta').textContent = tp === 'transferencia' ? 'Conta de origem' : 'Conta';
      };
      f.addEventListener('change', e => {
        if (e.target.name === 'tipo') atualiza();
        if (e.target.name === 'modo') f.querySelector('.nrep').classList.toggle('hidden', !e.target.value);
      });
      f.descricao.addEventListener('blur', () => {
        if (f.tipo.value === 'transferencia') return;
        const r = aplicarRegra(f.descricao.value); if (!r) return;
        const cat = S.mCat.get(r.categoria_id);
        if (cat && !f.categoria_id.value) { if (cat.tipo !== f.tipo.value) { f.querySelector(`input[name=tipo][value=${cat.tipo}]`).checked = true; atualiza(); } f.categoria_id.value = cat.id; }
        if (r.pessoa_id && !f.pessoa_id.value) f.pessoa_id.value = r.pessoa_id;
      });
      atualiza();
      if (!t) ligarSugestoes(f, atualiza);
      if (!t) f.descricao.focus();
    },
    onSubmit: async f => {
      const tp = f.tipo.value, valor = Math.round((parseNum(f.valor.value) || 0) * 100) / 100;
      if (!(valor > 0)) { toast('Informe um valor maior que zero.', true); return false; }
      const reg = {
        tipo: tp, descricao: f.descricao.value.trim(), valor, data: f.data.value,
        conta_id: f.conta_id.value || null,
        conta_destino_id: tp === 'transferencia' ? f.conta_destino_id.value || null : null,
        categoria_id: tp === 'transferencia' ? null : f.categoria_id.value || null,
        pessoa_id: tp === 'transferencia' ? null : f.pessoa_id.value || null,
        pago: f.pago.value === '1', observacao: f.observacao.value.trim() || null, tags: lerTags(f.tags.value)
      };
      if (tp === 'transferencia' && (!reg.conta_destino_id || reg.conta_destino_id === reg.conta_id)) { toast('Escolha contas de origem e destino diferentes.', true); return false; }
      if (t) await upd('transacoes', t.id, reg);
      else {
        const modo = f.modo.value, n = Math.min(120, Math.max(2, parseInt(f.n.value) || 2));
        if (modo) {
          const parc = Math.floor(valor * 100 / n) / 100, prim = Math.round((valor - parc * (n - 1)) * 100) / 100;
          const linhas = Array.from({ length: n }, (_, i) => ({
            ...reg, data: somaMeses(reg.data, i), pago: i === 0 ? reg.pago : false,
            valor: modo === 'parcelas' ? (i === 0 ? prim : parc) : valor,
            descricao: `${reg.descricao} (${i + 1}/${n})`
          }));
          await insLotes('transacoes', linhas);
        } else await ins('transacoes', reg);
      }
      toast(tp === 'receita' && !t ? 'Dinheiro na caixa-forte! 🪙' : 'Transação salva!');
      await recarregar();
      if (tp === 'receita' && !t) chuvaMoedas();
    }
  });
}
/* ---------- sugestões: puxa as configurações de transações anteriores ---------- */
const semParcela = d => String(d || '').replace(/\s*\(\d+\/\d+\)\s*$/, '');
function sugestoesTx(texto) {
  const n = norm(texto); if (n.length < 2) return [];
  const vistos = new Set(), out = [];
  for (let i = S.tx.length - 1; i >= 0 && out.length < 40; i--) {
    const t = S.tx[i], k = norm(semParcela(t.descricao));
    if (vistos.has(k) || !k.includes(n)) continue;
    vistos.add(k); out.push({ t, k, n: S.tx.filter(x => norm(semParcela(x.descricao)) === k).length });
  }
  return out.sort((a, b) => (b.k.startsWith(n) - a.k.startsWith(n)) || (b.n - a.n)).slice(0, 6).map(x => ({ ...x.t, _vezes: x.n }));
}
function ligarSugestoes(f, atualiza) {
  const box = $('#sug-tx'), inp = f.descricao; let lista = [], foco = -1, usado = false;
  const fechar = () => { box.classList.add('hidden'); foco = -1; };
  const aplicar = m => {
    usado = true;
    inp.value = semParcela(m.descricao);
    const r = f.querySelector(`input[name=tipo][value=${m.tipo}]`); if (r) { r.checked = true; atualiza(); }
    if (m.conta_id && f.conta_id.querySelector(`option[value="${m.conta_id}"]`)) f.conta_id.value = m.conta_id;
    if (m.tipo === 'transferencia' && m.conta_destino_id && f.conta_destino_id.querySelector(`option[value="${m.conta_destino_id}"]`)) f.conta_destino_id.value = m.conta_destino_id;
    if (m.categoria_id && f.categoria_id.querySelector(`option[value="${m.categoria_id}"]`)) f.categoria_id.value = m.categoria_id;
    if (f.pessoa_id) f.pessoa_id.value = m.pessoa_id || '';
    f.valor.value = (+m.valor).toFixed(2).replace('.', ',');
    if (f.tags) f.tags.value = (m.tags || []).join(', ');
    fechar(); f.valor.focus(); f.valor.select();
    toast('Configurações da última vez aplicadas — ajuste o que quiser.');
  };
  const desenhar = () => {
    lista = sugestoesTx(inp.value);
    if (!lista.length) return fechar();
    box.innerHTML = `<div class="sug-cab">Lançamentos anteriores</div>` + lista.map((m, i) => {
      const c = S.mCat.get(m.categoria_id), co = S.mC.get(m.conta_id), v = m.tipo === 'transferencia' ? null : sinalTx(m);
      return `<button type="button" class="sug-it ${i === foco ? 'foco' : ''}" data-i="${i}">${m.tipo === 'transferencia' ? tile('⇄', '#2563eb', 'sm') : c ? tile(c.icone, c.cor, 'sm') : tile('?', '#3f3f4a', 'sm')}
        <span class="sug-tx-t"><b>${esc(semParcela(m.descricao))}</b><small>${esc(c?.nome || (m.tipo === 'transferencia' ? 'Transferência' : 'Sem categoria'))} · ${esc(co?.nome || '')} · ${dataBR(m.data)}${m._vezes > 1 ? ` · ${m._vezes}x` : ''}</small></span>
        <b class="${v == null ? 'neu' : cls(v)}">${v == null ? fmt(m.valor) : fmtS(v)}</b></button>`;
    }).join('');
    box.classList.remove('hidden');
  };
  inp.addEventListener('input', () => { foco = -1; desenhar(); });
  inp.addEventListener('focus', () => { if (inp.value.trim().length >= 2 && !usado) desenhar(); });
  inp.addEventListener('keydown', e => {
    if (box.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); foco = Math.min(lista.length - 1, foco + 1); desenhar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); foco = Math.max(0, foco - 1); desenhar(); }
    else if (e.key === 'Enter' && foco >= 0) { e.preventDefault(); aplicar(lista[foco]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); }
  });
  box.addEventListener('mousedown', e => { const b = e.target.closest('.sug-it'); if (b) { e.preventDefault(); aplicar(lista[+b.dataset.i]); } });
  inp.addEventListener('blur', () => setTimeout(fechar, 150));
}
A.delTx = async el => { if (!confirm('Excluir esta transação?')) return; await del('transacoes', el.dataset.id); $('#modal').close(); toast('Transação excluída.'); recarregar(); };
A.dupTx = el => { const t = S.tx.find(x => x.id === el.dataset.id); modalTx(null, t.tipo, { ...t, data: hoje(), id: undefined }); };
A.txParaRec = el => {
  const t = S.tx.find(x => x.id === el.dataset.id);
  modalRec(null, { descricao: t.descricao.replace(/\s*\(\d+\/\d+\)$/, ''), tipo: t.tipo, valor: t.valor, conta_id: t.conta_id, categoria_id: t.categoria_id, pessoa_id: t.pessoa_id, frequencia: 'mensal', proxima_data: somaMeses(t.data, 1), auto: true });
};

/* =====================================================================
   CONTAS
   ===================================================================== */
const ORDEM_TIPOS = ['corrente', 'poupanca', 'carteira', 'cartao', 'investimento', 'outro'];
function movMes(contaId, ym) {
  let e = 0, s = 0;
  for (const t of S.tx) {
    if (!t.pago || !t.data.startsWith(ym)) continue;
    if (t.conta_id === contaId) { if (t.tipo === 'receita') e += +t.valor; else s += +t.valor; }
    if (t.conta_destino_id === contaId) e += +t.valor;
  }
  return { e, s };
}
function pgContas(el) {
  const sal = saldosEm(), lista = contasGrupo().filter(c => S.contasArq || !c.arquivada);
  const ativas = lista.filter(c => !c.arquivada), v = c => sal.get(c.id) || 0;
  const disp = soma(ativas.filter(c => TIPOS_CONTA[c.tipo]?.disp), v);
  const inv = soma(ativas.filter(c => c.tipo === 'investimento'), v);
  const cart = soma(ativas.filter(c => c.tipo === 'cartao'), v);
  const total = soma(ativas, v);
  const card = c => {
    const s = v(c), mv = movMes(c.id, S.mes), tp = TIPOS_CONTA[c.tipo] || TIPOS_CONTA.outro;
    let extra = '';
    if (c.tipo === 'cartao') {
      const usado = Math.max(0, -s), lim = +c.limite || 0, p = lim ? usado / lim : 0;
      extra = `${lim ? `<div><div class="info"><span>Limite usado ${pct(p)}</span><span>Disponível ${fmt(lim - usado)}</span></div><div class="barra ${p > .9 ? 'er' : p > .7 ? 'av' : ''}" style="margin-top:.35rem"><div style="width:${Math.min(100, p * 100)}%"></div></div></div>` : ''}
        <div class="info"><span>${c.dia_fechamento ? `Fecha dia ${c.dia_fechamento}` : ''}</span><span>${c.dia_vencimento ? `Vence dia ${c.dia_vencimento}` : ''}</span></div>`;
    }
    return `<div class="ccard ${c.arquivada ? 'arq' : ''}">
      <div class="ct">${tile(c.icone, c.cor)}<div class="nm"><b>${esc(c.nome)}</b><small>${tp.nome}${c.perfil === 'empresa' ? ' · <span class="tag">empresa</span>' : ''}${c.arquivada ? ' · arquivada' : ''}</small></div><div class="cv ${s < 0 ? 'neg' : ''}">${fmt(s)}</div></div>
      ${extra}
      <div class="info"><span>${nomeMes(S.mes)}</span><span><span class="pos">+${fmt(mv.e)}</span> &nbsp; <span class="neg">-${fmt(mv.s)}</span></span></div>
      <div class="cr"><button class="btn mini" data-a="verConta" data-id="${c.id}">${ic('lista', 13)} Transações</button>
        ${c.tipo === 'cartao' && s < 0 ? `<button class="btn mini" data-a="pagarFatura" data-id="${c.id}">${ic('dinheiro', 13)} Pagar fatura</button>` : ''}
        <span style="flex:1"></span>
        <button class="icobtn" data-a="editConta" data-id="${c.id}" title="Editar">${ic('editar', 16)}</button>
        <button class="icobtn" data-a="arqConta" data-id="${c.id}" title="${c.arquivada ? 'Desarquivar' : 'Arquivar'}">${ic('arquivo', 16)}</button>
        <button class="icobtn perigo" data-a="delConta" data-id="${c.id}" title="Excluir">${ic('lixo', 16)}</button></div></div>`;
  };
  const secoes = ORDEM_TIPOS.map(tp => {
    const cs = lista.filter(c => (TIPOS_CONTA[c.tipo] ? c.tipo : 'outro') === tp); if (!cs.length) return '';
    return `<div class="sec-tit"><span>${TIPOS_CONTA[tp].nome}</span><span>${fmt(soma(cs.filter(c => !c.arquivada), v))}</span></div><div class="grade-cartoes">${cs.map(card).join('')}</div>`;
  }).join('');
  S.contasVista = S.contasVista || ls.get('contasVista', 'cartoes');
  const linhaL = c => {
    const s = v(c), mv = movMes(c.id, S.mes), tp = TIPOS_CONTA[c.tipo] || TIPOS_CONTA.outro;
    const lim = c.tipo === 'cartao' && +c.limite ? Math.max(0, -s) / +c.limite : null;
    return `<tr class="${c.arquivada ? 'neu' : ''}" style="${c.arquivada ? 'opacity:.55' : ''}"><td><div class="tdesc">${tile(c.icone, c.cor, 'sm')}<div><div class="d1">${esc(c.nome)}${c.perfil === 'empresa' ? ' <span class="tag">empresa</span>' : ''}${c.arquivada ? ' <span class="badge nt">arquivada</span>' : ''}</div><div class="obs">${tp.nome}</div></div></div></td>
      <td class="num pos col-opc">+${fmt(mv.e)}</td><td class="num neg col-opc">-${fmt(mv.s)}</td>
      <td class="col-opc" style="min-width:120px">${lim != null ? `<div class="barra ${lim > .9 ? 'er' : lim > .7 ? 'av' : ''}" style="height:5px"><div style="width:${Math.min(100, lim * 100)}%"></div></div><small>${pct(lim)} do limite</small>` : '<span class="neu">—</span>'}</td>
      <td class="num vl ${s < 0 ? 'neg' : ''}">${fmt(s)}</td>
      <td class="num" style="white-space:nowrap"><button class="icobtn" data-a="verConta" data-id="${c.id}" title="Transações">${ic('lista', 16)}</button>${c.tipo === 'cartao' && s < 0 ? `<button class="icobtn" data-a="pagarFatura" data-id="${c.id}" title="Pagar fatura">${ic('dinheiro', 16)}</button>` : ''}<button class="icobtn" data-a="editConta" data-id="${c.id}" title="Editar">${ic('editar', 16)}</button><button class="icobtn" data-a="arqConta" data-id="${c.id}" title="${c.arquivada ? 'Desarquivar' : 'Arquivar'}">${ic('arquivo', 16)}</button><button class="icobtn perigo" data-a="delConta" data-id="${c.id}" title="Excluir">${ic('lixo', 16)}</button></td></tr>`;
  };
  const listaHtml = `<div class="card p0"><div class="tabela-wrap"><table><thead><tr><th>Conta</th><th class="num col-opc">Entradas no mês</th><th class="num col-opc">Saídas no mês</th><th class="col-opc">Limite</th><th class="num">Saldo</th><th></th></tr></thead><tbody>
    ${ORDEM_TIPOS.map(tp => { const cs = lista.filter(c => (TIPOS_CONTA[c.tipo] ? c.tipo : 'outro') === tp); if (!cs.length) return ''; return `<tr><td colspan="6" class="agrupa-data" style="padding:.55rem 1.2rem">${TIPOS_CONTA[tp].nome} · ${fmt(soma(cs.filter(c => !c.arquivada), v))}</td></tr>` + cs.map(linhaL).join(''); }).join('')}
    </tbody><tfoot><tr><td>Total</td><td colspan="3" class="col-opc"></td><td class="num ${cls(total)}">${fmt(total)}</td><td></td></tr></tfoot></table></div></div>`;
  el.innerHTML = cab('Contas', 'Financeiro', `${navMes()}<div class="seg"><button class="${S.contasVista !== 'lista' ? 'on' : ''}" data-a="contasVista" data-v="cartoes">${ic('colunas', 14)} Cartões</button><button class="${S.contasVista === 'lista' ? 'on' : ''}" data-a="contasVista" data-v="lista">${ic('lista', 14)} Lista</button></div><label class="chk" style="margin:0 .4rem"><input type="checkbox" data-c="contasArq" ${S.contasArq ? 'checked' : ''}> Mostrar arquivadas</label>
      <button class="btn pri" data-a="novaConta">${ic('mais', 15)} Nova conta</button>`) +
    `<div class="card mb"><div class="kpis" style="border-top:none;margin-top:0;padding-top:0">
      <div><div class="lbl-k">Disponível</div><div class="val-m ${cls(disp)}">${fmt(disp)}</div></div>
      <div><div class="lbl-k">Investimentos</div><div class="val-m">${fmt(inv)}</div></div>
      <div><div class="lbl-k">Cartões de crédito</div><div class="val-m ${cart < 0 ? 'neg' : ''}">${fmt(cart)}</div></div>
      <div><div class="lbl-k">Total em contas</div><div class="val-m ${cls(total)}">${fmt(total)}</div></div></div></div>` +
    (!lista.length ? `<div class="card">${vazio('Nenhuma conta cadastrada. <button class="lnk" data-a="novaConta">Criar a primeira</button>')}</div>` : S.contasVista === 'lista' ? listaHtml : secoes);
}
C.contasArq = el => { S.contasArq = el.checked; render(); };
A.contasVista = el => { S.contasVista = el.dataset.v; ls.set('contasVista', S.contasVista); render(); };
A.novaConta = () => modalConta();
A.editConta = el => modalConta(S.mC.get(el.dataset.id));
A.arqConta = async el => { const c = S.mC.get(el.dataset.id); await upd('contas', c.id, { arquivada: !c.arquivada }); toast(c.arquivada ? 'Conta desarquivada.' : 'Conta arquivada.'); recarregar(); };
A.delConta = async el => {
  const c = S.mC.get(el.dataset.id), n = S.tx.filter(t => t.conta_id === c.id || t.conta_destino_id === c.id).length;
  if (!confirm(`Excluir a conta "${c.nome}"?${n ? `\n\nAtenção: ${n} transação(ões) desta conta também serão excluídas. Se quiser manter o histórico, use "Arquivar".` : ''}`)) return;
  await del('contas', c.id); toast('Conta excluída.'); recarregar();
};
A.pagarFatura = el => {
  const c = S.mC.get(el.dataset.id), s = saldosEm().get(c.id) || 0;
  const origem = contasAtivas().find(x => TIPOS_CONTA[x.tipo]?.disp);
  modalTx(null, 'transferencia', { tipo: 'transferencia', descricao: `Fatura ${c.nome}`, valor: Math.abs(s), conta_id: origem?.id, conta_destino_id: c.id, data: hoje() });
};
function modalConta(c = null) {
  const tipo = c?.tipo || 'corrente';
  modal({
    titulo: c ? 'Editar conta' : 'Nova conta',
    corpo: `<div class="g2"><label>Nome<input name="nome" required maxlength="80" value="${esc(c?.nome || '')}" placeholder="Ex.: Nubank, Inter, Carteira"></label>
      <label>Tipo<select name="tipo">${optsObj(TIPOS_CONTA, tipo)}</select></label></div>
      <label>Perfil<select name="perfil"><option value="pessoal">Pessoal</option><option value="empresa" ${c?.perfil === 'empresa' ? 'selected' : ''}>Empresa / negócio</option></select></label>
      <label>Saldo inicial (R$)<input name="saldo_inicial" inputmode="decimal" value="${c ? (+c.saldo_inicial).toFixed(2).replace('.', ',') : '0,00'}"></label>
      <p class="ajuda" id="ajuda-saldo">Saldo da conta antes do primeiro lançamento registrado aqui.</p>
      <div class="g3 so-cartao"><label>Limite<input name="limite" inputmode="decimal" value="${c?.limite ? (+c.limite).toFixed(2).replace('.', ',') : ''}"></label>
        <label>Dia de fechamento<input type="number" name="dia_fechamento" min="1" max="31" value="${c?.dia_fechamento || ''}"></label>
        <label>Dia de vencimento<input type="number" name="dia_vencimento" min="1" max="31" value="${c?.dia_vencimento || ''}"></label></div>
      <label>Cor${pickCor('cor', c?.cor || CORES[0])}</label>
      <label>Ícone${pickIcone('icone', c?.icone || TIPOS_CONTA[tipo].icone)}</label>`,
    onOpen: f => {
      const at = () => { const cart = f.tipo.value === 'cartao'; $$('.so-cartao', f).forEach(e => e.classList.toggle('hidden', !cart)); $('#ajuda-saldo').textContent = cart ? 'Para cartão: informe a fatura em aberto como valor negativo (ex.: -350,00).' : 'Saldo da conta antes do primeiro lançamento registrado aqui.'; };
      f.tipo.addEventListener('change', () => { if (!c) f.icone.value = TIPOS_CONTA[f.tipo.value].icone; at(); });
      at();
    },
    onSubmit: async f => {
      const cart = f.tipo.value === 'cartao';
      const reg = {
        nome: f.nome.value.trim(), tipo: f.tipo.value, perfil: f.perfil.value, saldo_inicial: parseNum(f.saldo_inicial.value) || 0,
        cor: corDe(f, 'cor'), icone: f.icone.value.trim() || TIPOS_CONTA[f.tipo.value].icone,
        limite: cart ? parseNum(f.limite.value) : null,
        dia_fechamento: cart && f.dia_fechamento.value ? +f.dia_fechamento.value : null,
        dia_vencimento: cart && f.dia_vencimento.value ? +f.dia_vencimento.value : null
      };
      c ? await upd('contas', c.id, reg) : await ins('contas', reg);
      toast('Conta salva!'); await recarregar();
    }
  });
}

/* =====================================================================
   IMPORTAR (OFX e CSV)
   ===================================================================== */
function parseCSV(txt) {
  const prim = txt.split(/\r?\n/).find(l => l.trim()) || '';
  const sep = [';', ',', '\t', '|'].map(s => [s, prim.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cur = '', aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (aspas) { if (ch === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else aspas = false; } else cur += ch; }
    else if (ch === '"') aspas = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
function parseOFX(txt) {
  return txt.split(/<STMTTRN>/i).slice(1).map(b => {
    const g = tag => { const m = b.match(new RegExp('<' + tag + '>([^<\\r\\n]*)', 'i')); return m ? m[1].trim() : ''; };
    return { data: parseData(g('DTPOSTED')), valor: parseNum(g('TRNAMT')), descricao: g('MEMO') || g('NAME') || 'Sem descrição', import_id: g('FITID') || null, catNome: '', contaNome: '' };
  }).filter(x => x.data && x.valor);
}
function adivinharMapa(cabecalho, amostra) {
  const m = { data: '', desc: '', valor: '', tipo: '', categoria: '', conta: '' };
  cabecalho.forEach((h, i) => {
    const n = norm(h);
    if (m.data === '' && /^(data|date|dt)/.test(n)) m.data = String(i);
    else if (m.desc === '' && /(descri|histor|memo|titulo|title|estabelec|lancamento|nome)/.test(n)) m.desc = String(i);
    else if (m.valor === '' && /(valor|amount|value|quantia|montante)/.test(n)) m.valor = String(i);
    else if (m.tipo === '' && /^(tipo|type|natureza|d\/c|debito\/credito)/.test(n)) m.tipo = String(i);
    else if (m.categoria === '' && /categ/.test(n)) m.categoria = String(i);
    else if (m.conta === '' && /^(conta|account|banco|cartao)/.test(n)) m.conta = String(i);
  });
  if (amostra) amostra.forEach((c, i) => {
    if (m.data === '' && parseData(c)) m.data = String(i);
    else if (m.valor === '' && parseNum(c) != null && !parseData(c) && /\d/.test(c)) m.valor = String(i);
  });
  if (m.desc === '' && amostra) { let best = -1, len = 0; amostra.forEach((c, i) => { if (String(i) !== m.data && String(i) !== m.valor && c.length > len) { len = c.length; best = i; } }); if (best >= 0) m.desc = String(best); }
  return m;
}
async function lerArquivo(file) {
  let txt = await file.text();
  if (txt.includes('�')) txt = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsText(file, 'ISO-8859-1'); });
  return txt;
}
C.impArq = async el => {
  const file = el.files[0]; if (!file) return;
  const txt = await lerArquivo(file);
  const conta = S.impConta || contasAtivas()[0]?.id || '';
  if (/<STMTTRN>/i.test(txt)) {
    const itens = parseOFX(txt);
    if (!itens.length) return toast('Nenhuma transação encontrada no arquivo OFX.', true);
    S.imp = { nome: file.name, tipo: 'ofx', conta, etapa: 3, brutos: itens };
    prepararItens();
  } else {
    const linhas = parseCSV(txt);
    if (linhas.length < 1) return toast('Arquivo vazio ou formato não reconhecido.', true);
    const temCab = !parseData(linhas[0].find(c => parseData(c)) || '') && linhas.length > 1;
    S.imp = { nome: file.name, tipo: 'csv', conta, etapa: 2, linhas, temCab, inverter: false, map: adivinharMapa(temCab ? linhas[0] : [], linhas[temCab ? 1 : 0]) };
  }
  render();
};
function montarCSV() {
  const im = S.imp, mp = im.map, rows = im.temCab ? im.linhas.slice(1) : im.linhas;
  const col = (r, k) => mp[k] === '' ? '' : (r[+mp[k]] ?? '');
  return rows.map(r => {
    const data = parseData(col(r, 'data')); let v = parseNum(col(r, 'valor'));
    if (!data || v == null || v === 0) return null;
    if (mp.tipo !== '') { const tv = norm(col(r, 'tipo')); if (/(desp|debit|saida|pagamento|^d$)/.test(tv)) v = -Math.abs(v); else if (/(rec|credit|entrada|^c$)/.test(tv)) v = Math.abs(v); }
    if (im.inverter) v = -v;
    return { data, valor: v, descricao: String(col(r, 'desc')).trim() || 'Sem descrição', catNome: String(col(r, 'categoria')).trim(), contaNome: String(col(r, 'conta')).trim(), import_id: null };
  }).filter(Boolean);
}
function contaDoItem(it) {
  if (it.contaNome) { const c = S.contas.find(c => norm(c.nome) === norm(it.contaNome)); return c ? c.id : 'novo:' + it.contaNome; }
  return S.imp.conta;
}
function prepararItens() {
  const im = S.imp;
  im.itens = im.brutos.map(b => {
    const tipo = b.valor < 0 ? 'despesa' : 'receita';
    let cat = '';
    if (b.catNome) {
      const c = S.categorias.find(c => norm(c.nome) === norm(b.catNome) && c.tipo === tipo) || S.categorias.find(c => norm(c.nome) === norm(b.catNome));
      cat = c ? c.id : 'novo:' + b.catNome;
    } else { const r = aplicarRegra(b.descricao); if (r?.categoria_id) cat = r.categoria_id; }
    return { ...b, tipo, valor: Math.abs(b.valor), cat, pessoa: aplicarRegra(b.descricao)?.pessoa_id || null };
  });
  marcarDups();
}
function marcarDups() {
  const k = (c, d, v, tp) => `${c}|${d}|${(+v).toFixed(2)}|${tp}`;
  const exist = new Set(S.tx.map(t => k(t.conta_id, t.data, t.valor, t.tipo)));
  const fit = new Set(S.tx.filter(t => t.import_id).map(t => t.import_id));
  S.imp.itens.forEach(it => { it.dup = (it.import_id && fit.has(it.import_id)) || exist.has(k(contaDoItem(it), it.data, it.valor, it.tipo)); it.sel = !it.dup; });
}

function pgImportar(el) {
  const im = S.imp, etapa = im ? im.etapa : 1;
  const passos = `<div class="passos">${['1. Arquivo', '2. Colunas', '3. Revisar e importar'].map((p, i) => `<span class="${etapa === i + 1 ? 'on' : ''}">${p}</span>`).join('')}</div>`;
  const contaSel = (sel) => `<select data-c="impConta">${opts(contasAtivas(), sel)}</select>`;
  let corpo = '';
  if (etapa === 1) {
    corpo = `<div class="card mb"><label>Conta que vai receber as transações${contaSel(S.impConta || contasAtivas()[0]?.id)}</label>
      <div class="drop">${ic('importar', 30)}<p><b>Clique ou arraste o arquivo aqui</b></p><p class="sub" style="font-size:.82rem">OFX (extrato baixado do banco) ou CSV (planilha / exportação de outro sistema)</p>
      <input type="file" accept=".ofx,.qfx,.csv,.txt" data-c="impArq"></div></div>
      <div class="card"><h2 style="margin-bottom:.5rem">Dicas</h2><ul class="sub" style="margin:0;padding-left:1.1rem;line-height:1.7;font-size:.86rem">
        <li><b>OFX</b>: no app/site do banco, procure “Exportar extrato” › OFX ou Money. É o formato mais confiável.</li>
        <li><b>CSV</b>: você escolhe quais colunas são data, descrição e valor. Valores negativos viram despesas.</li>
        <li>Para trazer seus dados do <b>Securo</b>: em Transações use “Exportar CSV” e importe aqui; mapeie as colunas de categoria e conta para criá-las automaticamente.</li>
        <li>Transações já existentes (mesma conta, data, valor e tipo) são marcadas como duplicadas e desmarcadas.</li>
        <li>As <button class="lnk" data-a="ir" data-r="regras">Regras</button> categorizam automaticamente pelo texto da descrição.</li></ul></div>`;
  } else if (etapa === 2) {
    const ncol = Math.max(...im.linhas.slice(0, 10).map(r => r.length));
    const nomes = Array.from({ length: ncol }, (_, i) => im.temCab ? (im.linhas[0][i] || `Coluna ${i + 1}`) : `Coluna ${i + 1}`);
    const sel = (k, rot, obrig) => `<label>${rot}${obrig ? ' *' : ''}<select data-c="impMap" data-k="${k}"><option value="">${obrig ? 'Escolha…' : '(não usar)'}</option>${nomes.map((n, i) => `<option value="${i}" ${im.map[k] === String(i) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
    const amostra = im.linhas.slice(im.temCab ? 1 : 0, (im.temCab ? 1 : 0) + 6);
    corpo = `<div class="card mb"><div class="graf-cab"><h2>${esc(im.nome)}</h2><button class="btn mini" data-a="impReset">Trocar arquivo</button></div>
      <div class="g3">${sel('data', 'Data', 1)}${sel('desc', 'Descrição', 1)}${sel('valor', 'Valor', 1)}${sel('tipo', 'Tipo (débito/crédito)')}${sel('categoria', 'Categoria')}${sel('conta', 'Conta')}</div>
      <div style="display:flex;gap:1.4rem;flex-wrap:wrap;margin:.2rem 0 .8rem">
        <label class="chk"><input type="checkbox" data-c="impCab" ${im.temCab ? 'checked' : ''}> Primeira linha é cabeçalho</label>
        <label class="chk"><input type="checkbox" data-c="impInv" ${im.inverter ? 'checked' : ''}> Inverter sinal (fatura de cartão com compras positivas)</label></div>
      <label>Conta padrão (quando a coluna “Conta” não for usada)${contaSel(im.conta)}</label>
      <div style="display:flex;justify-content:flex-end"><button class="btn pri" data-a="impContinuar">Continuar ${ic('seta', 15)}</button></div></div>
      <div class="card p0"><div class="card-cab"><h2>Prévia do arquivo</h2><small>${im.linhas.length - (im.temCab ? 1 : 0)} linhas</small></div><div class="tabela-wrap"><table><thead><tr>${nomes.map(n => `<th>${esc(n)}</th>`).join('')}</tr></thead>
      <tbody>${amostra.map(r => `<tr>${nomes.map((_, i) => `<td>${esc(r[i] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  } else {
    const it = im.itens, nSel = it.filter(i => i.sel).length, nDup = it.filter(i => i.dup).length;
    const catOpts = (tipo, sel) => {
      const lista = S.categorias.filter(c => c.tipo === tipo);
      return `<option value="">Sem categoria</option>${sel.startsWith('novo:') ? `<option value="${esc(sel)}" selected>➕ ${esc(sel.slice(5))} (nova)</option>` : ''}${opts(lista, sel)}`;
    };
    const r = resumo(it.filter(i => i.sel));
    corpo = `<div class="card mb"><div class="graf-cab"><div><h2>${esc(im.nome)}</h2><small>${it.length} transações lidas · ${nDup} possível(is) duplicada(s)</small></div>
        <div class="pacoes"><button class="btn mini" data-a="impReset">Cancelar</button>${im.tipo === 'csv' ? '<button class="btn mini" data-a="impVoltar">Voltar às colunas</button>' : ''}</div></div>
      <div class="g2"><label>Conta padrão${contaSel(im.conta)}</label>
      <div class="resumo-linha" style="align-items:flex-end;margin:0 0 .75rem"><span>Selecionadas<b>${nSel}</b></span><span>Entradas<b class="pos">${fmt(r.rec)}</b></span><span>Saídas<b class="neg">${fmt(r.desp)}</b></span></div></div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap"><button class="btn" data-a="impTodos" data-v="1">Marcar todas</button><button class="btn" data-a="impTodos" data-v="0">Desmarcar todas</button>
        <button class="btn pri" data-a="impFinal" ${nSel ? '' : 'disabled'}>${ic('check', 15)} Importar ${nSel} transação(ões)</button></div></div>
      <div class="card p0"><div class="tabela-wrap"><table><thead><tr><th></th><th>Data</th><th>Descrição</th><th>Categoria</th>${it.some(i => i.contaNome) ? '<th>Conta</th>' : ''}<th class="num">Valor</th></tr></thead><tbody>
      ${it.map((i, k) => `<tr class="${i.sel ? '' : 'neu'}" style="${i.sel ? '' : 'opacity:.55'}"><td><input type="checkbox" data-a="impSel" data-k="${k}" ${i.sel ? 'checked' : ''}></td>
        <td style="white-space:nowrap">${dataBR(i.data)}</td><td>${esc(i.descricao)} ${i.dup ? '<span class="badge av">duplicada?</span>' : ''}</td>
        <td><select data-c="impCat" data-k="${k}">${catOpts(i.tipo, i.cat)}</select></td>
        ${it.some(x => x.contaNome) ? `<td>${esc(i.contaNome || S.mC.get(im.conta)?.nome || '')}</td>` : ''}
        <td class="num vl ${i.tipo === 'despesa' ? 'neg' : 'pos'}">${fmtS(i.tipo === 'despesa' ? -i.valor : i.valor)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  el.innerHTML = cab('Importar', 'Contas', '') + passos + corpo;
}
C.impConta = el => { S.impConta = el.value; if (S.imp) { S.imp.conta = el.value; if (S.imp.itens) marcarDups(); } render(); };
C.impMap = el => { S.imp.map[el.dataset.k] = el.value; };
C.impCab = el => { S.imp.temCab = el.checked; S.imp.map = adivinharMapa(el.checked ? S.imp.linhas[0] : [], S.imp.linhas[el.checked ? 1 : 0]); render(); };
C.impInv = el => { S.imp.inverter = el.checked; };
C.impCat = el => { S.imp.itens[+el.dataset.k].cat = el.value; };
A.impReset = () => { S.imp = null; render(); };
A.impVoltar = () => { S.imp.etapa = 2; render(); };
A.impContinuar = () => {
  const m = S.imp.map;
  if (m.data === '' || m.valor === '' || m.desc === '') return toast('Escolha as colunas de data, descrição e valor.', true);
  const brutos = montarCSV();
  if (!brutos.length) return toast('Nenhuma linha válida. Confira as colunas de data e valor.', true);
  S.imp.brutos = brutos; S.imp.etapa = 3; prepararItens(); render();
};
A.impSel = el => { const i = S.imp.itens[+el.dataset.k]; i.sel = !i.sel; render(); };
A.impTodos = el => { S.imp.itens.forEach(i => i.sel = el.dataset.v === '1'); render(); };
A.impFinal = async el => {
  const im = S.imp, sel = im.itens.filter(i => i.sel); if (!sel.length) return;
  if (!im.conta && sel.some(i => !i.contaNome)) return toast('Escolha a conta padrão.', true);
  el.disabled = true; el.textContent = 'Importando…';
  try {
    // cria categorias novas
    const novasCat = new Map();
    sel.forEach(i => { if (i.cat.startsWith('novo:')) novasCat.set(`${i.tipo}|${norm(i.cat.slice(5))}`, { nome: i.cat.slice(5), tipo: i.tipo, cor: CORES[novasCat.size % CORES.length], icone: '🏷️' }); });
    const mapaCat = new Map();
    if (novasCat.size) { const criadas = await ins('categorias', [...novasCat.values()]); criadas.forEach(c => mapaCat.set(`${c.tipo}|${norm(c.nome)}`, c.id)); }
    // cria contas novas
    const novasConta = new Map();
    sel.forEach(i => { const c = contaDoItem(i); if (c.startsWith('novo:')) novasConta.set(norm(c.slice(5)), { nome: c.slice(5), tipo: 'corrente', icone: '🏦', cor: CORES[(novasConta.size + 3) % CORES.length] }); });
    const mapaConta = new Map();
    if (novasConta.size) { const criadas = await ins('contas', [...novasConta.values()]); criadas.forEach(c => mapaConta.set(norm(c.nome), c.id)); }
    const regs = sel.map(i => {
      let conta = contaDoItem(i); if (conta.startsWith('novo:')) conta = mapaConta.get(norm(conta.slice(5)));
      let cat = i.cat || null; if (cat?.startsWith('novo:')) cat = mapaCat.get(`${i.tipo}|${norm(cat.slice(5))}`) || null;
      return { tipo: i.tipo, descricao: i.descricao.slice(0, 200), valor: Math.round(i.valor * 100) / 100, data: i.data, conta_id: conta, categoria_id: cat, pessoa_id: i.pessoa, pago: true, import_id: i.import_id };
    });
    await insLotes('transacoes', regs);
    const ultimo = regs.map(r => r.data).sort().at(-1);
    S.imp = null; S.mes = ultimo.slice(0, 7);
    toast(`${regs.length} transação(ões) importada(s)!`);
    await carregar(); filtrarPor('', '');
  } catch (e) { el.disabled = false; el.textContent = 'Tentar de novo'; }
};
