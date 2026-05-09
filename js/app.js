(function () {

  // ── All items with tab label ──
  const ALL_ITEMS = [
    ...window.LIKENESS_DATA.map(d => ({ ...d, tab: 'likeness' })),
    ...window.COGNITION_DATA.map(d => ({ ...d, tab: 'control' })),
    ...window.COMMUNICATION_DATA.map(d => ({ ...d, tab: 'habit' })),
  ];

  // ── Quiz question generators ──
  // Each returns { question, correctAnswer, explanation, options }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickDistractors(correct, pool, key, count) {
    return shuffle(pool.filter(d => d[key] !== correct)).slice(0, count).map(d => d[key]);
  }

  // conclusionは「〇〇をすると〇〇になる」形式。
  // splitConclusion で「行動」と「効果」に分割する。
  function splitConclusion(conclusion) {
    // 「すると」「と、」「により」「ことで」「場合、」などで分割を試みる
    const patterns = ['すると、', 'すると', 'と、', 'により、', 'ことで、', 'たら、', 'した場合、', 'によって、'];
    for (const p of patterns) {
      const idx = conclusion.indexOf(p);
      if (idx > 4 && idx < conclusion.length - 4) {
        return {
          action: conclusion.slice(0, idx + p.length).trim(),
          effect: conclusion.slice(idx + p.length).trim(),
        };
      }
    }
    // 分割できない場合は前半/後半で分ける
    const mid = Math.floor(conclusion.length / 2);
    const spaceIdx = conclusion.indexOf('、', mid);
    if (spaceIdx > 0) {
      return {
        action: conclusion.slice(0, spaceIdx + 1).trim(),
        effect: conclusion.slice(spaceIdx + 1).trim(),
      };
    }
    return { action: conclusion, effect: conclusion };
  }

  function makeQuestions(items) {
    const pool = [...items];
    const questions = [];

    pool.forEach(item => {
      const { action, effect } = splitConclusion(item.conclusion);
      // 同じ効果部分が短すぎる場合はスキップ
      if (effect.length < 8 || action.length < 8) return;

      const type = Math.random() < 0.5 ? 'action2effect' : 'effect2action';

      if (type === 'action2effect') {
        // Q: この行動をすると、どんな効果が生まれる？
        const correct = effect;
        const distractors = shuffle(
          pool
            .filter(d => d.conclusion !== item.conclusion)
            .map(d => splitConclusion(d.conclusion).effect)
            .filter(e => e.length > 8)
        ).slice(0, 3);
        if (distractors.length < 3) return;
        questions.push({
          category: item.category,
          tab: item.tab,
          qtype: '行動 → 効果',
          question: `この行動をとると、どんな効果が生まれる？\n\n「${action}」`,
          correctAnswer: correct,
          options: shuffle([correct, ...distractors]),
          explanation: item.conclusion,
          caution: item.caution,
        });
      } else {
        // Q: この効果を出すには、どんな行動が必要？
        const correct = action;
        const distractors = shuffle(
          pool
            .filter(d => d.conclusion !== item.conclusion)
            .map(d => splitConclusion(d.conclusion).action)
            .filter(a => a.length > 8)
        ).slice(0, 3);
        if (distractors.length < 3) return;
        questions.push({
          category: item.category,
          tab: item.tab,
          qtype: '効果 → 行動',
          question: `この効果を出すには、どんな行動が必要？\n\n「${effect}」`,
          correctAnswer: correct,
          options: shuffle([correct, ...distractors]),
          explanation: item.conclusion,
          caution: item.caution,
        });
      }
    });

    return shuffle(questions).slice(0, 10);
  }

  // ── Quiz State ──
  const quiz = {
    questions: [],
    current: 0,
    score: 0,
    answered: false,
  };

  function startQuiz() {
    quiz.questions = makeQuestions(ALL_ITEMS);
    quiz.current = 0;
    quiz.score = 0;
    quiz.answered = false;
    renderQuiz();
  }

  function renderQuiz() {
    const area = document.getElementById('quizArea');
    if (quiz.current >= quiz.questions.length) {
      renderScore(area);
      return;
    }

    const q = quiz.questions[quiz.current];
    const pct = Math.round((quiz.current / quiz.questions.length) * 100);

    area.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-counter">${quiz.current + 1} / ${quiz.questions.length}</div>
        <div class="quiz-category-badge">${q.category}</div>
      </div>
      <div class="quiz-progress">
        <div class="quiz-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="quiz-card">
        <div class="quiz-type-label">${q.qtype || 'QUESTION'}</div>
        <div class="quiz-question">${q.question.replace(/\n/g, '<br>')}</div>
      </div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <button class="quiz-option" data-opt="${encodeURIComponent(opt)}">
            <span style="font-family:'Syne',sans-serif;font-size:11px;color:var(--muted);margin-right:8px;">${['A','B','C','D'][i]}</span>${opt}
          </button>
        `).join('')}
      </div>
    `;

    area.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(btn, q));
    });
  }

  function handleAnswer(btn, q) {
    if (quiz.answered) return;
    quiz.answered = true;

    const chosen = decodeURIComponent(btn.dataset.opt);
    const isCorrect = chosen === q.correctAnswer;
    if (isCorrect) quiz.score++;

    // Style options
    document.querySelectorAll('.quiz-option').forEach(b => {
      b.disabled = true;
      const val = decodeURIComponent(b.dataset.opt);
      if (val === q.correctAnswer) b.classList.add('reveal-correct');
      else if (b === btn && !isCorrect) b.classList.add('wrong');
    });

    // Insert explanation
    const optionsEl = document.querySelector('.quiz-options');
    const exp = document.createElement('div');
    exp.className = 'quiz-explanation';
    exp.innerHTML = `<strong>${isCorrect ? '✓ CORRECT' : '✗ INCORRECT — 正解'}</strong>${q.explanation}<br><br><span style="color:var(--muted);font-size:11px;">⚠ ${q.caution}</span>`;
    optionsEl.after(exp);

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'quiz-next-btn';
    nextBtn.textContent = quiz.current + 1 < quiz.questions.length ? '次の問題 →' : '結果を見る';
    exp.after(nextBtn);
    nextBtn.addEventListener('click', () => {
      quiz.current++;
      quiz.answered = false;
      renderQuiz();
    });
  }

  function renderScore(area) {
    const pct = Math.round((quiz.score / quiz.questions.length) * 100);
    const wrong = quiz.questions.length - quiz.score;
    area.innerHTML = `
      <div class="score-screen">
        <div class="score-big">${pct}<span style="font-size:28px">%</span></div>
        <div class="score-label">${quiz.questions.length}問中 ${quiz.score}問正解</div>
        <div class="score-breakdown">
          <div class="score-box">
            <div class="score-box-val good">${quiz.score}</div>
            <div class="score-box-label">正解</div>
          </div>
          <div class="score-box">
            <div class="score-box-val bad">${wrong}</div>
            <div class="score-box-label">不正解</div>
          </div>
        </div>
        <button class="retry-btn" id="retryBtn">もう一度トレーニング</button>
        <button class="retry-btn-ghost" id="reviewFromScore">Reviewで確認する</button>
      </div>
    `;
    document.getElementById('retryBtn').addEventListener('click', startQuiz);
    document.getElementById('reviewFromScore').addEventListener('click', () => {
      switchPage('review');
    });
  }

  // ── Review ──
  let reviewFilter = 'all';

  function renderReview() {
    const list = document.getElementById('reviewList');
    const filtered = reviewFilter === 'all'
      ? ALL_ITEMS
      : ALL_ITEMS.filter(d => d.tab === reviewFilter);

    list.innerHTML = filtered.map((item, i) => `
      <div class="review-card" data-review="${i}">
        <div class="review-card-top">
          <div class="review-title">${item.title}</div>
          <div class="review-category ${item.tab}">${item.tab}</div>
        </div>
        <div class="review-conclusion">${item.conclusion}</div>
        <button class="review-expand-btn">▼ 詳細</button>
        <div class="review-body">
          <div class="review-section">
            <div class="review-section-label">実験・根拠</div>
            <div class="review-section-text">${item.experiment}</div>
          </div>
          <div class="review-section">
            <div class="review-section-label">結果</div>
            <div class="review-section-text">${item.result}</div>
          </div>
          <div class="review-section caution">
            <div class="review-section-label">⚠ 注意点</div>
            <div class="review-section-text">${item.caution}</div>
          </div>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.review-expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.review-card');
        card.classList.toggle('expanded');
        btn.textContent = card.classList.contains('expanded') ? '▲ 閉じる' : '▼ 詳細';
      });
    });
  }

  // ── Page switching ──
  function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(page + 'Page').classList.remove('hidden');
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.page === page);
    });
    if (page === 'review') renderReview();
  }

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      reviewFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderReview();
    });
  });

  // ── Init ──
  startQuiz();

})();
