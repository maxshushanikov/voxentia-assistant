import { useState, useRef, useCallback } from 'react';

export function useAudioManager() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mouthAlpha, setMouthAlpha] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const updateMouth = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const alpha = Math.min(average / 128, 1.0); 
    setMouthAlpha(alpha * 0.8); 

    animationFrameRef.current = requestAnimationFrame(updateMouth);
  }, []);

  const playAudio = useCallback(async (url: string) => {
    initAudio();
    const ctx = audioContextRef.current!;
    const analyser = analyserRef.current!;

    try {
      // CRITICAL: Must await resume() — browser blocks audio until first user interaction
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Audio fetch failed: ${response.status} ${url}`);
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        console.error('Audio buffer is empty:', url);
        return;
      }

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      setIsSpeaking(true);
      source.start(0);
      updateMouth();

      source.onended = () => {
        setIsSpeaking(false);
        setMouthAlpha(0);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsSpeaking(false);
      setMouthAlpha(0);
    }
  }, [initAudio, updateMouth]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording start error:', error);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsRecording(false);
        resolve(blob);
        
        // Stop all tracks to release microphone
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  const unlockAudio = useCallback(() => {
    initAudio();
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }, [initAudio]);

  return {
    isSpeaking,
    isRecording,
    mouthAlpha,
    playAudio,
    unlockAudio,
    startRecording,
    stopRecording
  };
}
