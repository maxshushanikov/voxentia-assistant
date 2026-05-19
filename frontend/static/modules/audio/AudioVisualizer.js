export class AudioVisualizer {
    constructor(canvas, audioManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioManager = audioManager;
        this.isVisualizing = false;
        this.animationFrame = null;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    startVisualization() {
        if (this.isVisualizing) return;
        
        this.isVisualizing = true;
        this.visualize();
    }

    stopVisualization() {
        this.isVisualizing = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        this.clearCanvas();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    visualize() {
        if (!this.isVisualizing) return;
        
        const data = this.audioManager.getAudioData();
        if (!data) {
            this.animationFrame = requestAnimationFrame(() => this.visualize());
            return;
        }
        
        this.clearCanvas();
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        const barWidth = (width / data.length) * 2.5;
        let barHeight;
        let x = 0;
        
        this.ctx.fillStyle = 'rgba(79, 123, 216, 0.8)';
        
        for (let i = 0; i < data.length; i++) {
            barHeight = data[i] / 255 * height;
            
            this.ctx.fillRect(
                x, 
                height - barHeight, 
                barWidth, 
                barHeight
            );
            
            x += barWidth + 1;
        }
        
        this.animationFrame = requestAnimationFrame(() => this.visualize());
    }

    dispose() {
        this.stopVisualization();
        window.removeEventListener('resize', () => this.resizeCanvas());
    }
}

export function createAudioVisualizer(canvas, audioManager) {
    return new AudioVisualizer(canvas, audioManager);
}