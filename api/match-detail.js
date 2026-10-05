export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Match ID required' });
  }

  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${id}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );

    if (!response.ok) {
      return res.status(200).json({ events: [], lineups: { home: [], away: [] }, statusDetail: 'MS' });
    }

    const data = await response.json();
    const headerComp = data?.header?.competitions?.[0];
    const rawStatus = headerComp?.status?.type?.detail || 'MS';
    const statusDetail = (rawStatus.includes('FT') || rawStatus.includes('Sonu')) ? 'MS' : rawStatus;

    // Ev Sahibi ve Deplasman Bilgileri
    const homeComp = headerComp?.competitors?.find(c => c.homeAway === 'home');
    const awayComp = headerComp?.competitors?.find(c => c.homeAway === 'away');

    const homeId = String(homeComp?.id || '');
    const homeName = homeComp?.team?.displayName || '';
    const awayId = String(awayComp?.id || '');
    const awayName = awayComp?.team?.displayName || '';

    // Kadro Verisi Çekme (Rosters)
    const rosters = data?.rosters || [];
    const parseRoster = (teamRoster) => {
      const starters = [];
      const bench = [];

      (teamRoster?.roster || []).forEach(playerObj => {
        const name = playerObj?.athlete?.displayName || playerObj?.athlete?.shortName || 'Oyuncu';
        const jersey = playerObj?.jersey || '';
        const position = playerObj?.position?.abbreviation || '';
        const isStarter = playerObj?.starter || false;

        const playerInfo = { name, jersey, position };
        if (isStarter) starters.push(playerInfo);
        else bench.push(playerInfo);
      });

      return { starters, bench };
    };

    const homeRosterRaw = rosters.find(r => String(r?.team?.id) === homeId);
    const awayRosterRaw = rosters.find(r => String(r?.team?.id) === awayId);

    const lineups = {
      home: parseRoster(homeRosterRaw),
      away: parseRoster(awayRosterRaw)
    };

    // Olaylar (Events)
    const rawEvents = data?.keyEvents || [];
    const events = [];
    let homeIY = 0;
    let awayIY = 0;

    rawEvents.forEach(item => {
      try {
        const clock = item?.clock?.displayValue || item?.time?.displayValue || '0';
        const typeId = String(item?.type?.id || '');
        const typeText = String(item?.type?.text || '').toLowerCase();
        const text = String(item?.text || '');

        let icon = null;
        let typeLabel = '';
        let isGoal = false;

        if (typeId === '1' || typeText.includes('goal')) {
          isGoal = true;
          if (typeText.includes('own') || text.toLowerCase().includes('own goal')) {
            icon = '⚽';
            typeLabel = 'Kendi Kalesine Gol';
          } else if (typeText.includes('penalty')) {
            icon = '⚽';
            typeLabel = 'Penaltı Golü';
          } else {
            icon = '⚽';
            typeLabel = 'Gol';
          }
        } else if (typeId === '3' || typeText.includes('yellow')) {
          icon = '🟨';
          typeLabel = 'Sarı Kart';
        } else if (typeId === '4' || typeText.includes('red')) {
          icon = '🟥';
          typeLabel = 'Kırmızı Kart';
        } else if (typeId === '2' || typeText.includes('sub')) {
          icon = '🔄';
          typeLabel = 'Oyuncu Değişikliği';
        }

        if (!icon) return;

        const itemTeamId = String(item?.team?.id || '');
        let isHome = false;

        if (itemTeamId) {
          isHome = (itemTeamId === homeId);
        } else if (homeName && text.includes(homeName)) {
          isHome = true;
        }

        const minute = parseInt(clock) || 0;
        if (isGoal && minute <= 45) {
          if (isHome) homeIY++;
          else awayIY++;
        }

        let player = '';
        if (item?.participants && item.participants.length > 0) {
          const p1 = item.participants[0]?.athlete?.displayName || '';
          const p2 = item.participants[1]?.athlete?.displayName || '';

          if (icon === '🔄' && p1 && p2) {
            player = `${p1} ➔ ${p2}`;
          } else if (p1) {
            player = p1;
          }
        }

        if (!player) player = text;

        events.push({ clock, icon, typeLabel, player, isHome });
      } catch (err) {
        console.error('Event parse error:', err);
      }
    });

    return res.status(200).json({
      statusDetail,
      homeIY,
      awayIY,
      events,
      lineups
    });

  } catch (error) {
    console.error('Match Detail API Error:', error);
    return res.status(200).json({ events: [], lineups: { home: [], away: [] }, statusDetail: 'MS', homeIY: 0, awayIY: 0 });
  }
}
