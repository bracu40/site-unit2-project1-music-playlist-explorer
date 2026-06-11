const featuredCover = document.getElementById("featured-cover");
const featuredTitle = document.getElementById("featured-title");
const featuredCreator = document.getElementById("featured-creator");
const featuredSongList = document.getElementById("featured-song-list");
const newFeaturedButton = document.getElementById("new-featured-button");

let featuredPlaylists = [];
let currentFeaturedIndex = -1;

function normalizePlaylists(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.playlists)) return raw.playlists;
  if (raw && typeof raw === "object") return [raw];
  return [];
}

function createFeaturedSongCard(song) {
  const li = document.createElement("li");
  li.className = "featured-song-item";

  const article = document.createElement("article");
  article.className = "song-card";

  const left = document.createElement("div");
  left.className = "song-left";

  const imageWrap = document.createElement("div");
  const image = document.createElement("img");
  image.src = song.song_cover || "assets/img/song.png";
  image.alt = `${song.song_title || "Song"} cover`;
  imageWrap.appendChild(image);

  const textWrap = document.createElement("div");
  const title = document.createElement("h4");
  title.textContent = song.song_title || "Untitled Song";

  const artist = document.createElement("p");
  artist.textContent = song.artist_name || "Unknown Artist";

  const album = document.createElement("p");
  album.textContent = song.album_name || "Unknown Album";

  textWrap.append(title, artist, album);
  left.append(imageWrap, textWrap);

  const right = document.createElement("div");
  const length = document.createElement("p");
  length.textContent = song.song_length || "--:--";
  right.appendChild(length);

  article.append(left, right);
  li.appendChild(article);
  return li;
}

function renderFeaturedPlaylist(playlist) {
  featuredCover.src = playlist.playlist_cover || "assets/img/playlist.png";
  featuredCover.alt = `Cover art for ${playlist.playlist_title || "Featured Playlist"}`;
  featuredTitle.textContent = playlist.playlist_title || "Untitled Playlist";
  featuredCreator.textContent = `Created by ${playlist.creator_name || "Unknown Creator"}`;

  featuredSongList.innerHTML = "";
  const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
  if (songs.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "featured-empty";
    emptyItem.textContent = "No songs in this playlist yet.";
    featuredSongList.appendChild(emptyItem);
    return;
  }

  songs.forEach((song) => {
    featuredSongList.appendChild(createFeaturedSongCard(song));
  });
}

function pickRandomPlaylist(playlists) {
  if (playlists.length === 0) return { playlist: null, index: -1 };

  let randomIndex = Math.floor(Math.random() * playlists.length);
  if (playlists.length > 1 && randomIndex === currentFeaturedIndex) {
    randomIndex = (randomIndex + 1) % playlists.length;
  }

  return { playlist: playlists[randomIndex], index: randomIndex };
}

function showAnotherFeaturedPlaylist() {
  if (featuredPlaylists.length === 0) return;
  const { playlist, index } = pickRandomPlaylist(featuredPlaylists);
  if (!playlist) return;
  currentFeaturedIndex = index;
  renderFeaturedPlaylist(playlist);
}

async function loadFeaturedPlaylist() {
  try {
    const response = await fetch("../data/data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const rawData = await response.json();
    featuredPlaylists = normalizePlaylists(rawData);

    if (featuredPlaylists.length === 0) {
      featuredTitle.textContent = "No playlists available";
      featuredCreator.textContent = "Add playlists to data/data.json to view featured content.";
      featuredSongList.innerHTML = "";
      if (newFeaturedButton) newFeaturedButton.disabled = true;
      return;
    }

    if (newFeaturedButton) {
      newFeaturedButton.disabled = featuredPlaylists.length <= 1;
    }

    showAnotherFeaturedPlaylist();
  } catch (error) {
    console.error("Failed to load featured playlist:", error);
    featuredTitle.textContent = "Failed to load featured playlist";
    featuredCreator.textContent = "Please check your data file and try again.";
    if (newFeaturedButton) newFeaturedButton.disabled = true;
  }
}

if (newFeaturedButton) {
  newFeaturedButton.addEventListener("click", showAnotherFeaturedPlaylist);
}

document.addEventListener("DOMContentLoaded", loadFeaturedPlaylist);
