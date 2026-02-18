/**
 * Точка входа: меню, переключение страниц, загрузка данных
 */
(function () {
  var pageTitles = {
    journal: 'Журнал посещений',
    employees: 'Сотрудники',
    analytics: 'Аналитика'
  };

  function showPage(pageId) {
    pageId = pageId || 'journal';
    var pages = document.querySelectorAll('.page');
    var links = document.querySelectorAll('.sidebar-nav a, .bottom-nav a');
    var titleEl = document.getElementById('pageTitle');
    pages.forEach(function (p) {
      p.classList.toggle('active', p.id === 'page-' + pageId);
    });
    links.forEach(function (a) {
      a.classList.toggle('active', (a.getAttribute('data-page') || '') === pageId);
    });
    if (titleEl) titleEl.textContent = pageTitles[pageId] || pageId;
    if (pageId === 'journal') window.JournalView && window.JournalView.render();
    if (pageId === 'employees') window.EmployeesView && window.EmployeesView.render();
    if (pageId === 'analytics') window.AnalyticsView && window.AnalyticsView.render();
  }

  function getPageFromHash() {
    var hash = (location.hash || '').replace(/^#/, '');
    return hash === 'employees' || hash === 'analytics' ? hash : 'journal';
  }

  function initNav() {
    document.querySelectorAll('.sidebar-nav a[data-page], .bottom-nav a[data-page]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var page = a.getAttribute('data-page');
        location.hash = page;
        showPage(page);
      });
    });
    window.addEventListener('hashchange', function () {
      showPage(getPageFromHash());
    });
  }

  function onDataLoaded(err) {
    if (err) {
      if (document.getElementById('journalBody')) {
        document.getElementById('journalBody').innerHTML = '<tr><td colspan="5" class="empty-state">Ошибка загрузки</td></tr>';
      }
      var el = document.getElementById('employeesList');
      if (el) el.innerHTML = '<div class="empty-state">—</div>';
      return;
    }
    window.JournalView && window.JournalView.fillFilterOptions();
    window.JournalView && window.JournalView.render();
    window.EmployeesView && window.EmployeesView.render();
    window.AnalyticsView && window.AnalyticsView.render();
    showPage(getPageFromHash());
  }

  initNav();
  window.JournalView && window.JournalView.init();
  showPage(getPageFromHash());
  window.AttendanceData.loadData(onDataLoaded);
})();
