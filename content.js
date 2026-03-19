let navEnabled = true;
let messageLimit = 10;
let blockScroll = true; // Default TRUE now
let darkTheme = false;  
let snippetLen = 40;     
let lastUrl = window.location.href; // Track URL changes for navigation

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

// --- SCROLL LOGIC ---
const originalScrollTo = window.scrollTo;
window.scrollTo = function() {
  if (navEnabled && blockScroll) {
    return; // Block scroll
  }
  return originalScrollTo.apply(this, arguments);
};


// --- UI CREATION ---
const tocPanel = document.createElement('div');
tocPanel.id = 'ai-nav-toc';
// Default styles
tocPanel.style.cssText = `
  position: fixed; top: 20px; right: 20px; width: 250px; 
  background: white; border: 2px solid #4CAF50; 
  border-radius: 8px; padding: 0; z-index: 999999; display: none;
  font-family: sans-serif; font-size: 12px; color: black; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  user-select: none; min-width: 150px; min-height: 100px;
`;

// --- HEADER ---
const header = document.createElement('div');
header.style.cssText = `
  background: #f1f8e9; padding: 5px 8px; cursor: move; 
  border-bottom: 1px solid #ddd; border-radius: 6px 6px 0 0;
  display: flex; justify-content: space-between; align-items: center;
`;
const titleSpan = document.createElement('span');
titleSpan.style.cssText = `color:#2E7D32; font-weight:bold; font-size: 12px;`;
titleSpan.innerText = 'AI Chat Navigator'; // Updated Name

// Collapse Button
const collapseBtn = document.createElement('span');
collapseBtn.innerHTML = '−'; // Minus sign
collapseBtn.style.cssText = `cursor:pointer; font-weight:bold; color:#666; font-size:14px; padding:0 4px;`;
collapseBtn.onclick = (e) => {
  e.stopPropagation();
  const wrapper = listWrapper;
  if (wrapper.style.display === 'none') {
    wrapper.style.display = 'block';
    collapseBtn.innerHTML = '−';
  } else {
    wrapper.style.display = 'none';
    collapseBtn.innerHTML = '+';
  }
};

header.appendChild(titleSpan);
header.appendChild(collapseBtn);
tocPanel.appendChild(header);

// --- RESIZE HANDLE (Top-Left) ---
const resizeHandle = document.createElement('div');
resizeHandle.style.cssText = `
  position: absolute; top: 0; left: 0; width: 10px; height: 10px; 
  cursor: nwse-resize; z-index: 10;
  border-bottom-right-radius: 4px;
`;
// Visual indicator
const resizeIcon = document.createElement('div');
resizeIcon.style.cssText = `
  position: absolute; top: 2px; left: 2px; width: 5px; height: 5px; 
  border-left: 1px solid #aaa; border-bottom: 1px solid #aaa;
`;
resizeHandle.appendChild(resizeIcon);
tocPanel.appendChild(resizeHandle);

// --- LIST WRAPPER ---
const listWrapper = document.createElement('div');
listWrapper.style.cssText = `padding: 5px; overflow-y: auto;`;
const tocList = document.createElement('ul');
tocList.id = 'ai-nav-list';
tocList.style.cssText = `list-style: none; padding: 0; margin: 0;`;
listWrapper.appendChild(tocList);
tocPanel.appendChild(listWrapper);

document.body.appendChild(tocPanel);

// --- RESIZE LOGIC ---
let isResizing = false;
let startWidth, startHeight, startX, startY;

resizeHandle.addEventListener('mousedown', (e) => {
  e.preventDefault(); // Prevent text selection
  e.stopPropagation(); // Prevent drag
  isResizing = true;
  startWidth = parseInt(document.defaultView.getComputedStyle(tocPanel).width, 10);
  startHeight = parseInt(document.defaultView.getComputedStyle(tocPanel).height, 10);
  startX = e.clientX;
  startY = e.clientY;
  
  // Prevent dragging while resizing
  header.style.cursor = 'default'; 
});

document.addEventListener('mousemove', (e) => {
  if (isResizing) {
    const dx = startX - e.clientX; 
    const dy = e.clientY - startY; 

    const newWidth = startWidth + dx;
    const newHeight = startHeight + dy;

    if (newWidth > 150) tocPanel.style.width = newWidth + 'px';
    if (newHeight > 80) tocPanel.style.height = newHeight + 'px';
  }
});

document.addEventListener('mouseup', () => {
  isResizing = false;
  header.style.cursor = 'move';
});


// Theme Logic
function applyTheme() {
  if (darkTheme) {
    tocPanel.style.background = '#222';
    tocPanel.style.color = '#eee';
    tocPanel.style.borderColor = '#444';
    header.style.background = '#333';
    header.style.borderBottom = '1px solid #555';
    titleSpan.style.color = '#8bc34a';
    resizeIcon.style.borderColor = '#555';
  } else {
    tocPanel.style.background = 'white';
    tocPanel.style.color = 'black';
    tocPanel.style.borderColor = '#4CAF50';
    header.style.background = '#f1f8e9';
    header.style.borderBottom = '1px solid #ddd';
    titleSpan.style.color = '#2E7D32';
    resizeIcon.style.borderColor = '#aaa';
  }
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
  if (e.target === collapseBtn || e.target === resizeHandle) return; 
  isDragging = true;
  offset.x = e.clientX - tocPanel.offsetLeft;
  offset.y = e.clientY - tocPanel.offsetTop;
  tocPanel.style.right = 'auto'; 
});

document.addEventListener('mousemove', (e) => {
  if (isDragging && !isResizing) {
    tocPanel.style.left = (e.clientX - offset.x) + 'px';
    tocPanel.style.top = (e.clientY - offset.y) + 'px';
  }
});

document.addEventListener('mouseup', () => { isDragging = false; });

function updatePanelHeight() {
  const height = messageLimit * 30; 
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
  const shortText = fullText.substring(0, snippetLen) + '...';
  
  const listItem = document.createElement('li');
  const bgColor = darkTheme ? '#333' : '#f5f5f5';
  const txtColor = darkTheme ? '#eee' : 'black';
  
  listItem.style.cssText = `
    margin-bottom: 3px; padding: 4px 6px; background: ${bgColor}; color: ${txtColor};
    border-radius: 3px; cursor: pointer; word-break: break-word;
    transition: background 0.2s; font-size: 11px;
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
      target.style.background = darkTheme ? '#004d40' : '#fff9c4';
      setTimeout(() => target.style.background = '', 2000);
    }
