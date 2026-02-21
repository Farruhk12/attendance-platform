/**
 * Раздел «Аналитика»
 */
window.AnalyticsView = (function () {
  var Data = window.AttendanceData;
  var Utils = window.Utils;

  var CARD_CONFIGS = [
    {
      key: 'visits',
      label: 'Всего записей',
      iconClass: 'purple',
      icon: '<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>'
    },
    {
      key: 'employees',
      label: 'Сотрудников',
      iconClass: 'blue',
      icon: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
    },
    {
      key: 'arrivals',
      label: 'Приходов',
      iconClass: 'green',
      icon: '<svg viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>'
    },
    {
      key: 'departures',
      label: 'Уходов',
      iconClass: 'amber',
      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    }
  ];

  function buildEmployeeHours(allEmployees, allVisits) {
    // Группируем по сотруднику и дате, храним строки времени (как в журнале)
    var grouped = {};
    allVisits.forEach(function (v) {
      var empId = String(v.employeeId || '').trim();
      if (!empId) return;
      var visitDate = Utils.getVisitDate(v);
      if (!visitDate) return;
      var key = empId + '|' + visitDate;
      if (!grouped[key]) {
        grouped[key] = { empId: empId, date: visitDate, arrival: null, departure: null };
      }
      var isArrival = String(v.action || '').toLowerCase().indexOf('приход') !== -1;
      var timeStr = Utils.formatTime(v);
      if (!timeStr || timeStr === '—') return;
      var ts = Utils.parseTimeToMs(visitDate, timeStr);
      if (!ts) return;
      if (isArrival) {
        if (!grouped[key].arrival || ts < Utils.parseTimeToMs(visitDate, grouped[key].arrival)) {
          grouped[key].arrival = timeStr;
        }
      } else {
        if (!grouped[key].departure || ts > Utils.parseTimeToMs(visitDate, grouped[key].departure)) {
          grouped[key].departure = timeStr;
        }
      }
    });

    // Считаем минуты по строкам времени (как в журнале)
    var empMinutes = {};
    var empDays = {};
    Object.keys(grouped).forEach(function (key) {
      var g = grouped[key];
      if (!g.arrival || !g.departure) return;
      var durationMs = 0;
      if (Utils.parseTimeToMs) {
        var arrivalMs = Utils.parseTimeToMs(g.date, g.arrival);
        var departureMs = Utils.parseTimeToMs(g.date, g.departure);
        if (arrivalMs && departureMs && departureMs > arrivalMs) durationMs = departureMs - arrivalMs;
      }
      if (durationMs <= 0) return;
      var mins = Math.floor(durationMs / 60000);
      if (!empMinutes[g.empId]) { empMinutes[g.empId] = 0; empDays[g.empId] = 0; }
      empMinutes[g.empId] += mins;
      empDays[g.empId]++;
    });

    // Строки: всего часов и среднее за день (цифры 0, не буква О)
    var rows = [];
    Object.keys(empMinutes).forEach(function (empId) {
      var emp = Utils.getEmployeeById(allEmployees, empId);
      var name = emp ? emp.name : empId;
      var dept = emp ? (emp.department || '') : '';
      var totalMin = empMinutes[empId];
      var h = Math.floor(totalMin / 60);
      var m = totalMin % 60;
      var hoursStr = h + 'ч ' + m + 'м';
      var days = empDays[empId];
      var avgMin = days > 0 ? Math.floor(totalMin / days) : 0;
      var avgH = Math.floor(avgMin / 60);
      var avgM = avgMin % 60;
      var avgStr = avgH + 'ч ' + avgM + 'м';
      rows.push({ name: name, dept: dept, hoursStr: hoursStr, avgStr: avgStr, totalMin: totalMin, days: days });
    });
    rows.sort(function (a, b) { return b.totalMin - a.totalMin; });
    return rows;
  }

  function render() {
    var container = document.getElementById('analyticsContent');
    if (!container) return;
    var allEmployees = Data.getEmployees();
    var allVisits = Data.getVisits();

    var totalVisits = allVisits.length;
    var totalEmployees = allEmployees.length;
    var arrivals = allVisits.filter(function (v) {
      return String(v.action || '').toLowerCase().indexOf('приход') !== -1;
    }).length;
    var departures = allVisits.filter(function (v) {
      return String(v.action || '').toLowerCase().indexOf('уход') !== -1;
    }).length;

    var values = { visits: totalVisits, employees: totalEmployees, arrivals: arrivals, departures: departures };

    var byDepartment = {};
    allVisits.forEach(function (v) {
      var emp = Utils.getEmployeeById(allEmployees, v.employeeId);
      var dept = (emp && emp.department) ? emp.department.trim() : '—';
      if (!byDepartment[dept]) byDepartment[dept] = 0;
      byDepartment[dept]++;
    });
    var deptRows = Object.keys(byDepartment).sort().map(function (d) {
      return '<tr><td>' + Utils.escapeHtml(d) + '</td><td>' + byDepartment[d] + '</td></tr>';
    }).join('');

    var byDate = {};
    allVisits.forEach(function (v) {
      var d = Utils.getVisitDate(v);
      if (!d) return;
      if (!byDate[d]) byDate[d] = 0;
      byDate[d]++;
    });
    var dateRows = Object.keys(byDate).sort().reverse().slice(0, 14).map(function (d) {
      return '<tr><td>' + Utils.escapeHtml(d) + '</td><td>' + byDate[d] + '</td></tr>';
    }).join('');

    // Employee hours
    var empHours = buildEmployeeHours(allEmployees, allVisits);
    var empHoursRows = empHours.map(function (r) {
      return '<tr>' +
        '<td>' + Utils.escapeHtml(r.name) + (r.dept ? ' <span style="color:var(--text-muted);font-size:0.75rem">· ' + Utils.escapeHtml(r.dept) + '</span>' : '') + '</td>' +
        '<td>' + r.days + '</td>' +
        '<td><span class="journal-badge hours">' + Utils.escapeHtml(r.hoursStr) + '</span></td>' +
        '<td><span style="color:var(--text-secondary)">' + Utils.escapeHtml(r.avgStr) + '</span></td>' +
        '</tr>';
    }).join('');

    var cardsHtml = CARD_CONFIGS.map(function (cfg) {
      return '<div class="analytics-card">' +
        '<div class="card-icon ' + cfg.iconClass + '">' + cfg.icon + '</div>' +
        '<div class="value">' + values[cfg.key] + '</div>' +
        '<div class="label">' + cfg.label + '</div>' +
        '</div>';
    }).join('');

    container.innerHTML =
      '<div class="analytics-cards">' + cardsHtml + '</div>' +
      '<div class="analytics-section">' +
      '<h3>Часы работы сотрудников</h3>' +
      '<table class="analytics-table card">' +
      '<thead><tr><th>Сотрудник</th><th>Дней</th><th>Всего часов</th><th>Среднее / день</th></tr></thead>' +
      '<tbody>' + (empHoursRows || '<tr><td colspan="4" class="empty-state">Нет данных о часах</td></tr>') + '</tbody>' +
      '</table>' +
      '</div>' +
      '<div class="analytics-section">' +
      '<h3>По подразделениям</h3>' +
      '<table class="analytics-table card">' +
      '<thead><tr><th>Подразделение</th><th>Записей</th></tr></thead><tbody>' + (deptRows || '<tr><td colspan="2" class="empty-state">Нет данных</td></tr>') + '</tbody>' +
      '</table>' +
      '</div>' +
      '<div class="analytics-section">' +
      '<h3>По дням (последние 14)</h3>' +
      '<table class="analytics-table card">' +
      '<thead><tr><th>Дата</th><th>Записей</th></tr></thead><tbody>' + (dateRows || '<tr><td colspan="2" class="empty-state">Нет данных</td></tr>') + '</tbody>' +
      '</table>' +
      '</div>';
  }

  return { render: render };
})();
