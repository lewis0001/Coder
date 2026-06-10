/* Rockway feature — Discover (local-business discovery + booking marketplace for Gibraltar). */
(function (RW) {
  'use strict';
  const { esc, uid, ref, fmtTime } = RW.util;

  // ─── SEED DATA ───────────────────────────────────────────────────────────────
  var SEED = [
    {
      id: 'biz-pc',
      name: 'Paws & Claws Grooming',
      category: 'Pets',
      emoji: '🐩',
      area: 'Westside',
      rating: 4.8,
      reviews: 74,
      blurb: 'Gibraltar’s favourite dog groomer, tucked in Westside. Full grooms, baths, nail trims and de-shedding treatments for all breeds.',
      phone: '+350 200 42031',
      hours: 'Mon–Sat 09:00–17:30',
      services: [
        { id: 's-pc-1', name: 'Full Groom (small breed)',  price: 35,  durationMin: 60  },
        { id: 's-pc-2', name: 'Full Groom (large breed)',  price: 55,  durationMin: 90  },
        { id: 's-pc-3', name: 'Bath & Dry',               price: 22,  durationMin: 45  },
        { id: 's-pc-4', name: 'Nail Trim',                price: 10,  durationMin: 15  },
      ],
    },
    {
      id: 'biz-gv',
      name: 'Gibraltar Veterinary Clinic',
      category: 'Pets',
      emoji: '🐾',
      area: 'Irish Town',
      rating: 4.7,
      reviews: 112,
      blurb: 'Full-service veterinary practice offering consultations, vaccinations, surgery and pet passport services for Gibraltar’s international pet owners.',
      phone: '+350 200 76777',
      hours: 'Mon–Fri 08:30–18:00, Sat 09:00–13:00',
      services: [
        { id: 's-gv-1', name: 'General Consultation',    price: 45,  durationMin: 20  },
        { id: 's-gv-2', name: 'Vaccination (annual)',    price: 55,  durationMin: 20  },
        { id: 's-gv-3', name: 'Pet Passport Issue',      price: 70,  durationMin: 30  },
        { id: 's-gv-4', name: 'Microchipping',           price: 30,  durationMin: 15  },
      ],
    },
    {
      id: 'biz-rb',
      name: 'Rock Barbers',
      category: 'Hair & Beauty',
      emoji: '💈',
      area: 'Main Street',
      rating: 4.9,
      reviews: 203,
      blurb: 'Classic barber shop on Main Street. Cuts, fades, beard trims and hot-towel shaves. No appointment needed, but booking saves your spot.',
      phone: '+350 200 51234',
      hours: 'Mon–Sat 09:00–18:30',
      services: [
        { id: 's-rb-1', name: 'Haircut',                  price: 18,  durationMin: 30  },
        { id: 's-rb-2', name: 'Haircut & Beard Trim',     price: 25,  durationMin: 45  },
        { id: 's-rb-3', name: 'Hot-Towel Shave',          price: 20,  durationMin: 30  },
        { id: 's-rb-4', name: 'Fade',                     price: 22,  durationMin: 35  },
      ],
    },
    {
      id: 'biz-cs',
      name: 'Cala Salon',
      category: 'Hair & Beauty',
      emoji: '✂️',
      area: 'Ocean Village',
      rating: 4.6,
      reviews: 89,
      blurb: 'Contemporary hair salon at Ocean Village. Cuts, colour, balayage, blowouts and keratin treatments by experienced stylists.',
      phone: '+350 200 69120',
      hours: 'Tue–Sat 10:00–19:00',
      services: [
        { id: 's-cs-1', name: 'Cut & Blowdry',            price: 42,  durationMin: 60  },
        { id: 's-cs-2', name: 'Full Colour',              price: 85,  durationMin: 120 },
        { id: 's-cs-3', name: 'Balayage',                 price: 110, durationMin: 150 },
        { id: 's-cs-4', name: 'Keratin Treatment',        price: 130, durationMin: 180 },
      ],
    },
    {
      id: 'biz-nn',
      name: 'Nina’s Nail Studio',
      category: 'Hair & Beauty',
      emoji: '💅',
      area: 'Catalan Bay',
      rating: 4.7,
      reviews: 57,
      blurb: 'Relaxed nail studio by the beach at Catalan Bay. Gel manicures, pedicures, nail art and lash extensions in a sea-view setting.',
      phone: '+350 200 87654',
      hours: 'Mon–Sat 10:00–18:00',
      services: [
        { id: 's-nn-1', name: 'Gel Manicure',             price: 28,  durationMin: 60  },
        { id: 's-nn-2', name: 'Classic Pedicure',         price: 32,  durationMin: 60  },
        { id: 's-nn-3', name: 'Gel Pedicure',             price: 38,  durationMin: 75  },
        { id: 's-nn-4', name: 'Nail Art (per nail)',      price: 4,   durationMin: 10  },
      ],
    },
    {
      id: 'biz-rf',
      name: 'Rock Fitness',
      category: 'Fitness',
      emoji: '🏋️',
      area: 'Westside',
      rating: 4.8,
      reviews: 136,
      blurb: 'Personal training and group fitness sessions with certified PT James Collado. Strength, conditioning, weight loss and sports performance programmes tailored to Gibraltar’s terrain.',
      phone: '+350 5600 21987',
      hours: 'Mon–Fri 06:00–20:00, Sat 07:00–14:00',
      services: [
        { id: 's-rf-1', name: '1-on-1 PT Session (60 min)',  price: 55,  durationMin: 60  },
        { id: 's-rf-2', name: '1-on-1 PT Session (30 min)',  price: 32,  durationMin: 30  },
        { id: 's-rf-3', name: 'Group Class (up to 6)',       price: 18,  durationMin: 45  },
        { id: 's-rf-4', name: 'Programme Design (6-week)',   price: 120, durationMin: 90  },
      ],
    },
    {
      id: 'biz-rp',
      name: 'Rock Plumbing Services',
      category: 'Trades',
      emoji: '🔧',
      area: 'Industrial Estate',
      rating: 4.5,
      reviews: 48,
      blurb: 'GAS-SAFE and OFTEC registered plumbers covering all of Gibraltar. Boilers, hot-water cylinders, bathroom installations and emergency call-outs.',
      phone: '+350 5600 55234',
      hours: 'Mon–Fri 08:00–17:00 (emergency: 24/7)',
      services: [
        { id: 's-rp-1', name: 'Boiler Service',            price: 90,  durationMin: 90  },
        { id: 's-rp-2', name: 'Tap / Valve Repair',        price: 60,  durationMin: 60  },
        { id: 's-rp-3', name: 'Bathroom Fit (per day)',    price: 280, durationMin: 480 },
        { id: 's-rp-4', name: 'Emergency Call-out',        price: 120, durationMin: 60  },
      ],
    },
    {
      id: 'biz-ge',
      name: 'Gib Electrical Solutions',
      category: 'Trades',
      emoji: '⚡',
      area: 'Industrial Estate',
      rating: 4.6,
      reviews: 62,
      blurb: 'NICEIC-approved electricians offering installation, fault-finding, consumer-unit upgrades and EV charger fitting across Gibraltar.',
      phone: '+350 5600 78901',
      hours: 'Mon–Fri 08:00–17:30',
      services: [
        { id: 's-ge-1', name: 'Consumer Unit Upgrade',    price: 350, durationMin: 240 },
        { id: 's-ge-2', name: 'Fault Finding',            price: 75,  durationMin: 60  },
        { id: 's-ge-3', name: 'EV Charger Install',       price: 450, durationMin: 300 },
        { id: 's-ge-4', name: 'Extra Socket / Light',     price: 65,  durationMin: 60  },
      ],
    },
    {
      id: 'biz-bm',
      name: 'Bayside Motors',
      category: 'Auto',
      emoji: '🚗',
      area: 'Westside',
      rating: 4.7,
      reviews: 94,
      blurb: 'Gibraltar’s trusted independent garage and MOT test centre at the western end of the Rock. Servicing, diagnostics, tyres and air-con re-gassing.',
      phone: '+350 200 43500',
      hours: 'Mon–Fri 08:00–17:30, Sat 08:30–12:30',
      services: [
        { id: 's-bm-1', name: 'Full Service',              price: 145, durationMin: 180 },
        { id: 's-bm-2', name: 'MOT Test',                  price: 55,  durationMin: 60  },
        { id: 's-bm-3', name: 'Tyre Fitting (per tyre)',   price: 15,  durationMin: 30  },
        { id: 's-bm-4', name: 'Air-Con Re-gas',            price: 65,  durationMin: 60  },
      ],
    },
    {
      id: 'biz-gd',
      name: 'Gib Dental Care',
      category: 'Health & Wellness',
      emoji: '🦷',
      area: 'Main Street',
      rating: 4.7,
      reviews: 121,
      blurb: 'Friendly NHS-registered dental practice on Main Street providing check-ups, hygiene appointments, teeth whitening and emergency dental care.',
      phone: '+350 200 73468',
      hours: 'Mon–Fri 09:00–17:30',
      services: [
        { id: 's-gd-1', name: 'Check-up & Clean',          price: 55,  durationMin: 30  },
        { id: 's-gd-2', name: 'Hygienist (full)',           price: 65,  durationMin: 45  },
        { id: 's-gd-3', name: 'Teeth Whitening',           price: 280, durationMin: 90  },
        { id: 's-gd-4', name: 'Emergency Appointment',     price: 80,  durationMin: 30  },
      ],
    },
    {
      id: 'biz-gph',
      name: 'Gibraltar Physio & Sports',
      category: 'Health & Wellness',
      emoji: '💪',
      area: 'Ocean Village',
      rating: 4.9,
      reviews: 77,
      blurb: 'Specialist physiotherapy clinic at Ocean Village. Sports injuries, back pain, post-surgery rehabilitation and dry needling by HCPC-registered physiotherapists.',
      phone: '+350 200 55901',
      hours: 'Mon–Fri 08:00–19:00, Sat 09:00–13:00',
      services: [
        { id: 's-gph-1', name: 'Initial Assessment (60 min)', price: 75,  durationMin: 60  },
        { id: 's-gph-2', name: 'Follow-up (30 min)',         price: 50,  durationMin: 30  },
        { id: 's-gph-3', name: 'Sports Massage (60 min)',    price: 65,  durationMin: 60  },
        { id: 's-gph-4', name: 'Dry Needling Session',       price: 55,  durationMin: 30  },
      ],
    },
    {
      id: 'biz-ss',
      name: 'Sacarello’s',
      category: 'Dining',
      emoji: '🍽️',
      area: 'Irish Town',
      rating: 4.8,
      reviews: 318,
      blurb: 'Gibraltar’s most-loved coffee house and restaurant since 1888. Breakfast, lunch and dinner in a historic Irish Town building. Book a table for the full experience.',
      phone: '+350 200 70625',
      hours: 'Mon–Sat 08:00–22:00',
      services: [
        { id: 's-ss-1', name: 'Table for 2',               price: 0,   durationMin: 90  },
        { id: 's-ss-2', name: 'Table for 4',               price: 0,   durationMin: 90  },
        { id: 's-ss-3', name: 'Table for 6',               price: 0,   durationMin: 120 },
        { id: 's-ss-4', name: 'Private Dining (up to 12)', price: 25,  durationMin: 180 },
      ],
    },
    {
      id: 'biz-gl',
      name: 'Gibraltar Learning Hub',
      category: 'Lessons',
      emoji: '📚',
      area: 'Main Street',
      rating: 4.6,
      reviews: 43,
      blurb: 'Private tuition for GCSE, A-Level and university entrance across Maths, Sciences and English. Small-group and one-on-one sessions available.',
      phone: '+350 5600 33412',
      hours: 'Mon–Sat 09:00–20:00',
      services: [
        { id: 's-gl-1', name: 'Maths Tuition (1 hr)',       price: 40,  durationMin: 60  },
        { id: 's-gl-2', name: 'Science Tuition (1 hr)',     price: 40,  durationMin: 60  },
        { id: 's-gl-3', name: 'English Tuition (1 hr)',     price: 38,  durationMin: 60  },
        { id: 's-gl-4', name: 'Exam Prep (2 hr session)',   price: 70,  durationMin: 120 },
      ],
    },
    {
      id: 'biz-di',
      name: 'Rock Drive Instructor',
      category: 'Lessons',
      emoji: '🚦',
      area: 'Westside',
      rating: 4.7,
      reviews: 59,
      blurb: 'DVSA-approved driving instructor with 15+ years experience on the Rock. Lessons for beginners to test-ready candidates. Friendly, patient and fully insured.',
      phone: '+350 5600 87123',
      hours: 'Mon–Sat 08:00–19:00',
      services: [
        { id: 's-di-1', name: 'Introductory Lesson (90 min)', price: 55,  durationMin: 90  },
        { id: 's-di-2', name: 'Standard Lesson (60 min)',   price: 40,  durationMin: 60  },
        { id: 's-di-3', name: 'Block of 5 Lessons',         price: 185, durationMin: 60  },
        { id: 's-di-4', name: 'Motorway / Night Lesson',    price: 48,  durationMin: 60  },
      ],
    },
  ];

  // index by id
  var BIZ_BY_ID = {};
  SEED.forEach(function (b) { BIZ_BY_ID[b.id] = b; });

  // The user's own published business (For Business) appears in the directory
  // alongside the seed entries — this is the "Preview in Discover" promise.
  function myBizEntry() {
    var b = RW.S.myBusiness;
    if (!b) return null;
    return {
      id: b.id || 'mybiz',
      name: b.name,
      category: b.category === 'Health' ? 'Health & Wellness' : b.category,
      emoji: b.emoji || '⭐',
      area: b.area || 'Gibraltar',
      rating: typeof b.rating === 'number' ? b.rating : null,
      reviews: b.reviews || 0,
      hours: b.hours || '',
      phone: b.phone || '',
      blurb: b.blurb || '',
      services: b.services || [],
    };
  }
  function getBiz(id) {
    if (BIZ_BY_ID[id]) return BIZ_BY_ID[id];
    var mine = myBizEntry();
    return mine && mine.id === id ? mine : null;
  }
  function allBusinesses() {
    var mine = myBizEntry();
    return mine ? SEED.concat([mine]) : SEED.slice();
  }

  // ─── READ APIs ───────────────────────────────────────────────────────────────
  RW.api = RW.api || {};
  RW.api.businesses = function () { return allBusinesses(); };
  RW.api.getBusiness = function (id) { return getBiz(id); };

  // ─── CATEGORY CONFIG ─────────────────────────────────────────────────────────
  var CATEGORIES = ['All', 'Pets', 'Hair & Beauty', 'Fitness', 'Trades', 'Auto', 'Health & Wellness', 'Dining', 'Lessons'];

  var CAT_ACCENT = {
    'Pets':             '#2a9d8f',
    'Hair & Beauty':    '#e76f51',
    'Fitness':          '#d4112a',
    'Trades':           '#457b9d',
    'Auto':             '#1d3557',
    'Health & Wellness':'#2d6a4f',
    'Dining':           '#a4616a',
    'Lessons':          '#6d4c8e',
  };

  function catAccent(cat) { return CAT_ACCENT[cat] || '#d4112a'; }

  // ─── MODULE STATE ─────────────────────────────────────────────────────────────
  var activeCategory = 'All';   // filter chip state (session only)
  var searchQuery    = '';      // live search text (session only)
  var searchTimer    = null;    // debounce handle for search re-renders
  // Booking flow state: keyed "bizId::serviceId"
  var selectedDay  = {};
  var selectedSlot = {};
  var reviewDraft  = {};   // bizId -> { rating, text } in-progress review

  // Slots already unavailable for a business on a given ISO date: the user's
  // own live bookings for that biz/date, plus (for the user's own business)
  // received bookings and owner block-outs. Returns a lookup object.
  function takenSlots(bizId, dateIso) {
    var taken = {};
    var active = function (s) { return s !== 'Cancelled' && s !== 'Declined'; };
    (RW.S.bookings || []).forEach(function (b) {
      if (b.bizId === bizId && b.whenIso === dateIso && b.slot && active(b.status)) taken[b.slot] = true;
    });
    if (RW.S.myBusiness && bizId === RW.S.myBusiness.id) {
      (RW.S.bizBookings || []).forEach(function (b) {
        if (b.whenIso === dateIso && b.slot && active(b.status)) taken[b.slot] = true;
      });
      (RW.S.myBusiness.blocked || []).forEach(function (key) {
        var parts = String(key).split(' ');
        if (parts[0] === dateIso && parts[1]) taken[parts[1]] = true;
      });
    }
    return taken;
  }

  // Has the user a Confirmed or past booking for this biz, and not yet reviewed?
  function userReview(bizId) {
    return (RW.S.reviews || []).filter(function (r) { return r.bizId === bizId; })[0] || null;
  }
  function canReview(bizId) {
    if (userReview(bizId)) return false;
    var today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Gibraltar' });
    return (RW.S.bookings || []).some(function (b) {
      return b.bizId === bizId && b.status !== 'Cancelled' && b.status !== 'Declined' &&
        (b.status === 'Confirmed' || (b.whenIso && b.whenIso < today));
    });
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  // Seed entries are founder-curated examples. The user's own published
  // business (myBizEntry) is real and never gets the Example badge.
  function isExample(bizId) {
    return !!BIZ_BY_ID[bizId];
  }

  // Case-insensitive substring match across name, category, area AND service
  // names. ql must already be lower-cased; empty query matches everything.
  function matchesQuery(biz, ql) {
    if (!ql) return true;
    if (String(biz.name || '').toLowerCase().indexOf(ql) !== -1) return true;
    if (String(biz.category || '').toLowerCase().indexOf(ql) !== -1) return true;
    if (String(biz.area || '').toLowerCase().indexOf(ql) !== -1) return true;
    var svcs = biz.services || [];
    for (var i = 0; i < svcs.length; i++) {
      if (String(svcs[i].name || '').toLowerCase().indexOf(ql) !== -1) return true;
    }
    return false;
  }

  // ─── SEARCH WIRING ───────────────────────────────────────────────────────────
  // The global action bus only delegates clicks, so the search field is wired
  // through ONE document-level 'input' delegate registered at load. Re-renders
  // are debounced (150ms); focus + caret are restored right after each search
  // re-render so typing never loses the input.
  function restoreSearchFocus() {
    var el = document.getElementById('disc-search');
    if (!el || typeof el.focus !== 'function') return;
    el.focus();
    if (typeof el.setSelectionRange === 'function') {
      var len = String(el.value || '').length;
      try { el.setSelectionRange(len, len); } catch (e) { /* non-text input states */ }
    }
  }

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (!t || t.id !== 'disc-search') return;
    var q = String(t.value || '');
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      searchTimer = null;
      if (q === searchQuery) return;
      searchQuery = q;
      RW.render();
      restoreSearchFocus();
    }, 150);
  });

  function lowestPrice(biz) {
    var prices = biz.services.map(function (s) { return s.price; }).filter(function (p) { return p > 0; });
    if (!prices.length) return null;
    return Math.min.apply(null, prices);
  }

  function starRating(r) {
    return typeof r === 'number' ? '★' + r.toFixed(1) : '🆕 New';
  }

  function isSaved(bizId) {
    RW.S.savedBusinesses = RW.S.savedBusinesses || [];
    return RW.S.savedBusinesses.indexOf(bizId) !== -1;
  }

  // Return next N calendar days as { label:'Mon 2 Jun', iso:'2026-06-02' } objects
  function nextDays(n) {
    var days = [];
    var now = new Date();
    for (var i = 0; i < n; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      var iso = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
      var label = (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' :
        d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }));
      days.push({ label: label, iso: iso });
    }
    return days;
  }

  // Generate 30-min time slots between startH and endH
  function timeSlots(startH, endH, stepMin) {
    var slots = [];
    var mins = startH * 60;
    var endMins = endH * 60;
    while (mins < endMins) {
      var h = Math.floor(mins / 60);
      var m = mins % 60;
      slots.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
      mins += stepMin;
    }
    return slots;
  }

  // ─── WAITLIST HELPERS ────────────────────────────────────────────────────────
  // RW.S.waitlist[i] = { id, t, bizId, bizName, svcId, service, dateIso }

  function waitlist() {
    RW.S.waitlist = RW.S.waitlist || [];
    return RW.S.waitlist;
  }

  function findWaitlist(bizId, svcId, dateIso) {
    return waitlist().filter(function (w) {
      return w.bizId === bizId && w.svcId === svcId && w.dateIso === dateIso;
    })[0] || null;
  }

  // Human label for an ISO date ('Today' / 'Tomorrow' / 'Mon 2 Jun')
  function dayIsoLabel(iso) {
    var near = nextDays(2);
    if (iso === near[0].iso) return 'Today';
    if (iso === near[1].iso) return 'Tomorrow';
    var p = String(iso).split('-');
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  // Local freed-slot check: does the service's slot grid for entry.dateIso have
  // at least one slot not in takenSlots()? Mirrors buildBookingPanel exactly
  // (same step logic + today's 20-min lead-time filter); past days never match.
  function waitlistHasFreeSlot(entry, svc) {
    if (!entry || !svc) return false;
    var today = nextDays(1)[0].iso;
    if (entry.dateIso < today) return false;
    var step = svc.durationMin >= 60 ? 60 : 30;
    var slots = timeSlots(9, 17, step);
    if (entry.dateIso === today) {
      var nowMins = new Date().getHours() * 60 + new Date().getMinutes() + 20;
      slots = slots.filter(function (sl) {
        var hm = sl.split(':');
        return parseInt(hm[0], 10) * 60 + parseInt(hm[1], 10) >= nowMins;
      });
    }
    var taken = takenSlots(entry.bizId, entry.dateIso);
    return slots.some(function (sl) { return !taken[sl]; });
  }

  // Seed reviews per business (deterministic from biz.id)
  var REVIEW_POOL = [
    { author: 'Maria C.', text: 'Absolutely brilliant service, will definitely come back!', rating: 5 },
    { author: 'James R.', text: 'Very professional and great value for Gibraltar.', rating: 5 },
    { author: 'Sofia D.', text: 'Friendly staff and excellent results. Highly recommend.', rating: 5 },
    { author: 'Carlos M.', text: 'Good experience overall, just a bit of a wait.', rating: 4 },
    { author: 'Liz T.',   text: 'Convenient, reliable and fairly priced.', rating: 4 },
    { author: 'Raj P.',   text: 'Top notch — the best in Gibraltar by far.', rating: 5 },
    { author: 'Anita K.', text: 'Booked through the app and it was seamless.', rating: 5 },
    { author: 'Tomasz W.', text: 'Solid service. Would use again without hesitation.', rating: 4 },
  ];

  function seedReviews(biz) {
    // pick 3 reviews deterministically from biz id hash
    var hash = 0;
    for (var i = 0; i < biz.id.length; i++) { hash = (hash * 31 + biz.id.charCodeAt(i)) & 0xffff; }
    var out = [];
    for (var j = 0; j < 3; j++) {
      out.push(REVIEW_POOL[(hash + j) % REVIEW_POOL.length]);
    }
    return out;
  }

  // ─── LIST VIEW ───────────────────────────────────────────────────────────────

  function bizCard(biz) {
    var lp = lowestPrice(biz);
    var priceStr = lp !== null ? 'from £' + lp.toFixed(0) : 'Free booking';
    var saved = isSaved(biz.id);
    var accent = catAccent(biz.category);
    var trail = '';
    if (saved) trail += '<span style="font-size:17px;line-height:1">❤️</span>';
    if (isExample(biz.id)) trail += '<span class="pill-status neutral" style="font-size:10px;padding:2px 8px">Example</span>';
    return (
      '<div class="card" style="margin-bottom:12px;cursor:pointer" data-act="nav" data-route="' + esc('#/discover/' + biz.id) + '">' +
        '<div style="display:flex;align-items:flex-start;gap:12px">' +
          '<div style="width:48px;height:48px;border-radius:14px;background:' + accent + '18;display:grid;place-items:center;font-size:26px;flex:0 0 auto">' +
            biz.emoji +
          '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:800;font-size:15.5px;line-height:1.25">' + esc(biz.name) + '</div>' +
            '<div style="margin-top:3px;font-size:12.5px;color:var(--ash)">' +
              esc(biz.area) + ' · <span style="color:' + accent + ';font-weight:700">' + esc(biz.category) + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex:0 0 auto">' + trail + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:baseline;gap:10px;margin-top:10px">' +
          '<span style="color:#f5a623;font-weight:700;font-size:13px">' + starRating(biz.rating) + '</span>' +
          '<span class="num" style="font-size:12px;color:var(--ash)">(' + esc(String(biz.reviews)) + ' reviews)</span>' +
          '<span style="flex:1"></span>' +
          '<span class="num" style="font-size:13px;font-weight:800;color:' + accent + '">' + esc(priceStr) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderList() {
    var catItems = CATEGORIES.map(function (c) { return { label: c, value: c }; });
    var filterChips = RW.ui.chips(catItems, activeCategory, 'discFilter', true);

    var q  = searchQuery.trim();
    var ql = q.toLowerCase();
    var all = allBusinesses();
    var visible = all.filter(function (b) {
      if (activeCategory !== 'All' && b.category !== activeCategory) return false;
      return matchesQuery(b, ql);
    });

    var n = visible.length;
    // sectionTitle() escapes its label — pass raw text (incl. the echoed query).
    var countLabel = q
      ? 'Results for “' + q + '” (' + n + (n === 1 ? ' result' : ' results') + ')'
      : (activeCategory === 'All'
        ? 'All Local Businesses (' + n + ')'
        : activeCategory + ' (' + n + ')');

    var cards = n
      ? visible.map(bizCard).join('')
      : RW.ui.empty('🔍', q
        ? 'No matches for “' + esc(q) + '”. Try another word or clear a filter.'
        : 'No businesses in this category yet.');

    var searchBox =
      '<div style="margin-bottom:12px">' +
        '<input id="disc-search" class="input" type="search" placeholder="Search businesses, services, areas…"' +
          ' value="' + esc(searchQuery) + '" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">' +
      '</div>';

    var body =
      searchBox +
      '<div style="font-size:13px;color:var(--ash);margin-bottom:10px">' +
        'Discover and book Gibraltar’s finest local businesses' +
      '</div>' +
      filterChips +
      RW.ui.sectionTitle(countLabel) +
      cards;

    return RW.ui.screen({ title: 'Discover', body: body, tab: 'discover' });
  }

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────────────

  // Track which booking panel is open: 'bizId::serviceId' or null
  var openBookingKey = null;

  function renderDetail(bizId) {
    var biz = getBiz(bizId);
    if (!biz) return renderList();

    RW.S.savedBusinesses = RW.S.savedBusinesses || [];
    RW.S.bookings = RW.S.bookings || [];

    var saved = isSaved(bizId);
    var accent = catAccent(biz.category);

    var heroEl = RW.ui.hero({
      emoji: biz.emoji,
      title: biz.name,
      sub: biz.category + ' · ' + biz.area,
      accent: accent,
      chips: [starRating(biz.rating) + ' (' + biz.reviews + ' reviews)', biz.hours],
    });

    // Example badge + claim line (seed listings only — never the user's own)
    var exampleStrip = '';
    if (isExample(bizId)) {
      exampleStrip =
        '<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:12px">' +
          '<span class="pill-status neutral">Example</span>' +
          '<span style="font-size:12.5px;color:var(--ash)">This is an example listing. Own this business? ' +
            '<span data-act="nav" data-route="#/business" style="color:var(--ink);font-weight:700;text-decoration:underline;cursor:pointer">List yours free</span>.' +
          '</span>' +
        '</div>';
    }

    // Info card
    var infoCard =
      '<div class="card" style="margin-bottom:12px">' +
        '<div class="kv"><span>Phone</span><span>' + esc(biz.phone) + '</span></div>' +
        '<div class="kv"><span>Hours</span><span>' + esc(biz.hours) + '</span></div>' +
        '<div class="kv"><span>Area</span><span>' + esc(biz.area) + '</span></div>' +
        '<div class="kv"><span>Category</span><span>' + esc(biz.category) + '</span></div>' +
      '</div>';

    // Save + message
    var saveLabel = saved ? '❤️ Saved' : '♡ Save';
    var actionRow =
      '<div style="display:flex;gap:10px;margin-bottom:14px">' +
        '<button class="btn ghost" style="flex:1" data-act="discSave" data-id="' + esc(bizId) + '">' + saveLabel + '</button>' +
        '<button class="btn sea" style="flex:1" data-act="discMessage" data-id="' + esc(bizId) + '">💬 Message</button>' +
      '</div>';

    // Blurb
    var blurbCard =
      '<div class="card" style="margin-bottom:12px">' +
        '<div style="font-size:13px;font-weight:700;color:var(--ash);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">About</div>' +
        '<div style="font-size:14px;line-height:1.6">' + esc(biz.blurb) + '</div>' +
      '</div>';

    // Services list
    var servicesHtml = RW.ui.sectionTitle('Services & Booking');
    biz.services.forEach(function (svc) {
      var bookKey = bizId + '::' + svc.id;
      var isOpen = openBookingKey === bookKey;
      var priceStr = svc.price > 0 ? '£' + svc.price.toFixed(2) : 'Free';
      var durStr = svc.durationMin >= 60
        ? (svc.durationMin / 60).toFixed(svc.durationMin % 60 === 0 ? 0 : 1) + ' hr'
        : svc.durationMin + ' min';

      var bookingPanel = '';
      if (isOpen) {
        bookingPanel = buildBookingPanel(bizId, svc, bookKey, accent);
      }

      // Freed-slot strips: for each of the user's waitlist entries on this
      // service, flag days where a previously-full grid now has an opening.
      var freedStrips = '';
      waitlist().forEach(function (w) {
        if (w.bizId !== bizId || w.svcId !== svc.id) return;
        if (!waitlistHasFreeSlot(w, svc)) return; // still full — no strip
        freedStrips +=
          '<div style="display:flex;align-items:center;gap:8px;box-shadow:inset 0 0 0 1.5px var(--gold-soft);border-radius:12px;padding:8px 10px;margin-bottom:10px">' +
            '<span style="flex:1;font-size:12.5px;font-weight:600">✨ A slot freed up on <span class="num">' + esc(dayIsoLabel(w.dateIso)) + '</span> — pick a time below</span>' +
            '<span data-act="discWaitlistDel" data-wid="' + esc(w.id) + '" title="Remove from waitlist" style="cursor:pointer;color:var(--ash);font-weight:700;padding:0 4px">×</span>' +
          '</div>';
      });

      servicesHtml +=
        '<div class="card" style="margin-bottom:10px">' +
          freedStrips +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<div style="flex:1">' +
              '<div style="font-weight:700;font-size:14px">' + esc(svc.name) + '</div>' +
              '<div style="font-size:12px;color:var(--ash);margin-top:2px">' +
                esc(durStr) +
              '</div>' +
            '</div>' +
            '<span class="num" style="font-size:16px;font-weight:900;color:' + accent + '">' + esc(priceStr) + '</span>' +
            '<button class="btn sm sea" data-act="discBook" data-id="' + esc(bizId) + '" data-svc="' + esc(svc.id) + '">' +
              (isOpen ? 'Cancel' : 'Book') +
            '</button>' +
          '</div>' +
          bookingPanel +
        '</div>';
    });

    // Reviews
    var reviewsHtml = RW.ui.sectionTitle('Reviews');

    // your own review (write-back) renders first
    var mine = userReview(bizId);
    if (mine) {
      reviewsHtml +=
        '<div class="card" style="margin-bottom:8px;box-shadow:inset 0 0 0 1.5px var(--gold-soft)">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
            '<span style="font-weight:700;font-size:13px">Your review</span>' +
            '<span style="color:var(--gold);font-size:13px">' + '★'.repeat(mine.rating) + '<span style="color:var(--mist)">' + '★'.repeat(5 - mine.rating) + '</span></span>' +
            '<span style="margin-left:auto;font-size:11px;color:var(--ash)">' + esc(fmtTime(mine.t)) + '</span>' +
          '</div>' +
          (mine.text ? '<div style="font-size:13px;color:var(--ink60);line-height:1.5">' + esc(mine.text) + '</div>' : '') +
          '<button class="btn sm ghost" style="margin-top:8px" data-act="discReviewDel" data-rid="' + esc(mine.id) + '">Remove</button>' +
        '</div>';
    } else if (canReview(bizId)) {
      // "Rate your visit" composer (eligible after a confirmed/past booking)
      var draft = reviewDraft[bizId] || { rating: 0, text: '' };
      var stars = '';
      for (var si = 1; si <= 5; si++) {
        stars += '<span class="rate-star' + (si <= draft.rating ? ' on' : '') + '" data-act="discRate" data-id="' + esc(bizId) + '" data-r="' + si + '">★</span>';
      }
      reviewsHtml +=
        '<div class="card" style="margin-bottom:8px">' +
          '<div style="font-weight:700;font-size:14px;margin-bottom:8px">Rate your visit</div>' +
          '<div class="rate-stars">' + stars + '</div>' +
          '<textarea id="rv-text-' + esc(bizId) + '" class="input" rows="2" placeholder="How was it? (optional)" style="margin-top:10px;resize:none">' + esc(draft.text || '') + '</textarea>' +
          '<button class="btn sm" style="margin-top:10px" data-act="discReview" data-id="' + esc(bizId) + '">Submit review</button>' +
        '</div>';
    }

    seedReviews(biz).forEach(function (rv) {
      reviewsHtml +=
        '<div class="card" style="margin-bottom:8px">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
            '<span style="font-weight:700;font-size:13px">' + esc(rv.author) + '</span>' +
            '<span style="color:var(--gold);font-size:12px">' + '★'.repeat(rv.rating) + '</span>' +
          '</div>' +
          '<div style="font-size:13px;color:var(--ink60);line-height:1.5">' + esc(rv.text) + '</div>' +
        '</div>';
    });

    var body = exampleStrip + infoCard + actionRow + blurbCard + servicesHtml + reviewsHtml;

    return RW.ui.screen({ title: biz.name, hero: heroEl, body: body });
  }

  // Build the day/slot picker panel for a service
  function buildBookingPanel(bizId, svc, bookKey, accent) {
    var days = nextDays(5);
    var curDay = selectedDay[bookKey] || days[0].iso;
    var curSlot = selectedSlot[bookKey] || null;

    // day chips
    var dayChipsHtml = '<div style="margin-top:14px">' +
      '<div style="font-size:12px;font-weight:700;color:var(--ash);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">Choose Day</div>' +
      '<div class="chips">';
    days.forEach(function (d) {
      var on = d.iso === curDay ? ' on brand' : '';
      dayChipsHtml +=
        '<span class="chip tap' + on + '" data-act="discPickDay" ' +
          'data-id="' + esc(bizId) + '" data-svc="' + esc(svc.id) + '" data-day="' + esc(d.iso) + '">' +
          esc(d.label) +
        '</span>';
    });
    dayChipsHtml += '</div></div>';

    // time slots (09:00–17:00, 30-min step — every hour for longer services)
    var step = svc.durationMin >= 60 ? 60 : 30;
    var slots = timeSlots(9, 17, step);
    // "Today" must not offer times that have already passed (20-min lead time)
    if (curDay === nextDays(1)[0].iso) {
      var nowMins = new Date().getHours() * 60 + new Date().getMinutes() + 20;
      slots = slots.filter(function (sl) {
        var hm = sl.split(':');
        return parseInt(hm[0], 10) * 60 + parseInt(hm[1], 10) >= nowMins;
      });
    }

    // remove already-booked / blocked slots for the chosen day
    var taken = takenSlots(bizId, curDay);
    var available = slots.filter(function (sl) { return !taken[sl]; });
    if (curSlot && taken[curSlot]) curSlot = null; // a held slot was just taken

    var slotChipsHtml = '<div style="margin-top:10px">' +
      '<div style="font-size:12px;font-weight:700;color:var(--ash);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">Choose Time</div>' +
      '<div class="chips">';
    if (!available.length) {
      slotChipsHtml += '<span class="subtle" style="padding:4px 0">No free slots that day — try another.</span>';
    }
    slots.forEach(function (sl) {
      if (taken[sl]) {
        slotChipsHtml += '<span class="chip" title="Booked" style="opacity:.4;text-decoration:line-through">' + esc(sl) + '</span>';
        return;
      }
      var on = sl === curSlot ? ' on brand' : '';
      slotChipsHtml +=
        '<span class="chip tap' + on + '" data-act="discPickSlot" ' +
          'data-id="' + esc(bizId) + '" data-svc="' + esc(svc.id) + '" data-slot="' + esc(sl) + '">' +
          esc(sl) +
        '</span>';
    });
    slotChipsHtml += '</div></div>';

    // Waitlist: when the chosen day is fully booked, offer to join (or show
    // the quiet on-the-list status if the user already joined for this day).
    var waitlistHtml = '';
    if (!available.length) {
      var wlEntry = findWaitlist(bizId, svc.id, curDay);
      if (wlEntry) {
        waitlistHtml =
          '<div style="margin-top:10px;display:flex;align-items:center;gap:8px">' +
            '<span class="pill-status info">On the waitlist for this day</span>' +
            '<span data-act="discWaitlistDel" data-wid="' + esc(wlEntry.id) + '" title="Remove from waitlist" style="cursor:pointer;color:var(--ash);font-weight:700;padding:0 4px">×</span>' +
          '</div>';
      } else {
        waitlistHtml =
          '<div style="margin-top:10px">' +
            '<button class="btn sm ghost" data-act="discWaitlist" data-id="' + esc(bizId) + '" data-svc="' + esc(svc.id) + '" data-dayiso="' + esc(curDay) + '">' +
              'Join the waitlist for this day' +
            '</button>' +
          '</div>';
      }
    }

    // Find the day label for selected day
    var dayObj = null;
    nextDays(5).forEach(function (d) { if (d.iso === curDay) dayObj = d; });
    var dayLabelStr = dayObj ? dayObj.label : curDay;

    var confirmDisabled = !curSlot ? ' disabled style="opacity:.5;cursor:default"' : '';
    var confirmHtml =
      '<div style="margin-top:14px">' +
        '<button class="btn sea" style="width:100%"' + confirmDisabled +
          ' data-act="discConfirm" data-id="' + esc(bizId) + '" data-svc="' + esc(svc.id) + '"' +
          ' data-day="' + esc(dayLabelStr) + '" data-dayiso="' + esc(curDay) + '" data-slot="' + esc(curSlot || '') + '">' +
          'Confirm booking' +
          (curSlot ? ' · ' + esc(dayLabelStr) + ' ' + esc(curSlot) : '') +
        '</button>' +
        '<div style="font-size:11px;color:var(--ash);text-align:center;margin-top:6px">Pay in person · Free to cancel</div>' +
        (isExample(bizId)
          ? '<div style="font-size:11px;color:var(--ash);text-align:center;margin-top:3px">Example business — booking is a demo</div>'
          : '') +
      '</div>';

    return (
      '<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:4px">' +
        dayChipsHtml +
        slotChipsHtml +
        waitlistHtml +
        confirmHtml +
      '</div>'
    );
  }

  // ─── RENDER DISPATCHER ───────────────────────────────────────────────────────

  function render(parts) {
    var bizId = parts && parts[0];
    if (bizId && getBiz(bizId)) {
      // deep-link "#/discover/<bizId>/book/<svcId>" auto-opens that slot picker
      // (used by Activity's one-tap "Book again").
      if (parts[1] === 'book' && parts[2]) {
        var bk = bizId + '::' + parts[2];
        if (openBookingKey !== bk) {
          openBookingKey = bk;
          var days = nextDays(5);
          if (!selectedDay[bk]) selectedDay[bk] = days[0].iso;
        }
      }
      return renderDetail(bizId);
    }
    openBookingKey = null; // reset booking panel when back on list
    return renderList();
  }

  // ─── ACTIONS ─────────────────────────────────────────────────────────────────

  RW.register({
    id: 'discover',
    title: 'Discover',
    emoji: '🔎',
    tileBg: '#fde7ea',
    section: 'daily',
    order: 10,
    showTile: false,
    render: render,
    actions: {

      discFilter: function (el) {
        activeCategory = el.dataset.v || 'All';
        RW.render();
      },

      discSave: function (el) {
        var id = el.dataset.id;
        if (!id) return;
        RW.S.savedBusinesses = RW.S.savedBusinesses || [];
        var idx = RW.S.savedBusinesses.indexOf(id);
        if (idx === -1) {
          RW.S.savedBusinesses.push(id);
          RW.toast('Saved ❤️');
        } else {
          RW.S.savedBusinesses.splice(idx, 1);
          RW.toast('Removed from saved.');
        }
        RW.store.save();
        RW.render();
      },

      discBook: function (el) {
        var bizId = el.dataset.id;
        var svcId = el.dataset.svc;
        if (!bizId || !svcId) return;
        var bookKey = bizId + '::' + svcId;
        // toggle
        openBookingKey = openBookingKey === bookKey ? null : bookKey;
        // seed default day if not already picked
        if (openBookingKey && !selectedDay[bookKey]) {
          var days = nextDays(5);
          selectedDay[bookKey] = days[0].iso;
        }
        RW.render();
      },

      discPickDay: function (el) {
        var bizId = el.dataset.id;
        var svcId = el.dataset.svc;
        var day   = el.dataset.day;
        if (!bizId || !svcId || !day) return;
        var bookKey = bizId + '::' + svcId;
        selectedDay[bookKey] = day;
        // clear slot when day changes
        selectedSlot[bookKey] = null;
        RW.render();
      },

      discPickSlot: function (el) {
        var bizId = el.dataset.id;
        var svcId = el.dataset.svc;
        var slot  = el.dataset.slot;
        if (!bizId || !svcId || !slot) return;
        var bookKey = bizId + '::' + svcId;
        selectedSlot[bookKey] = slot;
        RW.render();
      },

      discConfirm: function (el) {
        var bizId   = el.dataset.id;
        var svcId   = el.dataset.svc;
        var dayLabel = el.dataset.day;
        var dayIso  = el.dataset.dayiso;
        var slot    = el.dataset.slot;
        if (!bizId || !svcId || !dayLabel || !slot) return;

        var biz = getBiz(bizId);
        if (!biz) return;
        var svc = null;
        biz.services.forEach(function (s) { if (s.id === svcId) svc = s; });
        if (!svc) return;

        // re-validate: the slot may have been taken since the panel rendered
        if (dayIso && takenSlots(bizId, dayIso)[slot]) {
          RW.toast('That slot was just taken — pick another.');
          selectedSlot[bizId + '::' + svcId] = null;
          RW.render();
          return;
        }

        var booking = {
          id:      uid(),
          ref:     ref('BK'),
          t:       Date.now(),
          bizId:   bizId,
          bizName: biz.name,
          svcId:   svc.id,
          service: svc.name,
          price:   svc.price > 0 ? '£' + svc.price.toFixed(2) : 'Free',
          when:    dayLabel + ' · ' + slot,
          whenIso: dayIso || '',
          slot:    slot,
          status:  'Requested',
        };
        RW.S.bookings = RW.S.bookings || [];
        RW.S.bookings.push(booking);
        // if booking the user's OWN business, mirror into the owner inbox
        // (same id) so it shows in the For Business dashboard.
        if (RW.S.myBusiness && bizId === RW.S.myBusiness.id) {
          RW.S.bizBookings = RW.S.bizBookings || [];
          RW.S.bizBookings.push({
            id: booking.id, ref: booking.ref, t: booking.t,
            customer: RW.S.name || 'A customer', service: svc.name,
            when: booking.when, whenIso: dayIso || '', slot: slot, status: 'Requested',
          });
        }
        // a successful booking fulfils any waitlist entry for this biz+svc+day
        RW.S.waitlist = waitlist().filter(function (w) {
          return !(w.bizId === bizId && w.svcId === svcId && w.dateIso === dayIso);
        });
        RW.store.save();

        // clear booking panel state
        var bookKey = bizId + '::' + svcId;
        openBookingKey = null;
        delete selectedDay[bookKey];
        delete selectedSlot[bookKey];

        RW.toast('Booking requested — ' + biz.name + ' will confirm shortly.');
        RW.go('#/activity');
      },

      discWaitlist: function (el) {
        var bizId = el.dataset.id;
        var svcId = el.dataset.svc;
        var dateIso = el.dataset.dayiso;
        if (!bizId || !svcId || !dateIso) return;
        var biz = getBiz(bizId);
        if (!biz) return;
        var svc = null;
        (biz.services || []).forEach(function (s) { if (s.id === svcId) svc = s; });
        if (!svc) return;
        if (!findWaitlist(bizId, svcId, dateIso)) {
          waitlist().push({
            id:      uid(),
            t:       Date.now(),
            bizId:   bizId,
            bizName: biz.name,
            svcId:   svc.id,
            service: svc.name,
            dateIso: dateIso,
          });
          RW.store.save();
        }
        RW.toast('On the list — we’ll flag it if a slot frees up.');
        RW.render();
      },

      discWaitlistDel: function (el) {
        var wid = el.dataset.wid;
        if (!wid) return;
        RW.S.waitlist = waitlist().filter(function (w) { return w.id !== wid; });
        RW.store.save();
        RW.toast('Removed from the waitlist.');
        RW.render();
      },

      discRate: function (el) {
        var bizId = el.dataset.id;
        if (!bizId) return;
        reviewDraft[bizId] = reviewDraft[bizId] || { rating: 0, text: '' };
        reviewDraft[bizId].rating = parseInt(el.dataset.r, 10) || 0;
        // preserve any typed text before re-render
        var ta = document.getElementById('rv-text-' + bizId);
        if (ta) reviewDraft[bizId].text = ta.value;
        RW.render();
      },

      discReview: function (el) {
        var bizId = el.dataset.id;
        if (!bizId) return;
        var draft = reviewDraft[bizId] || { rating: 0, text: '' };
        var ta = document.getElementById('rv-text-' + bizId);
        var text = ta ? ta.value.trim().slice(0, 240) : (draft.text || '');
        if (!draft.rating) { RW.toast('Tap the stars to rate first.'); return; }
        RW.S.reviews = RW.S.reviews || [];
        RW.S.reviews.push({ id: uid(), t: Date.now(), bizId: bizId, rating: draft.rating, text: text });
        delete reviewDraft[bizId];
        RW.store.save();
        RW.toast('Thanks for reviewing — ¡gracias!');
        RW.render();
      },

      discReviewDel: function (el) {
        var rid = el.dataset.rid;
        if (!rid) return;
        RW.S.reviews = (RW.S.reviews || []).filter(function (r) { return r.id !== rid; });
        RW.store.save();
        RW.toast('Review removed.');
        RW.render();
      },

      discMessage: function (el) {
        var id = el.dataset.id;
        var biz = id ? getBiz(id) : null;
        var name = biz ? biz.name : 'the business';
        RW.toast('Message sent to ' + name + '. They’ll reply shortly.');
      },
    },
  });

  // ─── ACTIVITY FEED ───────────────────────────────────────────────────────────
  RW.registerActivity(function () {
    // bookings are already surfaced by activity.js built-in provider via RW.S.bookings
    // so we only surface booking-waitlist entries here
    return waitlist().map(function (w) {
      return {
        t: w.t,
        kind: 'bookings',
        html:
          '<div class="card row" data-act="nav" data-route="' + esc('#/discover/' + w.bizId) + '" style="cursor:pointer">' +
            '<div class="lead">⏳</div>' +
            '<div class="body"><div class="name">Waitlist · ' + esc(w.service) + '</div>' +
            '<div class="sub">' + esc(w.bizName) + ' · <span class="num">' + esc(dayIsoLabel(w.dateIso)) + '</span></div></div>' +
            '<div class="trail"><span class="pill-status info">Waiting</span></div>' +
          '</div>',
      };
    });
  });


  // ---- global search: businesses + services ----
  RW.registerSearch(function (q) {
    var out = [];
    allBusinesses().forEach(function (b) {
      var hitSvc = null;
      (b.services || []).forEach(function (s) {
        if (!hitSvc && String(s.name).toLowerCase().indexOf(q) !== -1) hitSvc = s;
      });
      var hitBiz = String(b.name).toLowerCase().indexOf(q) !== -1 ||
        String(b.category).toLowerCase().indexOf(q) !== -1 ||
        String(b.area).toLowerCase().indexOf(q) !== -1;
      if (hitBiz || hitSvc) {
        out.push({
          group: 'Businesses & services',
          label: b.name,
          sub: hitSvc ? hitSvc.name + ' · £' + hitSvc.price : b.category + ' · ' + b.area,
          route: '#/discover/' + b.id,
          lead: b.emoji || '🔎',
        });
      }
    });
    return out;
  });

})(window.RW);
