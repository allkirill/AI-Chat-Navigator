let navEnabled = true;
let messageLimit = 10;
let blockScroll = false; // New setting
let darkTheme = false;   // New setting
let snippetLen = 40;     // New setting

// Load settings
chrome.storage.sync.get(['navEnabled', 'limit', 'blockScroll', 'darkTheme', 'snippetLen'], (data) => {
  if (data.navEnabled !== undefined) navEnabled = data.navEnabled;
  if (data.limit !== undefined) messageLimit = data.limit;
  if (data.blockScroll !== undefined) blockScroll = data.blockScroll;
  if (data.darkTheme !== undefined) darkTheme = data.darkTheme;
  if (data.snippetLen !== undefined) snippetLen = data.snippetLen;
  
  updatePanelHeight();
  applyTheme();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.limit) { messageLimit = changes.limit.newValue; updatePanelHeight(); }
  if (changes.navEnabled) navEnabled = changes.navEnabled.newValue;
  if (changes.blockScroll) blockScroll = changes.blockScroll.newValue;
  if (changes.snippetLen) snippetLen = changes.snippetLen.newValue;
  
  if (changes.darkTheme) {
    darkTheme = changes.darkTheme.newValue;
    applyTheme();
  }
});

// --- SCROLL LOGIC (Updated) ---
const originalScrollTo = window.scrollTo;
window.scrollTo = function() {
  if (navEnabled && blockScroll) {
    // If we want to block scroll, we check if it's an automated call
    // Simple approach: just ignore all scroll calls if enabled and user didn't do it.
    // Note: This is a broad block. 'blockScroll' usually means "Stay where I am".
    // But simply blocking window.scrollTo is the requested feature.
    return; 
  }
  return originalScrollTo.apply(this, arguments);
};


// --- UI CREATION ---
const tocPanel = document.createElement('div');
tocPanel.id = 'ai-nav-toc';
// Default styles (Light)
tocPanel.style.cssText = `
  position: fixed; top: 20px; right: 20px; width: 250px; 
  background: white; border: 2px solid #4CAF50; 
  border-radius: 8px; padding: 0; z-index: 999999; display: none;
  font-family: sans-serif; font-size: 13px; color: black; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  user-select: none;
`;

const header = document.createElement('div');
header.style.cssText = `
  background: #f1f8e9; padding: 8px 12px; cursor: move; 
  border-bottom: 1px solid #ddd; font-weight: bold; border-radius: 6px 6px 0 0;
`;
header.innerHTML = '<span style="color:#2E7D32;">Chat Contents</span>';
tocPanel.appendChild(header);

const listWrapper = document.createElement('div');
listWrapper.style.cssText = `padding: 10px; overflow-y: auto;`;
const tocList = document.createElement('ul');
tocList.id = 'ai-nav-list';
tocList.style.cssText = `list-style: none; padding: 0; margin: 0;`;
listWrapper.appendChild(tocList);
tocPanel.appendChild(listWrapper);

document.body.appendChild(tocPanel);

// Theme Logic
function applyTheme() {
  if (darkTheme) {
    tocPanel.style.background = '#222';
    tocPanel.style.color = '#eee';
    tocPanel.style.borderColor = '#444';
    header.style.background = '#333';
    header.style.borderBottom = '1px solid #555';
    header.querySelector('span').style.color = '#8bc34a';
  } else {
    tocPanel.style.background = 'white';
    tocPanel.style.color = 'black';
    tocPanel.style.borderColor = '#4CAF50';
    header.style.background = '#f1f8e9';
    header.style.borderBottom = '1px solid #ddd';
    header.querySelector('span').style.color = '#2E7D32';
  }
  // Re-render items? No, CSS inheritance handles text color, but list items have inline styles.
  // Let's update list items styles
  const items = tocList.querySelectorAll('li');
  items.forEach(item => {
    item.style.background = darkTheme ? '#333' : '#f5f5f5';
    item.style.color = darkTheme ? '#eee' : 'black';
  });
}

// Drag Logic
let isDragging = false;
let offset = { x: 0, y: 0 };

header.addEventListener('mousedown', (e) => {
  isDragging = true;
  offset.x = e.clientX - tocPanel.offsetLeft;
  offset.y = e.clientY - tocPanel.offsetTop;
  tocPanel.style.right = 'auto'; 
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    tocPanel.style.left = (e.clientX - offset.x) + 'px';
    tocPanel.style.top = (e.clientY - offset.y) + 'px';
  }
});

document.addEventListener('mouseup', () => { isDragging = false; });

function updatePanelHeight() {
  const height = messageLimit * 35; 
  listWrapper.style.maxHeight = height + 'px';
}

// --- CORE LOGIC ---

