/* Rockway feature — Jobs (honest Gibraltar job board: post a vacancy free during
 * launch, clearly-badged example listings, and link-outs to where the Rock
 * really hires — no fabricated adverts under real employers). */
(function (RW) {
  'use strict';
  const { esc, uid, fmtTime } = RW.util;

  // Legacy guard: jobApps held applications from the old (removed) fake apply
  // flow. We keep the data so old blobs load cleanly, but never write to it.
  RW.S.jobApps = RW.S.jobApps || [];

  var SECTORS = ['iGaming', 'Finance', 'Insurance', 'Shipping', 'Legal', 'Healthcare', 'Civil Service', 'Hospitality', 'Retail'];
  var FILTER_ITEMS = ['All'].concat(SECTORS).map(function (s) { return { label: s, value: s }; });
  var SECTOR_ITEMS = SECTORS.map(function (s) { return { label: s, value: s }; });

  var AREAS = ['Main Street', 'Irish Town', 'Ocean Village', 'Marina Bay', 'Queensway Quay', 'Europort', 'Midtown', 'Gibraltar Harbour', 'Catalan Bay', 'Upper Town', 'Anywhere on the Rock'];

  var SECTOR_EMOJI = {
    iGaming: '🎮', Finance: '🏦', Insurance: '📋', Shipping: '⚓', Legal: '⚖️',
    Healthcare: '🏥', 'Civil Service': '🏛️', Hospitality: '🍽️', Retail: '🛍️',
  };

  // ---- Example listings ----
  // Deliberately GENERIC employers: these illustrate what an advert looks like.
  // No real firm is named and none of these can be applied to (see detail()).
  var EXAMPLES = [
    {
      id: 'ex1',
      sector: 'iGaming',
      title: 'Compliance & Licensing Officer',
      employer: 'An Ocean Village iGaming operator',
      area: 'Ocean Village',
      pay: '£38,000 – £48,000',
      type: 'Full-time',
      emoji: '🎮',
      shortDesc: 'Keep a licensed online gaming firm on the right side of the Gibraltar Gambling Commissioner — filings, AML policy and licence work.',
      fullDesc: 'A typical compliance brief at one of the Rock’s licensed operators: managing regulatory filings, responding to Gambling Commissioner correspondence, maintaining AML/KYC policy documents and working with legal and risk teams on evolving UK and Gibraltar requirements. Roles like this usually ask for gaming-compliance or financial-services experience and offer hybrid working around an Ocean Village office.',
    },
    {
      id: 'ex2',
      sector: 'Finance',
      title: 'Private Client Executive',
      employer: 'A Line Wall Road private bank',
      area: 'Line Wall Road',
      pay: '£40,000 – £55,000',
      type: 'Full-time',
      emoji: '🏦',
      shortDesc: 'Look after international private-banking clients — onboarding, KYC and portfolio reviews for a GFSC-regulated bank.',
      fullDesc: 'Private banking is one of Gibraltar’s anchor trades. A role like this covers managing a book of international clients, running onboarding under KYC/AML procedures, preparing portfolio reviews and co-ordinating with a European head office. Employers typically look for a CISI-style qualification and fluent English, with Spanish a strong advantage for cross-border clients.',
    },
    {
      id: 'ex3',
      sector: 'Insurance',
      title: 'Underwriting Analyst',
      employer: 'A Europort insurance group',
      area: 'Europort',
      pay: '£32,000 – £40,000',
      type: 'Full-time',
      emoji: '📋',
      shortDesc: 'Support senior underwriters on motor and specialty lines at one of the many insurers based around Europort.',
      fullDesc: 'Gibraltar writes a large share of UK motor insurance, and Europort is full of underwriting teams. An analyst role like this involves pricing support, maintaining underwriting data, preparing bordereaux and liaising with reinsurers. Employers often fund ACII study and look for one to two years of market experience.',
    },
    {
      id: 'ex4',
      sector: 'Shipping',
      title: 'Port Operations Co-ordinator',
      employer: 'A Gibraltar Harbour bunkering agency',
      area: 'North Mole, Gibraltar Harbour',
      pay: '£28,000 – £36,000',
      type: 'Full-time',
      emoji: '⚓',
      shortDesc: 'Co-ordinate vessel calls, crew changes and bunker deliveries in one of the world’s busiest refuelling ports.',
      fullDesc: 'The Strait makes Gibraltar a major bunkering and ship-agency hub. This kind of role covers vessel pre-arrival paperwork, co-ordination with the Gibraltar Port Authority, crew changes and bunker delivery scheduling — usually with on-call weekend cover on a rota. Shipping, port or logistics experience is the normal ask.',
    },
    {
      id: 'ex5',
      sector: 'Legal',
      title: 'Corporate & Commercial Solicitor',
      employer: 'A Main Street law firm',
      area: 'Main Street',
      pay: '£45,000 – £60,000',
      type: 'Full-time',
      emoji: '⚖️',
      shortDesc: 'Advise on company, funds and gaming-licensing work at an established Gibraltar practice.',
      fullDesc: 'Gibraltar’s law firms serve gaming, financial-services and property clients far beyond the Rock. A mid-level corporate role typically asks for an England & Wales or Gibraltar-admitted solicitor with 2–5 years PQE, covering M&A, fund formations, shareholder agreements and licensing applications. Spanish helps with cross-border matters.',
    },
    {
      id: 'ex6',
      sector: 'Healthcare',
      title: 'Registered Nurse',
      employer: 'A private healthcare clinic',
      area: 'Midtown',
      pay: '£30,000 – £38,000',
      type: 'Part-time',
      emoji: '🏥',
      shortDesc: 'Clinic nursing on the Rock — assessments, screening and minor procedures for a private practice.',
      fullDesc: 'Beyond the GHA, Gibraltar has private clinics and occupational-health providers that recruit registered nurses. Roles like this cover patient assessments, vaccinations, screening programmes and assisting with minor procedures. An NMC (or equivalent) registration is essential. For public-sector nursing posts, see the gov.gi vacancies link on the Jobs board — the GHA recruits there.',
    },
    {
      id: 'ex7',
      sector: 'Hospitality',
      title: 'Restaurant Supervisor',
      employer: 'A Queensway marina restaurant',
      area: 'Queensway Quay Marina',
      pay: '£24,000 – £28,000 + tronc',
      type: 'Full-time',
      emoji: '🍽️',
      shortDesc: 'Run front-of-house at a waterfront terrace — rotas, reservations and a team of six to eight servers.',
      fullDesc: 'Marina dining is a Gibraltar staple and supervisors are in steady demand. Expect to manage a small front-of-house team, handle reservations, liaise with the kitchen on menus and allergens, and keep service sharp through the summer terrace season. Conversational Spanish is a big plus with visiting yacht crews and cross-border guests; tips usually come via tronc.',
    },
    {
      id: 'ex8',
      sector: 'Retail',
      title: 'Retail Sales Advisor',
      employer: 'A Main Street electronics retailer',
      area: 'Main Street',
      pay: '£20,000 – £24,000',
      type: 'Full-time',
      emoji: '🛍️',
      shortDesc: 'Sell duty-free tech to locals, cruise visitors and day-trippers on Gibraltar’s high street.',
      fullDesc: 'Main Street retail runs on Gibraltar’s VAT-free pricing and cruise-ship footfall. Advisors demo phones, audio and appliances, handle point-of-sale and stock, and switch between English and Spanish all day. Saturday working is standard; Sundays are often optional at an enhanced rate.',
    },
  ];

  // ---- In-memory UI state (resets on reload, like other feature filters) ----
  var activeSector = 'All';
  var formOpen = false;
  var formSector = '';

  function posts() { return RW.S.jobPosts = RW.S.jobPosts || []; }

  function visiblePosts() {
    var arr = posts().slice().sort(function (a, b) { return b.t - a.t; });
    if (activeSector === 'All') return arr;
    return arr.filter(function (p) { return p.sector === activeSector; });
  }

  function visibleExamples() {
    if (activeSector === 'All') return EXAMPLES;
    return EXAMPLES.filter(function (j) { return j.sector === activeSector; });
  }

  function findJob(id) {
    var p = posts().filter(function (x) { return x.id === id; })[0];
    if (p) return { kind: 'post', job: p };
    var j = EXAMPLES.filter(function (x) { return x.id === id; })[0];
    return j ? { kind: 'example', job: j } : null;
  }

  // Relative age for the user's own adverts ("3 days ago")
  function ago(t) {
    var m = Math.max(1, Math.round((Date.now() - t) / 60000));
    if (m < 60) return m + 'm ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    var d = Math.round(h / 24);
    return d <= 1 ? 'yesterday' : d + ' days ago';
  }

  // Pay text with .num only when it actually contains figures
  function paySpan(pay) {
    if (!pay) return '';
    var cls = /\d/.test(pay) ? ' class="num"' : '';
    return '<span' + cls + ' style="font-size:12px;font-weight:700;color:var(--ink)">' + esc(pay) + '</span>';
  }

  function contactHref(contact) {
    var c = String(contact || '').trim();
    if (c.indexOf('@') > -1) return 'mailto:' + c;
    return 'tel:' + c.replace(/[^+\d]/g, '');
  }

  function teaser(s) {
    s = String(s == null ? '' : s);
    return s.length > 150 ? esc(s.slice(0, 150)) + '…' : esc(s);
  }

  // ---- Shared card scaffolding ----
  function jobCard(opts) {
    return '<div class="card" style="margin-bottom:12px;cursor:pointer" data-act="nav" data-route="' + esc('#/jobs/' + opts.id) + '">' +
      '<div class="row" style="padding:0;border:0;align-items:flex-start">' +
        '<div class="lead" style="font-size:26px;background:#e7e9ee;border-radius:10px;margin-top:2px">' + opts.emoji + '</div>' +
        '<div class="body">' +
          '<div class="name" style="font-size:15px;font-weight:800;line-height:1.25">' + esc(opts.title) + '</div>' +
          '<div class="sub" style="margin-top:2px;font-weight:600">' + esc(opts.employer) + '</div>' +
          '<div class="sub" style="font-size:11.5px;margin-top:1px">📍 ' + esc(opts.area) + '</div>' +
        '</div>' +
        '<div class="trail" style="text-align:right;padding-top:2px">' + opts.badge + '</div>' +
      '</div>' +
      '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
        paySpan(opts.pay) +
        '<span class="chip" style="font-size:11px">' + esc(opts.sector) + '</span>' +
        (opts.type ? '<span class="chip" style="font-size:11px">' + esc(opts.type) + '</span>' : '') +
      '</div>' +
      '<div class="subtle" style="margin-top:8px;line-height:1.45;font-size:12.5px">' + opts.teaser + '</div>' +
    '</div>';
  }

  function postCard(p) {
    return jobCard({
      id: p.id,
      emoji: SECTOR_EMOJI[p.sector] || '💼',
      title: p.title,
      employer: p.company,
      area: p.area,
      pay: p.pay,
      sector: p.sector,
      type: '',
      badge: '<span class="pill-status info" style="font-size:11px">Community post</span>',
      teaser: teaser(p.desc),
    });
  }

  function exampleCard(j) {
    return jobCard({
      id: j.id,
      emoji: j.emoji,
      title: j.title,
      employer: j.employer,
      area: j.area,
      pay: j.pay,
      sector: j.sector,
      type: j.type,
      badge: '<span class="pill-status neutral" style="font-size:11px">Example</span>',
      teaser: esc(j.shortDesc),
    });
  }

  // ---- Post-a-vacancy card (collapsed CTA ⇄ small form) ----
  function postVacancyCard() {
    if (!formOpen) {
      return '<div class="card" style="margin-bottom:14px">' +
        '<div style="font-size:15px;font-weight:800">Post a vacancy — free during launch</div>' +
        '<div class="subtle" style="margin-top:4px;line-height:1.5">Hiring on the Rock? Put your advert in front of Rockway users in under a minute. Adverts save to this device while Rockway is in launch preview.</div>' +
        '<button class="btn" style="margin-top:12px" data-act="jobsToggleForm">Post a vacancy</button>' +
      '</div>';
    }

    var areaOptions = AREAS.map(function (a) {
      return '<option value="' + esc(a) + '">' + esc(a) + '</option>';
    }).join('');

    var sectorChips = RW.ui.chips(SECTOR_ITEMS, formSector, 'jobsFormSector', false);

    return '<div class="card" style="margin-bottom:14px">' +
      '<div style="font-size:15px;font-weight:800">Post a vacancy — free during launch</div>' +
      '<label class="fld">Role title</label>' +
      '<input class="input" id="jobs-f-title" placeholder="e.g. Customer Support Agent" autocomplete="off">' +
      '<label class="fld">Company / employer</label>' +
      '<input class="input" id="jobs-f-company" placeholder="Your business name" autocomplete="off">' +
      '<label class="fld">Area</label>' +
      '<select class="input" id="jobs-f-area">' + areaOptions + '</select>' +
      '<label class="fld">Sector</label>' +
      sectorChips +
      '<label class="fld">Pay (optional)</label>' +
      '<input class="input" id="jobs-f-pay" placeholder="e.g. £26,000 – £30,000 or £11.50/hr" autocomplete="off">' +
      '<label class="fld">Contact email or phone</label>' +
      '<input class="input" id="jobs-f-contact" placeholder="jobs@yourfirm.gi or +350 200 12345" autocomplete="off">' +
      '<label class="fld">Description (one paragraph)</label>' +
      '<textarea class="input" id="jobs-f-desc" rows="4" placeholder="What the role involves, hours, experience needed…" style="resize:vertical;min-height:84px"></textarea>' +
      '<button class="btn" style="margin-top:14px" data-act="jobsPost">Post vacancy</button>' +
      '<button class="btn ghost" style="margin-top:8px" data-act="jobsToggleForm">Cancel</button>' +
    '</div>';
  }

  // ---- "Where Gibraltar really hires" — honest link-outs, not fake listings ----
  function channelsCard() {
    return RW.ui.sectionTitle('Where Gibraltar really hires') +
      '<div class="card" style="margin-bottom:14px">' +
        '<div class="subtle" style="line-height:1.5">Most live vacancies on the Rock are advertised on these channels — Rockway links out rather than reposting them.</div>' +
        '<div class="chips" style="margin-top:10px;margin-bottom:0">' +
          '<a class="chip" href="https://www.gibraltar.gov.gi/vacancies" target="_blank" rel="noopener" style="text-decoration:none">🏛️ gov.gi vacancies ↗</a>' +
          '<a class="chip" href="https://www.recruitgibraltar.com" target="_blank" rel="noopener" style="text-decoration:none">🧭 RecruitGibraltar ↗</a>' +
        '</div>' +
        '<div class="subtle" style="margin-top:8px;font-size:11.5px">Civil service &amp; GHA posts go through gov.gi; agency roles in gaming, finance, insurance &amp; IT through RecruitGibraltar.</div>' +
      '</div>';
  }

  // ---- List screen ----
  function list() {
    var myPosts = visiblePosts();
    var examples = visibleExamples();
    var total = myPosts.length + examples.length;

    var filterChips = RW.ui.chips(FILTER_ITEMS, activeSector, 'jobsFilter', true);

    var countLabel = activeSector === 'All'
      ? 'On the board (' + total + ')'
      : activeSector + ' (' + total + ')';

    var feed = myPosts.map(postCard).join('') + examples.map(exampleCard).join('');
    if (!total) {
      feed = RW.ui.empty('💼', 'Nothing posted in ' + esc(activeSector) + ' yet — be the first, or try the gov.gi and RecruitGibraltar links above.');
    }

    var body =
      '<div class="subtle" style="margin-bottom:10px;line-height:1.5">Gibraltar’s community job board. Grey “Example” cards are illustrations, not real adverts — real employers post free during launch.</div>' +
      postVacancyCard() +
      channelsCard() +
      filterChips +
      RW.ui.sectionTitle(countLabel) +
      feed;

    return RW.ui.screen({ title: 'Jobs', body: body });
  }

  // ---- Detail screens ----
  function detail(jobId) {
    var found = findJob(jobId);
    if (!found) return list();
    return found.kind === 'post' ? postDetail(found.job) : exampleDetail(found.job);
  }

  function exampleDetail(j) {
    var heroEl = RW.ui.hero({
      emoji: j.emoji,
      title: j.title,
      sub: j.employer + ' · ' + j.area,
      accent: '#3a4150',
      chips: [j.sector, j.type, 'Example'],
    });

    var statsGrid =
      '<div class="grid2" style="margin-bottom:14px">' +
        '<div class="stat"><div class="n num" style="font-size:15px">' + esc(j.pay) + '</div><div class="l">Typical pay</div></div>' +
        '<div class="stat"><div class="n" style="font-size:15px">' + esc(j.type) + '</div><div class="l">Contract</div></div>' +
      '</div>';

    var kvRows =
      '<div class="kv"><span>Employer</span><span>' + esc(j.employer) + '</span></div>' +
      '<div class="kv"><span>Location</span><span>📍 ' + esc(j.area) + '</span></div>' +
      '<div class="kv"><span>Sector</span><span>' + esc(j.sector) + '</span></div>' +
      '<div class="kv"><span>Status</span><span><span class="pill-status neutral" style="font-size:11px">Example</span></span></div>';

    var exampleNote =
      '<div class="card" style="margin-bottom:14px">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<span class="pill-status neutral" style="font-size:11px">Example</span>' +
          '<span style="font-weight:700;font-size:13.5px">This is an example listing</span>' +
        '</div>' +
        '<div class="subtle" style="margin-top:6px;line-height:1.5">It shows what a vacancy looks like on Rockway. No real employer is behind it, so it can’t be applied to.</div>' +
      '</div>';

    var body =
      statsGrid +
      '<div class="card" style="margin-bottom:14px">' + kvRows + '</div>' +
      RW.ui.sectionTitle('About roles like this') +
      '<div class="card" style="margin-bottom:14px">' +
        '<div style="line-height:1.65;font-size:13.5px">' + esc(j.fullDesc) + '</div>' +
      '</div>' +
      exampleNote +
      '<button class="btn ghost" style="width:100%" disabled>Apply</button>' +
      '<div class="subtle" style="text-align:center;margin-top:8px">Example listing — real employers can post free during launch</div>' +
      '<button class="btn" style="width:100%;margin-top:12px" data-act="jobsGoPost">Post a vacancy — free during launch</button>';

    return RW.ui.screen({ title: j.title, hero: heroEl, body: body, plain: true });
  }

  function postDetail(p) {
    var heroEl = RW.ui.hero({
      emoji: SECTOR_EMOJI[p.sector] || '💼',
      title: p.title,
      sub: p.company + ' · ' + p.area,
      accent: '#3a4150',
      chips: [p.sector, 'Community post'],
    });

    var statsGrid =
      '<div class="grid2" style="margin-bottom:14px">' +
        '<div class="stat"><div class="n' + (p.pay && /\d/.test(p.pay) ? ' num' : '') + '" style="font-size:15px">' + (p.pay ? esc(p.pay) : 'On application') + '</div><div class="l">Pay</div></div>' +
        '<div class="stat"><div class="n num" style="font-size:15px">' + esc(ago(p.t)) + '</div><div class="l">Posted</div></div>' +
      '</div>';

    var kvRows =
      '<div class="kv"><span>Company</span><span>' + esc(p.company) + '</span></div>' +
      '<div class="kv"><span>Location</span><span>📍 ' + esc(p.area) + '</span></div>' +
      '<div class="kv"><span>Sector</span><span>' + esc(p.sector) + '</span></div>' +
      (p.pay ? '<div class="kv"><span>Pay</span><span class="num">' + esc(p.pay) + '</span></div>' : '') +
      '<div class="kv"><span>Contact</span><span>' + esc(p.contact) + '</span></div>' +
      '<div class="kv"><span>Posted</span><span class="num">' + esc(fmtTime(p.t)) + '</span></div>';

    var body =
      statsGrid +
      '<div class="card" style="margin-bottom:14px">' + kvRows + '</div>' +
      RW.ui.sectionTitle('About this role') +
      '<div class="card" style="margin-bottom:14px">' +
        '<div style="line-height:1.65;font-size:13.5px">' + esc(p.desc) + '</div>' +
      '</div>' +
      '<a class="btn" style="width:100%;text-decoration:none" href="' + esc(contactHref(p.contact)) + '">Contact — ' + esc(p.contact) + '</a>' +
      '<div class="subtle" style="text-align:center;margin-top:8px">Community post · contact the poster directly</div>' +
      '<button class="btn ghost" style="width:100%;margin-top:12px" data-act="jobsDelete" data-id="' + esc(p.id) + '">Remove your advert</button>';

    return RW.ui.screen({ title: p.title, hero: heroEl, body: body, plain: true });
  }

  // ---- render dispatcher ----
  function render(parts) {
    var jobId = parts && parts[0];
    return jobId ? detail(jobId) : list();
  }

  // ---- Activity feed: the user's own adverts ----
  RW.registerActivity(function () {
    return (RW.S.jobPosts || []).map(function (p) {
      return {
        t: p.t,
        html: '<div class="card row" data-act="nav" data-route="' + esc('#/jobs/' + p.id) + '" style="cursor:pointer">' +
          '<div class="lead">💼</div>' +
          '<div class="body">' +
            '<div class="name">' + esc(p.title) + '</div>' +
            '<div class="sub">Your advert · ' + esc(ago(p.t)) + '</div>' +
          '</div>' +
          '<div class="trail"><span class="pill-status ok">Posted</span></div>' +
        '</div>',
      };
    });
  });

  // ---- Register ----
  RW.register({
    id: 'jobs',
    title: 'Jobs',
    emoji: '💼',
    tileBg: '#e7e9ee',
    section: 'services',
    order: 30,
    render: render,
    actions: {
      // Sector filter chips on the board
      jobsFilter: function (el) {
        activeSector = el.dataset.v || 'All';
        RW.render();
      },

      // Open/close the post-a-vacancy form
      jobsToggleForm: function () {
        formOpen = !formOpen;
        RW.render();
      },

      // Jump to the board with the form open (from example detail screens)
      jobsGoPost: function () {
        formOpen = true;
        if ((location.hash || '') === '#/jobs') RW.render();
        else RW.go('#/jobs');
      },

      // Sector chips inside the form: toggle in place WITHOUT re-rendering,
      // so typed input isn't lost.
      jobsFormSector: function (el) {
        formSector = el.dataset.v || '';
        var wrap = el.parentElement;
        if (wrap) {
          var chips = wrap.querySelectorAll('.chip');
          for (var i = 0; i < chips.length; i++) chips[i].classList.remove('on');
        }
        el.classList.add('on');
      },

      // Post a vacancy → RW.S.jobPosts
      jobsPost: function () {
        RW.S.jobPosts = RW.S.jobPosts || [];

        var titleEl = document.getElementById('jobs-f-title');
        var companyEl = document.getElementById('jobs-f-company');
        var areaEl = document.getElementById('jobs-f-area');
        var payEl = document.getElementById('jobs-f-pay');
        var contactEl = document.getElementById('jobs-f-contact');
        var descEl = document.getElementById('jobs-f-desc');
        if (!titleEl || !companyEl || !areaEl || !contactEl || !descEl) return;

        var title = titleEl.value.trim();
        var company = companyEl.value.trim();
        var area = areaEl.value.trim() || 'Anywhere on the Rock';
        var pay = (payEl && payEl.value.trim()) || '';
        var contact = contactEl.value.trim();
        var desc = descEl.value.trim();

        if (!title) { RW.toast('Add the role title.'); return; }
        if (!company) { RW.toast('Add your company or employer name.'); return; }
        if (!formSector) { RW.toast('Pick a sector for the role.'); return; }
        if (!contact) { RW.toast('Add a contact email or phone so applicants can reach you.'); return; }
        if (contact.indexOf('@') === -1 && !/\d/.test(contact)) { RW.toast('That contact doesn’t look like an email or phone number.'); return; }
        if (!desc) { RW.toast('Add a one-paragraph description of the role.'); return; }

        RW.S.jobPosts.push({
          id: 'up-' + uid(),
          t: Date.now(),
          title: title,
          company: company,
          area: area,
          sector: formSector,
          pay: pay,
          contact: contact,
          desc: desc,
        });
        RW.store.save();
        formOpen = false;
        formSector = '';
        RW.toast('Your advert is on the board — saved on this device during launch preview.');
        RW.render();
      },

      // The poster can remove their own advert
      jobsDelete: function (el) {
        var id = el.dataset.id;
        if (!id) return;
        RW.S.jobPosts = (RW.S.jobPosts || []).filter(function (p) { return p.id !== id; });
        RW.store.save();
        RW.toast('Advert removed from the board.');
        RW.go('#/jobs');
        RW.render();
      },
    },
  });

  // ---- global search: vacancies ----
  RW.registerSearch(function (q) {
    var out = [];
    (RW.S.jobPosts || []).forEach(function (j) {
      if (String(j.title).toLowerCase().indexOf(q) !== -1 || String(j.company || '').toLowerCase().indexOf(q) !== -1 || String(j.sector || '').toLowerCase().indexOf(q) !== -1) {
        out.push({ group: 'Jobs', label: j.title, sub: (j.company || 'Community post') + ' \u00b7 ' + (j.area || ''), route: '#/jobs', lead: '\ud83d\udcbc' });
      }
    });
    EXAMPLES.forEach(function (j) {
      if (String(j.title).toLowerCase().indexOf(q) !== -1 || String(j.employer || '').toLowerCase().indexOf(q) !== -1 || String(j.sector || '').toLowerCase().indexOf(q) !== -1) {
        out.push({ group: 'Jobs', label: j.title, sub: j.employer + ' \u00b7 Example', route: '#/jobs/' + j.id, lead: '\ud83d\udcbc' });
      }
    });
    return out;
  });

})(window.RW);
