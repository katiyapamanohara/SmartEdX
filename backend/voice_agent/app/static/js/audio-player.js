/**
 * Audio Player Worklet
 */

export async function startAudioPlayerWorklet() {
    // 1. Create an AudioContext
    const audioContext = new AudioContext({
        sampleRate: 24000
    });


    // 2. Load your custom processor code
    const workletURL = new URL('./pcm-player-processor.js', import.meta.url);
    await audioContext.audioWorklet.addModule(workletURL);

    // 3. Create an AudioWorkletNode
    const audioPlayerNode = new AudioWorkletNode(audioContext, 'pcm-player-processor');

    // 4. DON'T connect to destination here - let the caller decide the routing
    // This allows inserting an analyser node for visualization
    // audioPlayerNode.connect(audioContext.destination);

    // The audioPlayerNode.port is how we send messages (audio data) to the processor
    return [audioPlayerNode, audioContext];
}