function smartScrollToElement(element) {
  if (!element) return;
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });

  setTimeout(() => {
    const rect = element.getBoundingClientRect();
    if (Math.abs(rect.top) > 200) { 
       const scroller = document.querySelector('main') || document.documentElement;
       const absoluteTop = rect.top + window.scrollY;
       scroller.scrollTo({ top: absoluteTop - 80, behavior: 'smooth' });
    }
  }, 200);
}

function findUserContainer(element) {
  const specific = element.closest('[data-message-author-role="user"], .user-message, .human-message');
  if (specific) return specific;

  let parent = element.parentElement;
  for (let i = 0; i < 5; i++) {
    if (!parent || parent.tagName === 'BODY') break;
    const style = window.getComputedStyle(parent);
    if (style.display === 'block' && style.padding !== '0px' && parent.clientWidth > 100) {
       return parent;
    }
    parent = parent.parentElement;
  }
  return element.parentElement;
}

function addToTOC(element, fullText) {
  // Use snippetLen setting
  const shortText = fullText.substring(0, snippetLen) + '...';
  
  const listItem = document.createElement('li');
  // Style based on current theme
  const bgColor = darkTheme ? '#333' : '#f5f5f5';
  const txtColor = darkTheme ? '#eee' : 'black';
  
  listItem.style.cssText = `
    margin-bottom: 5px; padding: 8px; background: ${bgColor}; color: ${txtColor};
    border-radius: 4px; cursor: pointer; word-break: break-word;
    transition: background 0.2s;
  `;
  listItem.innerText = shortText;
  
  const anchorId = 'ai-msg-' + Date.now();
  element.id = anchorId;
  
  const textSnippet = fullText.substring(0, 100);
  
  listItem.onclick = () => {
    let target = document.getElementById(anchorId);
    if (!target) {
        target = findElementByText(textSnippet);
        if (target) target.id = anchorId;
    }
    
    if (target) {
      smartScrollToElement(target);
      target.style.transition = 'background 0.5s';
      target.style.background = darkTheme ? '#004d40' : '#fff9c4'; // Flash color matches theme
      setTimeout(() => target.style.background = '', 2000);
    }
  };
  
  tocList.appendChild(listItem);
  
  while (tocList.children.length > messageLimit) {
    tocList.removeChild(tocList.firstChild);
  }
  
  tocPanel.style.display = 'block';
  updatePanelHeight();
}

function findElementByText(text) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;
  const snippet = text.substring(0, 30);
  while(node = walker.nextNode()) {
    if (node.textContent.includes(snippet)) {
      if (!tocPanel.contains(node.parentElement)) {
         return node.parentElement;
      }
    }
  }
  return null;
}

// --- DETECTION TRIGGER ---

document.addEventListener('keydown', (e) => {
  if (!navEnabled) return;

  if (e.key === 'Enter' && !e.shiftKey && (e.target.tagName === 'TEXTAREA' || e.target.getAttribute('contenteditable'))) {
    const userText = (e.target.value || e.target.innerText).trim();
    
    if (userText.length > 0) {
      setTimeout(() => {
        findAndAnchorMessage(userText);
      }, 500);
    }
  }
}, true);

function findAndAnchorMessage(text) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;
  const snippet = text.substring(0, 30); 

  while(node = walker.nextNode()) {
    if (node.textContent.includes(snippet)) {
      const parent = node.parentElement;
      
      if (tocPanel.contains(parent) || parent.tagName === 'TEXTAREA' || parent.closest('textarea, [contenteditable="true"]')) continue;

      const container = findUserContainer(parent);
      
      if (container) {
        addToTOC(container, text);
        saveHistory(text);
        return; 
      }
    }
  }
}

// --- HISTORY ---

function getChatSessionId() {
  const path = window.location.pathname;
  const match = path.match(/\/(c|app)\/([a-zA-Z0-9-]+)/);
  if (match) return match[0]; 
  return window.location.origin + window.location.pathname;
}

function saveHistory(text) {
  const sessionId = getChatSessionId();
  const fullUrl = window.location.href;
  const title = document.title;
  const icon = document.querySelector('link[rel="icon"]')?.href || '';

  chrome.storage.local.get(['chatHistory'], (data) => {
    let history = data.chatHistory || [];
    const idx = history.findIndex(h => h.sessionId === sessionId);
    
    const entry = {
      text: text.substring(0, 50),
      time: new Date().toISOString()
    };

    if (idx !== -1) {
      history[idx].messages.push(entry);
      history[idx].lastUpdate = new Date().toISOString();
      history[idx].title = title; 
      const item = history.splice(idx, 1)[0];
      history.unshift(item);
    } else {
      history.unshift({
        sessionId: sessionId,
        url: fullUrl,
        title: title,
        icon: icon,
        messages: [entry],
        lastUpdate: new Date().toISOString()
      });
    }

    if (history.length > 100) history.pop();
    chrome.storage.local.set({ chatHistory: history });
  });
}