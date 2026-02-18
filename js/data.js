/**
 * Загрузка данных и общее состояние
 */
window.AttendanceData = (function () {
  var DATA_URL = 'https://script.google.com/macros/s/AKfycbwr2QA6HHqDZR3MT5wDjjfL8mPZp9BadITZWR7kEE82vUVTLPXyIVYqgh667076rnB0Mg/exec';
  var POLL_MS = 30 * 1000;
  var allEmployees = [];
  var allVisits = [];
  var pollTimer = null;

  function getDataUrl() {
    return DATA_URL + (DATA_URL.indexOf('?') >= 0 ? '&' : '?') + 'action=display';
  }

  function useProxy() {
    return (location.protocol || '').toLowerCase() === 'file:';
  }

  function fetchViaProxy(url) {
    var CORS_PROXIES = ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?'];
    function tryOne(i) {
      if (i >= CORS_PROXIES.length) throw new Error('Не удалось загрузить. Откройте по http:// (start-server.bat).');
      var u = CORS_PROXIES[i] + encodeURIComponent(url);
      return fetch(u)
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          return r.text();
        })
        .then(function (t) {
          try { return JSON.parse(t); } catch (_) { throw new Error('Не JSON'); }
        })
        .catch(function () { return tryOne(i + 1); });
    }
    return tryOne(0);
  }

  function fetchJson(url) {
    if (useProxy()) return fetchViaProxy(url);
    return fetch(url, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (t) {
        try { return JSON.parse(t); } catch (_) { throw new Error('Ответ не JSON'); }
      })
      .catch(function (err) {
        var m = (err && err.message) || '';
        if (m.indexOf('Failed to fetch') !== -1 || m.indexOf('NetworkError') !== -1) return fetchViaProxy(url);
        throw err;
      });
  }

  function loadData(callback) {
    var errorEl = document.getElementById('error');
    var lastUpdateEl = document.getElementById('lastUpdate');
    if (errorEl) errorEl.textContent = '';
    if (errorEl) errorEl.classList.add('hidden');

    fetchJson(getDataUrl())
      .then(function (data) {
        if (data && (data.ok === false || data.error)) throw new Error(data.error || 'Ошибка сервера');
        if (!data || !('employees' in data) && !('visits' in data)) throw new Error('Нет данных (employees/visits)');
        allEmployees = data.employees || [];
        allVisits = data.visits || [];
        if (lastUpdateEl) {
          lastUpdateEl.textContent = data.updated
            ? new Date(data.updated).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—';
        }
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(function () { loadData(callback); }, POLL_MS);
        if (callback) callback(null, data);
      })
      .catch(function (err) {
        if (errorEl) {
          errorEl.textContent = 'Ошибка загрузки: ' + ((err && err.message) || err);
          errorEl.classList.remove('hidden');
        }
        if (callback) callback(err);
      });
  }

  return {
    getEmployees: function () { return allEmployees; },
    getVisits: function () { return allVisits; },
    loadData: loadData
  };
})();
