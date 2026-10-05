export default async function handler(req, res) {
  const { matchId } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: 'matchId gereklidir' });
  }

  try {
    // ESPN Summary API
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${matchId}`
    );

    if (!response.ok) {
      return res.status(200).json({ header: null, events: [] });
    }

    const data = await response.json();

    // Olayları (Goller, Kartlar, Değişiklikler) derleme
    const events = [];

    // 1. Goller ve Önemli Olaylar (Key Events / Play-by-play)
    if (data.keyEvents && Array.isArray(data.keyEvents)) {
      data.keyEvents.forEach(evt => {
        events.push({
          id: evt.id || Math.random().toString(),
          type: evt.type?.text || 'Olay',
          clock: evt.clock?.displayValue || evt.time?.displayValue || '',
          team: evt.team?.displayName || evt.team?.name || '',
          player: evt.participants?.[0]?.athlete?.displayName || evt.text || '',
          detail: evt.text || ''
        });
      });
    }

    // 2. Detaylı Maç Olayları (Rosters / Plays)
    if (data.plays && Array.isArray(data.plays)) {
      data.plays.forEach(play => {
        events.push({
          id: play.id || Math.random().toString(),
          type: play.type?.text || 'Olay',
          clock: play.clock?.displayValue || '',
          team: play.team?.displayName || '',
          player: play.text || '',
          detail: play.text || ''
        });
      });
    }

    // 3. Genel Başlık Verileri (Skor, İY Skoru vb.)
    const header = data.header || null;

    res.status(200).json({
      header: header,
      events: events
    });

  } catch (error) {
    console.error('Match details error:', error);
    res.status(200).json({ header: null, events: [] });
  }
          }
