interface DecodeAudioDataPromise { 
	then(callback: (buffer: AudioBuffer) => void): void;
}

interface AudioContext2 extends AudioContext { 
	decodeAudioData(data: any): DecodeAudioDataPromise; 
}

interface Window2 extends Window { 
	gc(): void; 
}