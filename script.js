let currentDate = new Date('2026-10-06');
let selectedMatch = null;
let matchData = null;
let selectedTeam = null;

function formatDate(date) {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
}

function renderList() {
  const dateStr = formatDate(currentDate);
  const app = document.getElementById('app');
  
  let dateChipsHtml = '';
  for (let i = -3; i <= 3; i++) {
    let d = new Date(currentDate);
    d.setDate(d.getDate() + i);
    const dStr = formatDate(d);
    const isSelected = (dStr === dateStr);
    
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const dayName = dayNames[d.getDay()];
    const dayMonth = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    let displayLabel = dayName;
    const todayStr = '2026-10-06';
    if (dStr === todayStr) {
      displayLabel = 'Bugün';
    }

    dateChipsHtml += `
      <div class="date-chip ${isSelected ? 'active' : ''}" onclick="selectDate('${dStr}')">
        <div class="day-name">${displayLabel}</div>
        <div class="day-date">${dayMonth}</div>
      </div>
    `;
  }

  app.innerHTML = `
    <div class="top-bar">
      <div class="brand-area">OFİSYEL</div>
      <div class="top-icons">
        <button class="top-icon-btn">🔍</button>
        <button class="top-icon-btn">⚙️</button>
      </div>
    </div>

    <div class="date-strip-container">
      <div class="calendar-icon-btn calendar-input-wrapper" title="Takvimden Tarih Seç">
        📅
        <input type="date" value="${dateStr}" onchange="selectDate(this.value)">
      </div>
      ${dateChipsHtml}
    </div>

    <div id="matches-list">Yükleniyor...</div>
  `;

  fetch(`/api/matches?date=${dateStr}`)
    .then(res => res.json())
    .then(data => {
      const listEl = document.getElementById('matches-list');
      if (!data || data.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding: 40px; color:#a0aec0;">Bu tarihte maç bulunamadı.</div>';
        return;
      }

      const priorityLeagues = [
        'SÜPER LİG',
        'PREMIER LİG',
        'LA LİGA',
        'SERİE A',
        'BUNDESLİGA',
        'LİGUE 1',
        'İNGİLTERE CHAMPIONSHIP'
      ];

      data.sort((a, b) => {
        const nameA = (a.league || '').toUpperCase();
        const nameB = (b.league || '').toUpperCase();

        let indexA = priorityLeagues.indexOf(nameA);
        let indexB = priorityLeagues.indexOf(nameB);

        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;

        if (indexA !== indexB) {
          return indexA - indexB;
        }
        return nameA.localeCompare(nameB);
      });

      let html = '';
      data.forEach(group => {
        html += `<div class="league-title">${group.league}</div>`;
        group.matches.forEach(m => {
          let scoreText = '';
          let badgeClass = '';

          if (m.state === 'pre') {
            scoreText = m.time;
            badgeClass = 'upcoming';
          } else if (m.state === 'in') {
            scoreText = `<span class="live-dot"></span> ${m.homeScore} - ${m.awayScore}`;
            badgeClass = 'live';
          } else {
            scoreText = `${m.homeScore} - ${m.awayScore}`;
            badgeClass = 'finished';
          }

          html += `
            <div class="match-card" onclick="openDetail('${m.id}', '${m.homeTeam}', '${m.awayTeam}', '${m.homeLogo}', '${m.awayLogo}', '${m.homeScore}', '${m.awayScore}', '${m.homeId || ''}', '${m.awayId || ''}')">
              <div class="team">
                <img src="${m.homeLogo}" onerror="this.style.opacity=0">
                <span>${m.homeTeam}</span>
              </div>
              <div class="score ${badgeClass}">${scoreText}</div>
              <div class="team away">
                <span>${m.awayTeam}</span>
                <img src="${m.awayLogo}" onerror="this.style.opacity=0">
              </div>
            </div>
          `;
        });
      });
      listEl.innerHTML = html;
    })
    .catch(() => {
      document.getElementById('matches-list').innerHTML = '<div style="text-align:center; padding:40px; color:#ef4444;">Maçlar yüklenirken hata oluştu.</div>';
    });
}

