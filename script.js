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

      let html = '';
      data.forEach(group => {
        html += `<div class="league-title">${group.league}</div>`;
        group.matches.forEach(m => {
          let timeDisplay = '';
          let centerDisplay = '';
          let badgeClass = '';

          if (m.state === 'pre') {
            let timeStr = m.time || '';
            
            // Eğer gelen veri içinde 'October' veya virgül gibi ifadeler geçiyorsa temizle
            if (timeStr.includes(',')) {
              const parts = timeStr.split(',');
              timeStr = parts[1] ? parts[1].trim() : timeStr;
            }

            if (timeStr.includes('at')) {
              const parts = timeStr.split('at');
              timeStr = parts[1] ? parts[1].trim() : timeStr;
            }

            const isPM = timeStr.toUpperCase().includes('PM');
            const isAM = timeStr.toUpperCase().includes('AM');
            timeStr = timeStr.replace(/am|pm|EDT|EST|October|January|February|March|April|May|June|July|August|September|November|December|\d{1,2}th|\d{1,2}st|\d{1,2}nd|\d{1,2}rd/gi, '').trim();

            if (isPM || isAM) {
              let [hours, minutes] = timeStr.split(':');
              if (hours && minutes) {
                let h = parseInt(hours, 10);
                if (isPM && h < 12) h += 12;
                if (isAM && h === 12) h = 0;
                timeStr = `${String(h).padStart(2, '0')}:${minutes}`;
              }
            }

            // Saat formatına gelmediyse ve çok uzunsa güvenli bir çizgi koyalım
            if (!timeStr.includes(':')) {
              timeStr = (m.time && m.time.length <= 5 && m.time.includes(':')) ? m.time : '--:--';
            }

            timeDisplay = timeStr;
            badgeClass = 'upcoming';
            centerDisplay = `<div class="vs-divider" style="padding: 0 10px; color: #64748b; font-size: 12px; flex-shrink: 0;">v</div>`;
          } else if (m.state === 'in') {
            timeDisplay = `<span class="live-dot"></span> Canlı`;
            badgeClass = 'live';
            centerDisplay = `<div style="background: #1e293b; border: 1px solid #4ade80; padding: 2px 8px; border-radius: 4px; font-weight: bold; color: #4ade80; font-size: 12px; flex-shrink: 0;">${m.homeScore} -${m.awayScore}</div>`;
          } else {
            timeDisplay = `MS`;
            badgeClass = 'finished';
            centerDisplay = `<div style="background: #0f172a; padding: 2px 8px; border-radius: 4px; font-weight: bold; color: #fff; font-size: 12px; flex-shrink: 0;">${m.homeScore} -${m.awayScore}</div>`;
          }

          html += `
            <div class="match-card mackolik-style" onclick="openDetail('${m.id}', '${m.homeTeam}', '${m.awayTeam}', '${m.homeLogo}', '${m.awayLogo}', '${m.homeScore}', '${m.awayScore}', '${m.homeId \vert{}\vert{} ''}', '${m.awayId || ''}')">
              <div class="match-time-col ${badgeClass}">${timeDisplay}</div>
              <div class="match-teams-col" style="display: flex; align-items: center; width: 100%;">
                
                <!-- Ev Sahibi: Logo Solda, İsim Sağda -->
                <div style="display: flex; align-items: center; gap: 8px; flex: 1; justify-content: flex-start; overflow: hidden;">
                  <img src="${m.homeLogo}" width="20" height="20" onerror="this.style.opacity=0" style="object-fit: contain; flex-shrink: 0;">
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">${m.homeTeam}</span>
                </div>

                <!-- Ortada Skor veya 'v' -->
                ${centerDisplay}

                <!-- Deplasman: İsim Solda, Logo Sağda -->
                <div style="display: flex; align-items: center; gap: 8px; flex: 1; justify-content: flex-end; overflow: hidden;">
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right;">${m.awayTeam}</span>
                  <img src="${m.awayLogo}" width="20" height="20" onerror="this.style.opacity=0" style="object-fit: contain; flex-shrink: 0;">
                </div>

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
  const msScore = (m.homeScore !== 'null' && m.homeScore !== null) ? `${m.homeScore} -${m.awayScore}` : '0 - 0';

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
          <img src="${
            
