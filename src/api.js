import { getActiveKey, rotateKey, YOUTUBE_KEYS } from './config';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Dynamic API Base URL for Express backend.
// Defaults to local proxy in dev, and automatically points to the Render backend when hosted on GitHub Pages.
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  || (typeof window !== 'undefined' && window.location.hostname.includes('github.io') ? 'https://sonoria-backend.onrender.com' : '');

/**
 * Helper to parse ISO 8601 duration (e.g. PT4M13S -> 253 seconds)
 */
export function parseISO8601Duration(durationString) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = (durationString || '').match(regex);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format views count (e.g., 1482048 -> "1.5M views")
 */
export function formatViews(viewsStr) {
  const num = parseInt(viewsStr, 10);
  if (isNaN(num)) return '';
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B views`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K views`;
  return `${num} views`;
}

/**
 * Cleans YouTube titles (e.g. "Song Name (Official Video) [HQ]" -> "Song Name")
 */
export function cleanSongTitle(title) {
  return title
    .replace(/\(Official\s*(Video|Audio|Lyric|Music Video|Music)?\)/gi, '')
    .replace(/\[Official\s*(Video|Audio|Lyric|Music Video|Music)?\]/gi, '')
    .replace(/\(Video\)/gi, '')
    .replace(/\[Video\]/gi, '')
    .replace(/\(Audio\)/gi, '')
    .replace(/\[Audio\]/gi, '')
    .replace(/\(Lyrics\)/gi, '')
    .replace(/\[Lyrics\]/gi, '')
    .replace(/\(Lyric\s*Video\)/gi, '')
    .replace(/\[Lyric\s*Video\]/gi, '')
    .replace(/\(HD\)/gi, '')
    .replace(/\[HD\]/gi, '')
    .replace(/\(HQ\)/gi, '')
    .replace(/\[HQ\]/gi, '')
    .replace(/ft\./gi, 'feat.')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches YouTube data securely via our backend proxy
 */
async function fetchWithKeyRotation(endpoint, params = {}) {
  const baseUrl = API_BASE ? API_BASE : window.location.origin;
  const url = new URL(`${baseUrl}/api/youtube${endpoint}`);
  
  // Add all query parameters
  Object.entries(params).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`[Sonoria] Secure backend YouTube proxy failed: ${error.message}`);
    throw error;
  }
}

/**
 * Searches songs on YouTube
 * @param {string} query 
 * @returns {Promise<Array>}
 */
export async function searchYouTubeSongs(query) {
  if (!query || !query.trim()) return [];

  // 1. Initial search with music category (highly relevant official videos)
  const searchResults = await fetchWithKeyRotation('/search', {
    part: 'snippet',
    q: `${query}`,
    type: 'video',
    maxResults: 50,
    videoCategoryId: '10' // Music category
  });

  let songs = await processYouTubeItems(searchResults.items || []);

  // Filter helper
  const lowerQuery = query.toLowerCase();
  const djKeywords = ['dj', 'remix', 'mix', 'mashup', 'nonstop', 'party', 'remixed'];
  const isExplicitSearch = djKeywords.some(keyword => lowerQuery.includes(keyword));
  const longVideoKeywords = ['mix', 'compilation', 'playlist', 'hour', 'hours', 'nonstop', 'live', 'stream', 'full album', 'album'];
  const isLookingForLongVideo = longVideoKeywords.some(keyword => lowerQuery.includes(keyword));

  function filterSongs(songList) {
    return songList.filter(song => {
      // Exclude live streams
      if (song.liveBroadcastContent === 'live' || song.liveBroadcastContent === 'upcoming') {
        return false;
      }
      
      const lowerTitle = song.title.toLowerCase();
      const lowerArtist = song.artist.toLowerCase();

      // Filter DJ keywords if not explicitly requested
      if (!isExplicitSearch) {
        const containsDjKeyword = djKeywords.some(keyword => 
          lowerTitle.includes(keyword) || 
          lowerArtist.includes(keyword)
        );
        if (containsDjKeyword) return false;
      }

      // Filter long videos unless looking for them
      if (!isLookingForLongVideo) {
        const containsLongKeyword = longVideoKeywords.some(keyword => lowerTitle.includes(keyword));
        if (containsLongKeyword) return false;
        
        if (!song.duration || song.duration > 600) return false;
      }

      return true;
    });
  }

  let filteredSongs = filterSongs(songs);

  // 2. Fallback / supplementary search without category constraints if we got few tracks
  if (filteredSongs.length < 40) {
    const fallbackResults = await fetchWithKeyRotation('/search', {
      part: 'snippet',
      q: `${query}`,
      type: 'video',
      maxResults: 50
    });
    const fallbackSongs = await processYouTubeItems(fallbackResults.items || []);
    const filteredFallback = filterSongs(fallbackSongs);

    // Merge lists, avoiding duplicates
    const existingIds = new Set(filteredSongs.map(s => s.id));
    filteredFallback.forEach(song => {
      if (!existingIds.has(song.id)) {
        filteredSongs.push(song);
      }
    });
  }

  // Limit back to standard 50 results for the UI display
  return filteredSongs.slice(0, 50);
}

