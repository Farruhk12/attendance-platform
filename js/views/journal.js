/**
 * Раздел «Журнал посещений»
 */
window.JournalView = (function () {
  var Data = window.AttendanceData;
  var Utils = window.Utils;

  function getFilterEls() {
    return {
      dateFrom: document.getElementById('filterDateFrom'),
      dateTo: document.getElementById('filterDateTo'),
      name: document.getElementById('filterName'),
      position: document.getElementById('filterPosition'),
      department: document.getElementById('filterDepartment'),
      btnReset: document.getElementById('btnResetFilters'),
      body: document.getElementById('journalBody'),
      count: document.getElementById('journalCount')
    };
  }

  function applyFilters() {
    var els = getFilterEls();
    if (!els.body) return [];
    var allVisits = Data.getVisits();
    var allEmployees = Data.getEmployees();
    var dateFrom = (els.dateFrom && els.dateFrom.value || '').trim();
    var dateTo = (els.dateTo && els.dateTo.value || '').trim();
    var name = (els.name && els.name.value || '').trim().toLowerCase();
    var position = (els.position && els.position.value || '').trim();
    var department = (els.department && els.department.value || '').trim();

    return allVisits.filter(function (v) {
      var visitDate = Utils.getVisitDate(v);
      if (dateFrom && visitDate < dateFrom) return false;
      if (dateTo && visitDate > dateTo) return false;
      if (name) {
        var emp = Utils.getEmployeeById(allEmployees, v.employeeId);
        var fullName = (v.name || (emp && emp.name) || '').toLowerCase();
        if (fullName.indexOf(name) === -1) return false;
      }
      if (position || department) {
        var emp = Utils.getEmployeeById(allEmployees, v.employeeId);
        if (!emp) return false;
        if (position && (emp.position || '').trim() !== position) return false;
        if (department && (emp.department || '').trim() !== department) return false;
      }
      return true;
    });
  }

  function fillFilterOptions() {
    var els = getFilterEls();
    if (!els.position || !els.department) return;
    var allEmployees = Data.getEmployees();
    var positions = [];
    var departments = [];
    allEmployees.forEach(function (e) {
      var p = (e.position || '').trim();
      var d = (e.department || '').trim();
      if (p && positions.indexOf(p) === -1) positions.push(p);
      if (d && departments.indexOf(d) === -1) departments.push(d);
    });
    positions.sort();
    departments.sort();
    els.position.innerHTML = '<option value="">Все</option>' + positions.map(function (p) {
      return '<option value="' + Utils.escapeHtml(p) + '">' + Utils.escapeHtml(p) + '</option>';
    }).join('');
    els.department.innerHTML = '<option value="">Все</option>' + departments.map(function (d) {
      return '<option value="' + Utils.escapeHtml(d) + '">' + Utils.escapeHtml(d) + '</option>';
    }).join('');
  }

  function render() {
    var els = getFilterEls();
    if (!els.body) return;
    var allEmployees = Data.getEmployees();
    var visits = applyFilters();
    if (els.count) els.count.textContent = '(' + visits.length + ')';

    if (!visits.length) {
      els.body.innerHTML = '<tr><td colspan="5" class="empty-state">Нет записей по выбранным фильтрам</td></tr>';
      return;
    }
    els.body.innerHTML = visits.map(function (v) {
      var photoUrl = Utils.getPhotoUrl(allEmployees, v.employeeId);
      var img = photoUrl
        ? '<img class="journal-photo" src="' + Utils.escapeHtml(photoUrl) + '" alt="" onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'flex\'"><div class="journal-photo-placeholder" style="display:none">👤</div>'
        : '<div class="journal-photo-placeholder">👤</div>';
      var isIn = String(v.action || '').toLowerCase().indexOf('приход') !== -1;
      var badgeClass = isIn ? 'in' : 'out';
      var badgeText = v.action || '—';
      var emp = Utils.getEmployeeById(allEmployees, v.employeeId);
      var meta = [emp && emp.department, emp && emp.position].filter(Boolean).join(' · ');
      return '<tr class="journal-row">' +
        '<td class="cell-photo" data-label="">' + img + '</td>' +
        '<td data-label="Сотрудник"><div class="cell-name">' + Utils.escapeHtml(v.name || '—') + '</div>' + (meta ? '<div class="cell-meta">' + Utils.escapeHtml(meta) + '</div>' : '') + '</td>' +
        '<td class="cell-time" data-label="Время">' + Utils.escapeHtml(Utils.formatTime(v)) + '</td>' +
        '<td data-label="Действие"><span class="journal-badge ' + badgeClass + '">' + Utils.escapeHtml(badgeText) + '</span></td>' +
        '<td class="cell-meta" data-label="Устройство">' + Utils.escapeHtml(v.device || '—') + '</td></tr>';
    }).join('');
  }

  function init() {
    fillFilterOptions();
    var els = getFilterEls();
    function onFilterChange() { render(); }
    if (els.dateFrom) els.dateFrom.addEventListener('change', onFilterChange);
    if (els.dateTo) els.dateTo.addEventListener('change', onFilterChange);
    if (els.name) els.name.addEventListener('input', onFilterChange);
    if (els.position) els.position.addEventListener('change', onFilterChange);
    if (els.department) els.department.addEventListener('change', onFilterChange);
    if (els.btnReset) {
      els.btnReset.addEventListener('click', function () {
        if (els.dateFrom) els.dateFrom.value = '';
        if (els.dateTo) els.dateTo.value = '';
        if (els.name) els.name.value = '';
        if (els.position) els.position.value = '';
        if (els.department) els.department.value = '';
        render();
      });
    }
  }

  return {
    init: init,
    render: render,
    fillFilterOptions: fillFilterOptions
  };
})();
