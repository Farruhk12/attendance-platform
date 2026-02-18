/**
 * Раздел «Сотрудники»
 */
window.EmployeesView = (function () {
  var Data = window.AttendanceData;
  var Utils = window.Utils;

  function render() {
    var container = document.getElementById('employeesList');
    if (!container) return;
    var allEmployees = Data.getEmployees();
    var allVisits = Data.getVisits();

    if (!allEmployees.length) {
      container.innerHTML = '<div class="empty-state">Нет данных сотрудников</div>';
      return;
    }
    var lastBy = {};
    allVisits.forEach(function (v) {
      var id = String(v.employeeId || '').trim();
      if (!id) return;
      var cur = lastBy[id];
      var vts = (typeof v.ts === 'number') ? v.ts : 0;
      if (!cur || (typeof cur.ts === 'number' ? cur.ts : 0) < vts) lastBy[id] = v;
    });
    function isArrival(a) { return a && String(a).toLowerCase().indexOf('приход') !== -1; }
    container.innerHTML = allEmployees.map(function (e) {
      var id = String(e.id || '').trim();
      var last = lastBy[id];
      var on = last ? isArrival(last.action) : false;
      var img = e.photoUrl
        ? '<img class="emp-photo" src="' + Utils.escapeHtml(e.photoUrl) + '" alt="" onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'flex\'"><div class="emp-photo-placeholder" style="display:none">👤</div>'
        : '<div class="emp-photo-placeholder">👤</div>';
      var dept = (e.department || '') + (e.position ? ' · ' + e.position : '');
      return '<div class="emp-row">' +
        '<div class="emp-photo-cell">' + img + '</div>' +
        '<div class="emp-info"><div class="name">' + Utils.escapeHtml(e.name || '—') + '</div><div class="dept">' + Utils.escapeHtml(dept) + '</div></div>' +
        '<span class="emp-status ' + (on ? 'online' : 'offline') + '">' + (on ? 'На работе' : 'Нет') + '</span></div>';
    }).join('');
  }

  return { render: render };
})();