/**
 * Smart engine to search and return ONLY individual Lofi Chill songs.
 * Filters out live streams, radio loops, compilations, mixes, and long/short edge cases.
 * @returns {Promise<Array>}
 */
export async function fetchLofiChillSongs() {
  const primaryQuery = 'lofi hip hop -mix -playlist -live -stream';
  const secondaryQuery = 'lofi chill beats single -mix -playlist -live -stream';
  
  const searchResults = await fetchWithKeyRotation('/search', {
    part: 'snippet',
    q: primaryQuery,
    type: 'video',
    maxResults: 50
  });

  let songs = await processYouTubeItems(searchResults.items || []);

  const excludedKeywords = ['mix', 'playlist', 'compilation', 'live', 'stream', 'radio', 'hour', 'hours', 'nonstop', 'full album', 'album', 'loop', '1h', '2h', '3h', '10h', '24/7'];

  function filterLofiSongs(songList) {
    return songList.filter(song => {
      if (song.liveBroadcastContent === 'live' || song.liveBroadcastContent === 'upcoming') {
        return false;
      }
      
      const lowerTitle = song.title.toLowerCase();
      
      const hasExcludedKeyword = excludedKeywords.some(keyword => 
        lowerTitle.includes(keyword)
      );
      
      if (hasExcludedKeyword) return false;
      
      if (!song.duration || song.duration < 90 || song.duration > 420) {
        return false;
      }
      
      return true;
    });
  }

  let filteredSongs = filterLofiSongs(songs);

  if (filteredSongs.length < 12) {
    const secondaryResults = await fetchWithKeyRotation('/search', {
      part: 'snippet',
      q: secondaryQuery,
      type: 'video',
      maxResults: 40
    });
    const secondarySongs = await processYouTubeItems(secondaryResults.items || []);
    const filteredSecondary = filterLofiSongs(secondarySongs);

    const existingIds = new Set(filteredSongs.map(s => s.id));
    filteredSecondary.forEach(song => {
      if (!existingIds.has(song.id)) {
        filteredSongs.push(song);
      }
    });
  }

  return filteredSongs.slice(0, 15);
}

/**
 * Fetches popular videos in music category (for Home / Trending)
 * Fetches 50, filters out live streams & mixes, and sorts strictly by view count descending.
 * @returns {Promise<Array>}
 */