function selectDate(dateStr) {
  currentDate = new Date(dateStr);
  renderList();
}

function openDetail(id, homeTeam, awayTeam, homeLogo, awayLogo, homeScore, awayScore, homeId, awayId) {
  selectedMatch = { id, homeTeam, awayTeam, homeLogo, awayLogo, homeScore, awayScore, homeId, awayId };
  renderDetail();
}

function renderDetail() {
  const app = document.getElementById('app');
  const m = selectedMatch;
  const msScore = (m.homeScore !== 'null' && m.homeScore !== null) ? `${m.homeScore} - ${m.awayScore}` : '0 - 0';

  app.innerHTML = `
    <div class="detail-header">
      <button class="back-btn" onclick="goBack()">&larr;</button>
      <h2>Maç Detayı</h2>
    </div>

    <div class="match-summary-box">
      <div id="status-detail" style="color: #a0aec0; font-size: 12px; font-weight: bold; letter-spacing: 1px;">MS</div>
      <div class="teams-vs">
        <div class="team-box" onclick="openTeamDetail('${m.homeId}')" style="cursor: pointer;" title="Takım Profiline Git">
          <img src="${m.homeLogo}" onerror="this.style.opacity=0">
          <strong style="font-size:13px;">${m.homeTeam}</strong>
        </div>
        <div class="score-container">
          <div class="big-score">${msScore}</div>
          <div id="iy-header-score" class="iy-score"></div>
        </div>
        <div class="team-box" onclick="openTeamDetail('${m.awayId}')" style="cursor: pointer;" title="Takım Profiline Git">
          <img src="${m.awayLogo}" onerror="this.style.opacity=0">
          <strong style="font-size:13px;">${m.awayTeam}</strong>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button id="tab-events-btn" class="tab-btn active" onclick="switchTab('events')">Olaylar</button>
      <button id="tab-stats-btn" class="tab-btn" onclick="switchTab('stats')">İstatistikler</button>
      <button id="tab-lineups-btn" class="tab-btn" onclick="switchTab('lineups')">Kadrolar</button>
    </div>

    <div id="tab-content">Yükleniyor...</div>
  `;

  fetch(`/api/match-detail?id=${m.id}`)
    .then(res => res.json())
    .then(data => {
      matchData = data;
      if (data.statusDetail) {
        document.getElementById('status-detail').innerText = data.statusDetail;
      }
      if (data.homeIY !== undefined && data.awayIY !== undefined) {
        document.getElementById('iy-header-score').innerText = `(İY ${data.homeIY} - ${data.awayIY})`;
      }
      switchTab('events');
    })
    .catch(() => {
      document.getElementById('tab-content').innerHTML = '<div style="text-align:center; color:#ef4444; padding:20px;">Detaylar yüklenirken hata oluştu.</div>';
    });
}

