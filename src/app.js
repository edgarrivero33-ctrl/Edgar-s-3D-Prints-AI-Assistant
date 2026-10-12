const catalog = window.MASKMAKER_CATALOG || [];
const productImages = window.MASKMAKER_IMAGES || {};
const profileUrl = 'https://www.facebook.com/marketplace/profile/100002822624353/';

let state = { messages: [], quote: [], mode: 'preview' };
try {
  state = { ...state, ...JSON.parse(localStorage.getItem('maskmaker-state') || '{}') };
} catch {
  // Ignore stale or invalid browser storage and start a fresh conversation.
}

const $ = (selector) => document.querySelector(selector);

function saveState() {
  localStorage.setItem('maskmaker-state', JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderCatalog(filter = 'all') {
  const root = $('#catalog');
  root.innerHTML = '';

  catalog.forEach((product, index) => {
    if (filter !== 'all' && product.category !== filter) return;

    const card = document.createElement('article');
    card.className = 'card';
    const imageUrl = product.image ? productImages[product.image] : null;
    const artwork = imageUrl
      ? '<img class="catalog-photo" src="' + escapeHtml(imageUrl) + '" alt="' + escapeHtml(product.name) + ' helmet">'
      : '<div class="minihelmet" aria-hidden="true"></div>';

    card.innerHTML = '<div class="cardtop">'
      + '<span class="cardnum">MM—' + String(index + 1).padStart(2, '0') + '</span>'
      + '<span class="ready">MADE TO ORDER</span>' + artwork
      + '</div><div class="cardbody">'
      + '<div class="cardtitle">' + escapeHtml(product.name) + '</div>'
      + '<div class="cardmeta">' + escapeHtml(product.details || 'Made to order') + '</div>'
      + '<div class="cardbottom"><span class="price">' + escapeHtml(product.price || 'Ask for quote') + '</span>'
      + '<button class="askbtn">ASK ABOUT ↗</button></div></div>';

    card.querySelector('.askbtn').addEventListener('click', () => {
      state.quote = [{ name: product.name, price: product.price || 'Ask for quote' }];
      saveState();
      renderQuote();
      sendMessage('Tell me about the ' + product.name + ' helmet.');
    });
    root.appendChild(card);
  });
}

function renderQuote() {
  const item = $('#quote-item');
  $('#quote-count').textContent = state.quote.length + ' item' + (state.quote.length === 1 ? '' : 's');

  if (!state.quote.length) {
    item.className = 'quoteitem empty';
    item.textContent = 'Choose a helmet to start a quote draft.';
    return;
  }

  item.className = 'quoteitem';
  item.textContent = state.quote.map((product) => product.name + ' · ' + product.price).join('  /  ');
}

function renderMessages() {
  const root = $('#messages');
  root.innerHTML = '';

  if (!state.messages.length) {
    state.messages.push({
      role: 'assistant',
      content: 'Welcome to the studio. What kind of helmet are you looking for? I can help compare designs, visor or LED options, and sizing. If you already have a style in mind, tap a helmet in the archive to start.'
    });
    saveState();
  }

  state.messages.forEach((message) => {
    const bubble = document.createElement('div');
    bubble.className = 'msg ' + (message.role === 'user' ? 'user' : 'bot');
    bubble.innerHTML = (message.role === 'assistant' ? '<small>STUDIO ASSISTANT</small>' : '')
      + escapeHtml(message.content);
    root.appendChild(bubble);
  });
  root.scrollTop = root.scrollHeight;
}

async function sendMessage(text) {
  const message = String(text || '').trim();
  if (!message) return;

  state.messages.push({ role: 'user', content: message });
  saveState();
  renderMessages();
  $('#chat-input').value = '';

  const pending = document.createElement('div');
  pending.className = 'msg bot';
  pending.id = 'pending';
  pending.textContent = 'Thinking…';
  $('#messages').appendChild(pending);
  $('#messages').scrollTop = $('#messages').scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, history: state.messages.slice(-12), quote: state.quote })
    });
    const data = await response.json();
    state.mode = data.mode || 'preview';
    state.messages.push({
      role: 'assistant',
      content: data.reply || 'I can help with the helmet catalog, sizing, and custom options.'
    });
    $('#ai-status').textContent = state.mode === 'workers-ai'
      ? 'LLAMA 3.3 · WORKERS AI'
      : 'PREVIEW REPLIES · WORKERS AI NOT CONNECTED';
  } catch {
    state.messages.push({
      role: 'assistant',
      content: 'I can still help you browse the builds. For a specific quote, use the Marketplace link and I’ll confirm the latest options there.'
    });
  }

  saveState();
  renderMessages();
}

function showNotice(message) {
  const notice = $('#notice');
  notice.textContent = message;
  notice.classList.add('show');
  setTimeout(() => notice.classList.remove('show'), 1600);
}

async function checkAiStatus() {
  try {
    const response = await fetch('/api/health');
    const status = await response.json();
    state.mode = status.mode;
    $('#ai-status').textContent = status.ai
      ? 'LLAMA 3.3 · WORKERS AI'
      : 'PREVIEW REPLIES · WORKERS AI NOT CONNECTED';
  } catch {
    $('#ai-status').textContent = 'PREVIEW REPLIES · WORKERS AI NOT CONNECTED';
  }
}

$('#chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage($('#chat-input').value);
});

document.querySelectorAll('.chip').forEach((button) => {
  button.addEventListener('click', () => sendMessage(button.textContent));
});

$('#reset').addEventListener('click', () => {
  state.messages = [];
  saveState();
  renderMessages();
});

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.filter.active')?.classList.remove('active');
    button.classList.add('active');
    renderCatalog(button.dataset.filter);
  });
});

$('#clear-quote').addEventListener('click', () => {
  state.quote = [];
  saveState();
  renderQuote();
});

$('#copy-quote').addEventListener('click', async () => {
  const details = state.quote.length
    ? state.quote.map((product) => '- ' + product.name + ' (' + product.price + ')').join('\n')
    : 'No helmet selected yet';
  const request = 'Helmet quote request\n' + details
    + '\nHead circumference: ____\nCustomization / visor: ____\nNeeded by: ____\nMarketplace: ' + profileUrl;

  try {
    await navigator.clipboard.writeText(request);
    showNotice('Quote details copied');
  } catch {
    showNotice('Clipboard access is unavailable');
  }
});

renderCatalog();
renderQuote();
renderMessages();
checkAiStatus();
