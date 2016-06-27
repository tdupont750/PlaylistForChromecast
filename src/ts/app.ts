/// <reference path="audioEngine.ts" />
/// <reference path="playlistService.ts" />
/// <reference path="playlistView.ts" />

"use strict";

window.addEventListener("load", function onWindowLoad() {
	const audioEngine = createAudioEngine(),
		playlistService = createPlaylistService(audioEngine),
		playlistView = createPlaylistView(playlistService);
});