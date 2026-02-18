/**
 * Раздел «Аналитика»
 */
window.AnalyticsView = (function () {
  var Data = window.AttendanceData;
  var Utils = window.Utils;

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

    container.innerHTML =
      '<div class="analytics-cards">' +
        '<div class="analytics-card"><div class="value">' + totalVisits + '</div><div class="label">Всего посещений</div></div>' +
        '<div class="analytics-card"><div class="value">' + totalEmployees + '</div><div class="label">Сотрудников</div></div>' +
        '<div class="analytics-card"><div class="value">' + arrivals + '</div><div class="label">Приходов</div></div>' +
        '<div class="analytics-card"><div class="value">' + departures + '</div><div class="label">Уходов</div></div>' +
      '</div>' +
      '<div class="analytics-section">' +
        '<h3>По подразделениям</h3>' +
        '<table class="analytics-table card">' +
          '<thead><tr><th>Подразделение</th><th>Посещений</th></tr></thead><tbody>' + (deptRows || '<tr><td colspan="2" class="empty-state">Нет данных</td></tr>') + '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="analytics-section">' +
        '<h3>По дням (последние 14)</h3>' +
        '<table class="analytics-table card">' +
          '<thead><tr><th>Дата</th><th>Посещений</th></tr></thead><tbody>' + (dateRows || '<tr><td colspan="2" class="empty-state">Нет данных</td></tr>') + '</tbody>' +
        '</table>' +
      '</div>';
  }

  return { render: render };
})();
