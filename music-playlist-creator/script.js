const playlistGrid = document.getElementById("playlist-grid");
const modal = document.getElementById("modal-overlay");
const closeBtn = document.querySelector(".playlist-modal-close");
const shuffleBtn = document.getElementById("shuffle-button");
const modalTopImage = document.querySelector(".modal-top-left img");
const modalTitle = document.querySelector(".modal-top-right h3");
const modalCreator = document.querySelector(".modal-top-right .creator-name");
const modalSongList = document.querySelector(".modal-grid");
const playlistPlayButton = document.getElementById("playlist-play-button");
const playlistPrevButton = document.getElementById("playlist-prev-button");
const playlistNextButton = document.getElementById("playlist-next-button");
const nowPlayingLabel = document.getElementById("now-playing-label");
const getDescriptionBtn = document.getElementById("get-description-button");
const playlistDescriptionEl = document.getElementById("playlist-description");
const createPlaylistForm = document.getElementById("create-playlist-form");
const songsInputList = document.getElementById("songs-input-list");
const addSongRowButton = document.getElementById("add-song-row-button");
const createPlaylistMessage = document.getElementById("create-playlist-message");
const createPlaylistModal = document.getElementById("create-playlist-modal");
const openCreatePlaylistModalButton = document.getElementById("open-create-playlist-modal-button");
const closeCreatePlaylistModalButton = document.querySelector(".create-playlist-close");
const createPlaylistModalTitle = document.getElementById("create-playlist-modal-title");
const createPlaylistSubmitButton = document.getElementById("create-playlist-button");
const playlistSearchInput = document.getElementById("playlist-search-input");
const playlistSortSelect = document.getElementById("playlist-sort-select");

let playlistsStore = [];
let activePlaylistIndex = null;
let activeSongsView = [];
let editingPlaylistIndex = null;
let currentSearchQuery = "";
let currentSortMode = "date_desc";
let activeTrackIndex = -1;
let currentPlayingSong = null;
const previewAudio = new Audio();

// Paste your OpenRouter key here:
// const OPENROUTER_API_KEY = "sk-or-v1-...";
const OPENROUTER_API_KEY = API_KEY;
const DESCRIPTION_LOADING_MESSAGE = "Generating description...";
const DESCRIPTION_FAILURE_MESSAGE = "Description is unavailable right now. Please try again.";
const DESCRIPTION_SYSTEM_PROMPT =
  "You are a music editor. Write exactly 2-3 sentences that describe a playlist's vibe and theme based on playlist title, creator, and song list context. Do not list the songs individually. Avoid generic marketing language, hype, or promotional phrasing. Keep it concrete and natural.";

function renderPlaylistGrid() {
  playlistGrid.innerHTML = "";

  const normalizedQuery = currentSearchQuery.trim().toLowerCase();
  const filteredPlaylists = playlistsStore
    .map((playlist, index) => ({ playlist, index }))
    .filter(({ playlist }) => {
      const title = (playlist.playlist_title || "").toLowerCase();
      const author = (playlist.creator_name || "").toLowerCase();
      const matchesQuery =
        normalizedQuery.length === 0 ||
        title.includes(normalizedQuery) ||
        author.includes(normalizedQuery);
      return matchesQuery;
    });

  filteredPlaylists.sort((a, b) => {
    const aName = (a.playlist.playlist_title || "").toLowerCase();
    const bName = (b.playlist.playlist_title || "").toLowerCase();
    const aLikes = Number(a.playlist.num_likes) || 0;
    const bLikes = Number(b.playlist.num_likes) || 0;
    const aDate = Number(a.playlist.date_added) || 0;
    const bDate = Number(b.playlist.date_added) || 0;

    let primaryCompare = 0;
    switch (currentSortMode) {
      case "name_asc":
        primaryCompare = aName.localeCompare(bName);
        break;
      case "name_desc":
        primaryCompare = bName.localeCompare(aName);
        break;
      case "likes_asc":
        primaryCompare = aLikes - bLikes;
        break;
      case "likes_desc":
        primaryCompare = bLikes - aLikes;
        break;
      case "date_asc":
        primaryCompare = aDate - bDate;
        break;
      case "date_desc":
      default:
        primaryCompare = bDate - aDate;
        break;
    }

    if (primaryCompare !== 0) return primaryCompare;

    // Tie-breakers: name, then original index in playlistsStore
    const nameCompare = aName.localeCompare(bName);
    if (nameCompare !== 0) return nameCompare;
    return a.index - b.index;
  });

  filteredPlaylists.forEach(({ playlist, index }) => {
    playlistGrid.appendChild(createPlaylistCard(playlist, index));
  });
}

