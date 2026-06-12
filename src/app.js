import { searchYouTubeSongs, fetchVideoDetails, fetchITunesArtwork, fetchTrendingSongs, formatDuration, authLogin, authSignup, fetchUserProfile, syncUserData, fetchLofiChillSongs, fetch90sNostalgiaSongs } from './api.js?v=1.0.2';
import { PlayerService } from './player.js?v=1.0.2';
import { getKeysStatus, rotateKey, getActiveKeyIndex } from './config.js?v=1.0.2';

// ----------------------------------------------------
// APPLICATION STATE
// ----------------------------------------------------
const state = {
  queue: [],
  currentQueueIndex: -1,
  isPlaying: false,
  likedSongs: [],
  playlists: [],
  activeView: 'home', // 'home', 'search', 'liked', 'playlist'
  activePlaylistId: null,
  playbackMode: 'audio', // 'audio' or 'video'
  isDetailsPanelOpen: true,
  searchQuery: '',
  isMuted: false,
  previousVolume: 50,
  user: null,
  token: localStorage.getItem('sonoria_token') || null,
  authMode: 'login', // 'login' or 'signup'
  isShuffle: false,
  repeatMode: 'off' // 'off' | 'all' | 'one'
};

// ----------------------------------------------------
// SELECTORS & UI ELEMENTS
// ----------------------------------------------------
let elements = {};

function initElements() {
  elements = {
    // Navigation & Views
    navItems: document.querySelectorAll('.nav-item'),
    viewHome: document.getElementById('view-home'),
    viewSearch: document.getElementById('view-search'),
    viewLiked: document.getElementById('view-liked'),
    viewPlaylist: document.getElementById('view-playlist'),
    topSearchWrapper: document.getElementById('top-search-wrapper'),
    inputSearch: document.getElementById('input-search'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    searchPrompt: document.getElementById('search-prompt'),
    searchResultsArea: document.getElementById('search-results-area'),
    searchSongsGrid: document.getElementById('search-songs-grid'),
    trendingSongsGrid: document.getElementById('trending-songs-grid'),
    
    // Playlists UI
    sidebarPlaylists: document.getElementById('sidebar-playlists'),
    btnCreatePlaylist: document.getElementById('btn-create-playlist'),
    playlistModal: document.getElementById('playlist-modal'),
    btnClosePlaylistModal: document.getElementById('btn-close-playlist-modal'),
    btnCancelPlaylistModal: document.getElementById('btn-cancel-playlist-modal'),
    btnSavePlaylist: document.getElementById('btn-save-playlist'),
    inputPlaylistName: document.getElementById('input-playlist-name'),
    inputPlaylistDesc: document.getElementById('input-playlist-desc'),
    playlistTitleDisplay: document.getElementById('playlist-title-display'),
    playlistMetaDisplay: document.getElementById('playlist-meta-display'),
    playlistArtDisplay: document.getElementById('playlist-art-display'),
    playlistTrackList: document.getElementById('playlist-track-list'),
    btnPlayPlaylist: document.getElementById('btn-play-playlist'),
    btnDeleteCurrentPlaylist: document.getElementById('btn-delete-current-playlist'),
    
    // Liked Songs UI
    likedCount: document.getElementById('liked-count'),
    likedTrackList: document.getElementById('liked-track-list'),
    btnPlayLiked: document.getElementById('btn-play-liked'),
    
    // API Key Status
    activeKeyIndexText: document.getElementById('active-key-index'),
    keysStatusGrid: document.getElementById('keys-status-grid'),
    btnRotateKey: document.getElementById('btn-rotate-key'),
    
    // Now Playing Sidebar (Details Panel)
    detailsPanel: document.getElementById('details-panel'),
    btnCloseDetails: document.getElementById('btn-close-details'),
    btnModeAudio: document.getElementById('btn-mode-audio'),
    btnModeVideo: document.getElementById('btn-mode-video'),
    detailsSongTitle: document.getElementById('details-song-title'),
    detailsSongArtist: document.getElementById('details-song-artist'),
    detailsBtnLike: document.getElementById('details-btn-like'),
    vinylAlbumArt: document.getElementById('vinyl-album-art'),
    visualizerCanvas: document.getElementById('visualizer-canvas'),
    queueItemsList: document.getElementById('queue-items-list'),
    btnClearQueue: document.getElementById('btn-clear-queue'),
    youtubePlayerWrapper: document.getElementById('youtube-player-wrapper'),

    // Bottom Player Bar
    playerSongTitle: document.getElementById('player-song-title'),
    playerSongArtist: document.getElementById('player-song-artist'),
    playerAlbumArt: document.getElementById('player-album-art'),
    playerBtnLike: document.getElementById('player-btn-like'),
    playerBtnShuffle: document.getElementById('player-btn-shuffle'),
    playerBtnPrev: document.getElementById('player-btn-prev'),
    playerBtnPlay: document.getElementById('player-btn-play'),
    playerBtnNext: document.getElementById('player-btn-next'),
    playerBtnRepeat: document.getElementById('player-btn-repeat'),
    playerTimeCurrent: document.getElementById('player-time-current'),
    playerTimeDuration: document.getElementById('player-time-duration'),
    progressSlider: document.getElementById('progress-slider'),
    progressFill: document.getElementById('progress-fill'),
    volumeSlider: document.getElementById('volume-slider'),
    volumeFill: document.getElementById('volume-fill'),
    playerBtnMute: document.getElementById('player-btn-mute'),
    playerBtnQuickMode: document.getElementById('player-btn-quick-mode'),
    quickModeIcon: document.getElementById('quick-mode-icon'),
    playerBtnToggleDetails: document.getElementById('player-btn-toggle-details'),
    toastContainer: document.getElementById('toast-container'),
    heroPlayBtn: document.getElementById('hero-play-btn'),

    // Auth UI selectors
    headerUserBadge: document.getElementById('header-user-badge'),
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    userDropdownMenu: document.getElementById('user-dropdown-menu'),
    btnDropdownSignin: document.getElementById('btn-dropdown-signin'),
    btnDropdownLogout: document.getElementById('btn-dropdown-logout'),
    authModal: document.getElementById('auth-modal'),
    btnCloseAuthModal: document.getElementById('btn-close-auth-modal'),
    btnCancelAuthModal: document.getElementById('btn-cancel-auth-modal'),
    btnSubmitAuth: document.getElementById('btn-submit-auth'),
    tabLogin: document.getElementById('tab-login'),
    tabSignup: document.getElementById('tab-signup'),
    groupAuthUsername: document.getElementById('group-auth-username'),
    inputAuthUsername: document.getElementById('input-auth-username'),
    inputAuthEmail: document.getElementById('input-auth-email'),
    inputAuthPassword: document.getElementById('input-auth-password'),
    authErrorMessage: document.getElementById('auth-error-message'),
    authModalTitle: document.getElementById('auth-modal-title'),
    
    // Vibe Choice Modal
    vibeChoiceModal: document.getElementById('vibe-choice-modal'),
    btnCloseVibeChoiceModal: document.getElementById('btn-close-vibe-choice-modal'),
    btnVibeChoiceHindi: document.getElementById('btn-vibe-choice-hindi'),
    btnVibeChoiceEnglish: document.getElementById('btn-vibe-choice-english'),
    
    // Mobile Navigation
    btnHamburger: document.getElementById('btn-hamburger'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    mobileBottomNav: document.getElementById('mobile-bottom-nav'),
    mobileNavBtns: document.querySelectorAll('.mobile-nav-btn'),
    sidebar: document.querySelector('.sidebar')
  };
}

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initElements();
  loadLocalStorage();
  setupEventListeners();
  setupAuthEventListeners();
  updateAPIKeyUI();
  renderSidebarPlaylists();
  initializeVisualizer();
  
  // Load trending songs for home view
  loadTrendingSongs();
  
  // Auto-login if session token is saved
  if (state.token) {
    autoLogin();
  }
  
  // Register icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// Load storage
function loadLocalStorage() {
  try {
    const liked = localStorage.getItem('sonoria_liked_songs');
    if (liked) state.likedSongs = JSON.parse(liked);

    const playlists = localStorage.getItem('sonoria_playlists');
    if (playlists) state.playlists = JSON.parse(playlists);
  } catch (e) {
    console.error('[Sonoria] Failed to load data from localStorage', e);
  }
}

function saveLocalStorage() {
  try {
    localStorage.setItem('sonoria_liked_songs', JSON.stringify(state.likedSongs));
    localStorage.setItem('sonoria_playlists', JSON.stringify(state.playlists));
    
    // Auto sync with backend database if logged in
    syncDataWithDatabase();
  } catch (e) {
    console.error('[Sonoria] Failed to save data to localStorage', e);
  }
}

// ----------------------------------------------------
// USER AUTHENTICATION & SYNC LOGIC
// ----------------------------------------------------
async function autoLogin() {
  try {
    const data = await fetchUserProfile(state.token);
    state.user = data.user;
    
    updateUserBadgeUI();
    
    // Load lists from DB
    state.likedSongs = data.user.likedSongs || [];
    state.playlists = data.user.playlists || [];
    
    // Save locally
    localStorage.setItem('sonoria_liked_songs', JSON.stringify(state.likedSongs));
    localStorage.setItem('sonoria_playlists', JSON.stringify(state.playlists));
    
    // Renders
    renderSidebarPlaylists();
    if (state.activeView === 'liked') renderLikedSongs();
    if (state.activeView === 'playlist') renderPlaylistView(state.activePlaylistId);
    
    showToast(`Welcome back, ${state.user.username}!`, 'success');
  } catch (err) {
    console.warn('[Sonoria] Auto-login failed, clearing session.', err);
    handleLogout();
  }
}

function updateUserBadgeUI() {
  if (state.user) {
    elements.userAvatar.textContent = state.user.username.charAt(0).toUpperCase();
    elements.userName.textContent = state.user.username;
    elements.btnDropdownLogout.classList.remove('hidden');
    elements.btnDropdownSignin.classList.add('hidden');
  } else {
    elements.userAvatar.textContent = 'G';
    elements.userName.textContent = 'Guest User';
    elements.btnDropdownLogout.classList.add('hidden');
    elements.btnDropdownSignin.classList.remove('hidden');
  }
}

function handleLogout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('sonoria_token');
  
  // Revert back to local storage anonymous state
  loadLocalStorage(); 
  updateUserBadgeUI();
  
  // Re-render views
  renderSidebarPlaylists();
  if (state.activeView === 'liked') renderLikedSongs();
  if (state.activeView === 'playlist') renderPlaylistView(state.activePlaylistId);
  
  showToast('Logged out successfully.', 'info');
}

async function syncDataWithDatabase() {
  if (state.token && state.user) {
    try {
      await syncUserData(state.token, state.likedSongs, state.playlists);
    } catch (err) {
      console.error('[Sonoria] Failed to sync data with database:', err);
    }
  }
}

function setupAuthEventListeners() {
  // Toggle dropdown
  elements.headerUserBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.headerUserBadge.classList.toggle('active');
  });

  // Close dropdown on click outside
  document.addEventListener('click', () => {
    elements.headerUserBadge.classList.remove('active');
  });

  // Sign In / Sign Up dropdown button
  elements.btnDropdownSignin.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.headerUserBadge.classList.remove('active');
    openAuthModal('login');
  });

  // Logout dropdown button
  elements.btnDropdownLogout.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.headerUserBadge.classList.remove('active');
    handleLogout();
  });

  // Cancel / Close Auth Modal
  const closeAuth = () => {
    elements.authModal.classList.remove('active');
    clearAuthInputs();
  };
  elements.btnCloseAuthModal.addEventListener('click', closeAuth);
  elements.btnCancelAuthModal.addEventListener('click', closeAuth);

  // Toggle Login/Signup tabs
  elements.tabLogin.addEventListener('click', () => setAuthMode('login'));
  elements.tabSignup.addEventListener('click', () => setAuthMode('signup'));

  // Submit Authentication Form
  elements.btnSubmitAuth.addEventListener('click', handleAuthSubmit);
  elements.inputAuthPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAuthSubmit();
    }
  });
}

