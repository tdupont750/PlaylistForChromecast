/// <reference path="playlist.d.ts" />

function createPlaylistView(playlistService: PlaylistService) {
	const _playlistService = playlistService;
	const _list = document.getElementById("list");
	const _percent = document.getElementById("progress-percent");
	const _time = document.getElementById("progress-time");
	const _liTemplate = document.getElementById("ol-template").firstElementChild;
	const _volumeDisplay = document.getElementById("volume-display");
	const _volume = <HTMLInputElement> document.getElementById("volume");
	const _volumeKey = "playlist_volume";

	let _isFirstDrop = true;
	let _blinkId = 0;

	{
		window.onbeforeunload = function() {
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

		let body = document.getElementsByTagName("body")[0];
		body.addEventListener("dragover", onDragOver, false);
		body.addEventListener("drop", onDrop, false);
		body.onkeyup = onKeyUp;
		body.onkeydown = onKeyDown;
		
		let item = localStorage.getItem(_volumeKey);
		if (item) {
			_volume.value = item;
		}

		onVolumeChange();
		_volume.onchange = onVolumeChange;
	}

	function createCallback(fn: () => void) {
		return onClick;
		
		function onClick(ev: Event) {
			(<HTMLElement> ev.srcElement).blur();
			fn();
		}
	} 

	function blink(isRemove?: boolean) {
		if (isRemove === true && _blinkId !== 0) {
			clearInterval(_blinkId);
			_blinkId = 0;
		}

		if (isRemove === true || _time.classList.contains('hidden-text')) {
			_time.classList.remove('hidden-text');
		} else {
			_time.classList.add('hidden-text');
		}
	}

	function pad(num: number) {
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
	
	function onTrackChanged(oldIndex: number, newIndex: number, newName: string) {
		if (_list.childNodes.length === 0) {
			return;
		}

		if (oldIndex >= 0) {
			let oldLi = <Element>_list.childNodes[oldIndex];
			oldLi.classList.remove("loading", "active");
		}

		if (newIndex >= 0) {
			let newLi = <Element>_list.childNodes[newIndex];
			newLi.classList.add("loading");
			newLi.classList.add("active");
		}
	}

	function onTrackStarted(index: number) {
		let li = <Element>_list.childNodes[index];
		li.classList.remove("loading");
	}

	function onTrackUpdated(currentOrBlink: number | boolean, duration?: number) {
		if (currentOrBlink === true){
			_blinkId = setInterval(blink, 500);
			return;
		}

		blink(true);

		let current = <number>currentOrBlink;
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

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
	}

	function onDrop(e: DragEvent) {
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
			let li = <HTMLElement> _liTemplate.cloneNode(true);

			(<HTMLElement> li.children[0]).onclick = onRemove;
			(<HTMLElement> li.children[1]).onclick = onMoveDown;
			(<HTMLElement> li.children[2]).onclick = onMoveUp;
			li.children[3].textContent = file.name;
			
			li.onclick = onJumpToTrack;
			li.onmouseenter = onLiEnter;
			li.onmouseleave = onLiLeave;

			_list.appendChild(li);
		}

		_playlistService.addTracks(files);
	}

	function onKeyDown(ev: KeyboardEvent) {
		if(ev.keyCode == 32 && ev.target == document.body) {
			ev.preventDefault();
			ev.stopPropagation();
			return false;
		}
	}

	function onKeyUp(ev: KeyboardEvent) {
		ev.preventDefault();
		ev.stopPropagation();

		if (ev.key === ' ') {
			_playlistService.toggle();
		} else if (ev.key === 'Escape') {
			_playlistService.stop();
		} else if (ev.key === 'ArrowLeft') {
			_playlistService.prev();
		} else if (ev.key === 'ArrowRight') {
			_playlistService.next();
		}
	}

	function onJumpToTrack(ev: MouseEvent) {
		let el = ev.srcElement.nodeName === "SPAN"
			? ev.srcElement.parentElement
			: ev.srcElement;
		let newIndex = getIndex(el);
		_playlistService.changeTrack(newIndex);
	}
	
	function getIndex(node: Node) {
		let index = 0; 
		while((node = node.previousSibling) != null ) {
			index++;
		}
		return index;
	}

	function onRemove(ev: MouseEvent) {
		ev.stopPropagation();
		
		let li = ev.srcElement.classList.contains("badge")
			? ev.srcElement.parentElement
			: ev.srcElement.parentElement.parentElement;

		let index = getIndex(li);
		if (_playlistService.removeTrack(index)) {
			li.remove();
		}
	}

	function onMoveDown(ev: MouseEvent) {
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

	function onMoveUp(ev: MouseEvent) {
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

	function onLiEnter(ev: MouseEvent) {
		ev.srcElement.classList.add("mouseover");
	}

	function onLiLeave(ev: MouseEvent) {
		ev.srcElement.classList.remove("mouseover");
	}

	function onVolumeChange() {
		localStorage.setItem(_volumeKey, _volume.value);
		_volumeDisplay.textContent = _volume.value + "%";

		let value = parseInt(_volume.value);
		_playlistService.setVolume(value);
	}
}