function createSongInputRow(song = {}) {
  const row = document.createElement("div");
  row.className = "song-input-row";
  row.dataset.coverSrc = song.song_cover || "assets/img/song.png";
  row.innerHTML = `
    <input type="text" name="songTitle" placeholder="Song Title" required maxlength="80">
    <input type="text" name="songArtist" placeholder="Artist" required maxlength="80">
    <input type="text" name="songAlbum" placeholder="Album" maxlength="80">
    <input type="text" name="songDuration" placeholder="Duration (mm:ss)" maxlength="10">
    <label class="song-cover-upload">
      <span>Cover</span>
      <input type="file" name="songCoverFile" accept="image/*">
    </label>
    <img class="song-cover-preview" alt="Song cover preview">
    <button type="button" class="remove-song-row-button" aria-label="Remove song row">Remove</button>
  `;
  row.querySelector('input[name="songTitle"]').value = song.song_title || "";
  row.querySelector('input[name="songArtist"]').value = song.artist_name || "";
  row.querySelector('input[name="songAlbum"]').value = song.album_name || "";
  row.querySelector('input[name="songDuration"]').value = song.song_length || "";
  const preview = row.querySelector(".song-cover-preview");
  if (preview) preview.src = row.dataset.coverSrc;
  return row;
}

function resetCreatePlaylistForm() {
  if (!createPlaylistForm || !songsInputList) return;
  createPlaylistForm.reset();
  songsInputList.innerHTML = "";
  songsInputList.appendChild(createSongInputRow());
}

function openPlaylistFormModal(mode = "create", playlistIndex = null) {
  if (!createPlaylistModal || !createPlaylistForm || !songsInputList) return;

  if (mode === "edit" && playlistIndex !== null && playlistsStore[playlistIndex]) {
    editingPlaylistIndex = playlistIndex;
    const playlist = playlistsStore[playlistIndex];
    const nameInput = document.getElementById("playlist-name-input");
    const authorInput = document.getElementById("playlist-author-input");

    if (createPlaylistModalTitle) createPlaylistModalTitle.textContent = "Edit Playlist";
    if (createPlaylistSubmitButton) createPlaylistSubmitButton.textContent = "Save Changes";
    if (nameInput) nameInput.value = playlist.playlist_title || "";
    if (authorInput) authorInput.value = playlist.creator_name || "";

    songsInputList.innerHTML = "";
    const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
    if (songs.length === 0) {
      songsInputList.appendChild(createSongInputRow());
    } else {
      songs.forEach((song) => songsInputList.appendChild(createSongInputRow(song)));
    }
  } else {
    editingPlaylistIndex = null;
    if (createPlaylistModalTitle) createPlaylistModalTitle.textContent = "Create a New Playlist";
    if (createPlaylistSubmitButton) createPlaylistSubmitButton.textContent = "Create Playlist";
    resetCreatePlaylistForm();
  }

  if (createPlaylistMessage) createPlaylistMessage.textContent = "";
  createPlaylistModal.showModal?.();
}

