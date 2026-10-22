// Aba "Equipe": unidades bipadas por colaborador (hoje, total desde o reinício e período de até 30 dias).
const Team = {
  MAX_DAYS: 30,
  lastReset: null,
  missing: false,
  period: { rows: [], from: null, to: null },
  _timer: null,

  // ---------- Ligações da tela ----------
  bind() {
    $('btnResetCount').addEventListener('click', () => this.reset());
    $('btnRangeSearch').addEventListener('click', () => this.search());
    $('btnExportPeriod').addEventListener('click', () => this.exportCsv());
    $('rangeFrom').addEventListener('change', () => this.onFromChange());
    $('rangeTo').addEventListener('change', () => this.syncLimits());
    document.querySelectorAll('[data-range]').forEach((b) =>
      b.addEventListener('click', () => this.preset(Number(b.dataset.range))));
  },

  isMissing(error) {
    const text = ((error && error.message) || '') + ' ' + ((error && error.code) || '');
    return /42P01|42883|PGRST202|PGRST205|does not exist|schema cache|Could not find the function/i.test(text);
  },

  showSetup() {
    this.missing = true;
    $('teamSetup').classList.remove('hidden');
    $('teamContent').classList.add('hidden');
  },

  // ---------- Abertura da aba ----------
  async openView() {
    this.initDates();
    await this.loadAll();
  },

  async loadAll() {
    await this.loadReset();
    if (this.missing) return;
    await Promise.all([this.loadRanking(), this.search(true)]);
  },

  // Atualização automática quando alguém bipa (com pequena espera para não repetir à toa).
  scheduleRefresh() {
    if (this.missing) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this.loadRanking();
      this.search(true);
    }, 1000);
  },

  // ---------- Datas do período ----------
  initDates() {
    if ($('rangeFrom').value) { this.syncLimits(); return; }
    const today = DateUtil.today();
    $('rangeTo').value = today;
    $('rangeFrom').value = DateUtil.addDays(today, -6);
    this.syncLimits();
  },

  // Limita os calendários: sem futuro e no máximo 30 dias de intervalo.
  syncLimits() {
    const today = DateUtil.today();
    const from = $('rangeFrom').value;
    $('rangeFrom').max = today;
    if (from) {
      const maxTo = DateUtil.addDays(from, this.MAX_DAYS - 1);
      $('rangeTo').min = from;
      $('rangeTo').max = maxTo < today ? maxTo : today;
    } else {
      $('rangeTo').removeAttribute('min');
      $('rangeTo').max = today;
    }
  },

  onFromChange() {
    const from = $('rangeFrom').value;
    const to = $('rangeTo').value;
    if (from) {
      const today = DateUtil.today();
      const maxTo = DateUtil.addDays(from, this.MAX_DAYS - 1);
      const limit = maxTo < today ? maxTo : today;
      if (!to || to < from) $('rangeTo').value = from;
      else if (to > limit) $('rangeTo').value = limit;
    }
    this.syncLimits();
  },

  preset(days) {
    const today = DateUtil.today();
    $('rangeTo').value = today;
    $('rangeFrom').value = DateUtil.addDays(today, -(days - 1));
    this.syncLimits();
    this.search();
  },

  validate() {
    const from = $('rangeFrom').value;
    const to = $('rangeTo').value;
    if (!from || !to) return 'Escolha a data inicial e a final.';
    if (from > to) return 'A data inicial não pode ser depois da final.';
    if (to > DateUtil.today()) return 'A data final não pode estar no futuro.';
    if (DateUtil.diffDays(from, to) + 1 > this.MAX_DAYS) return `O intervalo máximo é de ${this.MAX_DAYS} dias.`;
    return null;
  },

  // ---------- Reinício da contagem ----------
  async loadReset() {
    const { data, error } = await db.from('contagem_reinicios').select('*')
      .order('created_at', { ascending: false }).limit(1);
    if (error) {
      console.error('Erro ao ler reinícios:', error);
      if (this.isMissing(error)) this.showSetup();
      else UI.toast('Erro ao carregar a contagem: ' + error.message, 'error');
      return;
    }
    this.lastReset = data && data.length ? data[0] : null;
    const info = $('resetInfo');
    if (this.lastReset) {
      const r = this.lastReset;
      info.innerHTML = `Contagem reiniciada em <strong>${esc(DateUtil.dateBr(r.created_at))} às ${esc(DateUtil.time(r.created_at))}</strong>` +
        (r.username ? ` por ${esc(r.username)}` : '') + '.';
    } else {
      info.textContent = 'A contagem nunca foi reiniciada: o total considera todo o histórico.';
    }
  },

  // Zera o histórico da EQUIPE (hoje, total e período). O Histórico de bipagens e o estoque NÃO são apagados.
  async reset() {
    if (!Auth.isMaster()) { UI.toast("Apenas o Lucas d' pode zerar o histórico da equipe.", 'error'); return; }
    if (!confirm(
      'Zerar o histórico da equipe?\n\n' +
      'Os totais de cada colaborador (hoje, total e pesquisa por período) voltam a zero a partir de agora.\n' +
      'A aba Histórico (movimentação do estoque) e o estoque NÃO são alterados.'
    )) return;

    // Senha pedida na hora e conferida pelo banco; não fica guardada em lugar nenhum.
    const senha = prompt('Digite a senha do master para confirmar:');
    if (senha === null) return;

    const { error } = await db.rpc('zerar_equipe', { p_senha: senha.trim(), p_username: Auth.user.username });
    if (error) {
      console.error('Erro ao zerar a equipe:', error);
      const text = (error.message || '') + ' ' + (error.code || '');
      UI.toast(/PGRST202|42883|Could not find the function/i.test(text)
        ? 'Falta rodar o arquivo sql/master.sql no Supabase.'
        : /Senha invalida|42501/i.test(text) ? 'Senha incorreta. Nada foi alterado.'
        : 'Erro ao zerar a equipe: ' + error.message, 'error');
      return;
    }

    UI.toast('✔ Histórico da equipe zerado!', 'success');
    await this.loadAll();
  },

  // ---------- Hoje + total desde o reinício ----------
  async loadRanking() {
    const today = DateUtil.today();
    const [daily, total] = await Promise.all([
      db.rpc('desempenho_diario', { p_inicio: today, p_fim: today, p_tz: APP_CONFIG.TIMEZONE }),
      db.rpc('desempenho_total')
    ]);
    const error = daily.error || total.error;
    if (error) {
      console.error('Erro no ranking:', error);
      if (this.isMissing(error)) this.showSetup();
      else UI.toast('Erro ao carregar a equipe: ' + error.message + ' — rode sql/permissoes.sql no Supabase.', 'error');
      return;
    }

    const people = new Map();
    const get = (name) => {
      if (!people.has(name)) people.set(name, { name, hoje: 0, e: 0, s: 0 });
      return people.get(name);
    };
    (daily.data || []).forEach((r) => { get(r.username).hoje += Number(r.entradas) + Number(r.saidas); });
    (total.data || []).forEach((r) => { const p = get(r.username); p.e += Number(r.entradas); p.s += Number(r.saidas); });

    const list = [...people.values()]
      .map((p) => ({ ...p, total: p.e + p.s }))
      .sort((a, b) => (b.total - a.total) || (b.hoje - a.hoje) || a.name.localeCompare(b.name));

    const box = $('teamList');
    if (!list.length) {
      box.innerHTML = '<div class="empty">Nenhuma bipagem desde o último reinício.</div>';
      return;
    }
    const top = box.scrollTop;
    box.innerHTML = list.map((p) => `
      <div class="team-row">
        <div class="tr-main">
          <strong>${esc(p.name)}</strong>
          <div class="chips">
            ${p.e ? `<span class="chip in">+${p.e}</span>` : ''}
            ${p.s ? `<span class="chip out">−${p.s}</span>` : ''}
          </div>
        </div>
        <div class="tr-num"><span>${p.hoje}</span><small>hoje</small></div>
        <div class="tr-num total"><span>${p.total}</span><small>total</small></div>
      </div>`).join('');
    box.scrollTop = top;
  },

  // ---------- Pesquisa por período ----------
  async search(silent = false) {
    const err = this.validate();
    if (err) { if (!silent) UI.toast(err, 'error'); return; }

    const from = $('rangeFrom').value;
    const to = $('rangeTo').value;
    const { data, error } = await db.rpc('desempenho_diario', {
      p_inicio: from, p_fim: to, p_tz: APP_CONFIG.TIMEZONE
    });
    if (error) {
      console.error('Erro na pesquisa por período:', error);
      if (this.isMissing(error)) this.showSetup();
      else if (!silent) UI.toast('Erro na pesquisa: ' + error.message, 'error');
      return;
    }
    this.period = { rows: data || [], from, to };
    this.renderPeriod();
  },

  renderPeriod() {
    const { rows, from, to } = this.period;
    const box = $('periodList');
    const summary = $('periodSummary');

    const people = new Map();
    rows.forEach((r) => {
      const e = Number(r.entradas), s = Number(r.saidas);
      let p = people.get(r.username);
      if (!p) { p = { name: r.username, e: 0, s: 0, days: [] }; people.set(r.username, p); }
      p.e += e; p.s += s;
      p.days.push({ dia: r.dia, e, s });
    });
    const list = [...people.values()].sort((a, b) => (b.e + b.s) - (a.e + a.s));
    const total = list.reduce((n, p) => n + p.e + p.s, 0);

    summary.textContent = `${DateUtil.fmtKey(from)} a ${DateUtil.fmtKey(to)} · ${total} unidades · ` +
      `${list.length} ${list.length === 1 ? 'colaborador' : 'colaboradores'}`;

    if (!list.length) {
      box.innerHTML = '<div class="empty">Nenhuma bipagem neste período.</div>';
      return;
    }

    const top = box.scrollTop;
    box.innerHTML = list.map((p) => {
      const days = p.days.sort((a, b) => (a.dia < b.dia ? 1 : -1)).map((d) => `
        <li>
          <span>${esc(DateUtil.short(d.dia))}</span>
          <div class="chips">
            <span class="chip">${d.e + d.s}</span>
            ${d.e ? `<span class="chip in">+${d.e}</span>` : ''}
            ${d.s ? `<span class="chip out">−${d.s}</span>` : ''}
          </div>
        </li>`).join('');
      return `
        <details class="day person">
          <summary>
            <div class="day-title">${esc(p.name)}</div>
            <div class="chips">
              <span class="chip">${p.e + p.s} unidades</span>
              ${p.e ? `<span class="chip in">${p.e} entradas</span>` : ''}
              ${p.s ? `<span class="chip out">${p.s} saídas</span>` : ''}
              <span class="chip adj">${p.days.length} ${p.days.length === 1 ? 'dia' : 'dias'}</span>
            </div>
          </summary>
          <div class="day-body"><ul class="person-days">${days}</ul></div>
        </details>`;
    }).join('');
    box.scrollTop = top;
  },

  // Por colaborador e dia: entradas com o total acumulado de entradas, e saídas com o total acumulado de saídas
  // (o acumulado é o resultado depois daquele dia, dentro do período pesquisado).
  exportCsv() {
    const { rows, from, to } = this.period;
    if (!rows.length) { UI.toast('Não há dados no período para exportar.', 'error'); return; }

    const sorted = [...rows].sort((a, b) =>
      a.username.localeCompare(b.username) || (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0));

    let csv = 'Data,Colaborador,Entradas,Total_apos_entrada,Saidas,Total_apos_saida\n';
    let current = null, accE = 0, accS = 0;
    sorted.forEach((r) => {
      if (r.username !== current) { current = r.username; accE = 0; accS = 0; }
      const e = Number(r.entradas), s = Number(r.saidas);
      accE += e; accS += s;
      csv += [csvCell(DateUtil.fmtKey(r.dia)), csvCell(r.username), e, accE, s, accS].join(',') + '\n';
    });
    downloadCsv(`equipe_${from}_a_${to}.csv`, csv);
  }
};
