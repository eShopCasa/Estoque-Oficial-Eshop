// Login, sessão e permissões.
const Auth = {
  user: null,

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

  // Retorna true se o login deu certo. O perfil (entrada/saída/admin) vem sempre do banco.
  async login(usernameRaw, passwordRaw) {
    const username = usernameRaw.trim();
    const password = passwordRaw.trim();
    UI.loginMsg('A verificar credenciais...');

    // Master: a senha NÃO fica no código; quem confere é o banco (função master_login, sql/master.sql).
    if (APP_CONFIG.MASTER_USERNAMES.includes(username.toLowerCase())) {
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

    // Preferido: o banco confere utilizador + senha e devolve o perfil (função login_usuario, sql/login.sql).
    const { data: rows, error: rpcErr } = await db.rpc('login_usuario', { p_username: username, p_senha: password });
    let found = null;

    if (!rpcErr) {
      found = Array.isArray(rows) ? rows[0] : rows;
      if (!found || !found.role) { UI.loginMsg('Utilizador ou palavra-passe incorretos.', 'error'); return false; }
    } else {
      const missing = /PGRST202|42883|Could not find the function/i.test((rpcErr.message || '') + ' ' + (rpcErr.code || ''));
      if (!missing) {
        console.error('Erro no login:', rpcErr);
        UI.loginMsg('Erro ao verificar as credenciais.', 'error');
        return false;
      }
      // Alternativa enquanto o sql/login.sql não foi rodado: consulta direta na tabela.
      const { data: users, error } = await db.from('usuarios').select('*').ilike('username', username);
      if (error) {
        console.error('Erro de consulta Supabase:', error);
        UI.loginMsg('Acesso negado ou utilizador não encontrado.', 'error');
        return false;
      }
      found = (users || []).find((u) => String(u.password).trim() === password);
      if (!found) { UI.loginMsg('Utilizador ou palavra-passe incorretos.', 'error'); return false; }
    }

    if (!['entrada', 'saida', 'admin'].includes(found.role)) {
      UI.loginMsg('Perfil do utilizador inválido no banco de dados.', 'error');
      return false;
    }
    // Sem o sql/login.sql o banco não registra o último login; tenta gravar daqui (sem travar o login se falhar).
    if (rpcErr && found.id != null) {
      db.from('usuarios').update({ ultimo_login: new Date().toISOString() }).eq('id', found.id).then(() => {}, () => {});
    }
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
