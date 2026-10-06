export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { date } = req.query;
  const targetDate = date ? date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');

  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${targetDate}`
    );

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    const events = data.events || [];

    const grouped = {};

    // Lig adlarını Türkçeleştirme ve standartlaştırma
    const translateLeague = (slug, leagueNameAPI) => {
      const s = ((slug || '') + ' ' + (leagueNameAPI || '')).toLowerCase();
      
      if (s.includes('turkish-super-lig') || s.includes('super lig') || s.includes('sÜper lig')) return 'SÜPER LİG';
      if (s.includes('english-premier-league') || s.includes('premier lig')) return 'PREMIER LİG';
      if (s.includes('spanish-primera-division') || s.includes('la liga') || s.includes('laliga')) return 'LA LİGA';
      if (s.includes('italian-serie-a') || s.includes('serie a')) return 'SERİE A';
      if (s.includes('german-bundesliga') || s.includes('bundesliga')) return 'BUNDESLİGA';
      if (s.includes('french-ligue-one') || s.includes('ligue 1')) return 'LİGUE 1';
      if (s.includes('english-championship') || s.includes('championship')) return 'İNGİLTERE CHAMPIONSHIP';
      if (s.includes('turkish-1-lig') || s.includes('1. lig') || s.includes('tff 1')) return '1. LİG';
      
      return (leagueNameAPI || slug || 'DİĞER LİGLER').replace(/-/g, ' ').toUpperCase();
    };

    // Takım adlarını Türkçeleştirme
    const translateTeam = (name) => {
      if (!name) return '';
      const map = {
        'Genclerbirligi': 'Gençlerbirliği',
        'Caykur Rizespor': 'Çaykur Rizespor',
        'Fenerbahce': 'Fenerbahçe',
        'Basaksehir': 'Başakşehir',
        'Besiktas': 'Beşiktaş',
        'Goztepe': 'Göztepe',
        'Konyaspor': 'Konyaspor',
        'Gaziantep FK': 'Gaziantep FK',
        'Sivasspor': 'Sivasspor',
        'Antalyaspor': 'Antalyaspor',
        'Kayserispor': 'Kayserispor',
        'Samsunspor': 'Samsunspor',
        'Trabzonspor': 'Trabzonspor',
        'Alanyaspor': 'Alanyaspor',
        'Kasimpasa': 'Kasımpaşa',
        'Adana Demirspor': 'Adana Demirspor',
        'Hatayspor': 'Hatayspor',
        'Bodrum FK': 'Bodrum FK',
        'Eyupspor': 'Eyüpspor',
        'Kocaelispor': 'Kocaelispor',
        'Sakaryaspor': 'Sakaryaspor',
        'Amed SFK': 'Amed SK'
      };
      return map[name] || name;
    };

    events.forEach(event => {
      const rawSlug = event.season?.slug || '';
      const rawLeagueName = event.league?.name || '';
      const leagueName = translateLeague(rawSlug, rawLeagueName);
      
      const competition = event.competitions?.[0];
      if (!competition) return;

      const homeComp = competition.competitors?.find(c => c.homeAway === 'home');
      const awayComp = competition.competitors?.find(c => c.homeAway === 'away');

      const status = competition.status?.type?.state; // 'pre', 'in', 'post'
      const matchDate = new Date(event.date);
      
      const timeStr = matchDate.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Istanbul' 
      });

      const matchObj = {
        id: event.id,
        time: status === 'in' ? (competition.status?.displayClock || 'Canlı') : timeStr,
        state: status,
        homeTeam: translateTeam(homeComp?.team?.displayName || 'Ev Sahibi'),
        awayTeam: translateTeam(awayComp?.team?.displayName || 'Deplasman'),
        homeLogo: homeComp?.team?.logo || '',
        awayLogo: awayComp?.team?.logo || '',
        homeScore: status !== 'pre' ? (homeComp?.score || '0') : null,
        awayScore: status !== 'pre' ? (awayComp?.score || '0') : null
      };

      if (!grouped[leagueName]) {
        grouped[leagueName] = [];
      }
      grouped[leagueName].push(matchObj);
    });

    // İstediğin Kesin Sıralama Önceliği
    const priorityLeagues = [
      'SÜPER LİG',
      'PREMIER LİG',
      'LA LİGA',
      'SERİE A',
      'BUNDESLİGA',
      'LİGUE 1',
      'İNGİLTERE CHAMPIONSHIP'
    ];

    const sortedLeagues = Object.keys(grouped).sort((a, b) => {
      let indexA = priorityLeagues.indexOf(a);
      let indexB = priorityLeagues.indexOf(b);

      if (indexA === -1) indexA = 999;
      if (indexB === -1) indexB = 999;

      if (indexA !== indexB) {
        return indexA - indexB;
      }
      return a.localeCompare(b);
    });

    const result = sortedLeagues.map(league => ({
      league: league,
      matches: grouped[league]
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Matches API Error:', error);
    return res.status(200).json([]);
  }
        }
      
