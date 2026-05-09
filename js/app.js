/* SocialFlow — app.js */

(function () {
  const state = {
    activeTab: 'likeness',
    checks: JSON.parse(localStorage.getItem('sf_checks') || '{}'),
  };

  function saveChecks() {
    localStorage.setItem('sf_checks', JSON.stringify(state.checks));
  }

  function checkKey(tab, index) {
    return `${tab}_${index}`;
  }

  function renderTab() {
    const tabs = {
      likeness: window.LIKENESS_DATA,
      cognition: window.COGNITION_DATA,
      communication: window.COMMUNICATION_DATA,
    };

    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
    });

    const data = tabs[state.activeTab] || [];
    const root = document.getElementById('cardRoot');

    // Progress header
    const total = data.length;
    const done = data.filter((_, i) => state.checks[checkKey(state.activeTab, i)]).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    root.innerHTML = `
      <div class="progress-bar-wrap">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-label">${done} / ${total} 完了</div>
      </div>
      ${data.map((item, index) => renderCard(item, index)).join('')}
    `;

    root.querySelectorAll('.check-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        const key = checkKey(state.activeTab, idx);
        state.checks[key] = !state.checks[key];
        saveChecks();
        renderTab();
      });
    });

    root.querySelectorAll('.card-expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.sf-card');
        card.classList.toggle('expanded');
        btn.textContent = card.classList.contains('expanded') ? '▲ 閉じる' : '▼ 詳細を見る';
      });
    });
  }

  function renderCard(item, index) {
    const key = checkKey(state.activeTab, index);
    const checked = !!state.checks[key];
    return `
      <div class="sf-card${checked ? ' checked' : ''}">
        <div class="sf-card-category">${item.category}</div>
        <div class="sf-card-title">${item.title}</div>
        <div class="sf-card-conclusion">${item.conclusion}</div>

        <button class="card-expand-btn">▼ 詳細を見る</button>

        <div class="sf-card-body">
          <div class="sf-card-section">
            <div class="sf-card-section-label">実験・根拠</div>
            <div class="sf-card-section-text">${item.experiment}</div>
          </div>
          <div class="sf-card-section">
            <div class="sf-card-section-label">結果</div>
            <div class="sf-card-section-text">${item.result}</div>
          </div>
          <div class="sf-card-section caution-section">
            <div class="sf-card-section-label">⚠ 注意点</div>
            <div class="sf-card-section-text">${item.caution}</div>
          </div>
        </div>

        <button class="check-toggle" data-index="${index}">
          ${checked ? '✓ 今日できた' : '今日できたかチェック'}
        </button>
        <div class="check-label">${item.check}</div>
      </div>
    `;
  }

  // Tab click
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeTab = btn.dataset.tab;
      renderTab();
    });
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('今日のチェックをリセットしますか？')) {
      state.checks = {};
      saveChecks();
      renderTab();
    }
  });

  renderTab();
})();