function readSongsFromForm() {
  if (!songsInputList) return [];
  const rows = Array.from(songsInputList.querySelectorAll(".song-input-row"));

  return rows
    .map((row) => {
      const title = row.querySelector('input[name="songTitle"]')?.value.trim() || "";
      const artist = row.querySelector('input[name="songArtist"]')?.value.trim() || "";
      const album = row.querySelector('input[name="songAlbum"]')?.value.trim() || "";
      const durationInput = row.querySelector('input[name="songDuration"]')?.value.trim() || "";
      const duration = durationInput || "--:--";
      const cover = row.dataset.coverSrc || "assets/img/song.png";
      return {
        title,
        artist,
        album,
        duration,
        cover,
      };
    })
    .filter((song) => song.title && song.artist);
}

function formatLikes(numLikes) {
  return `${numLikes} like${numLikes === 1 ? "" : "s"}`;
}

/**
 * Normalize incoming JSON to always be an array of playlist objects.
 * Supports:
 * - [ ... ]
 * - { ...singlePlaylist }
 * - { playlists: [ ... ] }
 */
function normalizePlaylists(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.playlists)) return raw.playlists;
  if (raw && typeof raw === "object") return [raw];
  return [];
}

function createSongCard(song) {
  const li = document.createElement("li");
  const article = document.createElement("article");
  article.className = "song-card";

  const left = document.createElement("div");
  left.className = "song-left";

  const imgWrap = document.createElement("div");
  const img = document.createElement("img");
  img.src = song.song_cover || "assets/img/song.png";
  img.alt = `${song.song_title || "Song"} cover`;
  imgWrap.appendChild(img);

  const textWrap = document.createElement("div");
  const title = document.createElement("h4");
  title.textContent = song.song_title || "Untitled Song";

  const artist = document.createElement("p");
  artist.textContent = song.artist_name || "Unknown Artist";

  const album = document.createElement("p");
  album.textContent = song.album_name || "Unknown Album";

  textWrap.append(title, artist, album);
  left.append(imgWrap, textWrap);

  const right = document.createElement("div");
  const songPlayButton = document.createElement("button");
  songPlayButton.className = "song-play-button";
  songPlayButton.type = "button";
  songPlayButton.textContent = "▶";
  songPlayButton.setAttribute("aria-label", `Play preview for ${song.song_title || "song"}`);

  const length = document.createElement("p");
  length.textContent = song.song_length || "--:--";
  right.appendChild(songPlayButton);
  right.appendChild(length);

  article.append(left, right);
  li.appendChild(article);
  return li;
}

function renderModalSongs(songs) {
  modalSongList.innerHTML = "";

  if (!Array.isArray(songs) || songs.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.textContent = "No songs in this playlist yet.";
    modalSongList.appendChild(emptyLi);
    return;
  }

  songs.forEach((song, index) => {
    const songCard = createSongCard(song);
    const playButton = songCard.querySelector(".song-play-button");
    if (playButton) playButton.dataset.songIndex = String(index);
    modalSongList.appendChild(songCard);
  });
}

function updateNowPlayingLabel() {
  if (!nowPlayingLabel) return;
  if (activeTrackIndex < 0 || !activeSongsView[activeTrackIndex]) {
    nowPlayingLabel.textContent = "";
    return;
  }
  const song = activeSongsView[activeTrackIndex];
  nowPlayingLabel.textContent = `${previewAudio.paused ? "Paused" : "Now Playing"}: ${song.song_title || "Untitled"} - ${song.artist_name || "Unknown Artist"}`;
}

function updatePlaylistPlayButton() {
  if (!playlistPlayButton) return;
  playlistPlayButton.textContent = previewAudio.paused ? "▶" : "❚❚";
  playlistPlayButton.setAttribute(
    "aria-label",
    previewAudio.paused ? "Play playlist" : "Pause playlist"
  );
}

function updateSongPlayButtons() {
  const playButtons = modalSongList?.querySelectorAll(".song-play-button") || [];
  playButtons.forEach((button) => {
    const index = Number(button.dataset.songIndex);
    const isCurrent = Number.isFinite(index) && index === activeTrackIndex;
    button.textContent = isCurrent && !previewAudio.paused ? "❚❚" : "▶";
    button.setAttribute(
      "aria-label",
      isCurrent && !previewAudio.paused ? "Pause song preview" : "Play song preview"
    );
  });
}

function deezerJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `deezerCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
    };
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Deezer JSONP timed out"));
    }, 10000);

    window[callbackName] = (payload) => {
      clearTimeout(timeoutId);
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error("Deezer JSONP failed"));
    };

    script.src = `${url}${url.includes("?") ? "&" : "?"}output=jsonp&callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

async function fetchDeezerTrackInfo(song) {
  if (song.preview_url) return song;

  const requests = [];
  if (song.deezer_track_id) {
    requests.push(`https://api.deezer.com/track/${song.deezer_track_id}`);
  }

  const q = encodeURIComponent(`${song.song_title || ""} ${song.artist_name || ""}`.trim());
  if (q) {
    requests.push(`https://api.deezer.com/search?q=${q}`);
  }

  for (const requestUrl of requests) {
    try {
      const data = await deezerJsonp(requestUrl);
      const track = data?.data?.[0] || data;
      if (!track?.preview) continue;

      song.preview_url = track.preview;
      song.song_cover = song.song_cover || track.album?.cover_medium || track.album?.cover || "assets/img/song.png";
      if ((!song.song_length || song.song_length === "--:--") && track.duration) {
        const mins = String(Math.floor(track.duration / 60)).padStart(2, "0");
        const secs = String(track.duration % 60).padStart(2, "0");
        song.song_length = `${mins}:${secs}`;
      }
      return song;
    } catch (error) {
      // Try the next Deezer lookup strategy.
    }
  }

  return song;
}

async function playTrackAt(index) {
  if (index < 0 || index >= activeSongsView.length) return;
  const song = activeSongsView[index];
  await fetchDeezerTrackInfo(song);

  if (!song.preview_url) {
    if (nowPlayingLabel) nowPlayingLabel.textContent = "Preview unavailable for this song.";
    return;
  }

  activeTrackIndex = index;
  currentPlayingSong = song;
  previewAudio.src = song.preview_url;
  await previewAudio.play().catch(() => {});
  updatePlaylistPlayButton();
  updateNowPlayingLabel();
  updateSongPlayButtons();
}

function playNextTrack() {
  if (activeSongsView.length === 0) return;
  const nextIndex = activeTrackIndex < 0
    ? 0
    : (activeTrackIndex + 1) % activeSongsView.length;
  playTrackAt(nextIndex);
}

function playPrevTrack() {
  if (activeSongsView.length === 0) return;
  const prevIndex = activeTrackIndex < 0
    ? 0
    : (activeTrackIndex - 1 + activeSongsView.length) % activeSongsView.length;
  playTrackAt(prevIndex);
}

