// Login, sessão e permissões.
const Auth = {
  user: null,
  role: 'entrada', // perfil selecionado na tela de login

  isAdmin() { return !!this.user && this.user.mode === 'admin'; },

  isMaster() {
    if (!this.isAdmin()) return false;
    return APP_CONFIG.MASTER_USERNAMES.includes(this.user.username.toLowerCase().trim());
  },

  roleLabel(role) {
    if (role === 'entrada') return 'Operador de Entrada';
    if (role === 'saida') return 'Operador de Saída';
    return 'Administrador';
  },

  setRole(role) {
    this.role = role;
    document.querySelectorAll('.user-toggle button').forEach((b) => {
      b.classList.toggle('active', b.dataset.role === role);
    });
    $('loginUsername').value = '';
    $('loginPassword').value = '';
    UI.loginMsg('');
    $('loginUsername').focus();
  },

  // Retorna true se o login deu certo.
  async login(usernameRaw, passwordRaw) {
    const username = usernameRaw.trim();
    const password = passwordRaw.trim();
    UI.loginMsg('A verificar credenciais...');

    // Master: a senha NÃO fica no código; quem confere é o banco (função master_login, sql/master.sql).
    if (this.role === 'admin' && APP_CONFIG.MASTER_USERNAMES.includes(username.toLowerCase())) {
      const { data: ok, error: mErr } = await db.rpc('master_login', { p_senha: password });
      if (mErr) {
        console.error('Erro no login master:', mErr);
        const missing = /PGRST202|42883|Could not find the function/i.test((mErr.message || '') + ' ' + (mErr.code || ''));
        UI.loginMsg(missing ? 'Falta rodar o arquivo sql/master.sql no Supabase.' : 'Erro ao verificar a senha do master.', 'error');
        return false;
      }
      if (!ok) { UI.loginMsg('Palavra-passe incorreta.', 'error'); return false; }
      this.start({ username: "Lucas d'", mode: 'admin', label: 'Administrador Master' });
      return true;
    }

    const { data: users, error } = await db.from('usuarios').select('*').ilike('username', username);
    if (error) {
      console.error('Erro de consulta Supabase:', error);
      UI.loginMsg('Acesso negado ou utilizador não encontrado.', 'error');
      return false;
    }
    if (!users || users.length === 0) {
      UI.loginMsg(`Utilizador "${username}" não encontrado.`, 'error');
      return false;
    }
    const found = users.find((u) => String(u.password).trim() === password);
    if (!found) { UI.loginMsg('Palavra-passe incorreta.', 'error'); return false; }
    if (found.role !== this.role) { UI.loginMsg('Acesso negado: perfil incompatível!', 'error'); return false; }

    this.start({ username: found.username, mode: found.role, label: this.roleLabel(found.role) });
    return true;
  },

  start(user) {
    this.user = user;
    sessionStorage.setItem(APP_CONFIG.SESSION_KEY, JSON.stringify(user));
  },

  restore() {
    // Sessão antiga (versão anterior guardava no localStorage e nunca expirava): apaga.
    try { localStorage.removeItem(APP_CONFIG.SESSION_KEY); } catch (e) { /* ignora */ }
    // A sessão vale só enquanto a aba/site estiver aberto; ao fechar, o login é encerrado.
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(APP_CONFIG.SESSION_KEY) || 'null'); } catch (e) { /* ignora */ }
    if (saved && saved.username && saved.mode) { this.user = saved; return true; }
    return false;
  },

  logout() {
    this.user = null;
    sessionStorage.removeItem(APP_CONFIG.SESSION_KEY);
  }
};
