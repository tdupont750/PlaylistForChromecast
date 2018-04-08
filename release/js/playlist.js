"use strict";

function createAudioEngine() {
    const _context = new AudioContext();
    const _gain = _context.createGain();
    const _gc = window.gc;
    let _source;
    _gain.connect(_context.destination);
    const _self = {
        getAudioBuffer: getAudioBuffer,
        setVolume: setVolume,
        start: start,
        stop: stop
    };
    return _self;
    function getAudioBuffer(file, onLoaded) {
        {
            let reader = new FileReader();
            reader.addEventListener("load", onReaderLoad);
            reader.readAsArrayBuffer(file);
        }
        function onReaderLoad(e) {
            let data = e.target.result;
            _context.decodeAudioData(data).then(onDecode);
        }
        function onDecode(b) {
            if (_gc) {
                _gc();
            }
            onLoaded(b);
        }
    }
    function setVolume(value) {
        if (value > 1 || value < 0) {
            throw 'Volume must be between 0 and 1';
        }
        _gain.gain.value = value;
    }
    function start(buffer, startAt, onEnded) {
        if (_source) {
            _source.disconnect();
        }
        _source = _context.createBufferSource();
        _source.onended = onEnded;
        _source.buffer = buffer;
        _source.connect(_gain);
        if (startAt === 0) {
            _source.start(0);
        }
        else {
            _source.start(0, startAt / 1000);
        }
    }
    function stop() {
        _source.stop(0);
    }
}