function shuffleSongs(songs) {
  const copy = songs.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function openPlaylistModal(index) {
  const playlist = playlistsStore[index];
  if (!playlist) return;
  activePlaylistIndex = index;

  modalTopImage.src = playlist.playlist_cover || "assets/img/playlist.png";
  modalTopImage.alt = `Cover art for ${playlist.playlist_title || "Playlist"}`;
  modalTitle.textContent = playlist.playlist_title || "Untitled Playlist";
  modalCreator.textContent = `Created by ${playlist.creator_name || "Unknown Creator"}`;
  if (playlistDescriptionEl) playlistDescriptionEl.textContent = "";
  activeSongsView = Array.isArray(playlist.songs) ? playlist.songs.slice() : [];
  activeTrackIndex = -1;
  currentPlayingSong = null;
  previewAudio.pause();
  previewAudio.src = "";
  renderModalSongs(activeSongsView);
  updatePlaylistPlayButton();
  updateNowPlayingLabel();
  updateSongPlayButtons();

  modal.showModal?.();
}

async function getPlaylistDescription(playlist) {
  try {
    if (!OPENROUTER_API_KEY) {
      return "Description is unavailable. Add your OpenRouter API key in script.js (OPENROUTER_API_KEY).";
    }

    const songContext = (Array.isArray(playlist.songs) ? playlist.songs : [])
      .map((song) => `${song.song_title || "Untitled"} by ${song.artist_name || "Unknown Artist"}`)
      .join(", ");

    const userPrompt = `Playlist title: ${playlist.playlist_title || "Untitled Playlist"}
Creator: ${playlist.creator_name || "Unknown Creator"}
Songs: ${songContext || "No songs listed"}

Write a 2-3 sentence playlist description.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: DESCRIPTION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) return DESCRIPTION_FAILURE_MESSAGE;

    const data = await response.json();
    const description = data?.choices?.[0]?.message?.content?.trim();
    return description || DESCRIPTION_FAILURE_MESSAGE;
  } catch (error) {
    console.error("getPlaylistDescription failed:", error);
    return DESCRIPTION_FAILURE_MESSAGE;
  }
}

function createPlaylistCard(playlist, index) {
  const li = document.createElement("li");
  const initialLikes = Number(playlist.num_likes) || 0;

  if (typeof playlist.isLiked !== "boolean") {
    playlist.isLiked = false;
  }
  playlist.num_likes = initialLikes;

  const article = document.createElement("article");
  article.className = "playlist-card";
  article.setAttribute("role", "button");
  article.setAttribute("tabindex", "0");

  const link = document.createElement("a");
  link.href = "#";

  const img = document.createElement("img");
  img.src = playlist.playlist_cover || "assets/img/playlist.png";
  img.alt = `Cover art for ${playlist.playlist_title || "Playlist"}`;

  const h4 = document.createElement("h4");
  h4.textContent = playlist.playlist_title || "Untitled Playlist";

  const creator = document.createElement("p");
  creator.className = "creater-name";
  creator.textContent = `Creator: ${playlist.creator_name || "Unknown"}`;

  const likesContainer = document.createElement("div");
  likesContainer.className = "playlist-likes-row";

  const likeButton = document.createElement("button");
  likeButton.className = "like-button";
  likeButton.type = "button";
  likeButton.setAttribute("aria-label", `Toggle like for ${playlist.playlist_title || "playlist"}`);
  likeButton.setAttribute("aria-pressed", String(playlist.isLiked));
  likeButton.textContent = "\u2665";
  if (playlist.isLiked) {
    likeButton.classList.add("liked");
  }

  const likes = document.createElement("p");
  likes.className = "likes";
  likes.textContent = formatLikes(playlist.num_likes);

  const editButton = document.createElement("button");
  editButton.className = "edit-playlist-button";
  editButton.type = "button";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit ${playlist.playlist_title || "playlist"}`);

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-playlist-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${playlist.playlist_title || "playlist"}`);

  likeButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const wasLiked = playlist.isLiked;
    playlist.isLiked = !wasLiked;
    playlist.num_likes += playlist.isLiked ? 1 : -1;

    likeButton.classList.toggle("liked", playlist.isLiked);
    likeButton.setAttribute("aria-pressed", String(playlist.isLiked));
    likes.textContent = formatLikes(playlist.num_likes);
  });

  editButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPlaylistFormModal("edit", index);
  });

  deleteButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    playlistsStore = playlistsStore.filter((_, playlistIndex) => playlistIndex !== index);
    renderPlaylistGrid();
  });

  likesContainer.append(likeButton, likes, editButton, deleteButton);
  link.append(img, h4);
  article.append(link, creator, likesContainer);
  li.appendChild(article);

  article.addEventListener("click", (e) => {
    e.preventDefault();
    openPlaylistModal(index);
  });

  article.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPlaylistModal(index);
    }
  });

  return li;
}

async function loadPlaylistCards() {
  try {
    const response = await fetch("../data/data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const rawData = await response.json();
    const playlists = normalizePlaylists(rawData);

    const now = Date.now();
    playlistsStore = playlists.map((playlist, index) => ({
      ...playlist,
      date_added: Number(playlist.date_added) || (now - (playlists.length - index) * 1000),
    }));
    renderPlaylistGrid();
  } catch (error) {
    console.error("Failed to load playlists:", error);
  }
}

if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    modal.close();
  });
}

modal.addEventListener("click", (e) => {
    const rect = modal.getBoundingClientRect();
    const isOutsideContent =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
  
    if (isOutsideContent) {
      modal.close();
    }
});

modal.addEventListener("close", () => {
  // Reset temporary modal state so next open always starts
  // from the playlist's original song order.
  activePlaylistIndex = null;
  activeSongsView = [];
  activeTrackIndex = -1;
  currentPlayingSong = null;
  previewAudio.pause();
  previewAudio.src = "";
  updatePlaylistPlayButton();
  updateNowPlayingLabel();
  updateSongPlayButtons();
});

if (shuffleBtn) {
  shuffleBtn.addEventListener("click", () => {
    if (activePlaylistIndex === null || activeSongsView.length <= 1) return;
    activeSongsView = shuffleSongs(activeSongsView);
    if (currentPlayingSong) {
      activeTrackIndex = activeSongsView.indexOf(currentPlayingSong);
    }
    renderModalSongs(activeSongsView);
    updateNowPlayingLabel();
    updateSongPlayButtons();
  });
}

if (playlistPlayButton) {
  playlistPlayButton.addEventListener("click", () => {
    if (activeSongsView.length === 0) return;
    if (!previewAudio.paused && activeTrackIndex >= 0) {
      previewAudio.pause();
      updatePlaylistPlayButton();
      updateNowPlayingLabel();
      updateSongPlayButtons();
      return;
    }
    const indexToPlay = activeTrackIndex >= 0 ? activeTrackIndex : 0;
    playTrackAt(indexToPlay);
  });
}

if (playlistNextButton) {
  playlistNextButton.addEventListener("click", playNextTrack);
}

if (playlistPrevButton) {
  playlistPrevButton.addEventListener("click", playPrevTrack);
}

if (modalSongList) {
  modalSongList.addEventListener("click", (event) => {
    const playButton = event.target.closest(".song-play-button");
    if (!playButton) return;
    const targetIndex = Number(playButton.dataset.songIndex);
    if (!Number.isFinite(targetIndex)) return;

    if (targetIndex === activeTrackIndex && !previewAudio.paused) {
      previewAudio.pause();
      updatePlaylistPlayButton();
      updateNowPlayingLabel();
      updateSongPlayButtons();
      return;
    }

    playTrackAt(targetIndex);
  });
}

if (getDescriptionBtn) {
  getDescriptionBtn.addEventListener("click", async () => {
    if (activePlaylistIndex === null || !playlistDescriptionEl) return;

    const playlist = playlistsStore[activePlaylistIndex];
    if (!playlist) return;

    getDescriptionBtn.disabled = true;
    playlistDescriptionEl.textContent = DESCRIPTION_LOADING_MESSAGE;

    const description = await getPlaylistDescription(playlist);
    playlistDescriptionEl.textContent = description;
    getDescriptionBtn.disabled = false;
  });
}

if (addSongRowButton && songsInputList) {
  addSongRowButton.addEventListener("click", () => {
    songsInputList.appendChild(createSongInputRow());
  });
}

if (songsInputList) {
  songsInputList.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-song-row-button");
    if (!removeButton) return;
    const rows = songsInputList.querySelectorAll(".song-input-row");
    if (rows.length <= 1) return;
    removeButton.closest(".song-input-row")?.remove();
  });

  songsInputList.addEventListener("change", (event) => {
    const fileInput = event.target.closest('input[name="songCoverFile"]');
    if (!fileInput) return;
    const row = fileInput.closest(".song-input-row");
    if (!row) return;
    const file = fileInput.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    row.dataset.coverSrc = previewUrl;
    const preview = row.querySelector(".song-cover-preview");
    if (preview) preview.src = previewUrl;
  });
}

if (createPlaylistForm) {
  createPlaylistForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(createPlaylistForm);
    const playlistName = (formData.get("playlistName") || "").toString().trim();
    const playlistAuthor = (formData.get("playlistAuthor") || "").toString().trim();
    const songs = readSongsFromForm();

    if (!playlistName || !playlistAuthor) {
      if (createPlaylistMessage) {
        createPlaylistMessage.textContent = "Please enter a playlist name and author.";
      }
      return;
    }

    if (songs.length === 0) {
      if (createPlaylistMessage) {
        createPlaylistMessage.textContent = "Add at least one song with title and artist.";
      }
      return;
    }

    const newPlaylist = {
      playlist_cover: "assets/img/playlist.png",
      playlist_title: playlistName,
      creator_name: playlistAuthor,
      num_likes: 0,
      date_added: Date.now(),
      songs: songs.map((song) => ({
        song_cover: song.cover,
        song_title: song.title,
        artist_name: song.artist,
        album_name: song.album || "Custom Collection",
        song_length: song.duration,
      })),
    };

    if (editingPlaylistIndex !== null && playlistsStore[editingPlaylistIndex]) {
      const existing = playlistsStore[editingPlaylistIndex];
      playlistsStore[editingPlaylistIndex] = {
        ...existing,
        playlist_title: playlistName,
        creator_name: playlistAuthor,
        songs: songs.map((song) => ({
          song_cover: song.cover,
          song_title: song.title,
          artist_name: song.artist,
          album_name: song.album || "Custom Collection",
          song_length: song.duration,
        })),
      };
    } else {
      playlistsStore = [newPlaylist, ...playlistsStore];
    }

    renderPlaylistGrid();
    resetCreatePlaylistForm();
    if (createPlaylistMessage) {
      createPlaylistMessage.textContent = editingPlaylistIndex !== null
        ? "Playlist updated successfully."
        : "Playlist created successfully.";
    }
    editingPlaylistIndex = null;
    createPlaylistModal?.close();
  });
}

if (openCreatePlaylistModalButton && createPlaylistModal) {
  openCreatePlaylistModalButton.addEventListener("click", () => {
    openPlaylistFormModal("create");
  });
}

if (closeCreatePlaylistModalButton && createPlaylistModal) {
  closeCreatePlaylistModalButton.addEventListener("click", () => {
    editingPlaylistIndex = null;
    createPlaylistModal.close();
  });
}

if (createPlaylistModal) {
  createPlaylistModal.addEventListener("close", () => {
    editingPlaylistIndex = null;
    if (createPlaylistModalTitle) createPlaylistModalTitle.textContent = "Create a New Playlist";
    if (createPlaylistSubmitButton) createPlaylistSubmitButton.textContent = "Create Playlist";
    if (createPlaylistMessage) createPlaylistMessage.textContent = "";
  });

  createPlaylistModal.addEventListener("click", (e) => {
    const rect = createPlaylistModal.getBoundingClientRect();
    const isOutsideContent =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;

    if (isOutsideContent) {
      editingPlaylistIndex = null;
      createPlaylistModal.close();
    }
  });
}

if (playlistSearchInput) {
  playlistSearchInput.addEventListener("input", (event) => {
    currentSearchQuery = (event.target.value || "").toLowerCase();
    renderPlaylistGrid();
  });
}

if (playlistSortSelect) {
  playlistSortSelect.addEventListener("change", (event) => {
    currentSortMode = event.target.value || "date_desc";
    renderPlaylistGrid();
  });
}

previewAudio.addEventListener("ended", () => {
  if (activeSongsView.length === 0) return;
  playNextTrack();
});

previewAudio.addEventListener("pause", updatePlaylistPlayButton);
previewAudio.addEventListener("play", updatePlaylistPlayButton);
previewAudio.addEventListener("pause", updateSongPlayButtons);
previewAudio.addEventListener("play", updateSongPlayButtons);

document.addEventListener("DOMContentLoaded", loadPlaylistCards);
document.addEventListener("DOMContentLoaded", resetCreatePlaylistForm);