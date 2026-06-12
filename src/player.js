/**
 * Sonoria YouTube Player Service
 * ================================
 * Modeled EXACTLY after Vibe_Music/src/components/VideoPlayerModal.jsx
 * 
 * How it works (same as Vibe_Music):
 * 1. The YouTube IFrame API script is loaded via <script> tag in index.html
 * 2. When a song is played, we create an <iframe> with autoplay=1 inside #youtube-iframe-container
 * 3. We wait 300ms for the iframe to mount, then wrap it with new window.YT.Player()
 * 4. The YT.Player events (onReady, onStateChange) drive our UI updates
 * 5. The iframe lives in a fixed off-screen container (400x300, opacity:0.001)
 *    so Chrome doesn't throttle it (same as Vibe_Music's approach)
 */

// State
let currentTrackId = null;
let timeUpdateInterval = null;
let bindTimer = null;
let bindPoll = null;
let currentStartTime = 0; // Start offset in seconds for playback session

// Callback registries
const stateCallbacks = [];
const timeCallbacks = [];

// ─── DYNAMIC API LOADER ───
function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      console.log('[Sonoria] YouTube IFrame API Ready');
      resolve();
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }
  });
}

// ─── PLAYBACK TRACKER ───
function startTimeTracker() {
  stopTimeTracker();
  timeUpdateInterval = setInterval(() => {
    try {
      if (window.ytPlayer &&
          typeof window.ytPlayer.getCurrentTime === 'function' &&
          typeof window.ytPlayer.getDuration === 'function') {
        const currentTime = window.ytPlayer.getCurrentTime();
        const duration = window.ytPlayer.getDuration();
        timeCallbacks.forEach(cb => cb({ currentTime, duration }));
      }
    } catch (_) {
      // Player might be destroyed mid-poll
    }
  }, 250);
}

function stopTimeTracker() {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }
}

// ─── CORE: initPlayer (copied from Vibe_Music lines 58-98) ───
function initPlayer() {
  const iframe = document.querySelector('#youtube-video-display iframe') || 
                 document.querySelector('#youtube-iframe-container iframe');
  if (!iframe) {
    console.error('[Sonoria] No iframe found in any active container');
    return;
  }

  console.log('[Sonoria] Binding YT.Player to iframe...');

  try {
    window.ytPlayer = new window.YT.Player(iframe, {
      events: {
        onReady: (event) => {
          console.log('[Sonoria] ✅ YT Player Ready — starting playback');
          // Set volume from slider
          const volSlider = document.getElementById('volume-slider');
          const vol = volSlider ? parseInt(volSlider.value, 10) : 50;
          event.target.setVolume(vol);
          event.target.unMute();
          
          if (currentStartTime > 0) {
            event.target.seekTo(currentStartTime, true);
          }
          event.target.playVideo();

          startTimeTracker();

          stateCallbacks.forEach(cb => cb({
            state: 'playing',
            trackId: currentTrackId
          }));
        },
        onStateChange: (event) => {
          const stateMap = {
            [-1]: 'unstarted',
            0: 'ended',
            1: 'playing',
            2: 'paused',
            3: 'buffering',
            5: 'cued'
          };
          const stateName = stateMap[event.data] || 'unknown';
          console.log('[Sonoria] YT State →', stateName);

          stateCallbacks.forEach(cb => cb({
            state: stateName,
            trackId: currentTrackId
          }));

          if (event.data === 1) { // PLAYING
            startTimeTracker();
          } else if (event.data === 0) { // ENDED
            stopTimeTracker();
          } else if (event.data === 2) { // PAUSED
            stopTimeTracker();
          }
        },
        onError: (event) => {
          console.error('[Sonoria] YT Player Error:', event.data);
          let msg = 'Playback Error';
          if (event.data === 2) msg = 'Invalid video ID';
          if (event.data === 100) msg = 'Video not found';
          if (event.data === 101 || event.data === 150) msg = 'Playback restricted by owner';
          stateCallbacks.forEach(cb => cb({ state: 'error', error: msg }));
        }
      }
    });
  } catch (e) {
    console.error('[Sonoria] Failed to create YT.Player:', e);
  }
}

