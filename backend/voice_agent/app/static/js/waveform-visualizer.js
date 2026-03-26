/**
 * Waveform Visualizer for Audio Output
 * Displays real-time waveform visualization of the audio being played
 */

export class WaveformVisualizer {
    constructor(canvasId, audioContext) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas element not found:', canvasId);
            return;
        }
        this.canvasContext = this.canvas.getContext('2d');
        this.audioContext = audioContext;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = 0;
        this.animationId = null;
        this.isActive = false;

        // Visualization settings
        this.lineWidth = 2;
        this.strokeStyle = '#4285f4';
        this.backgroundColor = '#1a1a2e';
        this.gridColor = 'rgba(255, 255, 255, 0.1)';

        // Set canvas resolution after a short delay to ensure layout is complete
        setTimeout(() => this.resizeCanvas(), 0);
        window.addEventListener('resize', () => this.resizeCanvas());

        console.log('WaveformVisualizer created for canvas:', canvasId);
    }

    /**
     * Initialize the analyser and connect it to the audio source
     */
    connect(sourceNode) {
        if (!this.audioContext) {
            console.error('AudioContext not available');
            return;
        }

        if (!this.canvas) {
            console.error('Canvas not initialized');
            return;
        }

        // Create analyser node
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048; // Higher value = more detail
        this.analyser.smoothingTimeConstant = 0.8;

        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        // Connect: source -> analyser -> destination
        // The analyser doesn't modify the audio, it just monitors it
        sourceNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        console.log('Waveform visualizer connected. Buffer length:', this.bufferLength);
        console.log('Canvas dimensions:', this.displayWidth, 'x', this.displayHeight);

        this.isActive = true;
        this.draw();
    }

    /**
     * Resize canvas to match display size with proper pixel density
     */
    resizeCanvas() {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Store display size for drawing
        this.displayWidth = rect.width;
        this.displayHeight = rect.height;

        // Set actual canvas pixel dimensions
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // Reset transform and scale for high DPI displays
        this.canvasContext.setTransform(1, 0, 0, 1, 0, 0);
        this.canvasContext.scale(dpr, dpr);

        console.log('Canvas resized - Display:', this.displayWidth, 'x', this.displayHeight,
                    'Actual:', this.canvas.width, 'x', this.canvas.height, 'DPR:', dpr);
    }

    /**
     * Draw the waveform
     */
    draw() {
        if (!this.isActive || !this.analyser) {
            console.log('Draw stopped - isActive:', this.isActive, 'analyser:', !!this.analyser);
            return;
        }

        this.animationId = requestAnimationFrame(() => this.draw());

        // Get time domain data (waveform)
        this.analyser.getByteTimeDomainData(this.dataArray);

        const ctx = this.canvasContext;
        const width = this.displayWidth;
        const height = this.displayHeight;

        if (!width || !height) {
            console.warn('Canvas has no dimensions:', width, 'x', height);
            return;
        }

        // Clear canvas with background color
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.drawGrid(ctx, width, height);

        // Draw waveform
        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;
        ctx.beginPath();

        const sliceWidth = width / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0; // Normalize to 0-2
            const y = (v * height) / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Draw center line
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
    }

    /**
     * Draw background grid
     */
    drawGrid(ctx, width, height) {
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;

        // Horizontal lines
        const horizontalLines = 5;
        for (let i = 0; i <= horizontalLines; i++) {
            const y = (height / horizontalLines) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Vertical lines
        const verticalLines = 10;
        for (let i = 0; i <= verticalLines; i++) {
            const x = (width / verticalLines) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    }

    /**
     * Stop visualization
     */
    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Clear canvas
        const ctx = this.canvasContext;
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
    }

    /**
     * Resume visualization
     */
    resume() {
        if (this.analyser && !this.isActive) {
            this.isActive = true;
            this.draw();
        }
    }

    /**
     * Update visualization colors
     */
    setColors(strokeColor, backgroundColor) {
        this.strokeStyle = strokeColor;
        this.backgroundColor = backgroundColor;
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        this.stop();
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
    }
}
