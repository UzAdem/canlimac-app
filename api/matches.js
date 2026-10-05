export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { date } = req.query; // YYYY-MM-DD
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${targetDate.replace(/-/g, '')}`);

    if (response.ok) {
      const data = await response.json();
      const events = data.events || [];

      if (events.length > 0) {
        const grouped = {};

        events.forEach(event => {
          // Lig ismini doğrudan lig objesinden alıyoruz
          const leagueName = event.league?.name || event.competitions?.[0]?.league?.name || 'Diğer Ligler';

          if (!grouped[leagueName]) {
            grouped[leagueName] = {
              league: leagueName,
              matches: []
            };
          }

          const competition = event.competitions?.[0];
          const home = competition?.competitors?.find(c => c.homeAway === 'home');
          const away = competition?.competitors?.find(c => c.homeAway === 'away');

          const matchDate = new Date(event.date);
          const hours = String(matchDate.getHours()).padStart(2, '0');
          const minutes = String(matchDate.getMinutes()).padStart(2, '0');

          grouped[leagueName].matches.push({
            id: event.id,
            time: `${hours}:${minutes}`,
            homeTeam: home?.team?.displayName || 'Ev Sahibi',
            awayTeam: away?.team?.displayName || 'Deplasman',
            homeScore: home?.score ?? '0',
            awayScore: away?.score ?? '0',
            homeLogo: home?.team?.logo || null,
            awayLogo: away?.team?.logo || null
          });
        });

        return res.status(200).json(Object.values(grouped));
      }
    }
  } catch (err) {
    console.error("ESPN Fetch Error:", err);
  }

  res.status(200).json([]);
}
