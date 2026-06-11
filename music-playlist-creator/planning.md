## Music Playlist Explorer — Planning Spec

### Data Shape
playlist:
    - playlist_cover (image) — cover image of the playlist
    - playlist_title (string) — title of the playlist
    - creator_name (string) - name of the playlist's creator
    - num_likes (number) - number of times playlist was liked
    - songs (array) - array of song objects in the playlist

song:
    - song_cover (image) - cover image of the song
    - song_title (string) - title of the song
    - artist_name (string) - name of the song's artist
    - album_name (string) - name of the album the song is from
    - song_length (string) - length of the song in minutes:seconds

### UI and Interaction Rules
_The main sections of the homepage are the header, section for the playlist gallery, and footer._
_When a user clicks on the playlist card, there will be a modal pop-up view with detailed information about the playlist._
_When a user clicks outside of the modal, the content behind it will not be affected, unlike what is typical where that functions to close the modal._
_The like button will change the number of liked playlists accordingly, and change the visual liked status accordingly._
_The shuffle button will change up the order of the songs in the playlist_

### Function Specs
renderPlaylistGrid()
Purpose: Render playlist cards into #playlist-grid after applying current search + sort state.
Inputs: none (uses playlistsStore, currentSearchQuery, currentSortMode).
Returns: void.
Side Effects: Clears/rebuilds DOM grid; creates card event handlers through createPlaylistCard.

createSongInputRow(song = {})
Purpose: Create one dynamic song input row for the create/edit playlist form.
Inputs: song object (optional prefill values).
Returns: HTMLDivElement (row node).
Side Effects: Sets row dataset.coverSrc; fills input defaults.

resetCreatePlaylistForm()
Purpose: Reset create/edit form to default empty state with one song row.
Inputs: none.
Returns: void.
Side Effects: Calls form.reset(), clears and repopulates song row container.

openPlaylistFormModal(mode = "create", playlistIndex = null)
Purpose: Open playlist form modal in create or edit mode.
Inputs: mode ("create" or "edit"), playlistIndex for edit.
Returns: void.
Side Effects: Sets editingPlaylistIndex; updates modal title/button; populates form fields; opens dialog.

readSongsFromForm()
Purpose: Convert current song form rows into normalized song data.
Inputs: none.
Returns: Array<{title, artist, album, duration, cover}>.
Side Effects: none (read-only from DOM).
Notes: Filters out rows missing title or artist.

formatLikes(numLikes)
Purpose: Format likes count with singular/plural text.
Inputs: numLikes: number.
Returns: string like "1 like" or "5 likes".

normalizePlaylists(raw)
Purpose: Normalize fetched playlist JSON into an array.
Inputs: raw JSON (array/object/wrapper).
Returns: Array.
Supported Shapes: [ ... ], { playlists: [...] }, { ...singlePlaylist }.

createSongCard(song)
Purpose: Build one modal song-card list item with play button and metadata.
Inputs: song object.
Returns: HTMLLIElement.
Side Effects: none beyond created DOM node.

renderModalSongs(songs)
Purpose: Render the songs section inside playlist modal.
Inputs: songs: Array.
Returns: void.
Side Effects: Clears/rebuilds .modal-grid; assigns each play button data-song-index.

updateNowPlayingLabel()
Purpose: Sync “Now Playing / Paused” label with current audio state.
Inputs: none.
Returns: void.
Side Effects: Updates #now-playing-label text.

updatePlaylistPlayButton()
Purpose: Sync global playlist play button icon + ARIA label to audio state.
Inputs: none.
Returns: void.
Side Effects: Updates #playlist-play-button text and aria-label.

updateSongPlayButtons()
Purpose: Sync each row play button icon/label so only active playing track shows pause icon.
Inputs: none.
Returns: void.
Side Effects: Iterates .song-play-button nodes and updates text/ARIA labels.

deezerJsonp(url)
Purpose: Perform Deezer API request via JSONP.
Inputs: url: string.
Returns: Promise<any> resolved with Deezer payload.
Side Effects: Injects/removes <script> tag; creates/removes temporary callback on window.
Errors: Rejects on timeout/network/script error.

fetchDeezerTrackInfo(song)
Purpose: Enrich song with playable preview URL (and fallback cover/duration) from Deezer.
Inputs: song object.
Returns: Promise<song>.
Side Effects: Mutates song (preview_url, potentially song_cover, song_length).

