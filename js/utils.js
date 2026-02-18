/**
 * Общие утилиты: форматирование, даты, фото
 */
window.Utils = (function () {
  function escapeHtml(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function formatTime(v) {
    var ts = (typeof v.ts === 'number' && v.ts > 0) ? v.ts : null;
    if (ts) {
      if (ts < 1e12) ts = ts * 1000;
      var date = new Date(ts);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
      }
    }
    var str = (v.time || '').toString().trim();
    if (str) {
      var date = new Date(str.replace(/\s+/g, 'T').replace(/[^\d\-:T.Z]/g, ''));
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
      }
    }
    return str || '—';
  }

  function getVisitDate(v) {
    var ts = (typeof v.ts === 'number' && v.ts > 0) ? v.ts : null;
    if (ts && ts < 1e12) ts = ts * 1000;
    var str = (v.time || '').toString().trim();
    var date = null;
    if (ts) date = new Date(ts);
    else if (str) {
      str = str.replace(/\s+/g, 'T').replace(/[^\d\-:T.Z]/g, '');
      if (str.length >= 10) date = new Date(str);
    }
    if (!date || isNaN(date.getTime())) return '';
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = date.getDate();
    return y + '-' + m + '-' + String(d).padStart(2, '0');
  }

  function getPhotoUrl(employees, employeeId) {
    var id = String(employeeId || '').trim();
    if (!id) return '';
    var e = (employees || []).find(function (x) { return String(x.id || '').trim() === id; });
    return (e && e.photoUrl) ? e.photoUrl : '';
  }

  function getEmployeeById(employees, employeeId) {
    var id = String(employeeId || '').trim();
    return (employees || []).find(function (x) { return String(x.id || '').trim() === id; }) || null;
  }

  return {
    escapeHtml: escapeHtml,
    formatTime: formatTime,
    getVisitDate: getVisitDate,
    getPhotoUrl: getPhotoUrl,
    getEmployeeById: getEmployeeById
  };
})();
