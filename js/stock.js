// Estoque: quantidades, bipagem, sincronização com o Supabase e tela do catálogo.
const Stock = {
  data: {},
  search: '',

  init() {
    Object.keys(productsDB).forEach((code) => {
      this.data[code] = { qty: 0, lastAction: 'Nenhuma' };
    });
  },

  // ---------- Supabase ----------
  async sync(code) {
    const item = this.data[code];
    if (!item) return;
    const { error } = await db.from('estoque').upsert(
      { code, qty: item.qty, last_action: item.lastAction },
      { onConflict: 'code' }
    );
    if (error) {
      console.error('Erro ao salvar no Supabase:', error);
      UI.toast('Erro ao salvar no banco: ' + error.message, 'error');
    }
  },

  async load() {
    const { data, error } = await db.from('estoque').select('*');
    if (error) { UI.toast('Erro ao carregar estoque: ' + error.message, 'error'); return; }
    (data || []).forEach((row) => {
      if (this.data[row.code]) {
        this.data[row.code] = { qty: row.qty, lastAction: row.last_action || 'Nenhuma' };
      }
    });
    this.render();
  },

  subscribe() {
    db.channel('realtime:estoque')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque' }, (payload) => {
        const row = payload.new;
        if (row && this.data[row.code]) {
          this.data[row.code] = { qty: row.qty, lastAction: row.last_action || 'Nenhuma' };
          this.render();
        }
      })
      .subscribe();
  },

  // ---------- Bipagem ----------
  process(raw) {
    const code = String(raw || '').trim();
    const user = Auth.user;
    if (!code || !user) return;

    const prod = productsDB[code];
    if (!prod) {
      UI.toast(`Atenção: código de barras (${code}) não registado!`, 'error');
      return;
    }

    const item = this.data[code];
    let tipo, delta;

    if (user.mode === 'saida') {
      if (item.qty <= 0) { UI.toast('⚠ Produto sem saldo disponível!', 'error'); return; }
      item.qty -= 1;
      item.lastAction = `Saida (-1) — ${user.username}`;
      tipo = 'saida'; delta = -1;
      UI.toast(`✖ SAÍDA: ${prod.name.trim()} (${prod.desc})`, 'success');
    } else {
      // entrada e admin somam 1
      item.qty += 1;
      item.lastAction = `Entrada (+1) — ${user.username}`;
      tipo = 'entrada'; delta = 1;
      UI.toast(`✔ ENTRADA: ${prod.name.trim()} (${prod.desc})`, 'success');
    }

    this.render();
    this.sync(code);
    History.log({ code, prod, tipo, delta });
  },

  // ---------- Ajustes (somente master) ----------
  setQty(code, value) {
    if (!Auth.isMaster()) {
      UI.toast("Apenas o utilizador Lucas d' tem permissão para editar o estoque.", 'error');
      this.render();
      return;
    }
    const qty = parseInt(value, 10);
    if (isNaN(qty) || qty < 0) { this.render(); return; }

    const item = this.data[code];
    const delta = qty - item.qty;
    if (delta === 0) return;

    item.qty = qty;
    item.lastAction = `Ajuste Admin — ${Auth.user.username}`;
    this.render();
    this.sync(code);
    History.log({ code, prod: productsDB[code], tipo: 'ajuste', delta });
  },

  async reset() {
    if (!Auth.isMaster()) {
      UI.toast("Apenas o utilizador Lucas d' pode zerar o estoque.", 'error');
      return;
    }
    if (!confirm('ATENÇÃO!\n\nIsso vai zerar TODO o estoque de todos os produtos.\n\nDeseja realmente continuar?')) return;

    const totalBefore = Object.values(this.data).reduce((n, i) => n + i.qty, 0);
    const action = `Estoque zerado — ${Auth.user.username}`;

    Object.keys(productsDB).forEach((code) => {
      this.data[code].qty = 0;
      this.data[code].lastAction = action;
    });

    const registros = Object.keys(productsDB).map((code) => ({ code, qty: 0, last_action: action }));
    const { error } = await db.from('estoque').upsert(registros, { onConflict: 'code' });

    if (error) {
      console.error('Erro ao zerar estoque:', error);
      UI.toast('Erro ao zerar estoque: ' + error.message, 'error');
      await this.load();
      return;
    }

    this.render();
    UI.toast('✔ Estoque zerado com sucesso!', 'success');
    if (totalBefore > 0) History.log({ code: 'TODOS', prod: null, tipo: 'zerar', delta: -totalBefore });
  },

  // ---------- Tela ----------
  render() {
    const list = $('stockList');
    if (!list) return;

    const term = this.search.toLowerCase().trim();
    const master = Auth.isMaster();
    let totalUnits = 0;
    let html = '';
    let shown = 0;

    Object.keys(productsDB).forEach((code) => {
      const prod = productsDB[code];
      const item = this.data[code] || { qty: 0, lastAction: 'Nenhuma' };
      totalUnits += item.qty;

      if (term && !`${prod.name} ${prod.desc} ${prod.sku} ${code}`.toLowerCase().includes(term)) return;
      shown++;

      const badge = item.lastAction.includes('Entrada') ? 'badge-in'
        : (item.lastAction.includes('Saida') ? 'badge-out' : 'badge-neutral');

      const qty = master
        ? `<input type="number" inputmode="numeric" min="0" class="qty-input" value="${item.qty}" data-code="${esc(code)}">`
        : `<strong>${item.qty}</strong>`;

      html += `
        <div class="stock-item">
          <div class="si-main">
            <strong>${esc(prod.name.trim())}</strong>
            <span class="desc">${esc(prod.desc)}</span>
            <span class="codes">${esc(prod.sku)} · ${esc(code)}</span>
            <span class="badge ${badge}">${esc(item.lastAction)}</span>
          </div>
          <div class="si-qty">${qty}</div>
        </div>`;
    });

    // Não recria a lista enquanto o master está digitando uma quantidade.
    const active = document.activeElement;
    const editing = active && active.classList && active.classList.contains('qty-input');
    if (!editing) {
      const top = list.scrollTop; // mantém a posição da rolagem ao atualizar
      list.innerHTML = html;
      list.scrollTop = top;
    }

    $('noResults').classList.toggle('hidden', shown > 0);
    $('dashTotalUnits').textContent = totalUnits;
    $('totalItems').textContent = `Total geral em estoque: ${totalUnits} unidades`;
  },

  exportCsv() {
    let csv = 'Codigo,SKU,Produto,Descricao,Quantidade,Ultima_Acao\n';
    Object.keys(productsDB).forEach((code) => {
      const p = productsDB[code];
      const s = this.data[code] || { qty: 0, lastAction: 'Nenhuma' };
      csv += [csvCell(code), csvCell(p.sku), csvCell(p.name.trim()), csvCell(p.desc), s.qty, csvCell(s.lastAction)].join(',') + '\n';
    });
    downloadCsv(`estoque_${DateUtil.today()}.csv`, csv);
  }
};
