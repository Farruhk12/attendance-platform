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
    // Priority: extract HH:mm:ss directly from the string to match the Google Sheet exactly
    var str = (v.time || '').toString().trim();
    if (str) {
      var parts = str.split(/[\sT]/);
      if (parts.length >= 2) {
        var tParts = parts[1].split(':');
        if (tParts.length >= 2) {
          // Return HH:mm:ss
          return String(tParts[0]).padStart(2, '0') + ':' +
            String(tParts[1]).padStart(2, '0') + ':' +
            (String(tParts[2] || '0').split('.')[0]).padStart(2, '0');
        }
      }
    }

    // Fallback if string is missing or invalid
    var ts = (typeof v.ts === 'number' && v.ts > 0) ? v.ts : null;
    if (ts) {
      if (ts < 1e12) ts = ts * 1000;
      var date = new Date(ts);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('ru-RU', { hour12: false });
      }
    }
    return str || '—';
  }

  function getVisitDate(v) {
    var str = (v.time || '').toString().trim();
    if (str) {
      var parts = str.split(/[\sT]/);
      if (parts[0].length >= 10) return parts[0];
    }
    var ts = (typeof v.ts === 'number' && v.ts > 0) ? v.ts : null;
    if (ts && ts < 1e12) ts = ts * 1000;
    var date = ts ? new Date(ts) : null;
    if (!date || isNaN(date.getTime())) return '';
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function getPhotoUrl(employees, employeeId) {
    var id = String(employeeId || '').trim();
    if (!id) return '';
    var e = (employees || []).find(function (x) { return String(x.id || '').trim() === id; });
    return (e && e.photoUrl) ? e.photoUrl : '';
  }

  function getTimestamp(v) {
    var ts = (typeof v.ts === 'number' && v.ts > 0) ? v.ts : null;
    if (ts) {
      if (ts < 1e12) ts = ts * 1000;
      return ts;
    }
    var str = (v.time || '').toString().trim();
    if (str) {
      // Parse components manually to avoid timezone issues
      var parts = str.split(/[\sT]/);
      if (parts.length >= 2) {
        var d = parts[0].split('-');
        var t = parts[1].split(':');
        if (d.length === 3 && t.length >= 2) {
          // Use Date.UTC or similar consistent method
          var date = new Date(
            parseInt(d[0]),
            parseInt(d[1]) - 1,
            parseInt(d[2]),
            parseInt(t[0]),
            parseInt(t[1]),
            parseInt(String(t[2] || '0').split('.')[0])
          );
          return date.getTime();
        }
      }
    }
    return 0;
  }

  function getEmployeeById(employees, employeeId) {
    var id = String(employeeId || '').trim();
    return (employees || []).find(function (x) { return String(x.id || '').trim() === id; }) || null;
  }

  function parseTimeToMs(dateStr, timeStr) {
    if (!dateStr || !timeStr) return 0;
    var d = (dateStr + '').trim().split('-');
    var t = (timeStr + '').trim().split(':');
    if (d.length !== 3 || t.length < 2) return 0;
    var date = new Date(
      parseInt(d[0], 10),
      parseInt(d[1], 10) - 1,
      parseInt(d[2], 10),
      parseInt(t[0], 10),
      parseInt(t[1], 10),
      parseInt(String(t[2] || '0').split('.')[0], 10)
    );
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function calcWorkedHours(arrivalTs, departureTs) {
    if (!arrivalTs || !departureTs || arrivalTs <= 0 || departureTs <= 0) return '';
    var diffMs = departureTs - arrivalTs;
    if (diffMs <= 0) return '';

    // If less than a minute, show seconds
    if (diffMs < 60000) {
      var sec = Math.floor(diffMs / 1000);
      return sec + ' сек';
    }

    var totalMin = Math.floor(diffMs / 60000);
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    if (h === 0 && m === 0) return '';
    if (h === 0) return m + 'м';
    if (m === 0) return h + 'ч';
    return h + 'ч ' + m + 'м';
  }

  function calcWorkedHoursFromStrings(dateStr, arrivalStr, departureStr) {
    if (!dateStr || !arrivalStr || !departureStr) return '';
    var arrivalMs = parseTimeToMs(dateStr, arrivalStr);
    var departureMs = parseTimeToMs(dateStr, departureStr);
    if (!arrivalMs || !departureMs) return '';
    return calcWorkedHours(arrivalMs, departureMs);
  }

  return {
    escapeHtml: escapeHtml,
    formatTime: formatTime,
    getVisitDate: getVisitDate,
    getPhotoUrl: getPhotoUrl,
    getEmployeeById: getEmployeeById,
    getTimestamp: getTimestamp,
    parseTimeToMs: parseTimeToMs,
    calcWorkedHours: calcWorkedHours,
    calcWorkedHoursFromStrings: calcWorkedHoursFromStrings
  };
})();
