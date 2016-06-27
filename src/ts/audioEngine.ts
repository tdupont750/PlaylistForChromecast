/// <reference path="playlist.d.ts" />

function createAudioEngine(): AudioEngine {
	const _context = <AudioContext2> new AudioContext();
	const _gain = _context.createGain();
	const _gc = (<Window2> window).gc;

	let _source: AudioBufferSourceNode;

	_gain.connect(_context.destination);

	const _self: AudioEngine = {
		getAudioBuffer: getAudioBuffer,
		setVolume: setVolume,
		start: start,
		stop: stop
	};

	return _self;

	function getAudioBuffer(file: File, onLoaded: (audioBuffer: AudioBuffer) => void) {
		{
			let reader = new FileReader();
			reader.addEventListener("load", onReaderLoad);
			reader.readAsArrayBuffer(file);
		}

		function onReaderLoad(e: any) {
			let data = e.target.result;
			_context.decodeAudioData(data).then(onDecode);
		}
			
		function onDecode(b: AudioBuffer) {
			if (_gc) {
				_gc();
			}

			onLoaded(b);
		}
	}

	function setVolume(value: number) {
		if (value > 1 || value < 0) {
			throw 'Volume must be between 0 and 1';
		}

		_gain.gain.value = value;
	}

	function start(buffer: AudioBuffer, startAt: number, onEnded: () => void) {
		if (_source) {
			_source.disconnect();
		}

		_source = _context.createBufferSource();
		_source.onended = onEnded;
		_source.buffer = buffer;
		_source.connect(_gain);

		if (startAt === 0) {
			_source.start(0);
		} else {
			_source.start(0, startAt / 1000);
		}
	}

	function stop() {
		_source.stop(0);
	}
}