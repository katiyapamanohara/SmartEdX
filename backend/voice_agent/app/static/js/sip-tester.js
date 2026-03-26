/**
 * SIP-over-WebSocket Tester
 * Frontend tool for testing SIP trunk integration
 */

class SIPTester {
  constructor() {
    this.ws = null;
    this.callState = 'idle';
    this.audioContext = null;
    this.audioSent = 0;
    this.audioReceived = 0;
    this.callId = null;
    this.fromTag = null;
    this.toTag = null;
    this.audioChunks = [];
    this.micStream = null;

    this.initUI();
  }

  initUI() {
    // Mode switching
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        this.switchMode(mode);
      });
    });

    // SIP controls
    document.getElementById('sipStartCall')?.addEventListener('click', () => this.startCall());
    document.getElementById('sipEndCall')?.addEventListener('click', () => this.endCall());
    document.getElementById('sipSendAudio')?.addEventListener('click', () => this.sendTestAudio());
    document.getElementById('sipClearLog')?.addEventListener('click', () => this.clearLog());
  }

  switchMode(mode) {
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const sipPanel = document.getElementById('sipPanel');
    const websocketPanel = document.getElementById('websocketPanel');
    const consolePanel = document.querySelector('.console-panel');

    if (mode === 'sip') {
      sipPanel.style.display = 'block';
      websocketPanel.style.display = 'none';
      consolePanel.style.display = 'none';
    } else {
      sipPanel.style.display = 'none';
      websocketPanel.style.display = 'block';
      consolePanel.style.display = 'block';
    }
  }

  async startCall() {
    try {
      const url = document.getElementById('sipUrl').value;
      const callerId = document.getElementById('sipCallerId').value;
      const codec = document.getElementById('sipCodec').value;

      this.log('INFO', `Connecting to ${url}...`);
      this.updateStatus('Connecting...');

      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => this.onConnected(callerId, codec);
      this.ws.onmessage = (event) => this.onMessage(event);
      this.ws.onclose = () => this.onDisconnected();
      this.ws.onerror = (error) => this.onError(error);

      document.getElementById('sipStartCall').disabled = true;
      document.getElementById('sipEndCall').disabled = false;

    } catch (error) {
      this.log('ERROR', `Failed to start call: ${error.message}`);
      this.updateStatus('Error');
    }
  }

  onConnected(callerId, codec) {
    this.log('SUCCESS', 'WebSocket connected');
    this.updateStatus('Connected');

    // Generate call identifiers
    this.callId = `test-${Date.now()}@localhost`;
    this.fromTag = `tag-${Math.random().toString(36).substring(7)}`;

    // Send INVITE
    const invite = this.createInvite(callerId, codec);
    this.log('SEND', 'Sending INVITE');
    this.log('SIP', invite, 'sent');
    this.ws.send(invite);

    this.updateStatus('Inviting...');
  }

  createInvite(callerId, codec) {
    const payloadType = codec === 'PCMU' ? 0 : 8;
    const lines = [
      'INVITE sip:agent@localhost:8000 SIP/2.0',
      'Via: SIP/2.0/WSS localhost:8000;branch=z9hG4bK' + this.generateBranch(),
      `From: <sip:${callerId}@test.com>;tag=${this.fromTag}`,
      'To: <sip:agent@localhost:8000>',
      `Call-ID: ${this.callId}`,
      'CSeq: 1 INVITE',
      `Contact: <sip:${callerId}@test.com>`,
      'Content-Type: application/sdp',
      'Content-Length: ' + this.calculateSDPLength(codec),
      '',
      'v=0',
      'o=- 0 0 IN IP4 127.0.0.1',
      's=SIP Test Call',
      'c=IN IP4 127.0.0.1',
      't=0 0',
      `m=audio 20000 RTP/AVP ${payloadType}`,
      `a=rtpmap:${payloadType} ${codec}/8000`,
      'a=sendrecv',
      ''
    ];
    return lines.join('\r\n');
  }

  calculateSDPLength(codec) {
    const payloadType = codec === 'PCMU' ? 0 : 8;
    const sdp = [
      'v=0',
      'o=- 0 0 IN IP4 127.0.0.1',
      's=SIP Test Call',
      'c=IN IP4 127.0.0.1',
      't=0 0',
      `m=audio 20000 RTP/AVP ${payloadType}`,
      `a=rtpmap:${payloadType} ${codec}/8000`,
      'a=sendrecv',
      ''
    ].join('\r\n');
    return sdp.length;
  }

  onMessage(event) {
    if (typeof event.data === 'string') {
      // SIP message
      this.log('RECV', 'Received SIP message');
      this.log('SIP', event.data, 'received');
      this.handleSIPMessage(event.data);
    } else {
      // Audio data
      const audioData = new Uint8Array(event.data);
      this.audioReceived += audioData.length;
      this.updateStats();
      this.log('AUDIO', `Received ${audioData.length} bytes of audio`);

      // Optionally play the audio
      this.playAudio(audioData);
    }
  }

  handleSIPMessage(message) {
    if (message.includes('100 Trying')) {
      this.log('SUCCESS', 'Received 100 Trying');
      this.updateStatus('Trying...');
    } else if (message.includes('200 OK')) {
      this.log('SUCCESS', 'Received 200 OK');

      // Extract To tag
      const toMatch = message.match(/To:.*tag=([^;\s]+)/);
      if (toMatch) {
        this.toTag = toMatch[1];
      }

      if (this.callState === 'idle' || this.callState === 'inviting') {
        // This is response to INVITE
        this.callState = 'ringing';
        this.updateStatus('Ringing');

        // Send ACK
        setTimeout(() => this.sendACK(), 100);
      } else if (this.callState === 'ending') {
        // Response to BYE
        this.callState = 'idle';
        this.updateStatus('Call Ended');
        this.ws.close();
      }
    } else if (message.includes('SIP/2.0')) {
      const statusMatch = message.match(/SIP\/2\.0 (\d+) (.+)/);
      if (statusMatch) {
        this.log('INFO', `Received ${statusMatch[1]} ${statusMatch[2]}`);
      }
    }
  }

  sendACK() {
    const ack = [
      'ACK sip:agent@localhost:8000 SIP/2.0',
      'Via: SIP/2.0/WSS localhost:8000;branch=z9hG4bK' + this.generateBranch(),
      `From: <sip:${document.getElementById('sipCallerId').value}@test.com>;tag=${this.fromTag}`,
      `To: <sip:agent@localhost:8000>;tag=${this.toTag}`,
      `Call-ID: ${this.callId}`,
      'CSeq: 1 ACK',
      'Content-Length: 0',
      '',
      ''
    ].join('\r\n');

    this.log('SEND', 'Sending ACK');
    this.log('SIP', ack, 'sent');
    this.ws.send(ack);

    this.callState = 'active';
    this.updateStatus('Call Active');

    // Enable audio sending
    document.getElementById('sipSendAudio').disabled = false;

    // Auto-send audio after ACK
    setTimeout(() => {
      if (this.callState === 'active') {
        this.sendTestAudio();
      }
    }, 500);
  }

  async sendTestAudio() {
    const audioType = document.getElementById('sipAudioType').value;
    const duration = parseFloat(document.getElementById('sipDuration').value);
    const codec = document.getElementById('sipCodec').value;

    this.log('INFO', `Generating ${audioType} audio (${duration}s, ${codec})`);

    try {
      let audioData;

      if (audioType === 'mic') {
        audioData = await this.captureMicrophoneAudio(duration, codec);
      } else if (audioType === 'sweep') {
        audioData = this.generateSweepTone(duration, codec);
      } else {
        audioData = this.generateTone(440, duration, codec);
      }

      this.log('INFO', `Sending ${audioData.length} bytes of audio`);
      this.sendAudioChunks(audioData);

    } catch (error) {
      this.log('ERROR', `Failed to send audio: ${error.message}`);
    }
  }

  generateTone(frequency, duration, codec) {
    const sampleRate = 8000;
    const numSamples = Math.floor(sampleRate * duration);
    const pcmData = new Int16Array(numSamples);

    // Generate sine wave
    for (let i = 0; i < numSamples; i++) {
      pcmData[i] = Math.floor(32767 * Math.sin(2 * Math.PI * frequency * i / sampleRate));
    }

    // Convert to G.711
    return this.encodePCMtoG711(pcmData, codec);
  }

  generateSweepTone(duration, codec) {
    const sampleRate = 8000;
    const numSamples = Math.floor(sampleRate * duration);
    const pcmData = new Int16Array(numSamples);

    const startFreq = 200;
    const endFreq = 3000;

    // Generate frequency sweep
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq = startFreq + (endFreq - startFreq) * (t / duration);
      pcmData[i] = Math.floor(32767 * Math.sin(2 * Math.PI * freq * t));
    }

    return this.encodePCMtoG711(pcmData, codec);
  }

  async captureMicrophoneAudio(duration, codec) {
    this.log('INFO', 'Requesting microphone access...');

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micStream = stream;

    const audioContext = new AudioContext({ sampleRate: 8000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    const chunks = [];

    return new Promise((resolve, reject) => {
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.floor(inputData[i] * 32767);
        }

        chunks.push(pcmData);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setTimeout(() => {
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach(track => track.stop());

        // Concatenate all chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const allPCM = new Int16Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          allPCM.set(chunk, offset);
          offset += chunk.length;
        }

        resolve(this.encodePCMtoG711(allPCM, codec));
      }, duration * 1000);
    });
  }

  encodePCMtoG711(pcmData, codec) {
    // Simple G.711 encoding (μ-law or a-law)
    const output = new Uint8Array(pcmData.length);

    for (let i = 0; i < pcmData.length; i++) {
      if (codec === 'PCMU') {
        output[i] = this.linearToUlaw(pcmData[i]);
      } else {
        output[i] = this.linearToAlaw(pcmData[i]);
      }
    }

    return output;
  }

  linearToUlaw(sample) {
    // G.711 μ-law encoding
    const BIAS = 0x84;
    const CLIP = 32635;

    let sign = (sample >> 8) & 0x80;
    if (sign !== 0) sample = -sample;
    if (sample > CLIP) sample = CLIP;

    sample += BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1);

    let mantissa = (sample >> (exponent + 3)) & 0x0F;
    let ulawByte = ~(sign | (exponent << 4) | mantissa);

    return ulawByte & 0xFF;
  }

  linearToAlaw(sample) {
    // G.711 a-law encoding
    const ALAW_MAX = 0xFFF;
    let sign = ((~sample >> 8) & 0x80);
    if (sign === 0) sample = -sample;
    if (sample > ALAW_MAX) sample = ALAW_MAX;

    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1);

    let mantissa = (sample >> (exponent + 3)) & 0x0F;
    let alawByte = sign | (exponent << 4) | mantissa;

    return alawByte ^ 0x55;
  }

  sendAudioChunks(audioData) {
    const chunkSize = 160; // 20ms @ 8kHz
    const numChunks = Math.ceil(audioData.length / chunkSize);

    this.log('INFO', `Sending ${numChunks} audio chunks (${chunkSize} bytes each)`);

    let i = 0;
    const sendNext = () => {
      if (i >= numChunks || this.callState !== 'active') {
        this.log('SUCCESS', 'All audio chunks sent');
        return;
      }

      const start = i * chunkSize;
      const end = Math.min((i + 1) * chunkSize, audioData.length);
      const chunk = audioData.slice(start, end);

      this.ws.send(chunk.buffer);
      this.audioSent += chunk.length;
      this.updateStats();

      i++;

      // Send next chunk after 20ms (simulate RTP timing)
      setTimeout(sendNext, 20);
    };

    sendNext();
  }

  playAudio(audioData) {
    // TODO: Decode G.711 and play through Web Audio API
    // For now, just log that we received it
  }

  endCall() {
    if (!this.ws || this.callState === 'idle') return;

    this.log('INFO', 'Ending call...');
    this.callState = 'ending';
    this.updateStatus('Ending...');

    const bye = [
      'BYE sip:agent@localhost:8000 SIP/2.0',
      'Via: SIP/2.0/WSS localhost:8000;branch=z9hG4bK' + this.generateBranch(),
      `From: <sip:${document.getElementById('sipCallerId').value}@test.com>;tag=${this.fromTag}`,
      `To: <sip:agent@localhost:8000>;tag=${this.toTag}`,
      `Call-ID: ${this.callId}`,
      'CSeq: 2 BYE',
      'Content-Length: 0',
      '',
      ''
    ].join('\r\n');

    this.log('SEND', 'Sending BYE');
    this.log('SIP', bye, 'sent');
    this.ws.send(bye);

    document.getElementById('sipSendAudio').disabled = true;
  }

  onDisconnected() {
    this.log('INFO', 'WebSocket disconnected');
    this.updateStatus('Disconnected');
    this.callState = 'idle';

    document.getElementById('sipStartCall').disabled = false;
    document.getElementById('sipEndCall').disabled = true;
    document.getElementById('sipSendAudio').disabled = true;
  }

  onError(error) {
    this.log('ERROR', `WebSocket error: ${error.message || error}`);
    this.updateStatus('Error');
  }

  updateStatus(status) {
    document.getElementById('sipCallState').textContent = status;
  }

  updateStats() {
    document.getElementById('sipAudioSent').textContent = this.formatBytes(this.audioSent);
    document.getElementById('sipAudioReceived').textContent = this.formatBytes(this.audioReceived);
  }

  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  log(type, message, detail = null) {
    const logContent = document.getElementById('sipLogContent');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type.toLowerCase()}`;

    const timestamp = new Date().toLocaleTimeString();
    const typeSpan = `<span class="log-type">[${type}]</span>`;
    const timeSpan = `<span class="log-time">${timestamp}</span>`;
    const msgSpan = `<span class="log-message">${this.escapeHtml(message)}</span>`;

    entry.innerHTML = `${timeSpan} ${typeSpan} ${msgSpan}`;

    if (detail) {
      const detailDiv = document.createElement('pre');
      detailDiv.className = 'log-detail';
      detailDiv.textContent = detail;
      entry.appendChild(detailDiv);
    }

    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
  }

  clearLog() {
    document.getElementById('sipLogContent').innerHTML = '';
    this.audioSent = 0;
    this.audioReceived = 0;
    this.updateStats();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  generateBranch() {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sipTester = new SIPTester();
  });
} else {
  window.sipTester = new SIPTester();
}
