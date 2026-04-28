export class AudioManager {
    constructor() {
        console.log('AudioManager v1.1 (with resume) loaded');
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
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

    /**
     * Diagnostic sound to verify if browser audio is actually on.
     * Generates a 440Hz beep (Tone A) for 0.5 seconds.
     */
    async playTestSound() {
        console.log('🔊 Starting playTestSound...');
        if (!this.audioContext) {
            console.log('🔊 Initializing AudioContext...');
            await this.init();
        }
        
        console.log(`🔊 Current Context State: ${this.audioContext.state}`);
        await this.resume();
        console.log(`🔊 Context State after resume: ${this.audioContext.state}`);

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.5);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            console.log('🔊 Starting Oscillator...');
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
            console.log('✅ 🔊 Diagnostic beep triggered successfully');
        } catch (err) {
            console.error('❌ 🔊 Error in playTestSound:', err);
        }
    }

    async playAudio(url) {
        if (!this.audioContext) {
            throw new Error('Audio context not initialized');
        }

        try {
            console.log(`Fetching audio from: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            console.log(`Audio file received, length: ${arrayBuffer.byteLength} bytes`);
            
            if (arrayBuffer.byteLength === 0) {
                throw new Error('Received empty audio buffer');
            }

            const decodeStartTime = Date.now();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            const decodeTime = Date.now() - decodeStartTime;
            console.log(`Audio decoded successfully in ${decodeTime}ms`);

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;

            // Create analyser if not exists
            if (!this.analyser) {
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
            }

            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            return new Promise((resolve) => {
                source.onended = () => {
                    source.disconnect();
                    resolve();
                };
                source.start(0);
            });
        } catch (error) {
            console.error('Audio playback via AudioContext failed:', error);
            throw error;
        }
    }

    async startRecording() {
        try {
            if (!this.audioContext) {
                await this.init();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 44100,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });
            
            this.mediaStream = stream;
            const source = this.audioContext.createMediaStreamSource(stream);
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            return this.analyser;
            
        } catch (error) {
            console.error('Recording start failed:', error);
            throw error;
        }
    }

    async stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) {
            return null;
        }

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
        if (!this.analyser) {
            return null;
        }
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        return dataArray;
    }

    getVolumeLevel() {
        const data = this.getAudioData();
        if (!data) return 0;
        
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
        }
        
        return sum / data.length / 255;
    }

    dispose() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
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