export class AudioManager {
    constructor() {
        console.log('AudioManager v1.2 (Stable Mic) loaded');
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;

        // Queue for streaming TTS
        this.audioQueue = [];
        this.isPlaying = false;
        this.currentSource = null;
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            return true;
        } catch (error) {
            console.error('Audio context initialization failed:', error);
            return false;
        }
    }

    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('Audio context resumed');
        }
    }

    async playTestSound() {
        console.log('🔊 Starting playTestSound...');
        if (!this.audioContext) await this.init();
        await this.resume();

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.5);
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (err) {
            console.error('❌ Error in playTestSound:', err);
        }
    }

    async playAudio(url) {
        if (!this.audioContext) throw new Error('Audio context not initialized');
        return new Promise((resolve, reject) => {
            this.audioQueue.push({ url, resolve, reject });
            if (!this.isPlaying) {
                this.isPlaying = true;
                this.processQueue();
            }
        });
    }

    async processQueue() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }
        const { url, resolve, reject } = this.audioQueue.shift();
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            this.currentSource = source;
            if (!this.analyser) {
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
            }
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            source.onended = () => {
                source.disconnect();
                this.currentSource = null;
                resolve();
                this.processQueue();
            };
            source.start(0);
        } catch (error) {
            console.error('Queue processing error:', error);
            reject(error);
            this.processQueue();
        }
    }

    stopAudio() {
        if (this.currentSource) {
            try { this.currentSource.stop(); } catch(e) {}
            this.currentSource = null;
        }
        this.audioQueue = [];
        this.isPlaying = false;
    }

    async startRecording() {
        console.log('🎤 AudioManager: Attempting to start recording...');
        try {
            // 1. Cleanup existing
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }

            // 2. Request basic stream first (Most compatible)
            let stream = null;
            try {
                console.log('🎤 AudioManager: Requesting basic getUserMedia...');
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (basicErr) {
                console.warn('🎤 Basic getUserMedia failed, trying fallback...', basicErr.name);
                
                // Fallback: Try with common sample rates or specific devices
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInput = devices.find(d => d.kind === 'audioinput' && d.deviceId !== 'default');
                
                if (audioInput) {
                    console.log(`🎤 Trying specific device: ${audioInput.label}`);
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        audio: { deviceId: { exact: audioInput.deviceId } } 
                    });
                } else {
                    throw basicErr;
                }
            }

            if (!stream) throw new Error('Could not acquire microphone stream.');
            
            this.mediaStream = stream;
            if (!this.audioContext) await this.init();
            if (this.audioContext.state === 'suspended') await this.resume();

            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            console.log('🚀 Recording started successfully');
            return this.analyser;
            
        } catch (error) {
            console.error('❌ AudioManager: Recording failed:', error);
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
            throw error;
        }
    }

    async stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) return null;
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.isRecording = false;
                resolve(audioBlob);
            };
            this.mediaRecorder.stop();
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
        });
    }

    getAudioData() {
        if (!this.analyser) return null;
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }

    getVolumeLevel() {
        const data = this.getAudioData();
        if (!data) return 0;
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        return sum / data.length / 255;
    }

    dispose() {
        if (this.mediaRecorder && this.isRecording) this.mediaRecorder.stop();
        if (this.mediaStream) this.mediaStream.getTracks().forEach(track => track.stop());
        if (this.audioContext) this.audioContext.close();
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
    }
}

export function createAudioManager() {
    return new AudioManager();
}