(function () {
  'use strict';

  var CHAT_ROOM = window.IMFTX_CHAT_ROOM || 'om-metz';
  var POLL_MS = 1800;

  function chatApiBase() {
    var u = window.IMFTX_CHAT_API;
    if (u != null && String(u).trim() !== '') {
      u = String(u).trim().split('?')[0];
      if (/^https?:\/\//i.test(u)) return u;
      if (u.charAt(0) === '/') return window.location.origin + u;
      return new URL(u, window.location.href).href.split('?')[0];
    }
    return window.location.origin + '/chat_api.php';
  }

  var API = chatApiBase();
  var NICK_KEY = 'imftx_chat_nick_' + CHAT_ROOM;
  var CLIENT_KEY = 'live_session_id';

  var messagesEl = document.getElementById('chatMessages');
  var inputEl = document.getElementById('chatMessageInput');
  var sendBtn = document.getElementById('chatSendBtn');
  var nickBar = document.getElementById('chatNickBar');
  var nickInput = document.getElementById('chatNickInput');
  var nickSave = document.getElementById('chatNickSave');
  var chatStatus = document.getElementById('chatStatus');

  if (!messagesEl || !inputEl || !sendBtn) return;

  var lastId = 0;
  var pollTimer = null;

  function getClientId() {
    try {
      var id = localStorage.getItem(CLIENT_KEY);
      if (!id) {
        id = 'c_' + Math.random().toString(36).slice(2) + Date.now();
        localStorage.setItem(CLIENT_KEY, id);
      }
      return id;
    } catch (e) {
      return 'anon_' + Date.now();
    }
  }

  function getNick() {
    try {
      return (localStorage.getItem(NICK_KEY) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function setNick(name) {
    try {
      localStorage.setItem(NICK_KEY, name.trim().slice(0, 28));
    } catch (e) {}
  }

  function updateNickUI() {
    var n = getNick();
    if (nickBar) nickBar.hidden = !!n;
    if (n && nickInput) nickInput.value = n;
  }

  function setStatus(text, isError) {
    if (!chatStatus) return;
    chatStatus.textContent = text || '';
    chatStatus.style.color = isError ? '#f87171' : 'rgba(255,255,255,.4)';
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function formatTime(ts) {
    var d = new Date(ts * 1000);
    var h = d.getHours();
    var m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function appendMessage(m, scroll) {
    var row = document.createElement('div');
    row.className = 'chat-msg';
    row.dataset.id = String(m.id);
    var meta = document.createElement('span');
    meta.className = 'chat-msg__meta';
    meta.innerHTML =
      '<span class="chat-msg__user">' +
      escapeHtml(m.user) +
      '</span> <span class="chat-msg__time">' +
      escapeHtml(formatTime(m.ts)) +
      '</span>';
    var text = document.createElement('div');
    text.className = 'chat-msg__text';
    text.textContent = m.text;
    row.appendChild(meta);
    row.appendChild(text);
    messagesEl.appendChild(row);
    if (scroll !== false) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function renderWelcomeRemoved() {
    var w = messagesEl.querySelector('.chat-msg--welcome');
    if (w) w.remove();
  }

  function parseJsonSafe(text, res) {
    try {
      return JSON.parse(text);
    } catch (e) {
      if (res && res.status === 404) {
        setStatus(
          'chat_api.php introuvable (404). Mets le fichier à la racine du site ou définis IMFTX_CHAT_API.',
          true
        );
      } else if (window.location.protocol === 'file:') {
        setStatus('Ouvre la page en http/https sur ton hébergement (pas en fichier local).', true);
      } else {
        setStatus(
          'Réponse invalide : PHP désactivé ou hébergeur sans PHP (ex. Vercel statique). Il faut un serveur PHP.',
          true
        );
      }
      return null;
    }
  }

  async function poll() {
    try {
      if (window.location.protocol === 'file:') {
        setStatus('Chat : ouvre le site via ton URL en ligne (pas file://).', true);
        return;
      }
      var url =
        API +
        '?room=' +
        encodeURIComponent(CHAT_ROOM) +
        '&since=' +
        lastId +
        '&_=' +
        Date.now();
      var res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
      var text = await res.text();
      var data = parseJsonSafe(text, res);
      if (!data) return;
      if (!data.ok || !Array.isArray(data.messages)) {
        setStatus(data.error || 'Chat indisponible', true);
        return;
      }
      setStatus('');
      if (data.messages.length) renderWelcomeRemoved();
      data.messages.forEach(function (m) {
        if (!m || typeof m.id === 'undefined') return;
        if (document.querySelector('.chat-msg[data-id="' + m.id + '"]')) return;
        appendMessage(m);
        if (m.id > lastId) lastId = m.id;
      });
    } catch (e) {
      setStatus('Réseau : impossible de joindre chat_api.php (même domaine que la page ?)', true);
    }
  }

  async function send() {
    var nick = getNick();
    if (!nick) {
      setStatus('Choisis un pseudo d’abord', true);
      if (nickBar) nickBar.hidden = false;
      return;
    }
    var text = inputEl.value.trim();
    if (!text) return;

    sendBtn.disabled = true;
    try {
      if (window.location.protocol === 'file:') {
        setStatus('Envoie impossible en mode fichier local.', true);
        sendBtn.disabled = false;
        return;
      }
      var res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          room: CHAT_ROOM,
          user: nick,
          text: text,
          client_id: getClientId(),
        }),
      });
      var text = await res.text();
      var data = parseJsonSafe(text, res);
      if (!data) {
        sendBtn.disabled = false;
        return;
      }
      if (!data.ok) {
        setStatus(data.error || 'Envoi refusé', true);
        return;
      }
      inputEl.value = '';
      setStatus('');
      if (data.message) {
        renderWelcomeRemoved();
        if (!document.querySelector('.chat-msg[data-id="' + data.message.id + '"]')) {
          appendMessage(data.message);
          if (data.message.id > lastId) lastId = data.message.id;
        }
      }
    } catch (e) {
      setStatus('Erreur réseau', true);
    }
    sendBtn.disabled = false;
  }

  function boot() {
    updateNickUI();

    if (nickSave && nickInput) {
      nickSave.addEventListener('click', function () {
        var n = nickInput.value.trim().slice(0, 28);
        if (!n) {
          setStatus('Pseudo requis', true);
          return;
        }
        setNick(n);
        updateNickUI();
        setStatus('');
        inputEl.focus();
      });
      nickInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') nickSave.click();
      });
    }

    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    poll();
    pollTimer = setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') poll();
    });
    if (getNick()) {
      try {
        inputEl.focus();
      } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
