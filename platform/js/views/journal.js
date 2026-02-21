/**
 * Раздел «Журнал»
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
    
    // Группируем по сотруднику и дате
    var grouped = {};
    visits.forEach(function (v) {
      var empId = String(v.employeeId || '').trim();
      var visitDate = Utils.getVisitDate(v);
      if (!visitDate) return;
      var key = empId + '|' + visitDate;
      if (!grouped[key]) {
        var emp = Utils.getEmployeeById(allEmployees, v.employeeId);
        grouped[key] = {
          employeeId: empId,
          name: v.name || (emp && emp.name) || '—',
          date: visitDate,
          department: emp && emp.department || '',
          position: emp && emp.position || '',
          photoUrl: Utils.getPhotoUrl(allEmployees, v.employeeId),
          arrival: null,
          departure: null,
          device: v.device || '—'
        };
      }
      var isArrival = String(v.action || '').toLowerCase().indexOf('приход') !== -1;
      var ts = (typeof v.ts === 'number' && v.ts > 0) ? v.ts : null;
      if (ts && ts < 1e12) ts = ts * 1000;
      var timeStr = Utils.formatTime(v);
      if (isArrival) {
        if (!grouped[key].arrival || (ts && (!grouped[key].arrivalTs || grouped[key].arrivalTs > ts))) {
          grouped[key].arrival = timeStr;
          grouped[key].arrivalTs = ts || 0;
        }
      } else {
        if (!grouped[key].departure || (ts && (!grouped[key].departureTs || grouped[key].departureTs < ts))) {
          grouped[key].departure = timeStr;
          grouped[key].departureTs = ts || 0;
        }
      }
      if (v.device) grouped[key].device = v.device;
    });
    
    var rows = Object.keys(grouped).map(function (key) {
      return grouped[key];
    }).sort(function (a, b) {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return 0;
    });
    
    if (els.count) els.count.textContent = '(' + rows.length + ')';

    if (!rows.length) {
      els.body.innerHTML = '<tr><td colspan="6" class="empty-state">Нет записей по выбранным фильтрам</td></tr>';
      return;
    }
    
    els.body.innerHTML = rows.map(function (row) {
      var img = row.photoUrl
        ? '<img class="journal-photo" src="' + Utils.escapeHtml(row.photoUrl) + '" alt="" onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'flex\'"><div class="journal-photo-placeholder" style="display:none">👤</div>'
        : '<div class="journal-photo-placeholder">👤</div>';
      var meta = [row.department, row.position].filter(Boolean).join(' · ');
      var dateStr = row.date.split('-').reverse().join('.');
      return '<tr class="journal-row">' +
        '<td class="cell-photo" data-label="">' + img + '</td>' +
        '<td data-label="Сотрудник"><div class="cell-name">' + Utils.escapeHtml(row.name) + '</div>' + (meta ? '<div class="cell-meta">' + Utils.escapeHtml(meta) + '</div>' : '') + '</td>' +
        '<td data-label="Дата">' + Utils.escapeHtml(dateStr) + '</td>' +
        '<td class="cell-time" data-label="Время прихода">' + (row.arrival ? '<span class="journal-badge in">' + Utils.escapeHtml(row.arrival) + '</span>' : '<span style="color:var(--text-muted)">—</span>') + '</td>' +
        '<td class="cell-time" data-label="Время ухода">' + (row.departure ? '<span class="journal-badge out">' + Utils.escapeHtml(row.departure) + '</span>' : '<span style="color:var(--text-muted)">—</span>') + '</td>' +
        '<td class="cell-meta" data-label="Устройство">' + Utils.escapeHtml(row.device) + '</td></tr>';
    }).join('');
  }

  function setTodayDate() {
    var els = getFilterEls();
    if (els.dateFrom && !els.dateFrom.value) {
      var today = new Date();
      var y = today.getFullYear();
      var m = String(today.getMonth() + 1).padStart(2, '0');
      var d = String(today.getDate()).padStart(2, '0');
      els.dateFrom.value = y + '-' + m + '-' + d;
    }
    if (els.dateTo && !els.dateTo.value) {
      var today = new Date();
      var y = today.getFullYear();
      var m = String(today.getMonth() + 1).padStart(2, '0');
      var d = String(today.getDate()).padStart(2, '0');
      els.dateTo.value = y + '-' + m + '-' + d;
    }
  }

  function init() {
    fillFilterOptions();
    setTodayDate();
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
        setTodayDate();
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
