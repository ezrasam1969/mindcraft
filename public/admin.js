$(document).ready(function () {

  let allData = [];
  let sortCol = 'registeredAt';
  let sortAsc = false;

  // ── Fetch Data ──────────────────────────────
  function fetchData() {
    $('#loadingState').show();
    $('#regTable').hide();
    $('#emptyState').hide();

    $.get('/api/registrations')
      .done(function (res) {
        if (res.success) {
          allData = res.data;
          updateStats();
          renderTable();
        }
      })
      .fail(function () {
        $('#loadingState').hide();
        $('#emptyState').show().find('p').text('Failed to load data. Check server connection.');
      });
  }

  // ── Update Stats Cards ──────────────────────
  function updateStats() {
    const events = new Set(allData.map(r => r.event));
    const colleges = new Set(allData.map(r => r.college));
    const today = new Date().toDateString();
    const todayRegs = allData.filter(r => new Date(r.registeredAt).toDateString() === today);

    $('#totalCount').text(allData.length);
    $('#eventCount').text(events.size);
    $('#collegeCount').text(colleges.size);
    $('#todayCount').text(todayRegs.length);
  }

  // ── Render Table ────────────────────────────
  function renderTable() {
    const query = $('#searchInput').val().toLowerCase().trim();
    const eventFilter = $('#eventFilter').val();

    let filtered = allData.filter(r => {
      const matchSearch = !query ||
        r.fullName.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query) ||
        r.college.toLowerCase().includes(query) ||
        (r.registrationId && r.registrationId.toLowerCase().includes(query)) ||
        (r.teamName && r.teamName.toLowerCase().includes(query));
      const matchEvent = !eventFilter || r.event === eventFilter;
      return matchSearch && matchEvent;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortCol] || '';
      let bVal = b[sortCol] || '';

      if (sortCol === 'registeredAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    // Update sort indicators
    $('th').removeClass('sorted');
    $(`th[data-col="${sortCol}"]`).addClass('sorted');

    const $tbody = $('#tableBody');
    $tbody.empty();

    if (filtered.length === 0) {
      $('#regTable').hide();
      $('#emptyState').show();
      $('#loadingState').hide();
      return;
    }

    filtered.forEach((r, i) => {
      const date = new Date(r.registeredAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
      const time = new Date(r.registeredAt).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit'
      });

      $tbody.append(`
        <tr>
          <td>${i + 1}</td>
          <td><strong>${escapeHtml(r.fullName)}</strong></td>
          <td>${escapeHtml(r.email)}</td>
          <td>${escapeHtml(r.phone)}</td>
          <td>${escapeHtml(r.college)}</td>
          <td>${escapeHtml(r.department)}</td>
          <td>${escapeHtml(r.year)}</td>
          <td><span class="badge-event">${escapeHtml(r.event)}</span></td>
          <td>${r.teamName ? escapeHtml(r.teamName) : '—'}</td>
          <td class="reg-id-cell">${escapeHtml(r.registrationId || '—')}</td>
          <td><span class="badge-status badge-confirmed">${r.status || 'confirmed'}</span></td>
          <td>${date}<br><small style="opacity:0.5">${time}</small></td>
        </tr>
      `);
    });

    $('#loadingState').hide();
    $('#emptyState').hide();
    $('#regTable').show();
  }

  // ── Sort on Header Click ────────────────────
  $('th[data-col]').on('click', function () {
    const col = $(this).data('col');
    if (col === 'index') return;
    if (sortCol === col) {
      sortAsc = !sortAsc;
    } else {
      sortCol = col;
      sortAsc = true;
    }
    renderTable();
  });

  // ── Search & Filter ─────────────────────────
  let searchTimeout;
  $('#searchInput').on('input', function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderTable, 250);
  });

  $('#eventFilter').on('change', renderTable);

  // ── Refresh ─────────────────────────────────
  $('#refreshBtn').on('click', fetchData);

  // ── CSV Export ───────────────────────────────
  $('#exportBtn').on('click', function () {
    if (allData.length === 0) return alert('No data to export.');

    const headers = ['Full Name', 'Email', 'Phone', 'College', 'Department', 'Year', 'Event', 'Team Name', 'Team Size', 'Registration ID', 'Status', 'Registered At'];
    const keys = ['fullName', 'email', 'phone', 'college', 'department', 'year', 'event', 'teamName', 'teamSize', 'registrationId', 'status', 'registeredAt'];

    let csv = headers.join(',') + '\n';
    allData.forEach(r => {
      const row = keys.map(k => {
        let val = r[k] || '';
        if (k === 'registeredAt') val = new Date(val).toLocaleString('en-IN');
        // Escape CSV values
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mindcraft_registrations_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });

  // ── Utility ─────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Init ────────────────────────────────────
  fetchData();

});
