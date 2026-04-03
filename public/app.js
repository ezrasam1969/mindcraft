$(document).ready(function () {

  // ── Countdown Timer ──────────────────────────
  const eventDate = new Date('2026-04-18T09:00:00');
  function updateCountdown() {
    const now = new Date();
    const diff = eventDate - now;
    if (diff <= 0) { $('#countdown').html('<p style="color:var(--primary)">Event is LIVE!</p>'); return; }
    $('#days').text(String(Math.floor(diff / 86400000)).padStart(2, '0'));
    $('#hours').text(String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0'));
    $('#minutes').text(String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'));
    $('#seconds').text(String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'));
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ── Event Card Selection ─────────────────────
  const teamEvents = ['Hackathon', 'AI Challenge', 'CTF', 'Quiz'];

  $('.event-card').on('click', function () {
    $('.event-card').removeClass('selected');
    $(this).addClass('selected');
    const selectedEvent = $(this).data('event');
    $('#event').val(selectedEvent);

    if (teamEvents.includes(selectedEvent)) {
      $('#teamFields').slideDown(300);
    } else {
      $('#teamFields').slideUp(300);
    }
  });

  // Show/hide team fields based on dropdown change too
  $('#event').on('change', function () {
    const val = $(this).val();
    $('.event-card').removeClass('selected');
    $(`.event-card[data-event="${val}"]`).addClass('selected');
    teamEvents.includes(val) ? $('#teamFields').slideDown(300) : $('#teamFields').slideUp(300);
  });

  // ── Real-time Email Check ─────────────────────
  let emailTimeout;
  $('#email').on('input', function () {
    clearTimeout(emailTimeout);
    const email = $(this).val().trim();
    if (!isValidEmail(email)) return;
    emailTimeout = setTimeout(function () {
      $.get(`/api/check/${encodeURIComponent(email)}`, function (data) {
        if (data.exists) {
          $('#emailErr').text(`⚠️ Already registered (ID: ${data.registrationId})`);
        } else {
          $('#emailErr').text('');
        }
      });
    }, 600);
  });

  // ── Validation ───────────────────────────────
  function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function isValidPhone(p) { return /^[6-9]\d{9}$/.test(p.replace(/[\s\-\+]/g, '')); }

  function validateForm() {
    let valid = true;
    clearErrors();

    const name = $('#fullName').val().trim();
    const email = $('#email').val().trim();
    const phone = $('#phone').val().trim();
    const event = $('#event').val();

    if (name.length < 3) { $('#nameErr').text('Please enter your full name'); valid = false; }
    if (!isValidEmail(email)) { $('#emailErr').text('Enter a valid email address'); valid = false; }
    if (!isValidPhone(phone)) { $('#phoneErr').text('Enter a valid 10-digit phone number'); valid = false; }
    if (!event) { $('#eventErr').text('Please select an event'); valid = false; }

    return valid;
  }

  function clearErrors() {
    $('.error-msg').text('');
  }

  // ── Form Submission ──────────────────────────
  $('#regForm').on('submit', function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = {
      fullName:   $('#fullName').val().trim(),
      email:      $('#email').val().trim().toLowerCase(),
      phone:      $('#phone').val().trim(),
      college:    $('#college').val().trim(),
      department: $('#department').val(),
      year:       $('#year').val(),
      event:      $('#event').val(),
      teamName:   $('#teamName').val().trim(),
      teamSize:   parseInt($('#teamSize').val()) || 1
    };

    // Show loader
    $('#btnText').hide();
    $('#btnLoader').show();
    $('#submitBtn').prop('disabled', true);

    $.ajax({
      url: '/api/register',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(formData),
      success: function (res) {
        $('#modalMessage').text(`Welcome, ${res.name}! You're registered for ${res.event}.`);
        $('#modalRegId').text(res.registrationId);

        // Reset AI tip area
        $('#aiTipLoading').show();
        $('#aiTipText').hide().text('');
        $('#successModal, #modalOverlay').fadeIn(300);
        $('#regForm')[0].reset();
        $('.event-card').removeClass('selected');
        $('#teamFields').hide();

        // Fetch AI preparation tip
        $.ajax({
          url: '/api/ai-tip',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({
            eventName: res.event,
            participantName: res.name
          }),
          success: function (aiRes) {
            $('#aiTipLoading').fadeOut(200, function () {
              $('#aiTipText').text(aiRes.tip).fadeIn(300);
            });
          },
          error: function () {
            $('#aiTipLoading').fadeOut(200, function () {
              $('#aiTipText').text('💡 Prepare well, practice consistently, and bring your A-game!').fadeIn(300);
            });
          }
        });
      },
      error: function (xhr) {
        const msg = xhr.responseJSON?.message || 'Something went wrong. Please try again.';
        alert(msg);
      },
      complete: function () {
        $('#btnText').show();
        $('#btnLoader').hide();
        $('#submitBtn').prop('disabled', false);
      }
    });
  });

  // Close modal on overlay click
  $('#modalOverlay').on('click', function () {
    $('#successModal, #modalOverlay').fadeOut(300);
  });

});