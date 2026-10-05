export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { date } = req.query; // Format: YYYY-MM-DD

  try {
    // Sofascore / Canlı Skor API isteği (API Key gerektirmez)
    const targetDate = date || new Date().toISOString().split('T')[0];
    const response = await fetch(`https://api.sofascore.com/api/v1/sport/football/scheduled-events/${targetDate}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    const events = data.events || [];

    // Ön yüzün (index.html) beklediği gruplanmış lig formatı
    const grouped = {};

    events.forEach(event => {
      const leagueName = event.tournament?.name || 'Diğer Ligler';
      const categoryName = event.tournament?.category?.name || '';
      const fullLeagueName = categoryName ? `${categoryName} ${leagueName}` : leagueName;

      if (!grouped[fullLeagueName]) {
        grouped[fullLeagueName] = {
          league: fullLeagueName,
          matches: []
        };
      }

      // Maç saati formatlama (SS:DK)
      const matchDate = new Date(event.startTimestamp * 1000);
      const hours = String(matchDate.getHours()).padStart(2, '0');
      const minutes = String(matchDate.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      grouped[fullLeagueName].matches.push({
        id: event.id,
        time: timeStr,
        homeTeam: event.homeTeam?.name || 'Ev Sahibi',
        awayTeam: event.awayTeam?.name || 'Deplasman',
        homeScore: event.homeScore?.current ?? 'v',
        awayScore: event.awayScore?.current ?? '',
        homeLogo: event.homeTeam?.id ? `https://api.sofascore.app/api/v1/team/${event.homeTeam.id}/image` : null,
        awayLogo: event.awayTeam?.id ? `https://api.sofascore.app/api/v1/team/${event.awayTeam.id}/image` : null,
        isStarted: event.status?.type !== 'notstarted',
        status: event.status?.type === 'inprogress' ? 'in' : 'finished',
        leagueSlug: event.tournament?.slug || ''
      });
    });

    res.status(200).json(Object.values(grouped));
  } catch (error) {
    console.error("Matches API Error:", error);
    res.status(500).json({ error: "Fikstür verileri çekilemedi." });
  }
}
