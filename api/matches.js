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

    // Lig adlarını Türkçeleştirme sözlüğü
    const translateLeague = (slug) => {
      if (!slug) return 'DİĞER LİGLER';
      const s = slug.toLowerCase();
      if (s.includes('turkish-super-lig') || s.includes('super-lig')) return 'SÜPER LİG';
      if (s.includes('turkish-1-lig') || s.includes('1-lig') || s.includes('tff-1')) return '1. LİG';
      if (s.includes('english-premier-league') || s.includes('premier-league')) return 'PREMIER LİG';
      if (s.includes('spanish-primera-division') || s.includes('la-liga')) return 'LA LİGA';
      if (s.includes('italian-serie-a') || s.includes('serie-a')) return 'SERİE A';
      if (s.includes('german-bundesliga') || s.includes('bundesliga')) return 'BUNDESLİGA';
      if (s.includes('french-ligue-one') || s.includes('ligue-1')) return 'LİGUE 1';
      return slug.replace(/-/g, ' ').toUpperCase();
    };

    // Takım adlarını Türkçeleştirme / Karakter düzeltme sözlüğü
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
      const rawLeague = event.season?.slug || event.league?.name || 'Diğer Ligler';
      const leagueName = translateLeague(rawLeague);
      
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

    const result = Object.keys(grouped).map(league => ({
      league: league,
      matches: grouped[league]
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Matches API Error:', error);
    return res.status(200).json([]);
  }
    }
        
