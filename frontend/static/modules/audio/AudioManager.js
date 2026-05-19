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
        console.log('🎤 AudioManager: Attempting to start recording...');
        try {
            // 1. Cleanup any existing stream/tracks first to avoid "in use" conflicts
            if (this.mediaStream) {
                console.log('🎤 AudioManager: Stopping existing media stream tracks...');
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }

            // 2. Diagnostics: List devices (helps "wake up" the subsystem on some browsers)
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                console.log(`🎤 AudioManager: Found ${audioInputs.length} audio input devices`);
            } catch (dErr) {
                console.warn('🎤 AudioManager: Could not enumerate devices:', dErr);
            }

            // 3. Request Microphone with Multi-Stage Strategy
            console.log('🎤 AudioManager: Requesting getUserMedia...');
            let stream = null;
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(d => d.kind === 'audioinput');
            
            // Try to find the "best" device (preferring real microphones over virtual ones)
            const preferredDevice = audioInputs.find(d => 
                d.label.toLowerCase().includes('mikrofon') || 
                d.label.toLowerCase().includes('microphone')
            );

            const attemptConstraints = async (constraints, label) => {
                try {
                    console.log(`🎤 AudioManager: Attempting constraints (${label})...`);
                    return await navigator.mediaDevices.getUserMedia(constraints);
                } catch (e) {
                    console.warn(`🎤 AudioManager: Constraints (${label}) failed:`, e.name);
                    return null;
                }
            };

            // Strategy 1: High Quality (Matching user's 48kHz setting)
            stream = await attemptConstraints({
                audio: {
                    deviceId: preferredDevice ? { exact: preferredDevice.deviceId } : undefined,
                    sampleRate: 48000,
                    channelCount: 1, // Try mono even if hardware is stereo
                    echoCancellation: true
                }
            }, '48kHz Mono');

            // Strategy 2: Basic fallback
            if (!stream) {
                stream = await attemptConstraints({ audio: true }, 'Basic Audio');
            }

            // Strategy 3: Nuclear Reset & Low Quality (Matching user's 16kHz headphone setting)
            if (!stream) {
                console.warn('⚠️ AudioManager: Standard attempts failed. Attempting "Nuclear Reset"...');
                
                if (this.audioContext) {
                    await this.audioContext.close();
                    this.audioContext = null;
                }

                await new Promise(resolve => setTimeout(resolve, 1500));
                
                stream = await attemptConstraints({
                    audio: { sampleRate: 16000, channelCount: 1 }
                }, '16kHz Mono (Post-Reset)');
            }

            // Strategy 4: Iterate through EVERY available device (Chrome Fix)
            if (!stream && audioInputs.length > 0) {
                console.warn(`⚠️ AudioManager: Trying each of the ${audioInputs.length} devices individually...`);
                for (const device of audioInputs) {
                    if (stream) break;
                    // Skip the 'default' virtual device and try the real IDs
                    if (device.deviceId === 'default' && audioInputs.length > 1) continue;
                    
                    stream = await attemptConstraints({
                        audio: { deviceId: { exact: device.deviceId } }
                    }, `Device: ${device.label || 'Unknown ID: ' + device.deviceId.slice(0,5)}`);
                }
            }

            if (!stream) {
                throw new Error('NotReadableError: All hardware access strategies and all devices exhausted.');
            }
            
            console.log('✅ AudioManager: Microphone stream acquired:', stream.id);
            this.mediaStream = stream;

            // 4. Ensure AudioContext exists and is running (Lazy initialization)
            if (!this.audioContext) {
                console.log('🎤 AudioManager: Initializing NEW AudioContext...');
                await this.init();
            }
            
            if (this.audioContext.state === 'suspended') {
                await this.resume();
            }

            // 5. Set up Audio Nodes
            const source = this.audioContext.createMediaStreamSource(stream);
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            
            // 6. Initialize MediaRecorder
            console.log('🎤 AudioManager: Initializing MediaRecorder...');
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            console.log('🚀 AudioManager: Recording started successfully');
            return this.analyser;
            
        } catch (error) {
            console.error('❌ AudioManager: Recording start failed:', error);
            // Ensure we cleanup on failure
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
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