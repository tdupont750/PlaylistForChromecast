/// <reference path="playlist.d.ts" />

function createPlaylistService(audioEngine: AudioEngine): PlaylistService {
	const _audioEngine = audioEngine;
	const _playlist: File[] = [];

	let _buffer: AudioBuffer;
	let _index = 0;
	let _startedAt = 0;
	let _pausedAt = 0;
	let _isStopped = true;
	let _isLoading = false;
	let _timeId = 0;
	let _lastVolume = 1;

	const _self: PlaylistService = {
		addTracks: addTracks,
		changeTrack: changeTrack,
		moveTrack: moveTrack,
		next: next,
		prev: prev,
		removeTrack: removeTrack,
		setVolume: setVolume,
		stop: stop,
		toggle: toggle,
		mute: mute,
		trackChanged: undefined,
		trackStarted: undefined,
		trackUpdated: undefined
	};

	return _self;

	function addTracks(files: FileList) {
		let firstDrop = _playlist.length === 0;

		for (let i = 0; i < files.length; i++) {
			_playlist.push(files[i]);
		}

		if (firstDrop) {
			bumpTrack(0);
		}
	}
	
	function bumpTrack(diff: number): boolean {
		return changeTrack(_index + diff);
	}

	function changeTrack(newIndex: number): boolean {
		if (_isLoading) {
			return false;
		}
		
		if (_playlist.length === 0) {
			return false;
		}
		
		stopAudio(true);

		let oldIndex = _index;
		_index = newIndex;
		
		if (_index >= _playlist.length) {
			_index = 0;
		} else if (_index < 0) {
			_index = _playlist.length - 1;
		}
		
		_isLoading = true;

		let file = _playlist[_index];
		_audioEngine.getAudioBuffer(file, onLoaded);

		triggerTrackChanged(oldIndex);
		return true;
	}

	function moveTrack(index: number, newIndex: number) {
		if (index < 0 || index >= _playlist.length) {
			return false;
		}

		if (newIndex < 0 || newIndex >= _playlist.length) {
			return false;
		}

		if (index == newIndex) {
			return false;
		}

		let active = _playlist[_index];

		let temp = _playlist[index];
		_playlist.splice(index, 1);
		_playlist.splice(newIndex, 0, temp);

		_index = _playlist.indexOf(active);

		return true;
	}

	function mute(): number {
		if (_lastVolume >= 0) {
			_lastVolume *= -1;
			_audioEngine.setVolume(0);
			return 0;
		} else {
			_lastVolume *= -1;
			_audioEngine.setVolume(_lastVolume);
			return Math.floor(_lastVolume * 100);
		}
	}

	function next() {
		stopAudio(true);
		bumpTrack(1);
	}

	function onEnded() {
		let wasStopped = _isStopped;
		_isStopped = true;

		if (!wasStopped) {
			bumpTrack(1);
		}
	}

	function onLoaded(audioBuffer: AudioBuffer) {
		_buffer = audioBuffer;
		_isLoading = false;
		play();
	}

	function play() {
		if (!_buffer) {
			return;
		}

		let duration = Math.floor(_buffer.duration);

		_startedAt = Date.now() - _pausedAt;
		_isStopped = false;
		_audioEngine.start(_buffer, _pausedAt, onEnded);

		if (_timeId !== 0) {
			clearInterval(_timeId);
		}

		updateDisplay();
		_timeId = setInterval(updateDisplay, 900);

		if (_self.trackStarted) {
			setTimeout(fireEvent, 0);
		}

		function fireEvent() {
			_self.trackStarted(_index);
		}
		
		function updateDisplay() {
			if (!_self.trackUpdated) {
				return;
			}

			let current = Math.floor((Date.now() - _startedAt) / 1000);
			_self.trackUpdated(current, duration);
		}
	}

	function prev() {
		stopAudio(true);
		bumpTrack(-1);
	}

	function removeTrack(index: number): boolean {
		if (_playlist.length === 0) {
			return false;
		}

		if (index < 0 || index >= _playlist.length) {
			return false;
		}

		_playlist.splice(index, 1);

		if (_playlist.length === 0) {
			triggerTrackChanged(index);
			return true;
		}
		
		let isCurrentTrack = index === _index;
		
		if (index < _index) {
			_index--;
		}
		
		if (isCurrentTrack) {
			bumpTrack(0);
		}

		return true;
	}

	function setVolume(value: number) {
		_lastVolume = value / 100;
		_audioEngine.setVolume(_lastVolume);
	}

	function stop() {
		stopAudio(true);
	}

	function stopAudio(isStop: boolean) {
		if (!_isStopped) {
			_audioEngine.stop();
		}
		
		_pausedAt = isStop ? 0 : Date.now() - _startedAt;
		_isStopped = true;
		
		if (_timeId !== 0) {
			clearInterval(_timeId);
			_timeId = 0;
		}

		if (_self.trackUpdated) {
			if (isStop) {
				_self.trackUpdated(0, 0);
			} else {
				_self.trackUpdated(true);
			}
		}
	}

	function toggle() {
		if (_isStopped) {
			play();
		} else {
			stopAudio(false);
		}
	}

	function triggerTrackChanged(oldIndex: number) {
		if (_self.trackChanged) {
			setTimeout(fireEvent, 0);
		}

		function fireEvent() {
			if (_playlist.length === 0) {
				_self.trackChanged(oldIndex, -1, "");
				return;
			}

			let file = _playlist[_index]
			_self.trackChanged(oldIndex, _index, file.name);
		}
	}
}