function openAuthModal(mode = 'login') {
  setAuthMode(mode);
  elements.authModal.classList.add('active');
  elements.inputAuthEmail.focus();
}

function setAuthMode(mode) {
  state.authMode = mode;
  elements.authErrorMessage.classList.add('hidden');
  
  if (mode === 'login') {
    elements.tabLogin.classList.add('active');
    elements.tabSignup.classList.remove('active');
    elements.groupAuthUsername.classList.add('hidden');
    elements.authModalTitle.textContent = 'Sign In to Sonoria';
    elements.btnSubmitAuth.textContent = 'Sign In';
    elements.inputAuthUsername.removeAttribute('required');
  } else {
    elements.tabSignup.classList.add('active');
    elements.tabLogin.classList.remove('active');
    elements.groupAuthUsername.classList.remove('hidden');
    elements.authModalTitle.textContent = 'Create an Account';
    elements.btnSubmitAuth.textContent = 'Register';
    elements.inputAuthUsername.setAttribute('required', 'required');
  }
}

function clearAuthInputs() {
  elements.inputAuthUsername.value = '';
  elements.inputAuthEmail.value = '';
  elements.inputAuthPassword.value = '';
  elements.authErrorMessage.classList.add('hidden');
  elements.authErrorMessage.textContent = '';
}