// ─── PUBLIC API ───
export const PlayerService = {
  /**
   * Play a track. This is the main entry point.
   * Follows Vibe_Music's exact flow:
   * 1. Destroy old player
   * 2. Create fresh iframe with src (autoplay=1, enablejsapi=1)
   * 3. Wait 300ms, then bind YT.Player
   */
  async playTrack(videoId, startSeconds = 0) {
    console.log('[Sonoria][player.js] playTrack ENTERED with videoId:', videoId, 'startSeconds:', startSeconds);
    currentTrackId = videoId;
    currentStartTime = startSeconds;

    // Clear pending timers
    if (bindTimer) { clearTimeout(bindTimer); bindTimer = null; }
    if (bindPoll) { clearInterval(bindPoll); bindPoll = null; }
    stopTimeTracker();

    // 1. Destroy old YT player (Vibe_Music lines 61-68)
    if (window.ytPlayer) {
      try {
        window.ytPlayer.destroy();
      } catch (_) {}
      window.ytPlayer = null;
    }

    // 2. Create fresh iframe based on current playback mode
    const mode = this.getPlaybackMode();
    let container;
    if (mode === 'video') {
      container = document.getElementById('youtube-video-display');
    } else {
      container = document.getElementById('youtube-iframe-container');
    }

    if (!container) {
      console.error('[Sonoria] Active player container not found!');
      return;
    }

    // Clear the unused container to avoid duplicate widgets playing
    const otherContainer = mode === 'video'
      ? document.getElementById('youtube-iframe-container')
      : document.getElementById('youtube-video-display');
    if (otherContainer) {
      otherContainer.innerHTML = '';
    }

    const origin = encodeURIComponent(window.location.origin);
    const startParam = startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : '';
    const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${origin}&playsinline=1${startParam}`;

    // Replace container contents with fresh iframe
    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('allowfullscreen', '');
    if (mode === 'video') {
      iframe.style.cssText = 'width:100%;height:100%;border:none;';
    } else {
      iframe.style.cssText = 'width:400px;height:300px;border:none;';
    }
    iframe.src = src;
    container.appendChild(iframe);

    console.log(`[Sonoria] Created iframe in ${mode} container for video:`, videoId);

    // 3. Ensure YT API is loaded, then bind
    try {
      await loadYouTubeAPI();
      bindTimer = setTimeout(initPlayer, 300);
    } catch (err) {
      console.error('[Sonoria] Failed to load YouTube Player API:', err);
    }
  },

  pause() {
    if (window.ytPlayer && typeof window.ytPlayer.pauseVideo === 'function') {
      window.ytPlayer.pauseVideo();
    }
  },

  resume() {
    if (window.ytPlayer && typeof window.ytPlayer.playVideo === 'function') {
      window.ytPlayer.unMute();
      window.ytPlayer.playVideo();
    }
  },

  stop() {
    if (window.ytPlayer && typeof window.ytPlayer.stopVideo === 'function') {
      window.ytPlayer.stopVideo();
    }
  },

  seekTo(seconds) {
    if (window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {
      window.ytPlayer.seekTo(seconds, true);
    }
  },

  setVolume(vol) {
    if (window.ytPlayer && typeof window.ytPlayer.setVolume === 'function') {
      window.ytPlayer.unMute();
      window.ytPlayer.setVolume(Math.max(0, Math.min(100, vol)));
    }
  },

  getVolume() {
    try {
      if (window.ytPlayer && typeof window.ytPlayer.getVolume === 'function') {
        return window.ytPlayer.getVolume();
      }
    } catch (_) {}
    return 50;
  },

  setPlaybackMode(mode) {
    if (mode !== 'audio' && mode !== 'video') return;

    const wrapper = document.getElementById('youtube-player-wrapper');
    if (wrapper) {
      if (mode === 'video') {
        wrapper.classList.remove('mode-audio-only');
        wrapper.classList.add('mode-video');
      } else {
        wrapper.classList.remove('mode-video');
        wrapper.classList.add('mode-audio-only');
      }
    }

    // Move player dynamically if currently playing
    if (currentTrackId && window.ytPlayer) {
      let currentTime = 0;
      try {
        if (typeof window.ytPlayer.getCurrentTime === 'function') {
          currentTime = window.ytPlayer.getCurrentTime();
        }
      } catch (_) {}
      console.log(`[Sonoria] Re-creating player in ${mode} mode at time:`, currentTime);
      this.playTrack(currentTrackId, currentTime);
    }

    window.dispatchEvent(new CustomEvent('sonoria-playback-mode-changed', { detail: { mode } }));
  },

  getPlaybackMode() {
    const wrapper = document.getElementById('youtube-player-wrapper');
    if (wrapper && wrapper.classList.contains('mode-video')) return 'video';
    return 'audio';
  },

  onStateChange(callback) {
    stateCallbacks.push(callback);
  },

  onTimeUpdate(callback) {
    timeCallbacks.push(callback);
  },

  isReady() {
    return !!(window.ytPlayer && typeof window.ytPlayer.playVideo === 'function');
  }
};
