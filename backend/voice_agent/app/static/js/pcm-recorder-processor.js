class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // DC offset accumulator for high-pass filter (removes low-frequency hum)
    this._dcOffset = 0;
  }

  process(inputs, outputs, parameters) {
    if (inputs.length > 0 && inputs[0].length > 0) {
      const inputChannel = inputs[0][0];
      const inputCopy = new Float32Array(inputChannel.length);

      // Single-pole high-pass filter: removes DC offset and sub-50Hz rumble.
      // alpha ≈ 0.995 gives ~80Hz cutoff at 16kHz, keeping all voice frequencies.
      const alpha = 0.995;
      for (let i = 0; i < inputChannel.length; i++) {
        this._dcOffset = alpha * this._dcOffset + (1 - alpha) * inputChannel[i];
        inputCopy[i] = inputChannel[i] - this._dcOffset;
      }

      this.port.postMessage(inputCopy);
    }
    return true;
  }
}

registerProcessor("pcm-recorder-processor", PCMProcessor);