function openTeamDetail(teamId) {
  if (!teamId || teamId === 'undefined' || teamId === 'null') {
    alert('Bu takım için detay bilgisi bulunamadı.');
    return;
  }
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="detail-header">
      <button class="back-btn" onclick="renderDetail()">&larr;</button>
      <h2>Takım Profili</h2>
    </div>
    <div style="text-align:center; padding: 40px; color:#a0aec0;">Takım bilgileri yükleniyor...</div>
  `;

  fetch(`/api/team-detail?id=${teamId}`)
    .then(res => res.json())
    .then(data => {
      if (!data || data.error) {
        app.innerHTML = `
          <div class="detail-header">
            <button class="back-btn" onclick="renderDetail()">&larr;</button>
            <h2>Takım Profili</h2>
          </div>
          <div style="text-align:center; padding: 40px; color:#ef4444;">Takım bilgileri alınamadı.</div>
        `;
        return;
      }

      const t = data.team;
      const matches = data.matches || [];

      let matchesHtml = '';
      if (matches.length === 0) {
        matchesHtml = '<div style="text-align:center; color:#a0aec0; padding:15px; font-size:13px;">Son maç bilgisi bulunmuyor.</div>';
      } else {
        matches.forEach(m => {
          matchesHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #1e293b; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; font-size: 13px;">
              <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <img src="${m.homeLogo}" width="18" height="18" onerror="this.style.opacity=0">
                <span style="color: ${m.homeTeam === t.name ? '#4ade80' : '#e2e8f0'}; font-weight:${m.homeTeam === t.name ? 'bold' : 'normal'}">${m.homeTeam}</span>
              </div>
              <div style="background: #0f172a; padding: 4px 10px; border-radius: 4px; font-weight: bold; color: #fff;">
                ${m.homeScore} - ${m.awayScore}
              </div>
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex: 1; text-align: right;">
                <span style="color: ${m.awayTeam === t.name ? '#4ade80' : '#e2e8f0'}; font-weight:${m.awayTeam === t.name ? 'bold' : 'normal'}">${m.awayTeam}</span>
                <img src="${m.awayLogo}" width="18" height="18" onerror="this.style.opacity=0">
              </div>
            </div>
          `;
        });
      }

      app.innerHTML = `
        <div class="detail-header">
          <button class="back-btn" onclick="renderDetail()">&larr;</button>
          <h2>Takım Profili</h2>
        </div>

        <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
          <div style="background: #1e293b; padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 16px; border-top: 4px solid ${t.color};">
            <img src="${t.logo}" width="60" height="60" onerror="this.style.opacity=0">
            <div>
              <h3 style="margin: 0; font-size: 18px; color: #fff;">${t.name}</h3>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Stadyum: ${t.venue}</p>
            </div>
          </div>

          <div>
            <h4 style="color: #cbd5e1; font-size: 14px; margin-bottom: 10px; border-left: 3px solid #4ade80; padding-left: 8px;">Son Maçlar / Fikstür</h4>
            <div>${matchesHtml}</div>
          </div>
        </div>
      `;
    })
    .catch(() => {
      app.innerHTML = `
        <div class="detail-header">
          <button class="back-btn" onclick="renderDetail()">&larr;</button>
          <h2>Takım Profili</h2>
        </div>
        <div style="text-align:center; padding: 40px; color:#ef4444;">Bağlantı hatası oluştu.</div>
      `;
    });
}

function switchTab(tab) {
  document.getElementById('tab-events-btn').classList.toggle('active', tab === 'events');
  document.getElementById('tab-stats-btn').classList.toggle('active', tab === 'stats');
  document.getElementById('tab-lineups-btn').classList.toggle('active', tab === 'lineups');

  const contentEl = document.getElementById('tab-content');
  if (!matchData) return;

  if (tab === 'events') {
    renderEventsTab(contentEl);
  } else if (tab === 'stats') {
    renderStatsTab(contentEl);
  } else {
    renderLineupsTab(contentEl);
  }
}

function renderEventsTab(container) {
  if (!matchData.events || matchData.events.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#a0aec0; padding:20px;">Bu maça ait öne çıkan olay bulunamadı.</div>';
    return;
  }

  let eventsHtml = '<div class="timeline-container">';
  let iyDividerAdded = false;

  matchData.events.forEach(e => {
    const minute = parseInt(e.clock) || 0;

    if (!iyDividerAdded && minute > 45) {
      eventsHtml += `<div class="timeline-divider"><span>İlk Yarı Bitti</span></div>`;
      iyDividerAdded = true;
    }

    const isHome = e.isHome;
    const leftContent = isHome ? buildEventCardContent(e) : '';
    const rightContent = !isHome ? buildEventCardContent(e) : '';

    eventsHtml += `
      <div class="timeline-row">
        <div class="timeline-side left">${leftContent}</div>
        <div class="timeline-center">${e.clock}'</div>
        <div class="timeline-side right">${rightContent}</div>
      </div>
    `;
  });

  if (!iyDividerAdded) {
    eventsHtml += `<div class="timeline-divider"><span>İlk Yarı Bitti</span></div>`;
  }

  eventsHtml += '</div>';
  container.innerHTML = eventsHtml;
}

