// İNGİLİZCE - TÜRKÇE TAKIM / ÜLKE İSİMLERİ SÖZLÜĞÜ
const teamTranslations = {
  "Cyprus": "Kıbrıs",
  "Armenia": "Ermenistan",
  "Latvia": "Letonya",
  "Montenegro": "Karadağ",
  "Faroe Islands": "Faroe Adaları",
  "Ukraine": "Ukrayna",
  "Northern Ireland": "Kuzey İrlanda",
  "North Macedonia": "Kuzey Makedonya",
  "Lithuania": "Litvanya",
  "Estonia": "Estonya",
  "Belarus": "Beyaz Rusya",
  "Czechia": "Çekya",
  "Czech Republic": "Çekya",
  "Switzerland": "İsviçre",
  "Austria": "Avusturya",
  "Greece": "Yunanistan",
  "Spain": "İspanya",
  "Germany": "Almanya",
  "England": "İngiltere",
  "Netherlands": "Hollanda",
  "Croatia": "Hırvatistan",
  "Scotland": "İskoçya",
  "Wales": "Galler",
  "Ireland": "İrlanda",
  "Republic of Ireland": "İrlanda",
  "Albania": "Arnavutluk",
  "Bulgaria": "Bulgaristan",
  "Azerbaijan": "Azerbaycan",
  "Georgia": "Gürcistan",
  "Hungary": "Macaristan",
  "Poland": "Polonya",
  "Romania": "Romanya",
  "Slovakia": "Slovakya",
  "Slovenia": "Slovenya",
  "Serbia": "Sırbistan",
  "Denmark": "Danimarka",
  "Finland": "Finlandiya",
  "Norway": "Norveç",
  "Sweden": "İsveç",
  "Iceland": "İzlanda",
  "Turkey": "Türkiye",
  "Turkiye": "Türkiye",
  "Italy": "İtalya",
  "France": "Fransa",
  "Belgium": "Belçika",
  "Portugal": "Portekiz",
  "Bosnia and Herzegovina": "Bosna-Hersek",
  "Bosnia-Herzegovina": "Bosna-Hersek",
  "Moldova": "Moldova",
  "Kazakhstan": "Kazakistan",
  "Kyrgyz Republic": "Kırgızistan",
  "Kyrgyzstan": "Kırgızistan"
};

function translateTeam(name) {
  if (!name) return name;
  return teamTranslations[name] || name;
}

const LEAGUES = [
  { slug: 'uefa.nations', name: 'Avrupa - UEFA Uluslar Ligi' },
  { slug: 'tur.1', name: 'Süper Lig' },
  { slug: 'eng.1', name: 'İngiltere Premier Lig' },
  { slug: 'esp.1', name: 'İspanya La Liga' },
  { slug: 'ita.1', name: 'İtalya Serie A' },
  { slug: 'ger.1', name: 'Almanya Bundesliga' },
  { slug: 'fra.1', name: 'Fransa Ligue 1' },
  { slug: 'uefa.champions', name: 'UEFA Şampiyonlar Ligi' },
  { slug: 'uefa.europa', name: 'UEFA Avrupa Ligi' }
];

module.exports = async (req, res) => {
  const targetDate = req.query.date ? req.query.date.replace(/-/g, '') : new Date().toISOString().slice(0,10).replace(/-/g, '');
  
  try {
    const promises = LEAGUES.map(async (league) => {
      try {
        const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/scoreboard?dates=${targetDate}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        
        const data = await response.json();
        const events = data.events || [];

        if (events.length > 0) {
          const formattedMatches = events.map(event => {
            const comp = event.competitions[0];
            const home = comp.competitors.find(c => c.homeAway === 'home') || comp.competitors[0];
            const away = comp.competitors.find(c => c.awayAway === 'away') || comp.competitors[1];

            const statusState = event.status.type.state;
            let displayMinute = event.status.type.shortDetail;

            // Başlamamış maçlar için başlama saatini Türkiye saatine göre alıyoruz (HH:mm)
            if (statusState === 'pre') {
              const matchDate = new Date(event.date);
              displayMinute = matchDate.toLocaleTimeString('tr-TR', {
                timeZone: 'Europe/Istanbul',
                hour: '2-digit',
                minute: '2-digit'
              });
            } else if (statusState === 'post') {
              displayMinute = 'MS';
            }

            return {
              id: event.id,
              leagueSlug: league.slug,
              homeTeam: translateTeam(home.team.displayName),
              awayTeam: translateTeam(away.team.displayName),
              homeScore: home.score || '0',
              awayScore: away.score || '0',
              minute: displayMinute,
              status: statusState === 'in' ? 'LIVE' : (statusState === 'post' ? 'FINISHED' : 'PRE'),
              venue: comp.venue ? comp.venue.fullName : ''
            };
          });

          return {
            league: league.name,
            matches: formattedMatches
          };
        }
      } catch (e) {
        return null;
      }
      return null;
    });

    const results = await Promise.all(promises);
    const filteredResult = results.filter(item => item !== null);

    res.status(200).json(filteredResult);
  } catch (error) {
    res.status(500).json({ error: 'Maç verileri çekilemedi.' });
  }
};
