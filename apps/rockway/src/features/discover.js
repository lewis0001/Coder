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

  // ─── READ APIs ───────────────────────────────────────────────────────────────
  RW.api = RW.api || {};
  RW.api.businesses = function () { return SEED.slice(); };
  RW.api.getBusiness = function (id) { return BIZ_BY_ID[id] || null; };

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
  // Booking flow state: keyed "bizId::serviceId"
  var selectedDay  = {};
  var selectedSlot = {};

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  function lowestPrice(biz) {
    var prices = biz.services.map(function (s) { return s.price; }).filter(function (p) { return p > 0; });
    if (!prices.length) return null;
    return Math.min.apply(null, prices);
  }

  function starRating(r) {
    return '★' + r.toFixed(1);
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
    return (
      '<div class="card" style="margin-bottom:12px;cursor:pointer" data-act="nav" data-route="' + esc('#/discover/' + biz.id) + '">' +
        '<div style="display:flex;align-items:flex-start;gap:12px">' +
          '<div style="width:48px;height:48px;border-radius:14px;background:' + accent + '18;display:grid;place-items:center;font-size:26px;flex:0 0 auto">' +
            biz.emoji +
          '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:800;font-size:15px;line-height:1.25">' + esc(biz.name) + '</div>' +
            '<div style="margin-top:2px;font-size:12px;color:var(--ash)">' +
              '<span class="chip" style="font-size:11px;padding:1px 7px;margin-right:4px">' + esc(biz.area) + '</span>' +
              '<span style="color:' + accent + ';font-weight:700">' + esc(biz.category) + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="text-align:right;flex:0 0 auto">' +
            (saved ? '<span style="font-size:18px;line-height:1">❤️</span>' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-top:10px">' +
          '<span style="color:#f5a623;font-weight:700;font-size:13px">' + starRating(biz.rating) + '</span>' +
          '<span class="num" style="font-size:12px;color:var(--ash)">(' + esc(String(biz.reviews)) + ' reviews)</span>' +
          '<span style="flex:1"></span>' +
          '<span style="font-size:12px;font-weight:700;color:' + accent + '">' + esc(priceStr) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderList() {
    var catItems = CATEGORIES.map(function (c) { return { label: c, value: c }; });
    var filterChips = RW.ui.chips(catItems, activeCategory, 'discFilter', true);

    var visible = activeCategory === 'All'
      ? SEED
      : SEED.filter(function (b) { return b.category === activeCategory; });

    var countLabel = activeCategory === 'All'
      ? 'All Local Businesses (' + visible.length + ')'
      : esc(activeCategory) + ' (' + visible.length + ')';

    var cards = visible.length
      ? visible.map(bizCard).join('')
      : RW.ui.empty('🔍', 'No businesses in this category yet.');

    var body =
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
    var biz = BIZ_BY_ID[bizId];
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

      servicesHtml +=
        '<div class="card" style="margin-bottom:10px">' +
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
    var reviews = seedReviews(biz);
    reviews.forEach(function (rv) {
      reviewsHtml +=
        '<div class="card" style="margin-bottom:8px">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
            '<span style="font-weight:700;font-size:13px">' + esc(rv.author) + '</span>' +
            '<span style="color:#f5a623;font-size:12px">' + '★'.repeat(rv.rating) + '</span>' +
          '</div>' +
          '<div style="font-size:13px;color:var(--ink60);line-height:1.5">' + esc(rv.text) + '</div>' +
        '</div>';
    });

    var body = infoCard + actionRow + blurbCard + servicesHtml + reviewsHtml;

    return RW.ui.screen({ title: esc(biz.name), hero: heroEl, body: body });
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

    var slotChipsHtml = '<div style="margin-top:10px">' +
      '<div style="font-size:12px;font-weight:700;color:var(--ash);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px">Choose Time</div>' +
      '<div class="chips">';
    slots.forEach(function (sl) {
      var on = sl === curSlot ? ' on brand' : '';
      slotChipsHtml +=
        '<span class="chip tap' + on + '" data-act="discPickSlot" ' +
          'data-id="' + esc(bizId) + '" data-svc="' + esc(svc.id) + '" data-slot="' + esc(sl) + '">' +
          esc(sl) +
        '</span>';
    });
    slotChipsHtml += '</div></div>';

    // Find the day label for selected day
    var dayObj = null;
    nextDays(5).forEach(function (d) { if (d.iso === curDay) dayObj = d; });
    var dayLabelStr = dayObj ? dayObj.label : curDay;

    var confirmDisabled = !curSlot ? ' disabled style="opacity:.5;cursor:default"' : '';
    var confirmHtml =
      '<div style="margin-top:14px">' +
        '<button class="btn sea" style="width:100%"' + confirmDisabled +
          ' data-act="discConfirm" data-id="' + esc(bizId) + '" data-svc="' + esc(svc.id) + '"' +
          ' data-day="' + esc(dayLabelStr) + '" data-slot="' + esc(curSlot || '') + '">' +
          'Confirm booking' +
          (curSlot ? ' · ' + esc(dayLabelStr) + ' ' + esc(curSlot) : '') +
        '</button>' +
        '<div style="font-size:11px;color:var(--ash);text-align:center;margin-top:6px">Pay in person · Free to cancel</div>' +
      '</div>';

    return (
      '<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:4px">' +
        dayChipsHtml +
        slotChipsHtml +
        confirmHtml +
      '</div>'
    );
  }

  // ─── RENDER DISPATCHER ───────────────────────────────────────────────────────

  function render(parts) {
    var bizId = parts && parts[0];
    if (bizId && BIZ_BY_ID[bizId]) {
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
        var slot    = el.dataset.slot;
        if (!bizId || !svcId || !dayLabel || !slot) return;

        var biz = BIZ_BY_ID[bizId];
        if (!biz) return;
        var svc = null;
        biz.services.forEach(function (s) { if (s.id === svcId) svc = s; });
        if (!svc) return;

        RW.S.bookings = RW.S.bookings || [];
        RW.S.bookings.push({
          id:      uid(),
          ref:     ref('BK'),
          t:       Date.now(),
          bizId:   bizId,
          bizName: biz.name,
          service: svc.name,
          price:   svc.price > 0 ? '£' + svc.price.toFixed(2) : 'Free',
          when:    esc(dayLabel) + ' · ' + esc(slot),
          status:  'Requested',
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

      discMessage: function (el) {
        var id = el.dataset.id;
        var biz = id ? BIZ_BY_ID[id] : null;
        var name = biz ? biz.name : 'the business';
        RW.toast('Message sent to ' + name + '. They’ll reply shortly.');
      },
    },
  });

  // ─── ACTIVITY FEED ───────────────────────────────────────────────────────────
  RW.registerActivity(function () {
    // bookings are already surfaced by activity.js built-in provider via RW.S.bookings
    // so we return [] to avoid duplicates
    return [];
  });

})(window.RW);
