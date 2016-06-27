/// <reference path="extensions.d.ts" />

// http://stackoverflow.com/questions/17944496/html5-audio-player-drag-and-drop
// http://jsfiddle.net/v3syS/2/
// http://stackoverflow.com/questions/11506180/web-audio-api-resume-from-pause

// https://github.com/katspaugh/wavesurfer.js/issues/326
// http://stackoverflow.com/questions/19559720/decodeaudiodata-hogs-memory
// https://bugs.chromium.org/p/chromium/issues/detail?id=554025
// https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext

// http://stackoverflow.com/questions/13950394/forcing-garbage-collection-in-google-chrome
// --js-flags="--expose-gc"

// https://cmatskas.com/setting-up-a-gulp-task-with-visual-studio-code/

// npm install gulp
// npm install gulp-sass --save-dev  
// npm install gulp-typescript  
// npm install merge2  

interface AudioEngine { 
	getAudioBuffer(file: File, onLoaded: (audioBuffer: AudioBuffer) => void): void;
	setVolume(value: number): void;
	start(buffer: AudioBuffer, startAt: number, onEnded: () => void): void;
	stop(): void;
}

interface PlaylistService {
	addTracks(file: FileList): void;
	changeTrack(newIndex: number): boolean;
	moveTrack(index: number, newIndex: number): void;
	mute(): number;
	next(): void;
	prev(): void;
	removeTrack(index: number): boolean;
	setVolume(value: number): void;
	stop(): void;
	toggle(): void;
	trackChanged(oldIndex: number, newIndex: number, newName: string): void;
	trackStarted(index: number): void;
	trackUpdated(current: number | boolean, duration?: number): void;
}