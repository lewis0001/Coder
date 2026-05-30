/* Rockway feature — Chat (direct messages + support threads). */
(function (RW) {
  'use strict';
  const { esc, uid, fmtTime, pick } = RW.util;

  // Guard the chats map in case it isn’t in the stored blob yet.
  function getChats() {
    RW.S.chats = RW.S.chats || {};
    return RW.S.chats;
  }

  // ---- pinned system threads (always present, never from contacts) ----
  const PINNED = [
    { id: 'support', name: 'Rockway Support', emoji: '\u{1F6DF}', pinned: true },
    { id: 'courier', name: 'Courier',          emoji: '\u{1F6F5}', pinned: true },
  ];

  // ---- tasteful Llanito-flavoured canned replies (garnish, not gimmick) ----
  const CANNED_REPLIES = [
    "¿Qué tal, mate? Just saw your message!",
    "Te llamo p’atrá in a bit — a bit busy on the Rock right now.",
    "Yeah sure, sorted! Luego te veo.",
    "No problem at all — give me five minutes.",
    "On my way up Main Street, won’t be long!",
    "All good here — lovely day for it, the Levanter has cleared.",
    "Sorted, mate. ¿Quedamos en Grand Casemates después?",
    "Roger that! Just crossing the Focona, be there soon.",
    "Ha! No me des la lata — just kidding, I’ll sort it now.",
    "Leave it with me. I’ll get back to you, te lo prometo.",
  ];

  const SUPPORT_REPLIES = [
    "Thanks for getting in touch with Rockway Support! How can we help?",
    "Got your message — a Rockway agent will be with you shortly. ¿Qué tal?",
    "We’re on it! Typical response time is under 10 minutes.",
    "Thanks for your patience. One of our Gibraltar team is picking this up now.",
    "Rockway Support here — happy to help. Could you share a bit more detail?",
  ];

  const COURIER_REPLIES = [
    "Hi! Courier here — your parcel is on the way.",
    "Just crossing from the frontier now, be with you shortly.",
    "Delivery today between 2 pm and 5 pm. Someone in?",
    "Parcel left at the door as requested. Have a good one!",
    "One more stop before yours — about 20 minutes away.",
  ];

  // Ensure a chat thread exists for the given contact/pinned entry.
  function ensureChat(entry) {
    const chats = getChats();
    if (!chats[entry.id]) {
      chats[entry.id] = {
        id:       entry.id,
        name:     entry.name,
        emoji:    entry.emoji,
        messages: [],
      };
    }
    return chats[entry.id];
  }

  // Build the full ordered list: pinned first, then one thread per contact.
  function allThreads() {
    const threads = [];
    PINNED.forEach(function (p) { threads.push(ensureChat(p)); });
    const contacts = RW.S.contacts || [];
    contacts.forEach(function (c) { threads.push(ensureChat(c)); });
    return threads;
  }

  // Smart timestamp: HH:MM today, "Mon" within last 7 days, "12 Jan" older.
  function previewTime(t) {
    if (!t) return '';
    const d   = new Date(t);
    const now = new Date();
    const diffMs  = now - d;
    const diffDay = Math.floor(diffMs / 86400000);
    const sameDay =
      d.getDate()     === now.getDate()  &&
      d.getMonth()    === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDay < 7) {
      return d.toLocaleDateString('en-GB', { weekday: 'short' });
    }
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  // Stable avatar background per thread id (cycles through calm palette).
  const AVATAR_PALETTE = [
    '#e3f7ec', '#e6effc', '#fff4d6', '#fde7ea',
    '#f0f0f0', '#e8f5e9', '#fce4ec', '#e3f2fd',
  ];
  function avatarBg(id) {
    var hash = 0;
    for (var i = 0; i < id.length; i++) { hash = (hash * 31 + id.charCodeAt(i)) & 0xffff; }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  }

  // ---- list view ----
  function renderList() {
    const threads = allThreads();

    const rows = threads.map(function (th) {
      const msgs     = Array.isArray(th.messages) ? th.messages : [];
      const last     = msgs.length ? msgs[msgs.length - 1] : null;
      const isPinned = PINNED.some(function (p) { return p.id === th.id; });

      // Preview text: "You: …" prefix for own messages
      var previewRaw = last
        ? (last.from === 'me' ? 'You: ' : '') + (last.text || '')
        : 'Tap to start chatting';
      var truncated = previewRaw.length > 44 ? previewRaw.slice(0, 44) + '…' : previewRaw;

      const timeStr = last ? previewTime(last.t) : '';

      // Unread-ish badge: pinned threads with messages get a subtle dot.
      const badge = isPinned && msgs.length
        ? '<span style="width:9px;height:9px;border-radius:50%;background:var(--brand);flex:0 0 auto;margin-top:4px"></span>'
        : '';

      // Use RW.ui.row for structure; override lead/trail for richer content.
      return (
        '<div class="row" style="cursor:pointer;padding:12px 0" data-act="chatOpen" data-id="' + esc(th.id) + '">' +
        '<div class="lead" style="background:' + esc(avatarBg(th.id)) + ';font-size:22px;border-radius:14px">' +
          esc(th.emoji) +
        '</div>' +
        '<div class="body" style="min-width:0">' +
          '<div class="name" style="font-weight:700;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
            esc(th.name) +
          '</div>' +
          '<div class="sub" style="font-size:12.5px;color:var(--ash);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
            esc(truncated) +
          '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:0 0 auto;padding-left:8px">' +
          '<span style="font-size:11px;color:var(--fog);white-space:nowrap">' + esc(timeStr) + '</span>' +
          badge +
        '</div>' +
        '</div>'
      );
    }).join('');

    const body =
      RW.ui.sectionTitle('Messages') +
      '<div class="card" style="padding:0 14px">' + rows + '</div>';

    return RW.ui.screen({ title: 'Chat', body: body });
  }

  // ---- date separator label ----
  function dateSepLabel(t) {
    const d   = new Date(t);
    const now = new Date();
    const sameDay =
      d.getDate()     === now.getDate()  &&
      d.getMonth()    === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) return 'Today';
    const yesterday = new Date(now - 86400000);
    const wasYesterday =
      d.getDate()     === yesterday.getDate()  &&
      d.getMonth()    === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (wasYesterday) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // Return HH:MM for a bubble timestamp.
  function bubbleTime(t) {
    if (!t) return '';
    return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  // ---- thread view ----
  function renderThread(chatId) {
    const chats  = getChats();
    const thread = chats[chatId];

    if (!thread) {
      return RW.ui.screen({
        title: 'Chat',
        body:  RW.ui.empty('\u{1F4AC}', 'Thread not found.', 'Back to messages', '#/chat'),
        fab:   false,
      });
    }

    const msgs = Array.isArray(thread.messages) ? thread.messages : [];

    // Build bubble list with date separators.
    var bubblesHtml = '';
    if (msgs.length === 0) {
      bubblesHtml = RW.ui.empty(
        esc(thread.emoji),
        'No messages yet — say hola!',
        null,
        null
      );
    } else {
      var lastDateLabel = '';
      bubblesHtml = msgs.map(function (m) {
        const isMe   = m.from === 'me';
        const tVal   = typeof m.t === 'number' && m.t > 0 ? m.t : null;
        const tLabel = tVal ? dateSepLabel(tVal) : '';
        const tTime  = tVal ? bubbleTime(tVal)   : '';

        var sep = '';
        if (tLabel && tLabel !== lastDateLabel) {
          lastDateLabel = tLabel;
          sep =
            '<div style="text-align:center;margin:14px 0 10px">' +
              '<span style="display:inline-block;background:var(--mist);color:var(--ash);' +
                'font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px">' +
                esc(tLabel) +
              '</span>' +
            '</div>';
        }

        // Bubble colours: me = green (brand), them = light grey.
        const bubbleBg   = isMe ? 'var(--green)'   : '#f0f0f0';
        const bubbleClr  = isMe ? '#fff'            : 'var(--ink)';
        const borderRad  = isMe
          ? '18px 18px 4px 18px'
          : '18px 18px 18px 4px';
        const wrapAlign  = isMe ? 'flex-end' : 'flex-start';

        return sep +
          '<div style="display:flex;flex-direction:column;align-items:' + wrapAlign + ';margin-bottom:6px">' +
            '<div style="' +
              'background:' + bubbleBg + ';' +
              'color:' + bubbleClr + ';' +
              'border-radius:' + borderRad + ';' +
              'padding:10px 14px;' +
              'max-width:78%;' +
              'font-size:15px;' +
              'line-height:1.45;' +
              'word-break:break-word' +
            '">' +
              esc(m.text) +
            '</div>' +
            '<div style="font-size:10px;color:var(--fog);margin-top:3px;padding:0 4px">' +
              esc(tTime) +
            '</div>' +
          '</div>';
      }).join('');
    }

    const body =
      '<div style="display:flex;flex-direction:column;padding:4px 0 8px">' +
        bubblesHtml +
      '</div>';

    // Sticky composer bar.
    const inputBar =
      '<div class="checkout-bar" style="display:flex;gap:8px;padding:10px 14px;align-items:center;' +
        'background:rgba(245,246,249,0.97);backdrop-filter:blur(8px)">' +
        '<input id="chat-input-' + esc(chatId) + '" class="input" type="text" ' +
          'placeholder="Message…" autocomplete="off" ' +
          'style="flex:1;margin:0;border-radius:22px;padding:10px 16px;font-size:15px" ' +
          'data-chatid="' + esc(chatId) + '">' +
        '<button class="btn sm" style="border-radius:22px;padding:10px 20px;flex:0 0 auto;' +
          'background:var(--green);box-shadow:0 4px 12px rgba(10,157,74,0.35)" ' +
          'data-act="chatSend" data-chatid="' + esc(chatId) + '">' +
          'Send' +
        '</button>' +
      '</div>';

    // Title: emoji + name (both escaped).
    const title = esc(thread.emoji) + ' ' + esc(thread.name);

    return RW.ui.screen({
      title:  title,
      body:   body,
      sticky: inputBar,
      fab:    false,
    });
  }

  // ---- main render dispatcher ----
  function render(parts) {
    const chatId = (parts && parts[0]) ? parts[0] : null;

    if (chatId) {
      const chats = getChats();
      if (!chats[chatId]) {
        const contacts = RW.S.contacts || [];
        const contact  = contacts.find(function (c) { return c.id === chatId; });
        const pinned   = PINNED.find(function (p)   { return p.id === chatId; });
        if (contact)     ensureChat(contact);
        else if (pinned) ensureChat(pinned);
      }
      return renderThread(chatId);
    }

    // Ensure all threads exist (lazy-create) so they appear in the list.
    allThreads();
    RW.store.save();
    return renderList();
  }

  // ---- pick a canned reply pool for this thread ----
  function cannedReply(chatId) {
    if (chatId === 'support') return pick(SUPPORT_REPLIES);
    if (chatId === 'courier') return pick(COURIER_REPLIES);
    return pick(CANNED_REPLIES);
  }

  RW.register({
    id:      'chat',
    title:   'Chat',
    emoji:   '\u{1F4AC}',
    tileBg:  '#e3f7ec',
    section: 'explore',
    order:   40,
    render:  render,
    actions: {
      // Open a thread: navigate to #/chat/<id>
      chatOpen: function (el) {
        const chatId = el.dataset.id;
        if (!chatId) return;
        RW.go('#/chat/' + chatId);
      },

      // Send a message in the current thread.
      chatSend: function (el) {
        const chatId = el.dataset.chatid;
        if (!chatId) return;

        // Read the input value at send time.
        const input = document.getElementById('chat-input-' + chatId);
        const text  = input ? input.value.trim() : '';
        if (!text) return;

        const chats = getChats();
        if (!chats[chatId]) return;

        const thread = chats[chatId];
        if (!Array.isArray(thread.messages)) thread.messages = [];

        const now = Date.now();

        // Append the user’s message.
        thread.messages.push({ from: 'me',   text: text,               t: now     });

        // Auto-append a canned reply from the other side (slightly later t).
        thread.messages.push({ from: 'them', text: cannedReply(chatId), t: now + 1 });

        RW.store.save();
        RW.render();
      },
    },
  });
})(window.RW);
