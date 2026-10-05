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

    // Ev Sahibi ve Deplasman Bilgileri
    const homeComp = headerComp?.competitors?.find(c => c.homeAway === 'home');
    const awayComp = headerComp?.competitors?.find(c => c.homeAway === 'away');

    const homeId = String(homeComp?.id || '');
    const homeName = homeComp?.team?.displayName || '';
    const awayId = String(awayComp?.id || '');
    const awayName = awayComp?.team?.displayName || '';

    // İlk Yarı Skoru Arama (Linescores veya period verisi)
    let homeIY = undefined;
    let awayIY = undefined;

    if (homeComp?.linescores?.[0]?.value !== undefined && awayComp?.linescores?.[0]?.value !== undefined) {
      homeIY = Math.round(homeComp.linescores[0].value);
      awayIY = Math.round(awayComp.linescores[0].value);
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

        // Olay Türü Ayıklama
        if (typeId === '1' || typeText.includes('goal')) {
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

        // Önemsiz bildirimse (raptiye vb.) atla
        if (!icon) return;

        // Ev Sahibi mi Deplasman mı?
        const itemTeamId = String(item?.team?.id || '');
        let isHome = false;

        if (itemTeamId) {
          isHome = (itemTeamId === homeId);
        } else if (homeName && text.includes(homeName)) {
          isHome = true;
        }

        const teamName = isHome ? homeName : awayName;

        // Oyuncu İsmi Temizleme & Oyuncu Değişikliği Formatlama
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

        if (!player) {
          player = text;
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
