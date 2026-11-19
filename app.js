'use strict';
/* =====================================================================
   INICIALIZAÇÃO E AUTENTICAÇÃO
   ===================================================================== */
(function () {
  const cfg = window.CONFIG || {};
  const mostrar = id => ['tela-config', 'tela-login', 'app'].forEach(x => $('#' + x).classList.toggle('hidden', x !== id));
  if (!cfg.SUPABASE_URL || /SEU-PROJETO/.test(cfg.SUPABASE_URL) || /SUA-CHAVE/.test(cfg.SUPABASE_KEY || '')) { mostrar('tela-config'); return; }
  sb = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
  let modoCadastro = false, carregando = false;

  sb.auth.onAuthStateChange((evento, sessao) => {
    setTimeout(() => {
      if (evento === 'PASSWORD_RECOVERY') novaSenha();
      tratarSessao(sessao);
    }, 0);
  });

  async function tratarSessao(sessao) {
    const u = sessao?.user ?? null;
    if (u && S.user?.id === u.id) { S.user = u; return; }
    S.user = u;
    if (!u) { mostrar('tela-login'); return; }
    const pf = u.user_metadata?.prefs; if (pf) { if (pf.tema) S.tema = pf.tema; if (pf.acento) S.acento = pf.acento; if (pf.inicial) S.inicial = pf.inicial; if (pf.estiloIcone) S.estiloIcone = pf.estiloIcone; if (pf.coresGraf) S.coresGraf = pf.coresGraf; if (pf.layoutTx) S.layoutTx = pf.layoutTx; if (Array.isArray(pf.layout)) { S.layout = pf.layout; ls.set('layoutInicio', pf.layout); } ls.set('tema', S.tema); ls.set('acento', S.acento); ls.set('inicial', S.inicial); }
    if (carregando) return; carregando = true;
    mostrar('app');
    const mc = icone('carregando');
    $('#conteudo').innerHTML = `<div class="carregando">${mc ? `<img src="${mc}" alt="">` : '<img src="logo.svg" alt="">'}<p>Contando as moedas…</p></div>`;
    try {
      await Promise.all([carregar(), carregarIcones()]);
      if (await criarPadroes()) await carregar();
      if (await gerarRecorrentes()) await carregar();
    } catch (e) { console.error(e); }
    carregando = false;
    S.rota = location.hash.replace(/^#\/?/, '') || S.inicial || 'inicio';
    render();
  }

  // primeiro acesso: categorias e uma conta padrão
  async function criarPadroes() {
    if (S.contas.length || S.categorias.length) return false;
    const d = (nome, icone, cor) => ({ nome, icone, cor, tipo: 'despesa' }), r = (nome, icone, cor) => ({ nome, icone, cor, tipo: 'receita' });
    await ins('categorias', [
      d('Mercado', '🛒', '#10b981'), d('Moradia', '🏠', '#8b5cf6'), d('Contas da casa', '💡', '#eab308'), d('Transporte', '🚗', '#0ea5e9'),
      d('Combustível', '⛽', '#f97316'), d('Saúde', '💊', '#ef4444'), d('Educação', '📚', '#14b8a6'), d('Restaurantes', '🍽️', '#f59e0b'),
      d('Lazer', '🎉', '#ec4899'), d('Assinaturas', '📺', '#6366f1'), d('Compras', '🛍️', '#d946ef'), d('Dízimos e ofertas', '🙏', '#8b5a3c'),
      d('Reformas e manutenção', '🔧', '#64748b'), d('Outras despesas', '📦', '#64748b'),
      r('Salário', '💰', '#22c55e'), r('Renda extra', '💼', '#84cc16'), r('Rendimentos', '📈', '#14b8a6'), r('Outras receitas', '➕', '#10b981')
    ]);
    await ins('contas', { nome: 'Carteira', tipo: 'carteira', icone: '👛', cor: '#10b981', saldo_inicial: 0 });
    return true;
  }

  async function novaSenha() {
    const s = prompt('Digite sua nova senha (mínimo 6 caracteres):');
    if (!s) return;
    const { error } = await sb.auth.updateUser({ password: s });
    error ? toast(msgErro(error), true) : toast('Senha alterada!');
  }

  const form = $('#form-login');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = form.email.value.trim(), password = form.senha.value, msg = $('#auth-msg'), btn = $('#btn-auth');
    msg.className = 'msg'; msg.textContent = ''; btn.disabled = true;
    try {
      if (modoCadastro) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { nome: form.nome.value.trim() }, emailRedirectTo: location.origin + location.pathname } });
        if (error) throw error;
        if (!data.session) { msg.className = 'msg ok'; msg.textContent = 'Cadastro feito! Confirme pelo link enviado ao seu e-mail e depois entre.'; }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) { msg.className = 'msg erro'; msg.textContent = msgErro(err); }
    btn.disabled = false;
  });
  $('#link-alterna').addEventListener('click', () => {
    modoCadastro = !modoCadastro;
    $('#auth-sub').textContent = modoCadastro ? 'Crie sua conta' : 'Entre na sua conta';
    $('#btn-auth').textContent = modoCadastro ? 'Cadastrar' : 'Entrar';
    $('#link-alterna').textContent = modoCadastro ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastre-se';
    $('#campo-nome').classList.toggle('hidden', !modoCadastro);
    $('#auth-msg').textContent = '';
  });
  $('#link-esqueci').addEventListener('click', async () => {
    const email = form.email.value.trim() || prompt('Seu e-mail:'); if (!email) return;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    const msg = $('#auth-msg'); msg.className = 'msg ' + (error ? 'erro' : 'ok');
    msg.textContent = error ? msgErro(error) : 'Enviamos um link para redefinir a senha.';
  });

  // app instalável (PWA)
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  aplicarTema(); aplicarIcones();
  // atalhos de teclado
  document.addEventListener('keydown', e => {
    if (!S.user) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); A.busca(); }
  });
  // fecha popover de colunas ao clicar fora
  document.addEventListener('click', e => { if (!e.target.closest('.rel')) $$('.popover:not(.hidden)').forEach(p => p.classList.add('hidden')); });
})();
