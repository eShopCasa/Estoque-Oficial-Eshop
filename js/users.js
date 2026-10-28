// Gestão de logins (somente administrador master).
const Users = {
  fmtLogin(v) {
    return `${DateUtil.dateBr(v)} às ${DateUtil.time(v)}`;
  },

  async load() {
    if (!Auth.isMaster()) return;
    const list = $('usersList');
    const { data, error } = await db.from('usuarios').select('*').order('id', { ascending: true });
    if (error) { UI.toast('Erro ao carregar utilizadores (RLS restrito): ' + error.message, 'error'); return; }

    if (!data || data.length === 0) {
      list.innerHTML = '<div class="empty">Nenhum login cadastrado.</div>';
      return;
    }

    const top = list.scrollTop;
    list.innerHTML = data.map((u) => {
      const badge = u.role === 'entrada' ? 'badge-in' : (u.role === 'saida' ? 'badge-out' : 'badge-neutral');
      const created = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-PT') : '-';
      const last = u.ultimo_login ? this.fmtLogin(u.ultimo_login) : 'sem registro';
      return `
        <div class="user-item">
          <div class="meta">
            <strong>${esc(u.username)}</strong>
            <small>ID ${esc(u.id)} · criado em ${esc(created)}</small>
            <small>Último login: ${esc(last)}</small>
            <span class="badge ${badge}">${esc(String(u.role).toUpperCase())}</span>
          </div>
          <button type="button" class="btn-delete" data-id="${esc(u.id)}" data-name="${esc(u.username)}">Excluir</button>
        </div>`;
    }).join('');
    list.scrollTop = top;
  },

  async create(event) {
    event.preventDefault();
    if (!Auth.isMaster()) { UI.toast("Apenas o Lucas d' pode criar novos utilizadores.", 'error'); return; }

    const username = $('newUsername').value.trim();
    const password = $('newPassword').value.trim();
    const role = $('newRole').value;

    const { error } = await db.from('usuarios').insert([{ username, password, role }]);
    if (error) {
      UI.toast('Erro ao criar utilizador: ' + error.message, 'error');
    } else {
      UI.toast(`Utilizador "${username}" criado com sucesso!`, 'success');
      $('createUserForm').reset();
      this.load();
    }
  },

  async remove(id, username) {
    if (!Auth.isMaster()) { UI.toast("Ação restrita ao utilizador Lucas d'.", 'error'); return; }
    if (APP_CONFIG.MASTER_USERNAMES.includes(username.toLowerCase().trim())) {
      alert('Não é possível excluir o administrador master!');
      return;
    }
    if (!confirm(`Remover o login "${username}"?`)) return;

    const { error } = await db.from('usuarios').delete().eq('id', id);
    if (error) {
      UI.toast('Erro ao excluir: ' + error.message, 'error');
    } else {
      UI.toast('Utilizador removido.', 'success');
      this.load();
    }
  }
};
