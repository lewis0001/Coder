/* Rockway feature — Jobs (Gibraltar job board with sector filters & applications). */
(function (RW) {
  'use strict';
  const { esc, uid, fmtTime } = RW.util;

  // Guard persisted state (already seeded in store.js defaults)
  RW.S.jobApps = RW.S.jobApps || [];

  // Sector accent colours for the detail hero
  var SECTOR_ACCENT = {
    iGaming:      '#6c3fc5',
    Finance:      '#1a5fa8',
    Insurance:    '#0e7a6c',
    Shipping:     '#155a8a',
    Legal:        '#8a4a00',
    Healthcare:   '#c0392b',
    'Civil Service': '#2e4a7a',
    Hospitality:  '#b06000',
    Retail:       '#1a7a3c',
  };

  // ---- Seed data: authentic Gibraltar listings across real sectors ----
  var JOBS = [
    {
      id: 'j1',
      sector: 'iGaming',
      title: 'Compliance & Licensing Officer',
      employer: 'RockBet Interactive Ltd',
      area: 'Ocean Village',
      salaryLow: 38000,
      salaryHigh: 48000,
      salary: '£38,000 – £48,000',
      type: 'Full-time',
      source: 'RecruitGibraltar',
      emoji: '🎮',
      shortDesc: 'Ensure licensing obligations are met under the Gibraltar Gambling Commissioner framework for a fast-growing online casino operator.',
      fullDesc: 'RockBet Interactive Ltd is one of Gibraltar’s licensed online gaming operators, holding a full B2C Remote Gambling Licence from the Gibraltar Gambling Commissioner. We are seeking a Compliance & Licensing Officer to manage regulatory filings, respond to GFSC and GGC correspondence, and maintain internal policy documentation. You will work closely with the Legal and Risk teams to keep us ahead of evolving UK and Gibraltar regulatory requirements. A background in gaming compliance or financial-services regulation is essential. Experience with AML/KYC frameworks is highly desirable. Remote-friendly hybrid arrangement available with 3 days in the Ocean Village office.',
    },
    {
      id: 'j2',
      sector: 'Finance',
      title: 'Private Client Manager — Banking',
      employer: 'Jyske Bank (Gibraltar) Ltd',
      area: 'Regal House, Queensway',
      salaryLow: 42000,
      salaryHigh: 58000,
      salary: '£42,000 – £58,000',
      type: 'Full-time',
      source: 'RecruitGibraltar',
      emoji: '🏦',
      shortDesc: 'Manage a portfolio of high-net-worth private banking clients, providing tailored investment and banking solutions from our Gibraltar office.',
      fullDesc: 'Jyske Bank (Gibraltar) Ltd is a licensed deposit-taking institution regulated by the GFSC. Our Private Banking division serves international HNW and UHNW clients with a strong connection to the Iberian Peninsula and beyond. We are looking for an experienced Private Client Manager who is fluent in English (Spanish an advantage) and holds a relevant qualification (CISI or equivalent). Responsibilities include portfolio review meetings, onboarding new clients under our KYC/AML procedures, and co-ordinating with our Copenhagen head office on product structuring. This is a relationship-driven role requiring discretion and commercial acumen. Salary includes discretionary bonus and private medical cover.',
    },
    {
      id: 'j3',
      sector: 'Insurance',
      title: 'Underwriting Analyst — Marine & Specialty',
      employer: 'Gibb & Co Insurance Managers',
      area: 'Main Street',
      salaryLow: 32000,
      salaryHigh: 40000,
      salary: '£32,000 – £40,000',
      type: 'Full-time',
      source: 'RecruitGibraltar',
      emoji: '📋',
      shortDesc: "Support senior underwriters on marine, cargo and specialty lines for an established Gibraltar-based insurance management firm.",
      fullDesc: "Gibb & Co Insurance Managers is a Gibraltar-based captive management and MGA business with Lloyd’s market connections. The Underwriting Analyst will assist in pricing Marine Hull, Cargo and Specialty lines, maintain underwriting data in our MGA platform, prepare bordereaux and liaise with reinsurers and Lloyd’s syndicates. The ideal candidate holds or is studying towards an ACII qualification and has at least two years in a London or Gibraltar market role. The Main Street office offers a collaborative team with regular travel to London for market visits. Benefits include study support, 25 days leave and a competitive pension.",
    },
    {
      id: 'j4',
      sector: 'Shipping',
      title: 'Port Operations Co-ordinator',
      employer: 'SteelRock Bunkers & Shipping Agency',
      area: 'North Mole, Gibraltar Harbour',
      salaryLow: 28000,
      salaryHigh: 36000,
      salary: '£28,000 – £36,000',
      type: 'Full-time',
      source: 'GiBoard / Direct',
      emoji: '⚓',
      shortDesc: "Co-ordinate vessel calls, bunkering operations and port agency services for one of Gibraltar’s active ship chandlers and bunkering agents.",
      fullDesc: "SteelRock Bunkers & Shipping Agency provides port agency, ship chandlery and marine fuel (bunkering) services to vessels transiting the Strait of Gibraltar — one of the world’s busiest shipping lanes. The Port Operations Co-ordinator manages vessel pre-arrival documentation, co-ordinates with the Gibraltar Port Authority and British Forces, arranges crew changes and medical evacuations, and oversees bunker delivery scheduling with our fuel suppliers. The role involves on-call weekend cover on a rota basis. Experience in shipping, port operations or logistics is preferred. Knowledge of Veson IMOS or similar maritime software a plus.",
    },
    {
      id: 'j5',
      sector: 'Legal',
      title: 'Solicitor — Corporate & Commercial',
      employer: 'Isolas LLP',
      area: 'Portland House, Glacis Road',
      salaryLow: 45000,
      salaryHigh: 62000,
      salary: '£45,000 – £62,000',
      type: 'Full-time',
      source: 'Direct',
      emoji: '⚖️',
      shortDesc: "Join Gibraltar’s leading independent law firm advising on corporate transactions, fund structuring and gaming regulatory matters.",
      fullDesc: "Isolas LLP is one of Gibraltar’s largest and most respected law firms, with offices in Portland House and a strong international client base across gaming, financial services and property. We are seeking a qualified Solicitor (England & Wales or Gibraltar admitted) with 2–5 years PQE in corporate and commercial law. You will advise on M&A transactions, fund formations, shareholder agreements and gaming licensing applications. The role includes drafting commercial contracts, conducting due diligence and attending client meetings. Fluency in English is essential; Spanish is advantageous for cross-border matters. The firm offers a competitive salary, bonus scheme and a genuine partnership track.",
    },
    {
      id: 'j6',
      sector: 'Healthcare',
      title: 'Staff Nurse — Accident & Emergency',
      employer: 'Gibraltar Health Authority (GHA)',
      area: "St Bernard’s Hospital, Europort",
      salaryLow: 31000,
      salaryHigh: 41000,
      salary: '£31,000 – £41,000',
      type: 'Full-time',
      source: 'GHA / gov.gi/vacancies',
      emoji: '🏥',
      shortDesc: "Provide high-quality nursing care in the A&E department of Gibraltar’s main acute hospital under the Gibraltar Health Authority.",
      fullDesc: "The Gibraltar Health Authority (GHA) is seeking a registered Staff Nurse for the Accident & Emergency Department at St Bernard’s Hospital, Gibraltar’s primary acute care facility. You will triage patients, deliver evidence-based nursing interventions and work within a multidisciplinary team of doctors, paramedics and allied health professionals. You must hold a valid NMC (or equivalent EU/overseas) nursing registration and have at least 12 months post-registration experience in an acute or emergency setting. GHA offers relocation support for candidates from the UK or EU, GHA pension scheme, and access to continuing professional development. Applications are processed via the Government of Gibraltar recruitment portal at gov.gi/vacancies.",
    },
    {
      id: 'j7',
      sector: 'Civil Service',
      title: 'Policy & Research Officer',
      employer: 'HM Government of Gibraltar',
      area: '6 Convent Place, Gibraltar',
      salaryLow: 27000,
      salaryHigh: 35000,
      salary: '£27,000 – £35,000',
      type: 'Full-time',
      source: 'gov.gi/vacancies',
      emoji: '🏙️',
      shortDesc: "Support Ministers and senior officials with policy analysis, briefing papers and research across Government of Gibraltar departments.",
      fullDesc: "HM Government of Gibraltar is recruiting a Policy & Research Officer within the Chief Minister’s Office to support cross-departmental policy development. The post-holder will draft briefing notes and Cabinet papers, conduct desktop and stakeholder research on issues including housing, economic development and EU-UK-Gibraltar relations, and co-ordinate responses to public consultations. A degree in law, economics, political science or a related field is required. Experience in a public-sector, think-tank or parliamentary environment is desirable. The role is based in the historic Convent Place complex adjacent to the Governor’s residence. Salary is benchmarked on the Gibraltar Civil Service pay scale with pensionable service from day one.",
    },
    {
      id: 'j8',
      sector: 'Hospitality',
      title: 'Restaurant Supervisor — Marina',
      employer: 'The Landings at Queensway Quay',
      area: 'Queensway Quay Marina',
      salaryLow: 22000,
      salaryHigh: 28000,
      salary: '£22,000 – £28,000',
      type: 'Full-time',
      source: 'Direct',
      emoji: '🍽️',
      shortDesc: "Supervise front-of-house operations at one of Gibraltar’s most popular waterfront restaurants on Queensway Quay Marina.",
      fullDesc: "The Landings is a well-known al fresco Mediterranean restaurant on the terrace of Queensway Quay Marina, popular with locals and visiting yacht crews alike. We are recruiting a Restaurant Supervisor to manage a team of 6–8 servers, ensure consistently high service standards, handle reservations via OpenTable and liaise with the head chef on menu changes and allergen compliance. The ideal candidate has at least two years’ supervisory experience in a busy restaurant environment and holds a Level 2 Food Hygiene certificate. Tronc tips included; meals on shift; staff discount at the marina. We are particularly keen to hear from candidates with conversational Spanish for our many Spanish-resident guests.",
    },
    {
      id: 'j9',
      sector: 'Retail',
      title: 'Retail Sales Advisor — Electronics',
      employer: "Murchison’s Electrical & Tech",
      area: 'Main Street',
      salaryLow: 20000,
      salaryHigh: 25000,
      salary: '£20,000 – £25,000',
      type: 'Full-time',
      source: 'GiBoard / Direct',
      emoji: '🛍️',
      shortDesc: "Advise customers on consumer electronics, appliances and tech accessories in Gibraltar’s iconic Main Street duty-free retail environment.",
      fullDesc: "Murchison’s Electrical & Tech is a long-established Main Street retailer taking advantage of Gibraltar’s duty-free and low-VAT status to offer competitive pricing on consumer electronics, home appliances and audio equipment. We are looking for a motivated Retail Sales Advisor who enjoys technology and is comfortable advising customers — many of whom are visiting from Spain or aboard cruise ships — on products ranging from smartphones and laptops to kitchen appliances. Bilingual English/Spanish preferred (the majority of our walk-in trade speaks Spanish). Training on point-of-sale systems and stock management provided. Saturday working is required; Sunday optional with enhanced pay rate.",
    },
  ];

  var SECTORS = ['All', 'iGaming', 'Finance', 'Insurance', 'Shipping', 'Legal', 'Healthcare', 'Civil Service', 'Hospitality', 'Retail'];

  // Sector items for RW.ui.chips
  var SECTOR_ITEMS = SECTORS.map(function (s) { return { label: s, value: s }; });

  // In-memory filter state (not persisted — resets on navigation)
  var activeSector = 'All';

  function filteredJobs() {
    if (activeSector === 'All') return JOBS;
    return JOBS.filter(function (j) { return j.sector === activeSector; });
  }

  function hasApplied(jobId) {
    return (RW.S.jobApps || []).some(function (a) { return a.jobId === jobId; });
  }

  // Pill for contract type
  function typePill(type) {
    var cls = type === 'Part-time' ? 'warn' : type === 'Contract' ? 'info' : 'neutral';
    return '<span class="pill-status ' + cls + '" style="font-size:11px">' + esc(type) + '</span>';
  }

  // Salary display with .num span, no undefined/NaN risk
  function salarySpan(j) {
    if (!j.salary) return '';
    return '<span class="num" style="font-size:12px;font-weight:700;color:var(--ink)">' + esc(j.salary) + '</span>';
  }

  // ---- List screen ----
  function list() {
    var visible = filteredJobs();

    // RW.ui.chips handles tap/on/brand classes automatically
    var filterChips = RW.ui.chips(SECTOR_ITEMS, activeSector, 'jobsFilter', true);

    var countLabel = activeSector === 'All'
      ? 'All Vacancies (' + visible.length + ')'
      : esc(activeSector) + ' (' + visible.length + ')';

    var jobCards = visible.length
      ? visible.map(function (j) {
          var applied = hasApplied(j.id);
          return '<div class="card" style="margin-bottom:12px;cursor:pointer" data-act="nav" data-route="' + esc('#/jobs/' + j.id) + '">' +
            '<div class="row" style="padding:0;border:0;align-items:flex-start">' +
              '<div class="lead" style="font-size:26px;background:#e7e9ee;border-radius:10px;margin-top:2px">' + j.emoji + '</div>' +
              '<div class="body">' +
                '<div class="name" style="font-size:15px;font-weight:800;line-height:1.25">' + esc(j.title) + '</div>' +
                '<div class="sub" style="margin-top:2px;font-weight:600">' + esc(j.employer) + '</div>' +
                '<div class="sub" style="font-size:11.5px;margin-top:1px">📍 ' + esc(j.area) + '</div>' +
              '</div>' +
              '<div class="trail" style="text-align:right;padding-top:2px">' +
                (applied ? '<span class="pill-status ok" style="font-size:11px">Applied ✓</span>' : '') +
              '</div>' +
            '</div>' +
            '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
              salarySpan(j) +
              typePill(j.type) +
              '<span class="chip" style="font-size:11px">' + esc(j.sector) + '</span>' +
            '</div>' +
            '<div class="subtle" style="margin-top:8px;line-height:1.45;font-size:12.5px">' + esc(j.shortDesc) + '</div>' +
          '</div>';
        }).join('')
      : RW.ui.empty('🔍', 'No vacancies in this sector right now. Try a different filter.');

    // Applications section
    var appsArr = RW.S.jobApps || [];
    var appsSection = '';
    if (appsArr.length) {
      var appRows = appsArr.slice().reverse().map(function (a) {
        var statusCls = a.status === 'Applied' ? 'ok' : a.status === 'Interview' ? 'info' : 'warn';
        return RW.ui.row({
          lead: '💼',
          leadBg: '#e7e9ee',
          name: a.title,
          sub: esc(a.employer) + ' · ' + fmtTime(a.t),
          trail: '<span class="pill-status ' + statusCls + '" style="font-size:11px">' + esc(a.status) + '</span>',
        });
      }).join('');
      appsSection =
        RW.ui.sectionTitle('Your Applications (' + appsArr.length + ')') +
        '<div class="card">' + appRows + '</div>';
    } else {
      appsSection =
        RW.ui.sectionTitle('Your Applications') +
        RW.ui.empty('📎', 'No applications yet. Tap a job to apply.');
    }

    var body =
      '<div class="subtle" style="margin-bottom:10px">' +
        'Live vacancies across Gibraltar — iGaming, Finance, Public Sector & more' +
      '</div>' +
      filterChips +
      RW.ui.sectionTitle(countLabel) +
      jobCards +
      appsSection;

    return RW.ui.screen({ title: 'Jobs', body: body });
  }

  // ---- Detail screen ----
  function detail(jobId) {
    var j = JOBS.filter(function (x) { return x.id === jobId; })[0];
    if (!j) return list();

    var applied = hasApplied(j.id);
    var accent = SECTOR_ACCENT[j.sector] || '#2c3e50';

    // Build the hero using RW.ui.hero
    var heroEl = RW.ui.hero({
      emoji: j.emoji,
      title: j.title,
      sub: j.employer + ' · ' + j.area,
      accent: accent,
      chips: [j.sector, j.type],
    });

    // Quick-stats grid
    var statsGrid =
      '<div class="grid2" style="margin-bottom:14px">' +
        '<div class="stat">' +
          '<div class="n num" style="font-size:17px">' + esc(j.salary) + '</div>' +
          '<div class="l">Salary</div>' +
        '</div>' +
        '<div class="stat">' +
          '<div class="n" style="font-size:17px">' + esc(j.type) + '</div>' +
          '<div class="l">Contract</div>' +
        '</div>' +
      '</div>';

    var kvRows =
      '<div class="kv"><span>Employer</span><span>' + esc(j.employer) + '</span></div>' +
      '<div class="kv"><span>Location</span><span>📍 ' + esc(j.area) + '</span></div>' +
      '<div class="kv"><span>Salary</span><span class="num">' + esc(j.salary) + '</span></div>' +
      '<div class="kv"><span>Sector</span><span>' + esc(j.sector) + '</span></div>' +
      '<div class="kv"><span>Source</span><span>' + esc(j.source) + '</span></div>';

    var appliedBanner = applied
      ? '<div class="card" style="margin-bottom:14px;background:#f0faf3;border:1.5px solid #b2dfcc">' +
          '<div style="font-size:15px;font-weight:700;color:var(--green)">Application Submitted ✓</div>' +
          '<div class="subtle" style="margin-top:4px">We’ve recorded your interest. Check Your Applications on the Jobs board.</div>' +
        '</div>'
      : '';

    var applyBtn = applied
      ? '<button class="btn ghost" style="width:100%;opacity:0.6;cursor:not-allowed" disabled>Applied ✓</button>'
      : '<button class="btn" style="width:100%" data-act="jobsApply" data-job-id="' + esc(j.id) + '">' +
          'Apply →' +
        '</button>';

    var body =
      statsGrid +
      '<div class="card" style="margin-bottom:14px">' + kvRows + '</div>' +
      RW.ui.sectionTitle('About This Role') +
      '<div class="card" style="margin-bottom:14px">' +
        '<div style="line-height:1.65;font-size:13.5px">' + esc(j.fullDesc) + '</div>' +
      '</div>' +
      appliedBanner +
      applyBtn;

    return RW.ui.screen({ title: esc(j.title), hero: heroEl, body: body, plain: true });
  }

  // ---- render dispatcher ----
  function render(parts) {
    var jobId = parts && parts[0];
    return jobId ? detail(jobId) : list();
  }

  // ---- Activity feed ----
  RW.registerActivity(function () {
    return (RW.S.jobApps || []).map(function (a) {
      var statusCls = a.status === 'Applied' ? 'ok' : a.status === 'Interview' ? 'info' : 'warn';
      return {
        t: a.t,
        html: '<div class="card row">' +
          '<div class="lead">💼</div>' +
          '<div class="body">' +
            '<div class="name">' + esc(a.title) + '</div>' +
            '<div class="sub">' + esc(a.employer) + ' · ' + fmtTime(a.t) + '</div>' +
          '</div>' +
          '<div class="trail"><span class="pill-status ' + statusCls + '">' + esc(a.status) + '</span></div>' +
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
      // Filter chips: update in-memory filter and re-render
      jobsFilter: function (el) {
        var sector = el.dataset.v || 'All';
        activeSector = sector;
        RW.render();
      },

      // Apply to a job: record application, save, toast, re-render
      jobsApply: function (el) {
        var jobId = el.dataset.jobId;
        var j = JOBS.filter(function (x) { return x.id === jobId; })[0];
        if (!j) return;

        RW.S.jobApps = RW.S.jobApps || [];

        // Prevent duplicate applications
        if (hasApplied(jobId)) {
          RW.toast('You have already applied for ' + j.title + '.');
          return;
        }

        RW.S.jobApps.push({
          id: uid(),
          t: Date.now(),
          jobId: j.id,
          title: j.title,
          employer: j.employer,
          status: 'Applied',
        });
        RW.store.save();
        RW.toast('Application submitted – ' + j.employer + ' will be in touch.');
        RW.render();
      },
    },
  });
})(window.RW);
