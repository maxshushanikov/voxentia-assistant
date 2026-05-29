import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Eye, RefreshCw, Sparkles, FileText, CheckCircle } from 'lucide-react';

export default function VisionView() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [webcamAvailable, setWebcamAvailable] = useState(true);
  const [result, setResult] = useState<{
    ocr_text?: string;
    description?: string;
    objects?: string[];
    handwriting?: string;
    metadata?: any;
  } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize webcam
  useEffect(() => {
    startWebcam();
    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    try {
      setCapturedImage(null);
      setFile(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setWebcamAvailable(true);
    } catch (err) {
      console.warn("Webcam not available:", err);
      setWebcamAvailable(false);
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopWebcam();
        
        // Convert to file
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const f = new File([blob], "captured_webcam.jpg", { type: "image/jpeg" });
            setFile(f);
          });
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      setFile(selectedFile);
      setCapturedImage(URL.createObjectURL(selectedFile));
      stopWebcam();
    }
  };

  const analyzeImage = async (mode: 'ocr' | 'analyze') => {
    if (!file) return;
    setScanning(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const endpoint = mode === 'ocr' ? '/api/v1/vision/ocr' : '/api/v1/vision/analyze';
    const token = localStorage.getItem('token') || '';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Fehler beim Analysieren des Bildes.");
      }

      const data = await response.json();
      if (mode === 'ocr') {
        setResult({ ocr_text: data.text, metadata: data.metadata });
      } else {
        setResult({
          ocr_text: data.ocr_text,
          description: data.description,
          objects: data.objects,
          handwriting: data.handwriting,
          metadata: data.metadata
        });
      }
    } catch (err) {
      console.error(err);
      setResult({
        description: "### Fehler\nDie Analyse konnte nicht abgeschlossen werden. Ist das Backend erreichbar?",
        ocr_text: "Fehler beim Auslesen."
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2 flex items-center gap-3">
            <Eye className="w-8 h-8 text-[var(--accent)]" /> Vision-Modus
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Echtzeit-Webcam-Analyse, Handschriften-Entzifferung und intelligente Objekterkennung.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[var(--accent)] animate-pulse" />
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            Voxentia Cognitive Service
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-[500px]">
        {/* Left Side: Webcam or Captured Image Preview */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="relative aspect-video rounded-[12px] overflow-hidden bg-black/10 dark:bg-white/2 border border-black/5 dark:border-white/10 flex items-center justify-center shadow-lg group">
            {scanning && (
              <div className="absolute inset-0 bg-black/40 z-30 flex flex-col items-center justify-center text-white">
                <RefreshCw className="w-12 h-12 text-[var(--accent)] animate-spin mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest">Scanne Bild...</p>
                {/* Laser scan line effect */}
                <div className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent animate-tts-wave" style={{ animationDuration: '2s', height: '4px' }}></div>
              </div>
            )}

            {!capturedImage && webcamAvailable && stream && (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Scanner alignment crosshair */}
                <div className="absolute z-10 w-48 h-48 border border-white/20 rounded-[8px] pointer-events-none flex items-center justify-center">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-[var(--accent)] absolute top-0 left-0"></div>
                  <div className="w-4 h-4 border-t-2 border-r-2 border-[var(--accent)] absolute top-0 right-0"></div>
                  <div className="w-4 h-4 border-b-2 border-l-2 border-[var(--accent)] absolute bottom-0 left-0"></div>
                  <div className="w-4 h-4 border-b-2 border-r-2 border-[var(--accent)] absolute bottom-0 right-0"></div>
                  <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Kamera ausrichten</span>
                </div>
              </>
            )}

            {capturedImage && (
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-full object-cover" 
              />
            )}

            {!webcamAvailable && !capturedImage && (
              <div className="text-center p-8">
                <Upload className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                <h3 className="text-lg text-[var(--text-primary)] mb-2 font-medium">Keine Webcam erkannt</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-6 max-w-sm">
                  Schließe eine Webcam an oder lade ein Foto hoch, um den Vision-Modus zu nutzen.
                </p>
                <label className="btn-accent px-6 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-[var(--accent-hover)] transition-all">
                  Foto hochladen
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex flex-wrap gap-4 justify-between">
            <div className="flex gap-4">
              {!capturedImage && webcamAvailable && stream && (
                <button
                  onClick={capturePhoto}
                  className="px-6 py-2.5 btn-accent rounded-[4px] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--accent-hover)] shadow-lg shadow-[var(--accent)]/15"
                >
                  <Camera className="w-4 h-4" /> Foto aufnehmen
                </button>
              )}
              {capturedImage && (
                <button
                  onClick={startWebcam}
                  className="px-6 py-2.5 bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[var(--text-secondary)] rounded-[4px] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-[var(--text-primary)] hover:bg-black/15 transition-all"
                >
                  <RefreshCw className="w-4 h-4" /> Kamera neu starten
                </button>
              )}
              {webcamAvailable && stream && (
                <label className="px-6 py-2.5 bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[var(--text-secondary)] rounded-[4px] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:text-[var(--text-primary)] hover:bg-black/15 transition-all">
                  <Upload className="w-4 h-4" /> Bild hochladen
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              )}
            </div>
            
            {capturedImage && file && (
              <div className="flex gap-2">
                <button
                  onClick={() => analyzeImage('ocr')}
                  disabled={scanning}
                  className="px-5 py-2.5 border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-[4px] text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Text auslesen (OCR)
                </button>
                <button
                  onClick={() => analyzeImage('analyze')}
                  disabled={scanning}
                  className="px-5 py-2.5 btn-accent rounded-[4px] text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent)]/15"
                >
                  „Was sehe ich gerade?“
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Analysis Results */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <div className="glass-card flex-1 p-6 border border-black/5 dark:border-white/10 rounded-[12px] bg-black/2 dark:bg-white/2 overflow-y-auto custom-scrollbar flex flex-col min-h-[400px]">
            {!scanning && !result && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--text-muted)]">
                <Eye className="w-16 h-16 opacity-30 mb-4" />
                <h3 className="text-base text-[var(--text-secondary)] font-medium mb-1">Bereit zur Analyse</h3>
                <p className="text-xs max-w-xs">
                  Mache ein Foto oder lade ein Bild hoch, um das OCR- und Erkennungssystem zu starten.
                </p>
              </div>
            )}

            {scanning && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full border-2 border-t-[var(--accent)] border-r-[var(--accent)] border-b-transparent border-l-transparent animate-spin mb-6"></div>
                <h3 className="text-base text-[var(--text-primary)] font-medium mb-1">Lese Bildinformationen...</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                  Erkenne Strukturen, filtere Textelemente und vergleiche Objekte mit Modellen.
                </p>
              </div>
            )}

            {!scanning && result && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center space-x-2 text-[var(--success)]">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Analyse erfolgreich</span>
                </div>

                {result.objects && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-3">Erkannte Objekte</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.objects.map((obj, i) => (
                        <span key={i} className="px-3 py-1 bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full text-[10px] text-[var(--text-primary)]">
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.ocr_text && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--accent)]" /> Extrahierter Text / OCR
                    </h4>
                    <div className="p-4 bg-black/10 dark:bg-black/25 rounded-[8px] text-xs text-[var(--text-primary)] font-mono whitespace-pre-line border border-black/5 dark:border-white/5 leading-relaxed">
                      {result.ocr_text}
                    </div>
                  </div>
                )}

                {result.handwriting && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-2">Handschriftenerkennung</h4>
                    <p className="text-sm text-[var(--text-secondary)] italic">
                      "{result.handwriting}"
                    </p>
                  </div>
                )}

                {result.description && (
                  <div>
                    <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-3">Ausführliche Beschreibung</h4>
                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-4 prose prose-invert">
                      {result.description.split('\n\n').map((paragraph, index) => {
                        if (paragraph.startsWith('###')) {
                          return <h5 key={index} className="text-sm font-semibold text-[var(--text-primary)] mt-6 mb-2">{paragraph.replace('###', '').trim()}</h5>;
                        }
                        if (paragraph.startsWith('-')) {
                          return (
                            <ul key={index} className="list-disc pl-4 space-y-1 my-2">
                              {paragraph.split('\n').map((li, liIndex) => (
                                <li key={liIndex}>{li.replace('-', '').trim()}</li>
                              ))}
                            </ul>
                          );
                        }
                        return <p key={index}>{paragraph}</p>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