export async function fetchTrendingSongs() {
  const result = await fetchWithKeyRotation('/videos', {
    part: 'snippet,contentDetails,statistics',
    chart: 'mostPopular',
    videoCategoryId: '10', // Music
    maxResults: 50,
    regionCode: 'US'
  });
  
  let songs = processVideosDetailed(result.items || []);

  const excludedKeywords = ['mix', 'compilation', 'playlist', 'nonstop', 'live', 'stream', 'full album', 'album', 'loop', '1h', '2h', '3h', '10h', '24/7'];
  
  songs = songs.filter(song => {
    if (song.liveBroadcastContent === 'live' || song.liveBroadcastContent === 'upcoming') {
      return false;
    }
    
    const lowerTitle = song.title.toLowerCase();
    const lowerArtist = song.artist.toLowerCase();
    const lowerChannel = (song.channelTitle || '').toLowerCase();
    
    const hasExcludedKeyword = excludedKeywords.some(keyword => 
      lowerTitle.includes(keyword) || 
      lowerArtist.includes(keyword) || 
      lowerChannel.includes(keyword)
    );
    
    if (hasExcludedKeyword) return false;

    if (!song.duration || song.duration > 600) {
      return false;
    }

    return true;
  });

  songs.sort((a, b) => b.viewsCount - a.viewsCount);
  
  return songs.slice(0, 15);
}

/**
 * Smart engine to search and return 90s Nostalgia songs in Hindi or English, sorted by views descending
 * @param {string} language 'hindi' or 'english'
 * @returns {Promise<Array>}
 */
export async function fetch90sNostalgiaSongs(language) {
  let query1 = '';
  let query2 = '';
  if (language === 'hindi') {
    query1 = '90s bollywood songs';
    query2 = '90s hindi romantic hits';
  } else {
    query1 = '90s pop hits';
    query2 = '90s rock hits';
  }

  // Execute queries sequentially with try/catch to avoid concurrent rotation conflicts and handle partial failures
  let items1 = [];
  try {
    const res1 = await fetchWithKeyRotation('/search', {
      part: 'snippet',
      q: query1,
      type: 'video',
      maxResults: 50
    });
    items1 = res1.items || [];
  } catch (err) {
    console.warn('[Sonoria] 90s Nostalgia Query 1 failed:', err);
  }

  let items2 = [];
  try {
    const res2 = await fetchWithKeyRotation('/search', {
      part: 'snippet',
      q: query2,
      type: 'video',
      maxResults: 50
    });
    items2 = res2.items || [];
  } catch (err) {
    console.warn('[Sonoria] 90s Nostalgia Query 2 failed:', err);
  }

  const allItems = [...items1, ...items2];
  if (allItems.length === 0) {
    throw new Error('All searches failed or returned no results. Check your network or API keys.');
  }
  
  // Deduplicate items by Video ID
  const uniqueItemsMap = new Map();
  allItems.forEach(item => {
    if (item.id && item.id.videoId) {
      uniqueItemsMap.set(item.id.videoId, item);
    }
  });

  const songs = await processYouTubeItems(Array.from(uniqueItemsMap.values()));

  const excludedKeywords = [
    'vlog', 'trailer', 'reaction', 'interview', 'review', 'teaser', 
    'behind the scenes', 'making of', 'bts', 'promo', 'talk show', 
    'podcast', 'movie scene', 'scene', 'dialogue', 'full movie', 
    'unboxing', 'live performance', 'concert', 'press conference', 
    'mix', 'playlist', 'compilation', 'live', 'stream', 'jukebox', 
    'mashup', 'nonstop', 'full album', 'album', 'loop', '1h', '2h', 
    '3h', '10h', '24/7', 'radio', 'dvd'
  ];

  let filteredSongs = songs.filter(song => {
    if (song.liveBroadcastContent === 'live' || song.liveBroadcastContent === 'upcoming') {
      return false;
    }
    
    const lowerTitle = song.title.toLowerCase();
    const lowerArtist = song.artist.toLowerCase();
    
    const hasExcludedKeyword = excludedKeywords.some(keyword => 
      lowerTitle.includes(keyword) || lowerArtist.includes(keyword)
    );
    
    if (hasExcludedKeyword) return false;
    
    // Songs are strictly between 1.5 minutes and 8 minutes
    if (!song.duration || song.duration < 90 || song.duration > 480) {
      return false;
    }
    
    return true;
  });

  // Sort strictly by view count descending
  filteredSongs.sort((a, b) => b.viewsCount - a.viewsCount);

  // Return up to 50 results
  return filteredSongs.slice(0, 50);
}

