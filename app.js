/* 3J Mobile Auto Repair LLC - shared site helpers (v1). */
(function () {
  'use strict';

  // Fallbacks if the API is unreachable - kept in sync with server CONFIG.
  var FALLBACK = {
    business_name: '3J Mobile Auto Repair LLC',
    phone_display: '(405) 221-8900',
    phone_href: 'tel:+14052218900',
    service_area: 'Oklahoma City metro area',
    emergency_surcharge: 95.0,
    truck_roll: 40.0,
    labor_rate_default: 120.0,
    tax_rate_default: 8.625,
    slot_minutes: 60,
    booking_window_days: 14
  };

  var config = Object.assign({}, FALLBACK);
  var configPromise = null;

  function loadConfig() {
    if (configPromise) return configPromise;
    configPromise = fetch('/api/config').then(function (r) {
      if (!r.ok) throw new Error('config fetch failed');
      return r.json();
    }).then(function (c) {
      config = Object.assign({}, FALLBACK, c);
      applyConfig();
      return config;
    }).catch(function () {
      applyConfig();
      return config;
    });
    return configPromise;
  }

  function applyConfig() {
    document.querySelectorAll('[data-cfg]').forEach(function (el) {
      var key = el.getAttribute('data-cfg');
      if (config[key] !== undefined) el.textContent = config[key];
    });
    document.querySelectorAll('[data-cfg-href]').forEach(function (el) {
      var key = el.getAttribute('data-cfg-href');
      if (config[key]) el.setAttribute('href', config[key]);
    });
    document.querySelectorAll('[data-cfg-money]').forEach(function (el) {
      var key = el.getAttribute('data-cfg-money');
      if (config[key] !== undefined) el.textContent = money(config[key]);
    });
  }

  function money(n) {
    return '$' + Number(n || 0).toFixed(2);
  }

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  window.JJ = {
    loadConfig: loadConfig,
    get config() { return config; },
    money: money,
    toast: toast,
    qs: qs
  };

  document.addEventListener('DOMContentLoaded', loadConfig);
})();