playTrackAt(index)
Purpose: Load and play preview for song at target index.
Inputs: index: number.
Returns: Promise<void>.
Side Effects: Sets activeTrackIndex, currentPlayingSong, previewAudio.src, starts playback, refreshes UI.

playNextTrack()
Purpose: Advance to next song (wrap-around).
Inputs: none.
Returns: void.
Side Effects: Calls playTrackAt(nextIndex).

playPrevTrack()
Purpose: Move to previous song (wrap-around).
Inputs: none.
Returns: void.
Side Effects: Calls playTrackAt(prevIndex).

shuffleSongs(songs)
Purpose: Return shuffled copy of songs array (Fisher-Yates).
Inputs: songs: Array.
Returns: Array (new shuffled copy).
Side Effects: none on original array.

openPlaylistModal(index)
Purpose: Open details modal for selected playlist.
Inputs: index: number.
Returns: void.
Side Effects: Sets active playlist/song state, resets audio state, renders songs, opens dialog.

getPlaylistDescription(playlist)
Purpose: Generate AI playlist description via OpenRouter.
Inputs: playlist object.
Returns: Promise<string> description/fallback message.
Side Effects: Network request to OpenRouter; logs on failure.

createPlaylistCard(playlist, index)
Purpose: Build one playlist grid card with like/edit/delete and open-modal interactions.
Inputs: playlist object, index: number.
Returns: HTMLLIElement.
Side Effects: Initializes playlist.isLiked; attaches event listeners that mutate playlistsStore and rerender UI.

loadPlaylistCards()
Purpose: Fetch playlist data and initialize app state/grid.
Inputs: none.
Returns: Promise<void>.
Side Effects: Network fetch of ../data/data.json; sets playlistsStore; renders grid.
music-playlist-creator/featured.js

normalizePlaylists(raw)
Purpose: Normalize featured-page data into playlist array.
Inputs: raw JSON.
Returns: Array.

createFeaturedSongCard(song)
Purpose: Build one song card for featured page list.
Inputs: song object.
Returns: HTMLLIElement.

renderFeaturedPlaylist(playlist)
Purpose: Render featured playlist metadata and songs into featured layout.
Inputs: playlist object.
Returns: void.
Side Effects: Updates featured cover/title/creator DOM and song list DOM.

pickRandomPlaylist(playlists)
Purpose: Choose random playlist, avoiding immediate repeat when possible.
Inputs: playlists: Array.
Returns: { playlist, index }.

showAnotherFeaturedPlaylist()
Purpose: Select and display another featured playlist.
Inputs: none.
Returns: void.
Side Effects: Updates currentFeaturedIndex; rerenders featured content.

loadFeaturedPlaylist()
Purpose: Fetch playlists and initialize featured page state/UI.
Inputs: none.
Returns: Promise<void>.
Side Effects: Fetches ../data/data.json; sets featuredPlaylists; enables/disables button; renders or fallback messages.

### AI Feature Spec (Milestone 8)
Feature: getPlaylistDescription generates a 2–3 sentence playlist summary.
Trigger: User clicks Get Description in the playlist modal.
Input Context: Playlist title, creator, and songs ("title by artist" list).
Model/API: OpenRouter chat completions using google/gemma-4-31b-it:free.
Prompt Rules: Describe vibe/theme, avoid listing songs, avoid hype language.
UX Flow: Disable button + show “Generating description...”, then display result and re-enable button.
Fallbacks: Missing key or failed request returns a default “Description unavailable” message.
Constraint: Summary is generated on demand and not saved/persisted.

### Decisions Log
_Milestone 0: I set up the project._
_Milestone 1: I structured the home page according to the wireframe provided._
_Milestone 2: I designed the website based on my admiration of the nature here in the Bay Area._
_Milestone 3: I designed the dynamic card structure based on the required information._
_Milestone 4: I implemented the modal based on the wireframe provided._
_Milestone 5: I implemented the like feature with a heart button that has a cool effect based on my spec._
_Milestone 6: I implemented the shuffle feature to maintain the original positioning of the songs based on my spec._
_Milestone 7: I implemented the feature page based on my wireframe._
_Milestone 8: I implemented the AI "get description" feature and positioned it near the top of my modal based on my spec._
_Stretch Features: I implemented all of the suggested stretch features, positioned them where I wanted them based on my spec, and included play song features based on my spec._