/**
 * Fetch detailed information (duration, views) for a list of video IDs
 * @param {Array<string>} videoIds 
 */
export async function fetchVideoDetails(videoIds) {
  if (!videoIds || videoIds.length === 0) return [];
  
  const result = await fetchWithKeyRotation('/videos', {
    part: 'snippet,contentDetails,statistics',
    id: videoIds.join(',')
  });
  
  return processVideosDetailed(result.items || []);
}

/**
 * Process list of search items and fetch details (duration)
 */
async function processYouTubeItems(items) {
  const videoIds = items.map(item => item.id.videoId).filter(Boolean);
  if (videoIds.length === 0) return [];
  
  // Batch request in groups of 50 (YouTube API /videos limit)
  const batches = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    batches.push(videoIds.slice(i, i + 50));
  }
  
  const results = await Promise.all(
    batches.map(batch => fetchVideoDetails(batch))
  );
  
  return results.flat();
}

/**
 * Format detailed videos list into standard Sonoria track objects
 */
function processVideosDetailed(items) {
  return items.map(item => {
    const snippet = item.snippet || {};
    const details = item.contentDetails || {};
    const stats = item.statistics || {};
    
    const rawTitle = snippet.title || '';
    const channelTitle = snippet.channelTitle || 'Unknown Artist';
    
    // Parse title & artist (YouTube titles often have "Artist - Title" format)
    let title = rawTitle;
    let artist = channelTitle;
    
    if (rawTitle.includes('-')) {
      const parts = rawTitle.split('-');
      artist = parts[0].trim();
      title = parts.slice(1).join('-').trim();
    }
    
    title = cleanSongTitle(title);
    artist = cleanSongTitle(artist);
    
    // Fallbacks
    if (!title) title = rawTitle;
    if (!artist) artist = channelTitle;

    const thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '';

    return {
      id: item.id,
      title,
      artist,
      channelTitle,
      thumbnailUrl,
      duration: parseISO8601Duration(details.duration),
      durationString: formatDuration(parseISO8601Duration(details.duration)),
      views: formatViews(stats.viewCount),
      viewsCount: parseInt(stats.viewCount || '0', 10),
      description: snippet.description || '',
      publishedAt: snippet.publishedAt || '',
      liveBroadcastContent: snippet.liveBroadcastContent || ''
    };
  });
}

/**
 * Format seconds to MM:SS
 */
export function formatDuration(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Fetches high-resolution album art from iTunes Search API (free, no key needed)
 * @param {string} songName 
 * @param {string} artistName 
 * @returns {Promise<string|null>} High-res artwork URL or null if not found
 */
export async function fetchITunesArtwork(songName, artistName) {
  try {
    // Remove featured artists and parentheses to clean search query
    const cleanSong = songName.replace(/\(.*?\)/g, '').replace(/feat\..*$/i, '').trim();
    const cleanArtist = artistName.replace(/\(.*?\)/g, '').replace(/feat\..*$/i, '').replace(/music/gi, '').trim();
    
    const query = `${cleanSong} ${cleanArtist}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=3`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      // Find the best match
      const result = data.results[0];
      if (result.artworkUrl100) {
        // Convert to high res (600x600)
        return result.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
      }
    }
  } catch (error) {
    console.warn(`[Sonoria] iTunes search failed for ${songName}:`, error);
  }
  return null;
}

/**
 * Real API Login Request
 */
export async function authLogin(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Login failed.');
  }
  return data;
}

/**
 * Real API Signup Request
 */
export async function authSignup(username, email, password) {
  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Signup failed.');
  }
  return data;
}

/**
 * Fetch authenticated User Profile using JWT token
 */
export async function fetchUserProfile(token) {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch user profile.');
  }
  return data;
}

/**
 * Sync Liked Songs & Playlists to the MongoDB database
 */
export async function syncUserData(token, likedSongs, playlists) {
  const response = await fetch(`${API_BASE}/api/user/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ likedSongs, playlists })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to sync user data.');
  }
  return data;
}
