
export const playCheckSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Create a compressor node to keep the sound balanced and avoid clipping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, now);
    compressor.knee.setValueAtTime(30, now);
    compressor.ratio.setValueAtTime(12, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.25, now);
    compressor.connect(ctx.destination);

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.2; // Gentle volume
    masterGain.connect(compressor);

    // Helper to play a single "soft pluck" tone
    const playTone = (freq: number, time: number, duration: number, isAccent: boolean = false) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Sine wave is smooth, "cute", and not harsh/metallic
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      // Envelope: Instant attack, exponential decay
      // This mimics a bell, marimba, or synth pluck
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(isAccent ? 0.8 : 0.6, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      
      osc.start(time);
      osc.stop(time + duration + 0.05);
    };

    // Notes: C6, E6, G6 (Ascending C Major Triad)
    // This interval creates a very positive, "Mission Complete" feeling
    const note1 = 1046.50; // C6
    const note2 = 1318.51; // E6
    const note3 = 1567.98; // G6

    // Timing: Fast sequence (Total ~0.5s)
    // "Ding-ding-ding"
    playTone(note1, now, 0.3);
    playTone(note2, now + 0.07, 0.3);
    playTone(note3, now + 0.14, 0.5, true); // Last note sustains slightly longer

  } catch (e) {
    // Silent fail if audio is blocked or unsupported
    console.error("Audio playback failed", e);
  }
};
