// Histórico de bipagens: grava cada movimento e mostra agrupado por dia.
// Só aparecem dias com pelo menos uma bipagem (entrada ou saída).
const History = {
  byId: new Map(),
  missingTable: false,
  started: false,      // já carregou o histórico completo (aba Histórico)?
  offset: 0,
  hasMore: false,
  loading: false,
  openKeys: new Set(), // dias/linhas do tempo que o usuário deixou abertos
  firstRender: true,

  get table() { return APP_CONFIG.HISTORY_TABLE; },

  rows() {
    return [...this.byId.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // ---------- Gravação ----------
  async log({ code, prod, tipo, delta }) {
    const row = {
      code,
      sku: prod ? prod.sku : null,
      produto: prod ? prod.name.trim() : 'Todos os produtos',
      descricao: prod ? prod.desc : null,
      tipo,
      delta,
      username: Auth.user ? Auth.user.username : null,
      funcao: Auth.user ? Auth.user.mode : null
    };
    let { data, error } = await db.from(this.table).insert(row).select().single();
    // Se o SQL novo ainda não foi rodado (coluna "funcao" inexistente), grava sem ela para não perder a bipagem.
    if (error && /funcao/i.test(error.message || '')) {
      delete row.funcao;
      ({ data, error } = await db.from(this.table).insert(row).select().single());
    }
    if (error) {
      console.error('Erro ao gravar histórico:', error);
      this.checkMissing(error);
      UI.toast('Estoque atualizado, mas o histórico não foi gravado: ' + error.message, 'error');
      return;
    }
    this.add(data);
  },

  // ---------- Carregamento ----------
  checkMissing(error) {
    const msg = (error && (error.message || '')) + ' ' + (error && (error.code || ''));
    if (/42P01|PGRST205|does not exist|schema cache/i.test(msg)) {
      this.missingTable = true;
      if (App.view === 'history') this.render();
    }
  },

  // Últimas 48h: suficiente para o contador "hoje" de qualquer perfil.
  async loadRecent() {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data, error } = await db.from(this.table).select('*')
      .gte('created_at', since).order('created_at', { ascending: false });
    if (error) { this.checkMissing(error); return; }
    (data || []).forEach((r) => this.byId.set(r.id, r));
    this.refresh();
  },

  // Histórico completo, em páginas (da mais recente para a mais antiga).
  async loadPage() {
    if (this.loading) return;
    this.loading = true;
    const size = APP_CONFIG.HISTORY_PAGE_SIZE;
    const { data, error } = await db.from(this.table).select('*')
      .order('created_at', { ascending: false })
      .range(this.offset, this.offset + size - 1);
    this.loading = false;
    if (error) {
      this.checkMissing(error);
      if (!this.missingTable) UI.toast('Erro ao carregar histórico: ' + error.message, 'error');
      return;
    }
    (data || []).forEach((r) => this.byId.set(r.id, r));
    this.offset += (data || []).length;
    this.hasMore = (data || []).length === size;
    this.render();
  },

  async openView() {
    if (!this.started) {
      this.started = true;
      this.render(); // mostra "carregando"
      await this.loadPage();
    } else {
      this.render();
    }
  },

  // Chamado pelo tempo real e depois de gravar.
  add(row) {
    if (!row || this.byId.has(row.id)) return;
    this.byId.set(row.id, row);
    this.refresh();
  },

  subscribe() {
    db.channel('realtime:historico')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: this.table },
        (payload) => this.add(payload.new))
      .subscribe();
  },

  refresh() {
    this.renderToday();
    if (typeof App !== 'undefined' && App.view === 'history') this.render();
    if (typeof App !== 'undefined' && App.view === 'team') Team.scheduleRefresh();
  },

  // ---------- Contador de hoje ----------
  // Operadores veem só as próprias bipagens; admin vê as de todos.
  todayStats() {
    const key = DateUtil.today();
    const onlyMine = Auth.user && Auth.user.mode !== 'admin';
    let e = 0, s = 0;
    for (const r of this.byId.values()) {
      if (DateUtil.key(r.created_at) !== key) continue;
      if (onlyMine && r.username !== Auth.user.username) continue;
      if (r.tipo === 'entrada') e++;
      else if (r.tipo === 'saida') s++;
    }
    return { e, s, total: e + s };
  },

  renderToday() {
    if (!Auth.user) return;
    const t = this.todayStats();
    const mode = Auth.user.mode;
    // Entrada vê só entradas; saída vê só saídas; admin vê as duas.
    $('cardIn').classList.toggle('hidden', mode === 'saida');
    $('cardOut').classList.toggle('hidden', mode === 'entrada');
    $('todayStats').classList.toggle('single', mode !== 'admin');
    $('todayIn').textContent = t.e;
    $('todayOut').textContent = t.s;
    $('todayInLabel').textContent = mode === 'admin' ? 'bipados em entrada hoje' : 'produtos bipados em entrada hoje';
    $('todayOutLabel').textContent = mode === 'admin' ? 'bipados em saída hoje' : 'produtos bipados em saída hoje';
    $('dashTodayIn').textContent = t.e;
    $('dashTodayOut').textContent = t.s;
  },

  // ---------- Agrupamento por dia ----------
  groupByDay() {
    const days = new Map(); // mantém ordem: dia mais recente primeiro
    for (const r of this.rows()) {
      const key = DateUtil.key(r.created_at);
      let d = days.get(key);
      if (!d) {
        d = { key, e: 0, s: 0, adj: 0, products: new Map(), rows: [] };
        days.set(key, d);
      }
      d.rows.push(r);
      if (r.tipo === 'entrada' || r.tipo === 'saida') {
        if (r.tipo === 'entrada') d.e++; else d.s++;
        let p = d.products.get(r.code);
        if (!p) {
          p = { produto: r.produto, descricao: r.descricao, sku: r.sku, e: 0, s: 0 };
          d.products.set(r.code, p);
        }
        if (r.tipo === 'entrada') p.e++; else p.s++;
      } else {
        d.adj++;
      }
    }
    // Só dias em que houve bipagem; os demais são pulados.
    return [...days.values()].filter((d) => d.e + d.s > 0);
  },

  tipoLabel(r) {
    if (r.tipo === 'entrada') return '<span class="chip in">Entrada +1</span>';
    if (r.tipo === 'saida') return '<span class="chip out">Saída −1</span>';
    if (r.tipo === 'zerar') return '<span class="chip adj">Estoque zerado</span>';
    const sign = r.delta > 0 ? '+' : '';
    return `<span class="chip adj">Ajuste ${sign}${r.delta}</span>`;
  },

  // ---------- Tela ----------
  render() {
    const box = $('historyList');
    if (!box) return;
    const summary = $('historySummary');
    const more = $('btnLoadMore');

    if (this.missingTable) {
      summary.textContent = '';
      more.classList.add('hidden');
      box.innerHTML = `
        <div class="setup-box">
          <strong>Falta criar a tabela do histórico.</strong><br>
          No Supabase, abra <em>SQL Editor</em>, cole o conteúdo do arquivo
          <code>sql/historico.sql</code> e clique em <em>Run</em>. Depois recarregue esta página.
        </div>`;
      return;
    }

    if (this.loading && this.byId.size === 0) {
      box.innerHTML = '<div class="empty">Carregando histórico…</div>';
      return;
    }

    const days = this.groupByDay();
    more.classList.toggle('hidden', !this.hasMore);

    if (days.length === 0) {
      summary.textContent = '';
      box.innerHTML = '<div class="empty">Nenhuma bipagem registrada ainda.<br>Os dias aparecem aqui assim que houver bipagens.</div>';
      return;
    }

    if (this.firstRender) {
      this.openKeys.add('d:' + days[0].key); // abre o dia mais recente
      this.firstRender = false;
    }

    const totalBips = days.reduce((n, d) => n + d.e + d.s, 0);
    summary.textContent = `${days.length} ${days.length === 1 ? 'dia' : 'dias'} · ${totalBips} bipagens`;

    box.innerHTML = days.map((d) => {
      const prods = [...d.products.values()].sort((a, b) => (b.e + b.s) - (a.e + a.s));
      const prodHtml = prods.map((p) => `
        <li>
          <div class="prod-name"><strong>${esc(p.produto)}</strong><small>${esc(p.descricao)} · ${esc(p.sku)}</small></div>
          <div class="chips">
            ${p.e ? `<span class="chip in">+${p.e}</span>` : ''}
            ${p.s ? `<span class="chip out">−${p.s}</span>` : ''}
          </div>
        </li>`).join('');

      const timeHtml = d.rows.map((r) => `
        <li>
          <span class="t">${DateUtil.time(r.created_at)}</span>
          <span class="what">${this.tipoLabel(r)} ${esc(r.produto)}${r.descricao ? ' — ' + esc(r.descricao) : ''}
            <div class="who">${esc(r.username || '—')}</div></span>
        </li>`).join('');

      const dayOpen = this.openKeys.has('d:' + d.key) ? 'open' : '';
      const tlOpen = this.openKeys.has('t:' + d.key) ? 'open' : '';
      return `
        <details class="day" data-key="d:${d.key}" ${dayOpen}>
          <summary>
            <div class="day-title">${esc(DateUtil.label(d.key))}</div>
            <div class="chips">
              <span class="chip">${d.e + d.s} bipados</span>
              ${d.e ? `<span class="chip in">${d.e} entradas</span>` : ''}
              ${d.s ? `<span class="chip out">${d.s} saídas</span>` : ''}
              ${d.adj ? `<span class="chip adj">${d.adj} ajustes</span>` : ''}
            </div>
          </summary>
          <div class="day-body">
            <ul class="prod-list">${prodHtml}</ul>
            <details class="timeline" data-key="t:${d.key}" ${tlOpen}>
              <summary>Ver bipagens por horário</summary>
              <ul class="time-list">${timeHtml}</ul>
            </details>
          </div>
        </details>`;
    }).join('');
  },

  // Guarda quais dias o usuário abriu/fechou (sobrevive às atualizações em tempo real).
  onToggle(event) {
    const el = event.target;
    if (!el.matches || !el.matches('details[data-key]')) return;
    const key = el.getAttribute('data-key');
    if (el.open) this.openKeys.add(key); else this.openKeys.delete(key);
  },

  // ---------- Exportação ----------
  async exportCsv() {
    // Garante que todo o histórico foi carregado (ele vem em páginas) antes de exportar.
    while (this.hasMore) await this.loadPage();
    // Ordem cronológica: do mais antigo (topo) para o mais novo (final).
    const rows = this.rows().reverse();
    if (!rows.length) { UI.toast('Não há histórico para exportar.', 'error'); return; }
    const funcaoLabel = (f) => (f === 'admin' ? 'Admin' : f === 'entrada' ? 'Entrada' : f === 'saida' ? 'Saída' : '');

    // Estoque do produto bipado logo após cada movimento (soma das variações, produto por produto).
    // "Zerar estoque" leva todos os produtos a 0. Se nunca houve zerar, o saldo é ancorado no estoque atual,
    // para incluir unidades que já existiam antes do histórico começar.
    const bal = {};
    const sim = [];
    let hadReset = false;
    rows.forEach((r) => {
      if (r.tipo === 'zerar') {
        hadReset = true;
        Object.keys(bal).forEach((c) => { bal[c] = 0; });
        sim.push({ code: r.code, after: 0, reset: true });
      } else {
        bal[r.code] = (bal[r.code] || 0) + Number(r.delta || 0);
        sim.push({ code: r.code, after: bal[r.code] });
      }
    });
    const offset = (code) => {
      if (hadReset) return 0;
      const current = (typeof Stock !== 'undefined' && Stock.data[code]) ? Stock.data[code].qty : null;
      return current === null ? 0 : current - (bal[code] || 0);
    };

    let csv = 'Data,Hora,Utilizador,Funcao,SKU,Produto,Descricao,Tipo,Variacao,Estoque_apos\n';
    rows.forEach((r, i) => {
      const after = sim[i].reset ? 0 : sim[i].after + offset(r.code);
      csv += [
        csvCell(DateUtil.dateBr(r.created_at)), csvCell(DateUtil.time(r.created_at)),
        csvCell(r.username), csvCell(funcaoLabel(r.funcao)), csvCell(r.sku), csvCell(r.produto),
        csvCell(r.descricao), csvCell(r.tipo), r.delta, after
      ].join(',') + '\n';
    });
    downloadCsv(`historico_${DateUtil.today()}.csv`, csv);
  }
};