function createPlaylistService(audioEngine) {
    const _audioEngine = audioEngine;
    const _playlist = [];
    let _buffer;
    let _index = 0;
    let _startedAt = 0;
    let _pausedAt = 0;
    let _isStopped = true;
    let _isLoading = false;
    let _timeId = 0;
    let _lastVolume = 1;
    const _self = {
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
    function addTracks(files) {
        let firstDrop = _playlist.length === 0;
        for (let i = 0; i < files.length; i++) {
            _playlist.push(files[i]);
        }
        if (firstDrop) {
            bumpTrack(0);
        }
    }
    function bumpTrack(diff) {
        return changeTrack(_index + diff);
    }
    function changeTrack(newIndex) {
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
        }
        else if (_index < 0) {
            _index = _playlist.length - 1;
        }
        _isLoading = true;
        let file = _playlist[_index];
        _audioEngine.getAudioBuffer(file, onLoaded);
        triggerTrackChanged(oldIndex);
        return true;
    }
    function moveTrack(index, newIndex) {
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
    function mute() {
        if (_lastVolume >= 0) {
            _lastVolume *= -1;
            _audioEngine.setVolume(0);
            return 0;
        }
        else {
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
    function onLoaded(audioBuffer) {
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
    function removeTrack(index) {
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
    function setVolume(value) {
        _lastVolume = value / 100;
        _audioEngine.setVolume(_lastVolume);
    }
    function stop() {
        stopAudio(true);
    }
    function stopAudio(isStop) {
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
            }
            else {
                _self.trackUpdated(true);
            }
        }
    }
    function toggle() {
        if (_isStopped) {
            play();
        }
        else {
            stopAudio(false);
        }
    }
    function triggerTrackChanged(oldIndex) {
        if (_self.trackChanged) {
            setTimeout(fireEvent, 0);
        }
        function fireEvent() {
            if (_playlist.length === 0) {
                _self.trackChanged(oldIndex, -1, "");
                return;
            }
            let file = _playlist[_index];
            _self.trackChanged(oldIndex, _index, file.name);
        }
    }
}

function createPlaylistView(playlistService, visualizer) {
    const _playlistService = playlistService;
    const _visualizer = visualizer;
    const _list = document.getElementById("list");
    const _percent = document.getElementById("progress-percent");
    const _time = document.getElementById("progress-time");
    const _liTemplate = document.getElementById("ol-template").firstElementChild;
    const _volumeDisplay = document.getElementById("volume-display");
    const _volume = document.getElementById("volume");
    const _volumeKey = "playlist_volume";
	
	let _hasLocalStorage = false;
	try {
		_hasLocalStorage = localStorage && localStorage.getItem && localStorage.setItem;
	} catch (ex) {
		console.log("No access to localStorage - " + ex);
	}
	
    let _isFirstDrop = true;
    let _blinkId = 0;
    {
        window.onbeforeunload = function () {
            if (_list.children.length > 0) {
                return true;
            }
        };
        _playlistService.trackChanged = onTrackChanged;
        _playlistService.trackStarted = onTrackStarted;
        _playlistService.trackUpdated = onTrackUpdated;
        document.getElementById("mute").onclick = createCallback(onMute);
        document.getElementById("toggle").onclick = createCallback(_playlistService.toggle);
        document.getElementById("stop").onclick = createCallback(_playlistService.stop);
        document.getElementById("prev").onclick = createCallback(_playlistService.prev);
        document.getElementById("next").onclick = createCallback(_playlistService.next);
        document.getElementById("visualize").onclick = createCallback(_visualizer.toggle, true);
        let body = document.getElementsByTagName("body")[0];
        body.addEventListener("dragover", onDragOver, false);
        body.addEventListener("drop", onDrop, false);
        body.onkeyup = onKeyUp;
        body.onkeydown = onKeyDown;
		body.onclick = onClick;
		
		if (_hasLocalStorage) {
			let item = localStorage.getItem(_volumeKey);
			if (item) {
				_volume.value = item;
			}
		}
		onVolumeChange();
		_volume.onchange = onVolumeChange;
    }
    function createCallback(fn, prevent) {
        return onClick;
        function onClick(ev) {
			if (prevent === true) {
				ev.preventDefault();
				ev.stopPropagation();
			}
            ev.srcElement.blur();
            fn();
        }
    }
    function blink(isRemove) {
        if (isRemove === true && _blinkId !== 0) {
            clearInterval(_blinkId);
            _blinkId = 0;
        }
        if (isRemove === true || _time.classList.contains('hidden-text')) {
            _time.classList.remove('hidden-text');
        }
        else {
            _time.classList.add('hidden-text');
        }
    }
    function pad(num) {
        let str = "" + Math.floor(num);
        return str.length == 1
            ? "0" + str
            : str;
    }
    function onMute() {
        let volume = _playlistService.mute();
        _volume.value = volume.toString();
        _volumeDisplay.textContent = volume + "%";
    }
    function onTrackChanged(oldIndex, newIndex, newName) {
        if (_list.childNodes.length === 0) {
            return;
        }
        if (oldIndex >= 0) {
            let oldLi = _list.childNodes[oldIndex];
            oldLi.classList.remove("loading", "active");
        }
        if (newIndex >= 0) {
            let newLi = _list.childNodes[newIndex];
            newLi.classList.add("loading");
            newLi.classList.add("active");
        }
    }
    function onTrackStarted(index) {
        let li = _list.childNodes[index];
        li.classList.remove("loading");
    }
    function onTrackUpdated(currentOrBlink, duration) {
        if (currentOrBlink === true) {
            _blinkId = setInterval(blink, 500);
            return;
        }
        blink(true);
        let current = currentOrBlink;
        let currentMin = pad(current / 60);
        let currentSec = pad(current % 60);
        let durationMin = pad(duration / 60);
        let durationSec = pad(duration % 60);
        _time.textContent = currentMin + ":" + currentSec + " - " + durationMin + ":" + durationSec;
        let percent = duration === 0
            ? 0
            : (current / duration) * 100;
        _percent.style.width = percent + "%";
    }
    function onDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    function onDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        if (_isFirstDrop === true) {
            _isFirstDrop = false;
            let startEl = document.getElementById("start");
            startEl.remove();
        }
        let files = e.dataTransfer.files;
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let li = _liTemplate.cloneNode(true);
            li.children[0].onclick = onRemove;
            li.children[1].onclick = onMoveDown;
            li.children[2].onclick = onMoveUp;
            li.children[3].textContent = file.name;
            li.onclick = onJumpToTrack;
            li.onmouseenter = onLiEnter;
            li.onmouseleave = onLiLeave;
            _list.appendChild(li);
        }
        _playlistService.addTracks(files);
    }
    function onKeyDown(ev) {
        if (ev.keyCode == 32 && ev.target == document.body) {
            ev.preventDefault();
            ev.stopPropagation();
            return false;
        }
    }
    function onKeyUp(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.key === ' ') {
            _playlistService.toggle();
        }
        else if (ev.key === 'Escape') {
            _playlistService.stop();
        }
        else if (ev.key === 'ArrowLeft') {
            _playlistService.prev();
        }
        else if (ev.key === 'ArrowRight') {
            _playlistService.next();
        }
    }
	function onClick(ev) {
		if (_visualizer.isEnabled()) {
			_visualizer.toggle();
		}
	}
    function onJumpToTrack(ev) {
        let el = ev.srcElement.nodeName === "SPAN"
            ? ev.srcElement.parentElement
            : ev.srcElement;
        let newIndex = getIndex(el);
        _playlistService.changeTrack(newIndex);
    }
    function getIndex(node) {
        let index = 0;
        while ((node = node.previousSibling) != null) {
            index++;
        }
        return index;
    }
    function onRemove(ev) {
        ev.stopPropagation();
        let li = ev.srcElement.classList.contains("badge")
            ? ev.srcElement.parentElement
            : ev.srcElement.parentElement.parentElement;
        let index = getIndex(li);
        if (_playlistService.removeTrack(index)) {
            li.remove();
        }
    }
    function onMoveDown(ev) {
        ev.stopPropagation();
        let li = ev.srcElement.classList.contains("badge")
            ? ev.srcElement.parentElement
            : ev.srcElement.parentElement.parentElement;
        let index = getIndex(li);
        if (_playlistService.moveTrack(index, index + 1)) {
            let parent = li.parentElement;
            let next = li.nextElementSibling;
            parent.removeChild(li);
            parent.insertBefore(li, next.nextElementSibling);
        }
    }
    function onMoveUp(ev) {
        ev.stopPropagation();
        let li = ev.srcElement.classList.contains("badge")
            ? ev.srcElement.parentElement
            : ev.srcElement.parentElement.parentElement;
        let index = getIndex(li);
        if (_playlistService.moveTrack(index, index - 1)) {
            let parent = li.parentElement;
            let prev = li.previousElementSibling;
            parent.removeChild(li);
            parent.insertBefore(li, prev);
        }
    }
    function onLiEnter(ev) {
        ev.srcElement.classList.add("mouseover");
    }
    function onLiLeave(ev) {
        ev.srcElement.classList.remove("mouseover");
    }
    function onVolumeChange() {
		if (_hasLocalStorage) {
			localStorage.setItem(_volumeKey, _volume.value);
		}
        
        _volumeDisplay.textContent = _volume.value + "%";
        let value = parseInt(_volume.value);
        _playlistService.setVolume(value);
    }
}