function buildEventCardContent(e) {
  if (e.icon === '🔄' && e.playerIn && e.playerOut) {
    return `
      <div class="event-card">
        <span class="event-icon">${e.icon}</span>
        <div class="sub-box">
          <div class="sub-in"><span>➔</span> ${e.playerIn}</div>
          <div class="sub-out"><span>➔</span> ${e.playerOut}</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="event-card">
      <span class="event-icon">${e.icon}</span>
      <div class="event-details">
        <div class="event-player">${e.player}</div>
        <div class="event-sub">${e.typeLabel}</div>
      </div>
    </div>
  `;
}

function renderStatsTab(container) {
  const stats = matchData?.statistics || [];
  if (stats.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#a0aec0; padding:20px;">İstatistik bilgisi bulunmuyor.</div>';
    return;
  }

  let html = '<div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">';

  stats.forEach(s => {
    let hValNum = parseFloat(s.homeVal) || 0;
    let aValNum = parseFloat(s.awayVal) || 0;
    let total = hValNum + aValNum;
    
    let hPercent = 50;
    let aPercent = 50;
    
    if (total > 0) {
      hPercent = (hValNum / total) * 100;
      aPercent = (aValNum / total) * 100;
    }

    html += `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #e2e8f0;">
          <span>${s.homeVal}</span>
          <span style="color: #a0aec0; font-size: 12px; font-weight: normal;">${s.label}</span>
          <span>${s.awayVal}</span>
        </div>
        <div style="display: flex; height: 6px; background: #2d3748; border-radius: 3px; overflow: hidden; gap: 2px;">
          <div style="width: ${hPercent}%; background: #4ade80; border-radius: 3px 0 0 3px; transition: width 0.3s;"></div>
          <div style="width: ${aPercent}%; background: #3b82f6; border-radius: 0 3px 3px 0; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function renderLineupsTab(container) {
  const homeStarters = matchData?.lineups?.home?.starters || [];
  const awayStarters = matchData?.lineups?.away?.starters || [];
  const homeBench = matchData?.lineups?.home?.bench || [];
  const awayBench = matchData?.lineups?.away?.bench || [];

  if (homeStarters.length === 0 && awayStarters.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#a0aec0; padding:20px;">Kadro bilgisi henüz açıklanmadı.</div>';
    return;
  }

  const renderPlayerList = (players, isHome) => {
    if (!players || players.length === 0) return '<div style="color:#718096; font-size:12px; padding:4px 0;">Bulunmuyor</div>';
    return players.map(p => {
      const numHtml = p.jersey ? `<span class="jersey-num">${p.jersey}</span>` : '';
      
      if (isHome) {
        return `<div class="player-row" style="display:flex; align-items:center; gap:8px; padding:4px 0;">${numHtml} <span>${p.name}</span></div>`;
      } else {
        return `<div class="player-row" style="display:flex; align-items:center; justify-content:flex-end; gap:8px; text-align:right; padding:4px 0;"><span>${p.name}</span> ${numHtml}</div>`;
      }
    }).join('');
  };

  container.innerHTML = `
    <div class="lineup-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 12px;">
      <div>
        <div class="section-title" style="color: #4ade80; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #2d3748; padding-bottom: 4px;">${selectedMatch.homeTeam}</div>
        <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 6px; font-weight: bold;">İlk 11</div>
        <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px;">
          ${renderPlayerList(homeStarters, true)}
        </div>
        <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 6px; font-weight: bold;">Yedekler</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${renderPlayerList(homeBench, true)}
        </div>
      </div>

      <div class="lineup-column-away">
        <div class="section-title" style="color: #4ade80; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #2d3748; padding-bottom: 4px; text-align: right;">${selectedMatch.awayTeam}</div>
        <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 6px; font-weight: bold; text-align: right;">İlk 11</div>
        <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px;">
          ${renderPlayerList(awayStarters, false)}
        </div>
        <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 6px; font-weight: bold; text-align: right;">Yedekler</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${renderPlayerList(awayBench, false)}
        </div>
      </div>
    </div>
  `;
}

function goBack() {
  renderList();
}

renderList();
