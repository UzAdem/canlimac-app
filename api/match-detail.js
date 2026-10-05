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
      return res.status(200).json({ events: [], statusDetail: 'Maç Sonu' });
    }

    const data = await response.json();
    const headerComp = data?.header?.competitions?.[0];
    const statusDetail = headerComp?.status?.type?.detail || 'Maç Sonu';

    // Ev Sahibi ve Deplasman Takım Bilgileri
    const homeComp = headerComp?.competitors?.find(c => c.homeAway === 'home');
    const awayComp = headerComp?.competitors?.find(c => c.homeAway === 'away');

    const homeId = String(homeComp?.id || '');
    const homeName = homeComp?.team?.displayName || '';
    const awayId = String(awayComp?.id || '');
    const awayName = awayComp?.team?.displayName || '';

    // İlk Yarı Skoru
    let homeIY = undefined;
    let awayIY = undefined;
    if (homeComp?.linescores?.[0]?.value !== undefined && awayComp?.linescores?.[0]?.value !== undefined) {
      homeIY = homeComp.linescores[0].value;
      awayIY = awayComp.linescores[0].value;
    }

    const rawEvents = data?.keyEvents || [];
    const events = [];

    rawEvents.forEach(item => {
      try {
        const clock = item?.clock?.displayValue || item?.time?.displayValue || '';
        const typeId = String(item?.type?.id || '');
        const typeText = String(item?.type?.text || '').toLowerCase();
        const text = String(item?.text || '');

        let icon = null;
        let typeLabel = '';

        // SADECE ÖNEMLİ OLAYLARI FİLTRELE (Gereksiz raptiyeler elenir)
        if (typeId === '1' || typeText.includes('goal')) {
          icon = '⚽';
          typeLabel = 'Gol';
          if (typeText.includes('own') || text.toLowerCase().includes('own goal')) {
            typeLabel = 'Kendi Kalesine Gol';
          } else if (typeText.includes('penalty')) {
            typeLabel = 'Penaltı Golü';
          }
        } else if (typeId === '3' || typeText.includes('yellow card') || typeText === 'yellow') {
          icon = '🟨';
          typeLabel = 'Sarı Kart';
        } else if (typeId === '4' || typeText.includes('red card') || typeText === 'red') {
          icon = '🟥';
          typeLabel = 'Kırmızı Kart';
        } else if (typeId === '2' || typeText.includes('substitution') || (text.includes('→') && !typeText.includes('goal'))) {
          icon = '🔄';
          typeLabel = 'Oyuncu Değişikliği';
        }

        // Önemsiz bir olay ise (raptiye vb.) listeden atla
        if (!icon) return;

        // Ev Sahibi mi Deplasman mı kontrolü
        const itemTeamId = String(item?.team?.id || '');
        let isHome = false;

        if (itemTeamId) {
          isHome = (itemTeamId === homeId);
        } else if (homeName && text.includes(homeName)) {
          isHome = true;
        }

        const teamName = isHome ? homeName : awayName;

        let player = text;
        if (item?.participants?.[0]?.athlete?.displayName) {
          player = item.participants[0].athlete.displayName;
          if (item?.participants?.[1]?.athlete?.displayName) {
            player += ` → ${item.participants[1].athlete.displayName}`;
          }
        }

        events.push({
          clock,
          icon,
          typeLabel,
          player,
          teamName,
          isHome
        });
      } catch (err) {
        console.error('Event parse error:', err);
      }
    });

    return res.status(200).json({
      statusDetail,
      homeIY,
      awayIY,
      events
    });

  } catch (error) {
    console.error('Match Detail API Error:', error);
    return res.status(200).json({ events: [], statusDetail: 'Maç Sonu' });
  }
}