async function handleAuthSubmit() {
  const username = elements.inputAuthUsername.value.trim();
  const email = elements.inputAuthEmail.value.trim();
  const password = elements.inputAuthPassword.value.trim();

  if (!email || !password) {
    showAuthError('Email and Password are required.');
    return;
  }

  if (state.authMode === 'signup' && !username) {
    showAuthError('Username is required.');
    return;
  }

  if (password.length < 6) {
    showAuthError('Password must be at least 6 characters.');
    return;
  }

  elements.btnSubmitAuth.disabled = true;
  elements.btnSubmitAuth.textContent = state.authMode === 'login' ? 'Signing In...' : 'Registering...';
  elements.authErrorMessage.classList.add('hidden');

  try {
    let data;
    if (state.authMode === 'login') {
      data = await authLogin(email, password);
      showToast('Logged in successfully!', 'success');
    } else {
      data = await authSignup(username, email, password);
      showToast('Account registered successfully!', 'success');
    }

    state.user = data.user;
    state.token = data.token;
    localStorage.setItem('sonoria_token', data.token);

    updateUserBadgeUI();
    
    // Load lists
    state.likedSongs = data.user.likedSongs || [];
    state.playlists = data.user.playlists || [];
    
    // Save locally
    localStorage.setItem('sonoria_liked_songs', JSON.stringify(state.likedSongs));
    localStorage.setItem('sonoria_playlists', JSON.stringify(state.playlists));

    // Render lists
    renderSidebarPlaylists();
    if (state.activeView === 'liked') renderLikedSongs();
    if (state.activeView === 'playlist') renderPlaylistView(state.activePlaylistId);

    // Close Modal
    elements.authModal.classList.remove('active');
    clearAuthInputs();

  } catch (error) {
    console.error('[Auth Error]', error);
    showAuthError(error.message || 'An error occurred.');
  } finally {
    elements.btnSubmitAuth.disabled = false;
    elements.btnSubmitAuth.textContent = state.authMode === 'login' ? 'Sign In' : 'Register';
  }
}

function showAuthError(msg) {
  elements.authErrorMessage.textContent = msg;
  elements.authErrorMessage.classList.remove('hidden');
}

// ----------------------------------------------------
// UI UPDATES & WIDGETS
// ----------------------------------------------------
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'warning') iconName = 'alert-triangle';
  if (type === 'error') iconName = 'x-circle';
  
  toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
  elements.toastContainer.appendChild(toast);
  
  if (window.lucide) {
    window.lucide.createIcons({ attrs: { class: 'toast-icon' } });
  }
  
  // Remove toast after animation completes
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function updateAPIKeyUI() {
  const activeIndex = getActiveKeyIndex();
  if (elements.activeKeyIndexText) {
    elements.activeKeyIndexText.textContent = `API Key ${activeIndex + 1} Active`;
  }
  
  if (elements.keysStatusGrid) {
    const statusList = getKeysStatus();
    elements.keysStatusGrid.innerHTML = '';
    
    statusList.forEach((status, i) => {
      const indicator = document.createElement('div');
      indicator.className = `key-indicator ${status.isActive ? 'active' : ''}`;
      indicator.title = `Key ${i + 1}: ${status.maskedKey}`;
      elements.keysStatusGrid.appendChild(indicator);
    });
  }
}

