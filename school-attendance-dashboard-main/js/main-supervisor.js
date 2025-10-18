(function(){
  function getTheme(){ return document.documentElement.getAttribute('data-theme') || 'light'; }
  function setTogglePressed(){ var btn = document.getElementById('themeToggle'); if(!btn) return; btn.setAttribute('aria-pressed', getTheme()==='dark' ? 'true' : 'false'); }

  function normalizeStr(s){ return String(s||'').toLowerCase(); }
  function inRange(date, start, end){ if(!(date instanceof Date)) return false; if(start && date < start) return false; if(end && date > end) return false; return true; }

  function getFilters(){
    var q = document.getElementById('searchInput')?.value || '';
    var sd = document.getElementById('startDate')?.value || '';
    var ed = document.getElementById('endDate')?.value || '';
    var start = sd ? new Date(sd + 'T00:00:00') : null;
    var end = ed ? new Date(ed + 'T23:59:59') : null;
    return { q: normalizeStr(q), start: start, end: end };
  }

  function applyFilters(){
    var all = window.allAbsences || [];
    var f = getFilters();
    var rows = all.filter(function(r){
      var hay = [r.division, r.class, r.section, r.absentees].map(normalizeStr).join(' ');
      var qok = !f.q || hay.indexOf(f.q) !== -1;
      var dok = inRange(r.timestamp, f.start, f.end);
      return qok && dok;
    }).filter(function(r){ return r.status !== 'archived'; });
    window.renderReports(rows);
    return rows;
  }

  function bindEvents(){
    var si = document.getElementById('searchInput');
    var sd = document.getElementById('startDate');
    var ed = document.getElementById('endDate');
    var ex = document.getElementById('exportCsvBtn');

    var t; function debouncedApply(){ clearTimeout(t); t = setTimeout(applyFilters, 200); }
    if(si) si.addEventListener('input', debouncedApply);
    if(sd) sd.addEventListener('change', applyFilters);
    if(ed) ed.addEventListener('change', applyFilters);

    if(ex) ex.addEventListener('click', function(){
      var data = applyFilters();
      var flat = data.map(function(r){ return {
        division: r.division,
        class: r.class,
        section: r.section,
        absentees: r.absentees,
        timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp
      }; });
      UI.exportCSV('absences.csv', flat);
    });
  }

  function init(){ UI.initThemeToggle('themeToggle'); setTogglePressed(); bindEvents(); }

  if(document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
