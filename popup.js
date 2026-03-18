document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.getElementById('navToggle');
  const scrollToggle = document.getElementById('scrollToggle');
  const themeToggle = document.getElementById('themeToggle');
  const snippetLen = document.getElementById('snippetLen');
  const historyBtn = document.getElementById('historyBtn');
  const historyContainer = document.getElementById('historyContainer');
  const filterContainer = document.getElementById('filterContainer');

  // Load Settings
  // DEFAULTS: nav=true, scroll=true, theme=false, snippet=40
  chrome.storage.sync.get(['navEnabled', 'blockScroll', 'darkTheme', 'snippetLen'], (data) => {
    navToggle.checked = data.navEnabled !== false; // Default true
    scrollToggle.checked = data.blockScroll !== false; // Default TRUE (Fixed!)
    themeToggle.checked = data.darkTheme === true; // Default false
    snippetLen.value = data.snippetLen || 40;
  });

  // Save Settings
  const saveSettings = () => {
    chrome.storage.sync.set({
      navEnabled: navToggle.checked,
      blockScroll: scrollToggle.checked,
      darkTheme: themeToggle.checked,
      snippetLen: parseInt(snippetLen.value) || 40
    });
  };

  navToggle.onchange = saveSettings;
  scrollToggle.onchange = saveSettings;
  themeToggle.onchange = saveSettings;
  snippetLen.onchange = saveSettings;

  // --- History Logic ---
  let fullHistory = [];
  let activeFilters = []; 

  historyBtn.addEventListener('click', () => {
    const isVisible = historyContainer.style.display === 'block';
    historyContainer.style.display = isVisible ? 'none' : 'block';
    filterContainer.style.display = isVisible ? 'none' : 'flex';
    
    if (!isVisible) renderHistory();
  });

  function renderHistory() {
    chrome.storage.local.get(['chatHistory'], (data) => {
      fullHistory = data.chatHistory || [];
      
      if (fullHistory.length === 0) {
        historyContainer.innerHTML = '<div style="text-align:center; color:#888; padding:10px; font-size:10px;">History empty</div>';
        return;
      }

      renderFilters();
      drawList();
    });
  }

  function renderFilters() {
    const domains = {};
    fullHistory.forEach(chat => {
      try {
        const domain = new URL(chat.url).hostname;
        if (!domains[domain]) domains[domain] = { icon: chat.icon, count: 0 };
        domains[domain].count++;
      } catch (e) {}
    });

    filterContainer.innerHTML = '';
    Object.keys(domains).forEach(domain => {
      const chip = document.createElement('div');
      chip.className = 'filter-chip';
      if (activeFilters.includes(domain)) chip.classList.add('active');
      
      chip.innerHTML = `
        <img src="${domains[domain].icon || 'icon.png'}" onerror="this.src='icon.png'">
        <span>${domain.split('.')[0]} (${domains[domain].count})</span>
      `;
      
      chip.onclick = (e) => {
        e.stopPropagation();
        const idx = activeFilters.indexOf(domain);
        if (idx > -1) activeFilters.splice(idx, 1);
        else activeFilters.push(domain);
        
        renderFilters();
        drawList();
      };
      
      filterContainer.appendChild(chip);
    });
  }

  function drawList() {
    historyContainer.innerHTML = '';
    
    let filtered = fullHistory;
    if (activeFilters.length > 0) {
      filtered = fullHistory.filter(chat => {
        try {
          const domain = new URL(chat.url).hostname;
          return activeFilters.includes(domain);
        } catch (e) { return false; }
      });
    }

    filtered.forEach(chat => {
      const item = document.createElement('div');
      item.className = 'history-item';
      
      const date = new Date(chat.lastUpdate).toLocaleDateString();
      const msgCount = chat.messages ? chat.messages.length : 0;

      item.innerHTML = `
        <div class="h-info">
          <img class="h-icon" src="${chat.icon || 'icon.png'}" onerror="this.src='icon.png'">
          <div class="h-text">${chat.title || 'Chat'}</div>
          <div class="h-meta">${date} | ${msgCount} msgs</div>
        </div>
        <button class="delete-btn" title="Delete">&times;</button>
      `;

      item.querySelector('.h-info').onclick = () => {
        chrome.tabs.query({ url: chat.url }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
            chrome.windows.update(tabs[0].windowId, { focused: true });
          } else {
            chrome.tabs.create({ url: chat.url });
          }
        });
      };

      item.querySelector('.delete-btn').onclick = (e) => {
        e.stopPropagation();
        deleteChat(chat.sessionId);
      };

      historyContainer.appendChild(item);
    });
  }

  function deleteChat(sessionId) {
    chrome.storage.local.get(['chatHistory'], (data) => {
      let history = data.chatHistory || [];
      history = history.filter(h => h.sessionId !== sessionId);
      chrome.storage.local.set({ chatHistory: history }, () => {
        fullHistory = history;
        renderHistory();
      });
    });
  }
});
