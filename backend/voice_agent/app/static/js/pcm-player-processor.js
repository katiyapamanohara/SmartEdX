/**
 * PCM player processor.
 *
 * Improvements over the original:
 * - Underflow fades to silence rather than holding the last sample
 *   (eliminates the low buzz when the agent stops speaking).
 * - Ring buffer is the same size so no memory change.
 */
class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.bufferSize = 24000 * 180; // 24kHz × 180 s
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.readIndex = 0;

    // Fade state used during underflow to avoid harsh cutoff clicks
    this._fadeGain = 0.0; // 1.0 = full volume, 0.0 = silence
    this._fadeStep = 1 / 128; // reach silence in ~128 samples after underflow

    this.port.onmessage = (event) => {
      if (event.data.command === "endOfAudio") {
        this.readIndex = this.writeIndex;
        console.log("endOfAudio received, clearing buffer.");
        return;
      }
      this._enqueue(new Int16Array(event.data));
    };
  }

  _enqueue(int16Samples) {
    for (let i = 0; i < int16Samples.length; i++) {
      this.buffer[this.writeIndex] = int16Samples[i] / 32768;
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
      // Overflow: overwrite oldest sample
      if (this.writeIndex === this.readIndex) {
        this.readIndex = (this.readIndex + 1) % this.bufferSize;
      }
    }
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const framesPerBlock = output[0].length;

    for (let frame = 0; frame < framesPerBlock; frame++) {
      const hasData = this.readIndex !== this.writeIndex;

      let sample;
      if (hasData) {
        sample = this.buffer[this.readIndex];
        this.readIndex = (this.readIndex + 1) % this.bufferSize;
        // Ramp gain back up smoothly when data resumes after underflow
        this._fadeGain = Math.min(1.0, this._fadeGain + this._fadeStep);
      } else {
        sample = 0;
        // Fade out during underflow to avoid click/buzz at end of speech
        this._fadeGain = Math.max(0.0, this._fadeGain - this._fadeStep);
      }

      const out = sample * this._fadeGain;
      output[0][frame] = out;
      if (output.length > 1) output[1][frame] = out;
    }

    return true;
  }
}

registerProcessor("pcm-player-processor", PCMPlayerProcessor);