// TODO Remove dependency on DOM
function createVisualizer() {
	let _enabled = false;
	
	return {
		toggle: toggle,
		isEnabled: isEnabled
	};
	
	function isEnabled() {
		return _enabled;
	}
	
	function toggle() {
		if (_enabled) {
			_enabled = false;
			document.body.classList.remove('visualize');
			let els = document.getElementsByClassName('visualize');
			for (let i = 0; i < els.length; i++) {
				els[i].style.visibility = 'hidden';
			}
		} else {
			_enabled = true;
			document.body.classList.add('visualize');
			visualize();
		}
	}
	
	function visualize() {		
		if (_enabled == false) {
			return;
		}
		
		let next = rand(1, 5),
		    duration = rand(10, 16),
			opacity = rand(4, 8),
		    motion = ' motion_' + rand(1, 4),
		    color = ', color_' + rand(1, 3),
		    size = ', size_' + rand(1, 4),
			timing = rand (1, 5);
		
		let style = 'opacity: 0.' + opacity + ';';
		style += ' animation:' + motion + color + size + ';';
		style += ' animation-duration: ' + duration + 's;';
		style += ' animation-iteration-count: 1;';
		
		if (timing == 1) {
			style += ' animation-timing-function: ease;'
		} else if (timing == 2) {
			style += ' animation-timing-function: ease-in;'
		} else if (timing == 3) {
			style += ' animation-timing-function: ease-out;'
		} else {
			style += ' animation-timing-function: linear;'
		} 
		
		let div = document.createElement('div');
		div.classList.add('visualize');
		div.setAttribute('style', style);
		document.body.appendChild(div);
		
		setTimeout(removeDiv, duration * 1000);
		setTimeout(visualize, next * 250);
		
		function removeDiv() {
			document.body.removeChild(div);
		}
	}
	
	function rand(min, max) {
		return Math.floor((Math.random() * max) + min);
	}
}

window.addEventListener("load", function onWindowLoad() {
    const visualizer = createVisualizer(), 
		audioEngine = createAudioEngine(), 
		playlistService = createPlaylistService(audioEngine), 
		playlistView = createPlaylistView(playlistService, visualizer);
});
