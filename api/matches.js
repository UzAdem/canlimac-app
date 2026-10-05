export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { date } = req.query; // YYYY-MM-DD
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    // Vercel uyuşmazlığı olmayan açık spor servisi
    const response = await fetch(`https://api.sofascore.com/api/v1/sport/football/scheduled-events/${targetDate}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    const events = data.events || [];

    const grouped = {};

    events.forEach(event => {
      // Lig İsmi
      const category = event.tournament?.category?.name || '';
      const tournament = event.tournament?.name || 'Diğer Ligler';
      const leagueName = category ? `${category} - ${tournament}` : tournament;

      if (!grouped[leagueName]) {
        grouped[leagueName] = {
          league: leagueName,
          matches: []
        };
      }

      // Saat Formatı (SS:DK)
      const matchDate = new Date(event.startTimestamp * 1000);
      const hours = String(matchDate.getHours()).padStart(2, '0');
      const minutes = String(matchDate.getMinutes()).padStart(2, '0');

      grouped[leagueName].matches.push({
        id: event.id,
        time: `${hours}:${minutes}`,
        homeTeam: event.homeTeam?.name || 'Ev Sahibi',
        awayTeam: event.awayTeam?.name || 'Deplasman',
        homeScore: event.homeScore?.current ?? 'v',
        awayScore: event.awayScore?.current ?? '',
        homeLogo: event.homeTeam?.id ? `https://api.sofascore.app/api/v1/team/${event.homeTeam.id}/image` : null,
        awayLogo: event.awayTeam?.id ? `https://api.sofascore.app/api/v1/team/${event.awayTeam.id}/image` : null
      });
    });

    res.status(200).json(Object.values(grouped));
  } catch (error) {
    console.error("Matches API Error:", error);
    res.status(500).json({ error: "Veriler çekilemedi." });
  }
}
