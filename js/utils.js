// Funções utilitárias compartilhadas.
const $ = (id) => document.getElementById(id);

// Escapa texto antes de colocar em innerHTML.
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Célula de CSV (aspas duplicadas, sempre entre aspas).
function csvCell(value) {
  return '"' + String(value ?? '').replace(/"/g, '""') + '"';
}

function downloadCsv(filename, text) {
  // BOM para o Excel reconhecer acentos.
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}

const UI = {
  _timer: null,
  toast(message, type = 'success') {
    const t = $('toast');
    t.textContent = message;
    t.className = `toast ${type} show`;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => t.classList.remove('show'), 3500);
  },
  loginMsg(message, type = '') {
    const el = $('loginMsg');
    el.textContent = message;
    el.className = 'login-msg ' + type;
  }
};

// Datas sempre no fuso configurado, independente do aparelho.
const DateUtil = {
  _tz: () => APP_CONFIG.TIMEZONE,

  // "2026-10-20" — chave do dia.
  key(date) {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: this._tz() }).format(new Date(date));
  },
  today() { return this.key(new Date()); },

  // "terça-feira, 20 de outubro de 2026"
  label(key) {
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12));
    const text = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(dt);
    const label = text.charAt(0).toUpperCase() + text.slice(1);
    return key === this.today() ? `Hoje — ${label}` : label;
  },

  // Soma dias a uma chave "YYYY-MM-DD".
  addDays(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  },

  // Diferença em dias entre duas chaves (b - a).
  diffDays(a, b) {
    const ms = (k) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
    return Math.round((ms(b) - ms(a)) / 86400000);
  },

  // "20/10/2026"
  fmtKey(key) {
    const [y, m, d] = key.split('-');
    return `${d}/${m}/${y}`;
  },

  // "ter., 20/10"
  short(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC'
    }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  },

  time(date) {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: this._tz()
    }).format(new Date(date));
  },

  dateBr(date) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: this._tz() }).format(new Date(date));
  }
};
