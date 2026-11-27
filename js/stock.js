// Estoque: quantidades, bipagem, sincronização com o Supabase e tela do catálogo.
// Confirmação antes de gravar a bipagem (botões grandes, pensados para o celular).
const Confirm = {
  open: false,
  _onYes: null,

  bind() {
    $('btnConfirmYes').addEventListener('click', () => this.close(true));
    $('btnConfirmNo').addEventListener('click', () => this.close(false));
    document.addEventListener('keydown', (e) => { if (this.open && e.key === 'Escape') this.close(false); });
  },

  ask({ tipo, prod, code, qty, onYes }) {
    const entrada = tipo !== 'saida'; // entrada e devolução somam 1
    $('confirmBox').className = 'confirm-box ' + tipo;
    const devolucao = tipo === 'devolucao';
    $('confirmTitle').textContent = devolucao ? 'Registrar DEVOLUÇÃO deste produto?'
      : entrada ? 'Dar ENTRADA neste produto?' : 'Dar SAÍDA neste produto?';
    $('confirmName').textContent = prod.name.trim();
    $('confirmDesc').textContent = prod.desc;
    $('confirmCodes').textContent = `${prod.sku} · ${code}`;
    $('confirmStock').textContent = `Estoque atual: ${qty} → ficará ${entrada ? qty + 1 : qty - 1}`;
    $('btnConfirmYes').textContent = devolucao ? '↺ Confirmar devolução (+1)'
      : entrada ? '✔ Confirmar entrada (+1)' : '✖ Confirmar saída (−1)';
    this._onYes = onYes;
    this.open = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    $('confirmModal').classList.remove('hidden');
  },

  close(yes) {
    if (!this.open) return;
    const fn = this._onYes;
    this.open = false;
    this._onYes = null;
    $('confirmModal').classList.add('hidden');
    if (yes && fn) fn();
    else UI.toast('Bipagem não confirmada. Nada foi alterado.', 'error');
    // Foco automático só onde há teclado físico.
    if (window.matchMedia('(hover: hover)').matches) $('barcodeInput').focus();
  }
};

const Stock = {
  data: {},
  search: '',
  scanMode: 'entrada', // só vale para o master: 'entrada', 'saida' ou 'devolucao'

  setScanMode(mode) {
    this.scanMode = ['saida', 'devolucao'].includes(mode) ? mode : 'entrada';
    document.querySelectorAll('#masterMode button').forEach((b) =>
      b.classList.toggle('active', b.dataset.scan === this.scanMode));
  },

  init() {
    Object.keys(productsDB).forEach((code) => {
      this.data[code] = { qty: 0, lastAction: 'Nenhuma' };
    });
    Confirm.bind();
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
  // Valida o código e pede confirmação; só grava depois do "Confirmar".
  process(raw) {
    const code = String(raw || '').trim();
    const user = Auth.user;
    if (!code || !user) return;
    if (Confirm.open) return; // já há uma confirmação aberta

    const prod = productsDB[code];
    if (!prod) {
      UI.toast(`Atenção: código de barras (${code}) não registado!`, 'error');
      return;
    }

    // entrada, devolução e admin somam 1; saída subtrai 1. O master escolhe no seletor da tela de bipar.
    const tipo = user.mode === 'saida' ? 'saida'
      : user.mode === 'devolucao' ? 'devolucao'
      : Auth.isMaster() ? this.scanMode : 'entrada';
    const item = this.data[code];
    if (tipo === 'saida' && item.qty <= 0) { UI.toast('⚠ Produto sem saldo disponível!', 'error'); return; }

    Confirm.ask({ tipo, prod, code, qty: item.qty, onYes: () => this.apply(code, prod, tipo) });
  },

  // Grava a bipagem já confirmada.
  apply(code, prod, tipo) {
    const user = Auth.user;
    const item = this.data[code];
    if (!user || !item) return;
    let delta;

    if (tipo === 'saida') {
      if (item.qty <= 0) { UI.toast('⚠ Produto sem saldo disponível!', 'error'); return; }
      item.qty -= 1;
      item.lastAction = `Saida (-1) — ${user.username}`;
      delta = -1;
      UI.toast(`✖ SAÍDA: ${prod.name.trim()} (${prod.desc})`, 'success');
    } else if (tipo === 'devolucao') {
      item.qty += 1;
      item.lastAction = `Devolução (+1) — ${user.username}`;
      delta = 1;
      UI.toast(`↺ DEVOLUÇÃO: ${prod.name.trim()} (${prod.desc})`, 'success');
    } else {
      item.qty += 1;
      item.lastAction = `Entrada (+1) — ${user.username}`;
      delta = 1;
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
        : (item.lastAction.includes('Saida') ? 'badge-out'
        : (item.lastAction.includes('Devolu') ? 'badge-ret' : 'badge-neutral'));

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
            <button type="button" class="btn-label" data-code="${esc(code)}">Baixar Etiqueta</button>
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

  // Baixa a etiqueta (PNG) do produto, guardada no Supabase Storage (bucket "etiquetas", um arquivo por código de barras).
  // O atributo "download" do <a> é ignorado em links de outro domínio (o navegador só abre a imagem),
  // por isso o arquivo é buscado como blob e baixado a partir de um link local.
  async downloadLabel(code) {
    const prod = productsDB[code];
    if (!prod) return;
    const nome = `Etiqueta - ${prod.name.trim()} ${prod.desc} - ${code}`.replace(/[\\/:*?"<>|]/g, '');
    const bucket = db.storage.from(APP_CONFIG.LABELS_BUCKET);
    const path = `${code}.png`;

    try {
      const { data } = bucket.getPublicUrl(path);
      const res = await fetch(data.publicUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nome}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('Falha ao baixar etiqueta, tentando link direto:', err);
      // Plano B: o Supabase responde com "Content-Disposition: attachment" quando o link leva ?download=
      const { data } = bucket.getPublicUrl(path, { download: `${nome}.png` });
      window.location.href = data.publicUrl;
    }
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
