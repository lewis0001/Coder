/* Rockway feature — Chat (direct messages + support threads). */
(function (RW) {
  'use strict';
  const { esc, uid, fmtTime, pick } = RW.util;

  // Guard the chats map in case it isn't in the stored blob yet.
  // (store.js already seeds it, but we guard on every access for safety.)
  function getChats() {
    RW.S.chats = RW.S.chats || {};
    return RW.S.chats;
  }

  // ---- pinned system threads (always present, never from contacts) ----
  const PINNED = [
    {
      id: 'support',
      name: 'Rockway Support',
      emoji: '🛟',
      pinned: true,
    },
    {
      id: 'courier',
      name: 'Courier',
      emoji: '🛵',
      pinned: true,
    },
  ];

  // ---- canned Llanito-flavoured auto-replies ----
  const CANNED_REPLIES = [
    '¿Qué tal, mate? Just saw your message!',
    'Te llamo p\'atrá in a bit — a bit busy on the Rock right now.',
    'Yeah sure, sorted! Luego te veo.',
    'No problem at all — give me five minutes.',
    'On my way up Main Street, won\'t be long!',
    'All good here — lovely day for it, the Levanter has cleared.',
    'Sorted, mate. ¿Quedamos en Grand Casemates después?',
    'Roger that! Just crossing the Focona, be there soon.',
    'Ha! No me des la lata — just kidding, I\'ll sort it now.',
    'Leave it with me. I\'ll get back to you, te lo prometo.',
  ];

  const SUPPORT_REPLIES = [
    'Thanks for getting in touch with Rockway Support! How can we help?',
    'Got your message — a Rockway agent will be with you shortly. ¿Qué tal?',
    'We\'re on it! Typical response time is under 10 minutes.',
    'Thanks for your patience. One of our Gibraltar team is picking this up now.',
    'Rockway Support here — happy to help. Could you share a bit more detail?',
  ];

  const COURIER_REPLIES = [
    'Hi! Courier here — your parcel is on the way.',
    'Just crossing from the frontier now, be with you shortly.',
    'Delivery today between 2pm and 5pm. Someone in?',
    'Parcel left at the door as requested. Have a good one!',
    'One more stop before yours — about 20 minutes away.',
  ];

  // Ensure a chat thread exists for the given contact/pinned entry.
  function ensureChat(entry) {
    const chats = getChats();
    if (!chats[entry.id]) {
      chats[entry.id] = {
        id: entry.id,
        name: entry.name,
        emoji: entry.emoji,
        messages: [],
      };
    }
    return chats[entry.id];
  }

  // Build the full ordered list: pinned first, then one thread per contact.
  function allThreads() {
    const chats = getChats();
    const threads = [];

    // Pinned system threads always appear first.
    PINNED.forEach(function (p) {
      threads.push(ensureChat(p));
    });

    // One thread per seeded contact (lazy-create if needed).
    const contacts = RW.S.contacts || [];
    contacts.forEach(function (c) {
      threads.push(ensureChat(c));
    });

    return threads;
  }

  // Format a timestamp nicely for the conversation list (just time today,
  // or short date otherwise).
  function previewTime(t) {
    if (!t) return '';
    const d = new Date(t);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  // ---- list view ----
  function renderList() {
    const threads = allThreads();

    const rows = threads.map(function (th) {
      const msgs = Array.isArray(th.messages) ? th.messages : [];
      const last = msgs.length ? msgs[msgs.length - 1] : null;
      const preview = last
        ? (last.from === 'me' ? 'You: ' : '') + (last.text || '')
        : 'Tap to start chatting';
      const time = last ? previewTime(last.t) : '';
      const truncated = preview.length > 42 ? preview.slice(0, 42) + '…' : preview;

      return (
        '<div class="row" style="cursor:pointer" data-act="chatOpen" data-id="' + esc(th.id) + '">' +
        '<div class="lead" style="background:#e8f5e9;font-size:22px">' + esc(th.emoji) + '</div>' +
        '<div class="body">' +
        '<div class="name">' + esc(th.name) + '</div>' +
        '<div class="sub">' + esc(truncated) + '</div>' +
        '</div>' +
        '<div class="trail" style="font-size:11px;color:var(--ink-muted,#888);white-space:nowrap">' +
        esc(time) +
        '</div>' +
        '</div>'
      );
    }).join('');

    const body =
      RW.ui.sectionTitle('Messages') +
      '<div class="card" style="padding:0">' + rows + '</div>';

    return RW.ui.screen({ title: 'Chat', body: body, section: 'explore' });
  }

  // ---- thread view ----
  function renderThread(chatId) {
    const chats = getChats();
    const thread = chats[chatId];

    if (!thread) {
      // Should not normally happen (ensureChat is called on list render),
      // but guard gracefully.
      return RW.ui.screen({
        title: 'Chat',
        body: RW.ui.empty('💬', 'Thread not found.', 'Back to messages', '#/chat'),
        fab: false,
      });
    }

    const msgs = Array.isArray(thread.messages) ? thread.messages : [];

    const bubbles = msgs.length
      ? msgs.map(function (m) {
          const isMe = m.from === 'me';
          const bubbleStyle = isMe
            ? 'background:var(--brand,#0a9d4a);color:#fff;align-self:flex-end;border-radius:18px 18px 4px 18px;'
            : 'background:#f0f0f0;color:#222;align-self:flex-start;border-radius:18px 18px 18px 4px;';
          const wrapStyle = isMe
            ? 'display:flex;flex-direction:column;align-items:flex-end;margin-bottom:8px;'
            : 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:8px;';
          const timeStr = m.t ? fmtTime(m.t) : '';
          return (
            '<div style="' + bubbleStyle.replace(/"/g, '&quot;') + 'padding:10px 14px;max-width:78%;font-size:15px;line-height:1.4;word-break:break-word">' +
            esc(m.text) +
            '</div>' +
            '<div style="font-size:10px;color:#aaa;margin-top:2px">' + esc(timeStr) + '</div>'
          );
        }).map(function (html, i) {
          const isMe = msgs[i].from === 'me';
          return '<div style="' + (isMe
            ? 'display:flex;flex-direction:column;align-items:flex-end;margin-bottom:8px;'
            : 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:8px;') + '">' + html + '</div>';
        }).join('')
      : '<div class="empty" style="padding:32px 0"><div class="e">💬</div><p style="color:#aaa">No messages yet — say hello!</p></div>';

    const inputBar =
      '<div class="checkout-bar" style="display:flex;gap:8px;padding:10px 16px;align-items:center">' +
      '<input id="chat-input-' + esc(chatId) + '" class="input" type="text" placeholder="Message…" ' +
      'style="flex:1;margin:0;border-radius:22px;padding:10px 16px;font-size:15px" ' +
      'data-chatid="' + esc(chatId) + '">' +
      '<button class="btn" style="border-radius:22px;padding:10px 20px;white-space:nowrap" ' +
      'data-act="chatSend" data-chatid="' + esc(chatId) + '">Send</button>' +
      '</div>';

    const body =
      '<div style="display:flex;flex-direction:column;gap:0;padding-bottom:8px">' +
      bubbles +
      '</div>';

    return RW.ui.screen({
      title: esc(thread.name) + ' ' + esc(thread.emoji),
      body: body,
      sticky: inputBar,
      fab: false,
    });
  }

  // ---- main render dispatcher ----
  function render(parts) {
    // parts[0] is the chatId when we are on #/chat/<id>
    const chatId = (parts && parts[0]) ? parts[0] : null;

    if (chatId) {
      // Ensure the thread exists before rendering (lazy-create).
      const chats = getChats();
      if (!chats[chatId]) {
        // Try to match a contact or pinned entry.
        const contacts = RW.S.contacts || [];
        const contact = contacts.find(function (c) { return c.id === chatId; });
        const pinned = PINNED.find(function (p) { return p.id === chatId; });
        if (contact) ensureChat(contact);
        else if (pinned) ensureChat(pinned);
      }
      return renderThread(chatId);
    }

    // Ensure all threads exist (lazy-create) so they appear in the list.
    allThreads();
    RW.store.save();

    return renderList();
  }

  // ---- choose a canned reply pool for this thread ----
  function cannedReply(chatId) {
    if (chatId === 'support') return pick(SUPPORT_REPLIES);
    if (chatId === 'courier') return pick(COURIER_REPLIES);
    return pick(CANNED_REPLIES);
  }

  RW.register({
    id: 'chat',
    title: 'Chat',
    emoji: '💬',
    tileBg: '#e3f7ec',
    section: 'explore',
    order: 40,
    render: render,
    actions: {
      // Open a thread: navigate to #/chat/<id>
      chatOpen: function (el) {
        const chatId = el.dataset.id;
        if (!chatId) return;
        RW.go('#/chat/' + chatId);
      },

      // Send a message in the current thread
      chatSend: function (el) {
        const chatId = el.dataset.chatid;
        if (!chatId) return;

        // Read the input value at send time
        const input = document.getElementById('chat-input-' + chatId);
        const text = input ? input.value.trim() : '';
        if (!text) return;

        const chats = getChats();
        if (!chats[chatId]) return;

        const thread = chats[chatId];
        if (!Array.isArray(thread.messages)) thread.messages = [];

        const now = Date.now();

        // Append the user's message
        thread.messages.push({ from: 'me', text: text, t: now });

        // Auto-append a canned reply from the other side (same tick, t+1)
        thread.messages.push({ from: 'them', text: cannedReply(chatId), t: now + 1 });

        RW.store.save();
        RW.render();
      },
    },
  });
})(window.RW);