// ----------------------------------------------------
// MOBILE SIDEBAR HELPERS
// ----------------------------------------------------
function openMobileSidebar() {
  if (elements.sidebar) elements.sidebar.classList.add('mobile-open');
  if (elements.sidebarOverlay) elements.sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  if (elements.sidebar) elements.sidebar.classList.remove('mobile-open');
  if (elements.sidebarOverlay) elements.sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ----------------------------------------------------
// NAVIGATION & ROUTING
// ----------------------------------------------------
function navigateToView(viewName, playlistId = null) {
  state.activeView = viewName;
  state.activePlaylistId = playlistId;

  // Toggle Nav active state (desktop sidebar)
  elements.navItems.forEach(item => {
    if (item.getAttribute('data-view') === viewName && !playlistId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Toggle Nav active state (mobile bottom nav)
  elements.mobileNavBtns.forEach(btn => {
    if (btn.getAttribute('data-view') === viewName && !playlistId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Close mobile sidebar on navigation
  closeMobileSidebar();

  // Handle active playlist navigation class
  const sidebarItems = elements.sidebarPlaylists.querySelectorAll('.playlist-item');
  sidebarItems.forEach(item => {
    if (playlistId && item.getAttribute('data-id') === playlistId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Hide all views, then show selected
  elements.viewHome.classList.remove('active');
  elements.viewSearch.classList.remove('active');
  elements.viewLiked.classList.remove('active');
  elements.viewPlaylist.classList.remove('active');



  if (viewName === 'home') {
    elements.viewHome.classList.add('active');
  } else if (viewName === 'search') {
    elements.viewSearch.classList.add('active');
    renderSearchResults();
  } else if (viewName === 'liked') {
    elements.viewLiked.classList.add('active');
    renderLikedSongs();
  } else if (viewName === 'playlist') {
    elements.viewPlaylist.classList.add('active');
    renderPlaylistView(playlistId);
  }
}

// ----------------------------------------------------
// SEARCH & TRENDING
// ----------------------------------------------------
let searchTimeout = null;

async function triggerSearch(query) {
  if (!query || !query.trim()) {
    state.searchQuery = '';
    renderSearchResults();
    return;
  }
  
  state.searchQuery = query;
  navigateToView('search');
  
  elements.searchPrompt.classList.add('hidden');
  elements.searchResultsArea.classList.remove('hidden');
  
  // Show Skeleton load items
  elements.searchSongsGrid.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-text-1"></div>
      <div class="skeleton-text-2"></div>
    </div>
  `).join('');
  
  try {
    let songs;
    if (query === 'Lofi Chill Track') {
      songs = await fetchLofiChillSongs();
    } else if (query === '90s Nostalgia Hindi') {
      songs = await fetch90sNostalgiaSongs('hindi');
    } else if (query === '90s Nostalgia English') {
      songs = await fetch90sNostalgiaSongs('english');
    } else {
      songs = await searchYouTubeSongs(query);
    }
    renderSongsInGrid(songs, elements.searchSongsGrid);
  } catch (error) {
    showToast(error.message, 'error');
    elements.searchSongsGrid.innerHTML = `<p class="queue-empty">Search failed: ${error.message}</p>`;
  }
}

async function loadTrendingSongs() {
  elements.trendingSongsGrid.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-text-1"></div>
      <div class="skeleton-text-2"></div>
    </div>
  `).join('');

  try {
    const songs = await fetchTrendingSongs();
    renderSongsInGrid(songs, elements.trendingSongsGrid);
  } catch (error) {
    console.error(error);
    elements.trendingSongsGrid.innerHTML = `<p class="queue-empty">Could not load trending music: ${error.message}</p>`;
  }
}

function renderSongsInGrid(songs, gridElement) {
  gridElement.innerHTML = '';
  
  if (songs.length === 0) {
    gridElement.innerHTML = '<p class="queue-empty">No results found</p>';
    return;
  }
  
  songs.forEach((song, idx) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.id = song.id;
    
    // Add default background artwork styling if image fails
    const artworkUrl = song.thumbnailUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%233f3f46" stroke-width="1"%3E%3Crect width="18" height="18" x="3" y="3" rx="2"/%3E%3Ccircle cx="12" cy="12" r="3"/%3E%3C/svg%3E';
    
    card.innerHTML = `
      <div class="song-card-image">
        <img src="${artworkUrl}" alt="${song.title}" loading="lazy">
        <button class="song-card-play-btn" data-action="play">
          <i data-lucide="play" class="fill"></i>
        </button>
      </div>
      <div class="song-card-details">
        <div class="song-card-title" title="${song.title}">${song.title}</div>
        <div class="song-card-artist" title="${song.artist}">${song.artist}</div>
        ${song.views ? `<div class="song-card-views" title="${song.views}"><i data-lucide="eye" class="views-icon"></i> ${song.views}</div>` : ''}
      </div>
    `;
    
    // Add play click listener
    card.querySelector('[data-action="play"]').addEventListener('click', (e) => {
      e.stopPropagation();
      playTrackListStartingFrom(songs, idx);
    });

    card.addEventListener('click', () => {
      // Normal click: open options or play song
      playTrackListStartingFrom(songs, idx);
    });
    
    gridElement.appendChild(card);
  });
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderSearchResults() {
  if (!state.searchQuery) {
    elements.searchPrompt.classList.remove('hidden');
    elements.searchResultsArea.classList.add('hidden');
    elements.searchSongsGrid.innerHTML = '';
  }
}

// ----------------------------------------------------
// PLAYLISTS & LIKED SONGS
// ----------------------------------------------------
function renderSidebarPlaylists() {
  elements.sidebarPlaylists.innerHTML = '';
  state.playlists.forEach(pl => {
    const li = document.createElement('li');
    li.className = `playlist-item ${state.activePlaylistId === pl.id ? 'active' : ''}`;
    li.setAttribute('data-id', pl.id);
    li.textContent = pl.name;
    li.addEventListener('click', () => navigateToView('playlist', pl.id));
    elements.sidebarPlaylists.appendChild(li);
  });
}

function renderPlaylistView(playlistId) {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (!playlist) {
    navigateToView('home');
    return;
  }

  elements.playlistTitleDisplay.textContent = playlist.name;
  elements.playlistMetaDisplay.textContent = `${playlist.tracks.length} song${playlist.tracks.length === 1 ? '' : 's'} • ${playlist.description || 'No description'}`;
  
  renderTrackList(playlist.tracks, elements.playlistTrackList, playlist.id);
}

function renderLikedSongs() {
  elements.likedCount.textContent = state.likedSongs.length;
  renderTrackList(state.likedSongs, elements.likedTrackList, 'liked');
}

function renderTrackList(tracks, container, listContextId) {
  container.innerHTML = '';
  
  if (tracks.length === 0) {
    container.innerHTML = '<p class="queue-empty">No tracks in this list yet. Start searching to add songs!</p>';
    return;
  }
  
  tracks.forEach((track, index) => {
    const isPlaying = state.queue[state.currentQueueIndex]?.id === track.id;
    const isLiked = state.likedSongs.some(s => s.id === track.id);
    
    const row = document.createElement('div');
    row.className = `track-row ${isPlaying ? 'playing' : ''}`;
    row.dataset.id = track.id;
    
    row.innerHTML = `
      <div class="track-num-cell">${index + 1}</div>
      <div class="track-info-cell">
        <div class="track-thumb">
          <img src="${track.thumbnailUrl || ''}" alt="${track.title}">
        </div>
        <div class="track-text">
          <div class="track-title-cell" title="${track.title}">${track.title}</div>
          <div class="track-artist-cell" title="${track.artist}">${track.artist}</div>
        </div>
      </div>
      <div class="track-views-cell">${track.views || '-'}</div>
      <div class="track-duration-cell">${track.durationString || '-'}</div>
      <div class="track-actions-cell">
        <button class="btn-like-track ${isLiked ? 'liked' : ''}" data-action="like">
          <i data-lucide="heart" class="${isLiked ? 'fill' : ''}"></i>
        </button>
        <button class="btn-add-playlist-track" data-action="add-playlist">
          <i data-lucide="plus"></i>
        </button>
        ${listContextId !== 'liked' ? `
        <button class="btn-remove-track" data-action="remove">
          <i data-lucide="trash-2"></i>
        </button>` : ''}
      </div>
    `;
    
    // Play on row double click or single click
    row.addEventListener('click', (e) => {
      // Don't trigger if clicked on actions
      if (e.target.closest('button')) return;
      playTrackListStartingFrom(tracks, index);
    });
    
    // Actions click listeners
    row.querySelector('[data-action="like"]').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLikeTrack(track);
    });

    row.querySelector('[data-action="add-playlist"]').addEventListener('click', (e) => {
      e.stopPropagation();
      promptAddToPlaylist(track);
    });

    if (listContextId !== 'liked') {
      row.querySelector('[data-action="remove"]').addEventListener('click', (e) => {
        e.stopPropagation();
        removeTrackFromPlaylist(listContextId, track.id);
      });
    }
    
    container.appendChild(row);
  });
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function promptAddToPlaylist(track) {
  if (state.playlists.length === 0) {
    showToast('Create a playlist first!', 'warning');
    elements.playlistModal.classList.add('active');
    return;
  }
  
  // Build dynamic dropdown or simple prompt list
  const listNames = state.playlists.map((pl, i) => `${i + 1}. ${pl.name}`).join('\n');
  const response = prompt(`Choose a playlist to add "${track.title}" to:\n\n${listNames}\n\nEnter the number:`);
  
  if (response !== null) {
    const num = parseInt(response, 10);
    if (!isNaN(num) && num > 0 && num <= state.playlists.length) {
      const selectedPlaylist = state.playlists[num - 1];
      
      // Check if already in playlist
      if (selectedPlaylist.tracks.some(t => t.id === track.id)) {
        showToast('Song is already in this playlist', 'info');
        return;
      }
      
      selectedPlaylist.tracks.push(track);
      saveLocalStorage();
      showToast(`Added to "${selectedPlaylist.name}"`, 'success');
      
      // Refresh current view if we are on that playlist
      if (state.activeView === 'playlist' && state.activePlaylistId === selectedPlaylist.id) {
        renderPlaylistView(selectedPlaylist.id);
      }
    } else {
      showToast('Invalid choice', 'error');
    }
  }
}

function removeTrackFromPlaylist(playlistId, trackId) {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (playlist) {
    playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
    saveLocalStorage();
    showToast('Removed track from playlist', 'success');
    renderPlaylistView(playlistId);
  }
}

function toggleLikeTrack(track) {
  const isLiked = state.likedSongs.some(s => s.id === track.id);
  if (isLiked) {
    state.likedSongs = state.likedSongs.filter(s => s.id !== track.id);
    showToast('Removed from Liked Songs', 'info');
  } else {
    state.likedSongs.push(track);
    showToast('Added to Liked Songs', 'success');
  }
  
  saveLocalStorage();
  
  // Sync UI
  updateLikeButtonsSync(track.id);
  
  // Refresh views
  if (state.activeView === 'liked') renderLikedSongs();
  if (state.activeView === 'playlist') renderPlaylistView(state.activePlaylistId);
}

function updateLikeButtonsSync(trackId) {
  const isPlayingTrack = state.queue[state.currentQueueIndex]?.id === trackId;
  const isLiked = state.likedSongs.some(s => s.id === trackId);
  
  // Footer Like Button
  if (isPlayingTrack) {
    const playerLikeIcon = elements.playerBtnLike.querySelector('i, svg');
    const detailsLikeIcon = elements.detailsBtnLike.querySelector('i, svg');
    
    if (isLiked) {
      elements.playerBtnLike.classList.add('liked');
      if (playerLikeIcon) playerLikeIcon.classList.add('fill');
      elements.detailsBtnLike.classList.add('liked');
      if (detailsLikeIcon) detailsLikeIcon.classList.add('fill');
    } else {
      elements.playerBtnLike.classList.remove('liked');
      if (playerLikeIcon) playerLikeIcon.classList.remove('fill');
      elements.detailsBtnLike.classList.remove('liked');
      if (detailsLikeIcon) detailsLikeIcon.classList.remove('fill');
    }
  }
  
  // Rows Like buttons
  const rows = document.querySelectorAll(`.track-row[data-id="${trackId}"] .btn-like-track`);
  rows.forEach(btn => {
    const icon = btn.querySelector('i, svg');
    if (isLiked) {
      btn.classList.add('liked');
      if (icon) icon.classList.add('fill');
    } else {
      btn.classList.remove('liked');
      if (icon) icon.classList.remove('fill');
    }
  });
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ----------------------------------------------------
// PLAYBACK ENGINE
// ----------------------------------------------------
function playSongImmediately(song) {
  // Clear queue and play immediately to preserve user gesture context
  state.queue = [song];
  state.currentQueueIndex = 0;
  
  executeTrackPlay(song);

  // Fetch detailed metadata and high-res artwork asynchronously in the background
  (async () => {
    try {
      if (!song.duration || !song.views) {
        const details = await fetchVideoDetails([song.id]);
        if (details && details.length > 0) {
          const detailed = details[0];
          song.duration = detailed.duration;
          song.views = detailed.views;
          song.durationString = detailed.durationString;
          
          // If this song is still the active track in the queue, sync the UI duration info
          if (state.queue[state.currentQueueIndex]?.id === song.id) {
            elements.playerTimeDuration.textContent = detailed.durationString || '0:00';
            elements.progressSlider.max = 100;
          }
        }
      }
    } catch (e) {
      console.warn('[Sonoria] Background details fetch failed', e);
    }

    try {
      const artwork = await fetchITunesArtwork(song.title, song.artist);
      if (artwork) {
        song.thumbnailUrl = artwork;
        // If this song is still the active track, update UI artwork
        if (state.queue[state.currentQueueIndex]?.id === song.id) {
          elements.playerAlbumArt.src = artwork;
          elements.vinylAlbumArt.src = artwork;
        }
      }
    } catch (e) {
      console.warn('[Sonoria] Background iTunes artwork fetch failed', e);
    }
  })();
}

function playTrackListStartingFrom(trackList, startIndex) {
  state.queue = [...trackList];
  state.currentQueueIndex = startIndex;
  
  const song = state.queue[startIndex];
  executeTrackPlay(song);
}

function executeTrackPlay(song) {
  if (!song) return;
  
  console.log(`[Sonoria] Playing track: ${song.title} (ID: ${song.id})`);
  
  // Update Player UI details immediately
  elements.playerSongTitle.textContent = song.title;
  elements.playerSongArtist.textContent = song.artist;
  elements.detailsSongTitle.textContent = song.title;
  elements.detailsSongArtist.textContent = song.artist;
  
  if (song.thumbnailUrl) {
    elements.playerAlbumArt.src = song.thumbnailUrl;
    elements.vinylAlbumArt.src = song.thumbnailUrl;
  } else {
    // Gradient fallback
    elements.playerAlbumArt.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="100%25" height="100%25" fill="%2327272a"/%3E%3C/svg%3E';
    elements.vinylAlbumArt.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3E%3Crect width='100' height='100' fill='%23121214'/%3E%3Ccircle cx='50' cy='50' r='35' stroke='%231db954' stroke-width='2' stroke-dasharray='4 4'/%3E%3Cpath d='M41 65V35l30-6v30' stroke='%231db954' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='35' cy='65' r='6' fill='%231db954'/%3E%3Ccircle cx='65' cy='59' r='6' fill='%231db954'/%3E%3C/svg%3E";
  }

  // Sync Liked State
  updateLikeButtonsSync(song.id);
  
  // Mount playing state class on body
  document.body.classList.add('playing');
  document.body.classList.add('has-track');
  
  // Load & Play via service
  PlayerService.playTrack(song.id);
  state.isPlaying = true;
  updatePlayButtonUI(true);
  
  // Refresh queue layout
  renderQueueList();
  
  // Re-sync rows active highlighting
  document.querySelectorAll('.track-row').forEach(row => {
    if (row.dataset.id === song.id) {
      row.classList.add('playing');
      const titleCell = row.querySelector('.track-title-cell');
      if (titleCell) titleCell.style.color = 'var(--primary)';
    } else {
      row.classList.remove('playing');
      const titleCell = row.querySelector('.track-title-cell');
      if (titleCell) titleCell.style.color = '';
    }
  });
}

function updatePlayButtonUI(isPlaying) {
  const button = elements.playerBtnPlay;
  if (button) {
    button.innerHTML = isPlaying 
      ? '<i data-lucide="pause"></i>' 
      : '<i data-lucide="play" class="fill"></i>';
    button.title = isPlaying ? 'Pause' : 'Play';
  }
  if (elements.vinylAlbumArt) {
    elements.vinylAlbumArt.style.animationPlayState = isPlaying ? 'running' : 'paused';
  }
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function handlePlayPauseToggle() {
  if (state.currentQueueIndex === -1) {
    // If nothing playing, search and play trending
    if (state.queue.length > 0) {
      state.currentQueueIndex = 0;
      executeTrackPlay(state.queue[0]);
    } else {
      showToast('Select a song to start listening!', 'info');
    }
    return;
  }
  
  if (state.isPlaying) {
    PlayerService.pause();
    state.isPlaying = false;
    document.body.classList.remove('playing');
  } else {
    PlayerService.resume();
    state.isPlaying = true;
    document.body.classList.add('playing');
  }
  updatePlayButtonUI(state.isPlaying);
}

function playNextTrack(isAuto = false) {
  if (state.queue.length === 0) return;
  
  // If isAuto is an Event object (e.g. from click listener), treat it as false
  const autoAdvance = (isAuto === true);
  let nextIndex = state.currentQueueIndex;
  
  if (state.repeatMode === 'one') {
    executeTrackPlay(state.queue[state.currentQueueIndex]);
    return;
  }
  
  if (state.isShuffle) {
    if (state.queue.length > 1) {
      let rand = state.currentQueueIndex;
      while (rand === state.currentQueueIndex) {
        rand = Math.floor(Math.random() * state.queue.length);
      }
      nextIndex = rand;
    } else {
      nextIndex = 0;
    }
  } else {
    nextIndex = state.currentQueueIndex + 1;
    if (nextIndex >= state.queue.length) {
      if (autoAdvance && state.repeatMode === 'off') {
        // Stop playback at the end of the queue if repeat is off
        state.isPlaying = false;
        updatePlayButtonUI(false);
        document.body.classList.remove('playing');
        showToast('Queue ended', 'info');
        return;
      }
      nextIndex = 0; // Wrap around to first track
    }
  }
  
  state.currentQueueIndex = nextIndex;
  executeTrackPlay(state.queue[nextIndex]);
}

function playPrevTrack() {
  if (state.queue.length === 0) return;
  
  let prevIndex = state.currentQueueIndex;
  
  if (state.repeatMode === 'one') {
    executeTrackPlay(state.queue[state.currentQueueIndex]);
    return;
  }
  
  if (state.isShuffle) {
    if (state.queue.length > 1) {
      let rand = state.currentQueueIndex;
      while (rand === state.currentQueueIndex) {
        rand = Math.floor(Math.random() * state.queue.length);
      }
      prevIndex = rand;
    } else {
      prevIndex = 0;
    }
  } else {
    prevIndex = state.currentQueueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = state.queue.length - 1;
    }
  }
  
  state.currentQueueIndex = prevIndex;
  executeTrackPlay(state.queue[prevIndex]);
}

function addToQueue(song) {
  state.queue.push(song);
  showToast(`Added "${song.title}" to Play Queue`, 'success');
  renderQueueList();
}

function renderQueueList() {
  elements.queueItemsList.innerHTML = '';
  
  const upcomingSongs = state.queue.slice(state.currentQueueIndex + 1);
  
  if (upcomingSongs.length === 0) {
    elements.queueItemsList.innerHTML = '<li class="queue-empty">Queue is empty</li>';
    return;
  }
  
  upcomingSongs.forEach((song, idx) => {
    const queueIdx = state.currentQueueIndex + 1 + idx;
    
    const li = document.createElement('li');
    li.className = 'queue-item';
    li.innerHTML = `
      <div class="queue-thumb">
        <img src="${song.thumbnailUrl || ''}" alt="${song.title}">
      </div>
      <div class="queue-title" title="${song.title}">${song.title}</div>
      <button class="btn-remove-queue" data-index="${queueIdx}">
        <i data-lucide="trash-2"></i>
      </button>
    `;
    
    // Jump to this track on click
    li.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      state.currentQueueIndex = queueIdx;
      executeTrackPlay(song);
    });
    
    // Delete from queue listener
    li.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      const removeIndex = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      state.queue.splice(removeIndex, 1);
      renderQueueList();
      showToast('Removed from Queue', 'info');
    });
    
    elements.queueItemsList.appendChild(li);
  });
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ----------------------------------------------------
// CANVAS VISUALIZER
// ----------------------------------------------------
let visualizerCtx = null;
let animationId = null;
let visualizerBars = [];
const VISUALIZER_BAR_COUNT = 32;

function initializeVisualizer() {
  const canvas = elements.visualizerCanvas;
  if (!canvas) return;
  
  visualizerCtx = canvas.getContext('2d');
  
  // Set dimensions
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Set up placeholder visualizer bars
  visualizerBars = Array(VISUALIZER_BAR_COUNT).fill(0).map(() => ({
    currentHeight: 0,
    targetHeight: 0,
    speed: 0.1 + Math.random() * 0.15
  }));
  
  // Start visualizer drawing loop
  drawVisualizer();
}

function resizeCanvas() {
  const canvas = elements.visualizerCanvas;
  if (!canvas) return;
  
  // Find rect of parent container
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

function drawVisualizer() {
  animationId = requestAnimationFrame(drawVisualizer);
  
  if (!visualizerCtx || !elements.visualizerCanvas) return;
  
  const ctx = visualizerCtx;
  const canvas = elements.visualizerCanvas;
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.clearRect(0, 0, w, h);
  
  // Base visualizer settings
  const spacing = 4;
  const barWidth = (w - (spacing * (VISUALIZER_BAR_COUNT + 1))) / VISUALIZER_BAR_COUNT;
  
  // Pulse factor based on time
  const time = Date.now() * 0.003;
  
  // Draw bars
  for (let i = 0; i < VISUALIZER_BAR_COUNT; i++) {
    const bar = visualizerBars[i];
    
    if (state.isPlaying) {
      // Calculate animated values using overlapping sine waves
      const factor1 = Math.sin(i * 0.3 + time * 1.5) * 0.4 + 0.6;
      const factor2 = Math.cos(i * 0.1 - time * 0.8) * 0.3 + 0.5;
      
      // Calculate target heights dynamically
      bar.targetHeight = (factor1 * factor2) * (h * 0.7);
    } else {
      // Return slowly to flat line
      bar.targetHeight = 4;
    }
    
    // Smooth interpolations
    bar.currentHeight += (bar.targetHeight - bar.currentHeight) * bar.speed;
    
    const x = spacing + i * (barWidth + spacing);
    const height = Math.max(2, bar.currentHeight);
    const y = h - height;
    
    // Gradient coloring
    const grad = ctx.createLinearGradient(x, y, x, h);
    if (state.playbackMode === 'video') {
      grad.addColorStop(0, '#00b4d8');
      grad.addColorStop(1, 'rgba(0, 180, 216, 0.1)');
    } else {
      grad.addColorStop(0, '#1db954');
      grad.addColorStop(1, 'rgba(29, 185, 84, 0.1)');
    }
    
    ctx.fillStyle = grad;
    
    // Draw rounded rect bar
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, height, [3, 3, 0, 0]);
    ctx.fill();
  }

  // Draw circular glowing overlay wave in background
  if (state.isPlaying) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 75 + Math.sin(time * 2) * 5, 0, Math.PI * 2);
    ctx.strokeStyle = state.playbackMode === 'video' ? 'rgba(0, 180, 216, 0.1)' : 'rgba(29, 185, 84, 0.1)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

// ----------------------------------------------------
// EVENT BINDINGS & LISTENERS
// ----------------------------------------------------
function setupEventListeners() {
  // Navigation items (desktop sidebar)
  elements.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const view = e.currentTarget.getAttribute('data-view');
      navigateToView(view);
    });
  });

  // Mobile bottom navigation
  elements.mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      navigateToView(view);
    });
  });

  // Hamburger menu toggle
  if (elements.btnHamburger) {
    elements.btnHamburger.addEventListener('click', () => {
      const isOpen = elements.sidebar.classList.contains('mobile-open');
      if (isOpen) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    });
  }

  // Sidebar overlay click to close
  if (elements.sidebarOverlay) {
    elements.sidebarOverlay.addEventListener('click', closeMobileSidebar);
  }

  // Search input events
  elements.inputSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      triggerSearch(elements.inputSearch.value);
    }
  });

  elements.inputSearch.addEventListener('input', () => {
    if (elements.inputSearch.value.trim().length > 0) {
      elements.btnClearSearch.classList.remove('hidden');
    } else {
      elements.btnClearSearch.classList.add('hidden');
    }
    
    // Debounce search keystrokes
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      triggerSearch(elements.inputSearch.value);
    }, 600);
  });

  elements.btnClearSearch.addEventListener('click', () => {
    elements.inputSearch.value = '';
    elements.btnClearSearch.classList.add('hidden');
    triggerSearch('');
  });

  // Custom Playlist Modals
  elements.btnCreatePlaylist.addEventListener('click', () => {
    elements.playlistModal.classList.add('active');
    elements.inputPlaylistName.focus();
  });
  
  const closeModal = () => {
    elements.playlistModal.classList.remove('active');
    elements.inputPlaylistName.value = '';
    elements.inputPlaylistDesc.value = '';
  };

  elements.btnClosePlaylistModal.addEventListener('click', closeModal);
  elements.btnCancelPlaylistModal.addEventListener('click', closeModal);
  
  elements.btnSavePlaylist.addEventListener('click', () => {
    const name = elements.inputPlaylistName.value.trim();
    const desc = elements.inputPlaylistDesc.value.trim();
    
    if (!name) {
      showToast('Playlist name is required', 'warning');
      return;
    }
    
    const newPlaylist = {
      id: `pl-${Date.now()}`,
      name,
      description: desc,
      tracks: []
    };
    
    state.playlists.push(newPlaylist);
    saveLocalStorage();
    renderSidebarPlaylists();
    closeModal();
    showToast(`Playlist "${name}" created!`, 'success');
  });

  // Playlists delete
  elements.btnDeleteCurrentPlaylist.addEventListener('click', () => {
    if (!state.activePlaylistId) return;
    
    const playlist = state.playlists.find(p => p.id === state.activePlaylistId);
    if (confirm(`Are you sure you want to delete the playlist "${playlist?.name}"?`)) {
      state.playlists = state.playlists.filter(p => p.id !== state.activePlaylistId);
      saveLocalStorage();
      renderSidebarPlaylists();
      navigateToView('home');
      showToast('Playlist deleted', 'info');
    }
  });

  // Play Actions
  elements.btnPlayPlaylist.addEventListener('click', () => {
    const pl = state.playlists.find(p => p.id === state.activePlaylistId);
    if (pl && pl.tracks.length > 0) {
      playTrackListStartingFrom(pl.tracks, 0);
    } else {
      showToast('No songs in this playlist to play', 'info');
    }
  });

  elements.btnPlayLiked.addEventListener('click', () => {
    if (state.likedSongs.length > 0) {
      playTrackListStartingFrom(state.likedSongs, 0);
    } else {
      showToast('No liked songs yet', 'info');
    }
  });

  // Playback Control Buttons
  elements.playerBtnPlay.addEventListener('click', handlePlayPauseToggle);
  elements.playerBtnNext.addEventListener('click', playNextTrack);
  elements.playerBtnPrev.addEventListener('click', playPrevTrack);

  // Shuffle Button
  elements.playerBtnShuffle.addEventListener('click', () => {
    state.isShuffle = !state.isShuffle;
    if (state.isShuffle) {
      elements.playerBtnShuffle.classList.add('active');
      showToast('Shuffle ON', 'success');
    } else {
      elements.playerBtnShuffle.classList.remove('active');
      showToast('Shuffle OFF', 'info');
    }
  });

  // Repeat Button
  elements.playerBtnRepeat.addEventListener('click', () => {
    if (state.repeatMode === 'off') {
      state.repeatMode = 'all';
      elements.playerBtnRepeat.classList.add('active');
      elements.playerBtnRepeat.innerHTML = '<i data-lucide="repeat"></i>';
      showToast('Repeat: All', 'success');
    } else if (state.repeatMode === 'all') {
      state.repeatMode = 'one';
      elements.playerBtnRepeat.classList.add('active');
      elements.playerBtnRepeat.innerHTML = '<i data-lucide="repeat-1"></i>';
      showToast('Repeat: One', 'success');
    } else {
      state.repeatMode = 'off';
      elements.playerBtnRepeat.classList.remove('active');
      elements.playerBtnRepeat.innerHTML = '<i data-lucide="repeat"></i>';
      showToast('Repeat: Off', 'info');
    }
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  // Like Buttons (Footer and details panel)
  const handleLikeToggle = () => {
    const currentSong = state.queue[state.currentQueueIndex];
    if (currentSong) {
      toggleLikeTrack(currentSong);
    }
  };
  elements.playerBtnLike.addEventListener('click', handleLikeToggle);
  elements.detailsBtnLike.addEventListener('click', handleLikeToggle);

  // Mode Switches (Audio vs Video)
  elements.btnModeAudio.addEventListener('click', () => {
    PlayerService.setPlaybackMode('audio');
  });

  elements.btnModeVideo.addEventListener('click', () => {
    PlayerService.setPlaybackMode('video');
  });

  // Quick mode toggle inside player bar
  elements.playerBtnQuickMode.addEventListener('click', () => {
    const active = PlayerService.getPlaybackMode();
    const nextMode = active === 'audio' ? 'video' : 'audio';
    PlayerService.setPlaybackMode(nextMode);
  });

  // Listen to playback mode changes
  window.addEventListener('sonoria-playback-mode-changed', (e) => {
    const mode = e.detail.mode;
    state.playbackMode = mode;
    
    const quickModeBtn = elements.playerBtnQuickMode;
    
    if (mode === 'video') {
      elements.btnModeVideo.classList.add('active');
      elements.btnModeAudio.classList.remove('active');
      quickModeBtn.classList.add('active');
      quickModeBtn.innerHTML = '<i data-lucide="video" id="quick-mode-icon"></i>';
      showToast('Switched to Video Playback', 'info');
    } else {
      elements.btnModeAudio.classList.add('active');
      elements.btnModeVideo.classList.remove('active');
      quickModeBtn.classList.remove('active');
      quickModeBtn.innerHTML = '<i data-lucide="headphones" id="quick-mode-icon"></i>';
      showToast('Switched to Audio Only', 'info');
    }
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  // Sidebar toggle details panel
  elements.playerBtnToggleDetails.addEventListener('click', () => {
    state.isDetailsPanelOpen = !state.isDetailsPanelOpen;
    const layout = document.querySelector('.app-layout');
    
    if (state.isDetailsPanelOpen) {
      layout.classList.remove('hide-details');
      elements.playerBtnToggleDetails.classList.add('active');
    } else {
      layout.classList.add('hide-details');
      elements.playerBtnToggleDetails.classList.remove('active');
    }
    
    // Redraw visualizer to match new width
    setTimeout(resizeCanvas, 310);
  });

  elements.btnCloseDetails.addEventListener('click', () => {
    elements.playerBtnToggleDetails.click();
  });

  // Timeline Progress Slider
  elements.progressSlider.addEventListener('mousedown', () => {
    state.isDraggingProgress = true;
  });
  elements.progressSlider.addEventListener('touchstart', () => {
    state.isDraggingProgress = true;
  });

  elements.progressSlider.addEventListener('input', (e) => {
    state.isDraggingProgress = true;
    const pct = parseFloat(e.target.value);
    const currentSong = state.queue[state.currentQueueIndex];
    const duration = currentSong && currentSong.duration ? currentSong.duration : (window.ytPlayer && typeof window.ytPlayer.getDuration === 'function' ? window.ytPlayer.getDuration() : 100);
    const seconds = (pct / 100) * duration;
    
    // Update local UI representation immediately during drag
    elements.progressFill.style.width = `${pct}%`;
    elements.playerTimeCurrent.textContent = formatDuration(seconds);
  });

  elements.progressSlider.addEventListener('change', (e) => {
    const pct = parseFloat(e.target.value);
    const currentSong = state.queue[state.currentQueueIndex];
    const duration = currentSong && currentSong.duration ? currentSong.duration : (window.ytPlayer && typeof window.ytPlayer.getDuration === 'function' ? window.ytPlayer.getDuration() : 0);
    if (duration > 0) {
      const targetSec = (pct / 100) * duration;
      PlayerService.seekTo(targetSec);
    }
    setTimeout(() => {
      state.isDraggingProgress = false;
    }, 250);
  });

  // Volume slider events
  elements.volumeSlider.addEventListener('input', (e) => {
    const vol = parseInt(e.target.value, 10);
    PlayerService.setVolume(vol);
    elements.volumeFill.style.width = `${vol}%`;
    state.previousVolume = vol;
    
    const muteBtn = elements.playerBtnMute;
    if (vol === 0) {
      muteBtn.innerHTML = '<i data-lucide="volume-x"></i>';
      state.isMuted = true;
    } else {
      const iconName = vol < 40 ? 'volume-1' : 'volume-2';
      muteBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
      state.isMuted = false;
    }
    if (window.lucide) window.lucide.createIcons();
  });

  elements.playerBtnMute.addEventListener('click', () => {
    const muteBtn = elements.playerBtnMute;
    if (state.isMuted) {
      PlayerService.setVolume(state.previousVolume);
      elements.volumeSlider.value = state.previousVolume;
      elements.volumeFill.style.width = `${state.previousVolume}%`;
      const iconName = state.previousVolume < 40 ? 'volume-1' : 'volume-2';
      muteBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
      state.isMuted = false;
    } else {
      PlayerService.setVolume(0);
      elements.volumeSlider.value = 0;
      elements.volumeFill.style.width = `0%`;
      muteBtn.innerHTML = '<i data-lucide="volume-x"></i>';
      state.isMuted = true;
    }
    if (window.lucide) window.lucide.createIcons();
  });

  // API manual rotation button
  if (elements.btnRotateKey) {
    elements.btnRotateKey.addEventListener('click', () => {
      rotateKey();
      updateAPIKeyUI();
      showToast('YouTube API key rotated manually!', 'info');
    });
  }

  // Clear queue
  elements.btnClearQueue.addEventListener('click', () => {
    state.queue = state.queue.slice(0, state.currentQueueIndex + 1);
    renderQueueList();
    showToast('Play Queue cleared', 'info');
  });

  // Vibe Choice Modal events
  const closeChoiceModal = () => {
    elements.vibeChoiceModal.classList.remove('active');
  };

  elements.btnCloseVibeChoiceModal.addEventListener('click', closeChoiceModal);
  
  elements.vibeChoiceModal.addEventListener('click', (e) => {
    if (e.target === elements.vibeChoiceModal) {
      closeChoiceModal();
    }
  });

  elements.btnVibeChoiceHindi.addEventListener('click', () => {
    closeChoiceModal();
    elements.inputSearch.value = '90s Nostalgia (Hindi)';
    triggerSearch('90s Nostalgia Hindi');
  });

  elements.btnVibeChoiceEnglish.addEventListener('click', () => {
    closeChoiceModal();
    elements.inputSearch.value = '90s Nostalgia (English)';
    triggerSearch('90s Nostalgia English');
  });

  // Key Rotations notification syncing (Silent rotation in background)
  window.addEventListener('sonoria-key-rotated', (e) => {
    updateAPIKeyUI();
    console.log(`[Sonoria] API Key rotated to index ${e.detail.newIndex} automatically.`);
  });

  // Hero Play Button
  elements.heroPlayBtn.addEventListener('click', () => {
    elements.inputSearch.value = 'Global Hits';
    triggerSearch('Global Hits');
  });

  // Vibe cards click selection
  document.querySelectorAll('.vibe-card').forEach(card => {
    card.addEventListener('click', () => {
      const query = card.getAttribute('data-query');
      if (query === '90s Pop Global Hits') {
        elements.vibeChoiceModal.classList.add('active');
      } else {
        elements.inputSearch.value = query;
        triggerSearch(query);
      }
    });
  });

  // ----------------------------------------------------
  // SYNCING WITH PLAYER EVENTS
  // ----------------------------------------------------
  PlayerService.onStateChange((e) => {
    if (e.state === 'playing') {
      state.isPlaying = true;
      updatePlayButtonUI(true);
      document.body.classList.add('playing');
    } else if (e.state === 'paused') {
      state.isPlaying = false;
      updatePlayButtonUI(false);
      document.body.classList.remove('playing');
    } else if (e.state === 'ended') {
      state.isPlaying = false;
      updatePlayButtonUI(false);
      document.body.classList.remove('playing');
      
      // Auto-advance to next song
      playNextTrack(true);
    } else if (e.state === 'error') {
      state.isPlaying = false;
      updatePlayButtonUI(false);
      document.body.classList.remove('playing');
      showToast(`Playback Error: ${e.error}`, 'error');
    }
  });

  PlayerService.onTimeUpdate((progress) => {
    if (state.isDraggingProgress) return;
    
    const curTime = progress.currentTime || 0;
    const duration = progress.duration || 0;
    
    // Sync text stamps
    elements.playerTimeCurrent.textContent = formatDuration(curTime);
    elements.playerTimeDuration.textContent = formatDuration(duration);
    
    // Sync timeline range inputs
    if (duration > 0) {
      const percentage = (curTime / duration) * 100;
      elements.progressSlider.value = percentage;
      elements.progressSlider.max = 100;
      elements.progressFill.style.width = `${percentage}%`;
    } else {
      elements.progressSlider.value = 0;
      elements.progressFill.style.width = `0%`;
    }
  });
}
