export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const matchesData = [
    {
      league: "🇹🇷 Türkiye Trendyol Süper Lig",
      matches: [
        {
          id: 101,
          homeTeam: "Galatasaray",
          awayTeam: "Fenerbahçe",
          homeScore: 2,
          awayScore: 1,
          status: "LIVE",
          minute: "67'"
        },
        {
          id: 102,
          homeTeam: "Beşiktaş",
          awayTeam: "Trabzonspor",
          homeScore: 1,
          awayScore: 0,
          status: "FINISHED",
          minute: "MS"
        }
      ]
    },
    {
      league: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 İngiltere Premier Lig",
      matches: [
        {
          id: 201,
          homeTeam: "Arsenal",
          awayTeam: "Chelsea",
          homeScore: 0,
          awayScore: 0,
          status: "LIVE",
          minute: "34'"
        },
        {
          id: 202,
          homeTeam: "Manchester City",
          awayTeam: "Liverpool",
          homeScore: "-",
          awayScore: "-",
          status: "UPCOMING",
          minute: "22:00"
        }
      ]
    }
  ];

  res.status(200).json(matchesData);
}
