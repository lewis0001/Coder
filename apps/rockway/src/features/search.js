/* Rockway feature — Search: one box for the whole Rock.
 * Queries every feature's registered search provider (RW.searchAll) and
 * renders grouped results — businesses, events, jobs, property, classifieds,
 * attractions, live headlines, chats and your own bookings. */
(function (RW) {
  'use strict';
  const { esc } = RW.util;

  var query = '';
  var debounce = null;

  // Live-typing: one document-level listener; re-render keeps focus + caret.
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el || el.id !== 'global-search') return;
    var v = el.value;
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      query = v;
      RW.render();
      var input = document.getElementById('global-search');
      if (input) {
        input.focus();
        try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
      }
    }, 140);
  });

  var GROUP_ORDER = ['Businesses & services', 'Your bookings', 'What’s On', 'Explore',
    'Buy & Sell', 'Jobs', 'Property', 'News (live)', 'Chat'];

  var HINTS = ['groomer', 'haircut', 'plumber', 'National Day', '2-bed', 'dolphin', 'MOT'];

  function resultRow(r) {
    var inner =
      '<div class="lead" style="font-size:20px">' + (r.lead || '🔎') + '</div>' +
      '<div class="body"><div class="name">' + esc(r.label) + '</div>' +
      (r.sub ? '<div class="sub">' + esc(r.sub) + '</div>' : '') + '</div>' +
      '<div class="trail muted">›</div>';
    if (r.external) {
      return '<a class="row" href="' + esc(r.route) + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;cursor:pointer">' + inner + '</a>';
    }
    return '<div class="row" data-act="nav" data-route="' + esc(r.route) + '" style="cursor:pointer">' + inner + '</div>';
  }

  function render() {
    var q = query.trim();
    var results = RW.searchAll(q);

    var input =
      '<input id="global-search" class="input" type="search" placeholder="Search the whole Rock…" ' +
      'value="' + esc(query) + '" autocomplete="off" style="margin-top:8px;font-size:16px">';

    var body = input;

    if (q.length < 2) {
      body +=
        '<div class="subtle" style="margin-top:14px;margin-bottom:8px">Businesses, services, events, jobs, property, classifieds, places & live news — one box.</div>' +
        '<div class="chips" style="margin-top:10px">' + HINTS.map(function (h) {
          return '<span class="chip tap" data-act="searchHint" data-v="' + esc(h) + '">' + esc(h) + '</span>';
        }).join('') + '</div>';
    } else if (!results.length) {
      body += RW.ui.empty('🔎', 'Nothing on the Rock for “' + esc(q) + '”.<br>Try a service, a place or an area.');
    } else {
      // group results, in a stable curated order
      var groups = {};
      results.forEach(function (r) { (groups[r.group] = groups[r.group] || []).push(r); });
      var names = Object.keys(groups).sort(function (a, b) {
        var ia = GROUP_ORDER.indexOf(a); var ib = GROUP_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      body += '<div class="subtle" style="margin:12px 2px 0">' + results.length + ' result' + (results.length === 1 ? '' : 's') + '</div>';
      names.forEach(function (g) {
        body += RW.ui.sectionTitle(g) +
          '<div class="card" style="padding:2px 14px">' + groups[g].map(resultRow).join('') + '</div>';
      });
    }

    return RW.ui.screen({ title: 'Search', body: body });
  }

  RW.register({
    id: 'search',
    title: 'Search',
    emoji: '🔎',
    showTile: false,
    render: render,
    actions: {
      searchHint: function (el) {
        query = el.dataset.v || '';
        RW.render();
        var input = document.getElementById('global-search');
        if (input) input.focus();
      },
    },
  });
})(window.RW);
