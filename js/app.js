// Ponto de entrada: liga os módulos, controla telas e navegação.
const App = {
  view: 'scan',

  init() {
    Stock.init();
    Stock.subscribe();
    History.subscribe();
    this.bind();
    if (Auth.restore()) this.enter();
  },

  bind() {
    // Login
    $('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const ok = await Auth.login($('loginUsername').value, $('loginPassword').value);
      if (ok) this.enter();
    });
    $('btnLogout').addEventListener('click', () => this.exit());

    // Navegação inferior
    document.querySelectorAll('#bottomNav button').forEach((b) =>
      b.addEventListener('click', () => this.show(b.dataset.view)));

    // Bipar
    $('btnCamera').addEventListener('click', () => Scanner.start());
    $('btnCloseCamera').addEventListener('click', () => Scanner.stop());
    $('barcodeInput').addEventListener('keydown', (e) => Scanner.onKey(e));

    // Estoque
    $('stockSearch').addEventListener('input', (e) => { Stock.search = e.target.value; Stock.render(); });
    $('stockList').addEventListener('change', (e) => {
      if (e.target.classList.contains('qty-input')) {
        Stock.setQty(e.target.dataset.code, e.target.value);
      }
    });
    $('btnResetStock').addEventListener('click', () => Stock.reset());
    $('btnExportStock').addEventListener('click', () => Stock.exportCsv());

    // Histórico
    $('historyList').addEventListener('toggle', (e) => History.onToggle(e), true);
    $('btnLoadMore').addEventListener('click', () => History.loadPage());
    $('btnExportHistory').addEventListener('click', () => History.exportCsv());

    // Equipe
    Team.bind();

    // Utilizadores
    $('createUserForm').addEventListener('submit', (e) => Users.create(e));
    $('usersList').addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-delete');
      if (btn) Users.remove(Number(btn.dataset.id), btn.dataset.name);
    });
  },

  enter() {
    const user = Auth.user;
    const admin = Auth.isAdmin();
    const master = Auth.isMaster();

    $('loginScreen').classList.add('hidden');
    $('appScreen').classList.remove('hidden');
    $('loggedUserLabel').textContent = `${user.label} (${user.username})`;

    // Banner do modo
    const banner = $('modeBanner');
    if (user.mode === 'entrada') {
      banner.className = 'mode-banner entrada';
      $('modeTitle').textContent = 'Modo: ENTRADA DE ESTOQUE';
      $('modeSub').textContent = 'Cada leitura soma 1 unidade ao estoque';
    } else if (user.mode === 'saida') {
      banner.className = 'mode-banner saida';
      $('modeTitle').textContent = 'Modo: SAÍDA DE ESTOQUE';
      $('modeSub').textContent = 'Cada leitura subtrai 1 unidade do estoque';
    } else {
      banner.className = 'mode-banner admin';
      $('modeTitle').textContent = master ? "Modo: ADMINISTRADOR MASTER (Lucas d')" : 'Modo: ADMINISTRADOR (Visualização)';
      $('modeSub').textContent = master
        ? 'Controle total de estoque, histórico e gestão de utilizadores'
        : 'Visualização do estoque e do histórico de bipagens';
    }

    // Navegação: só administradores têm abas.
    $('bottomNav').classList.toggle('hidden', !admin);
    $('navUsers').classList.toggle('hidden', !master);
    $('btnResetStock').classList.toggle('hidden', !master);
    $('btnResetCount').classList.toggle('hidden', !master);
    document.body.classList.toggle('has-nav', admin);

    Stock.load();
    History.loadRecent();
    if (master) Users.load();

    this.show(admin ? 'stock' : 'scan');
    Stock.render();
    History.renderToday();

    // Foco automático só onde há teclado físico (no celular abriria o teclado à toa).
    if (window.matchMedia('(hover: hover)').matches) $('barcodeInput').focus();
  },

  show(view) {
    this.view = view;
    ['scan', 'stock', 'history', 'team', 'users'].forEach((v) =>
      $('view-' + v).classList.toggle('hidden', v !== view));
    document.querySelectorAll('#bottomNav button').forEach((b) =>
      b.classList.toggle('active', b.dataset.view === view));

    if (view === 'history') History.openView();
    if (view === 'team') Team.openView();
    if (view === 'users') Users.load();
    window.scrollTo({ top: 0 });
  },

  exit() {
    Scanner.stop();
    Auth.logout();
    document.body.classList.remove('has-nav');
    $('bottomNav').classList.add('hidden');
    $('appScreen').classList.add('hidden');
    $('loginScreen').classList.remove('hidden');
    $('loginForm').reset();
    UI.loginMsg('');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
