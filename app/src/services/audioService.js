class AudioService {
  constructor() {
    this.audioContext = null;
    this.audioBuffers = new Map();
    this.currentSource = null;
    this.currentMovement = null;
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;
    this.gainNode = null;
    this.metronomeNodes = [];
    
    // Tempo configuration for each movement (BPM)
    this.tempos = {
      1: 140,
      2: 170
    };
    
    // Store set markers for each movement (in seconds)
    this.setMarkers = new Map();
  }

  async initialize() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }
  }

  async loadMovementAudio(movement) {
    await this.initialize();
    
    const movementNum = parseInt(movement);
    if (this.audioBuffers.has(movementNum)) {
      return this.audioBuffers.get(movementNum);
    }

    try {
      const response = await fetch(`/audio/${movementNum}.mp3`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(movementNum, audioBuffer);
      
      // Calculate set markers based on tempo and counts
      this.calculateSetMarkers(movementNum);
      
      return audioBuffer;
    } catch (error) {
      console.error(`Failed to load audio for movement ${movement}:`, error);
      return null;
    }
  }

  calculateSetMarkers(movement, movementData) {
    const tempo = this.tempos[movement];
    if (!tempo) return;
    
    const beatDuration = 60 / tempo; // Duration of one beat in seconds
    const markers = new Map();
    
    // Calculate cumulative time for each set transition
    let currentTime = 0;
    
    if (movementData) {
      movementData.forEach((set, index) => {
        markers.set(index, currentTime);
        // Add the duration of this set's counts
        const counts = set.counts || 8;
        currentTime += counts * beatDuration;
      });
    }
    
    // Store markers for this movement
    this.setMarkers.set(movement, markers);
  }

  // Calculate time offset for a specific set and count within that set
  calculateTimeForSet(movement, setIndex, totalCountsUpToSet) {
    const tempo = this.tempos[movement];
    if (!tempo) return 0;
    
    const beatDuration = 60 / tempo;
    
    // Calculate total time based on accumulated counts
    const totalTime = totalCountsUpToSet * beatDuration;
    
    return totalTime;
  }
  
  // Set movement data to calculate markers
  setMovementData(movement, movementData) {
    this.calculateSetMarkers(movement, movementData);
  }

  async play(movement, setIndex = 0, totalCountsUpToPosition = 0, playbackRate = 1.0) {
    await this.initialize();
    
    // Stop any currently playing audio
    this.stop();
    
    const movementNum = parseInt(movement);
    const audioBuffer = await this.loadMovementAudio(movementNum);
    if (!audioBuffer) return;
    
    this.currentMovement = movementNum;
    
    // Create new source
    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = audioBuffer;
    this.currentSource.playbackRate.value = playbackRate; // Set playback rate
    this.currentSource.connect(this.gainNode);
    
    // Calculate start offset based on accumulated counts
    const startOffset = this.calculateTimeForSet(movementNum, setIndex, totalCountsUpToPosition);
    const audioDuration = audioBuffer.duration;
    
    // Make sure we don't start beyond the audio duration
    if (startOffset >= audioDuration) {
      console.warn(`Start offset (${startOffset}s) exceeds audio duration (${audioDuration}s), not playing`);
      return;
    }
    
    // Start playback
    this.startTime = this.audioContext.currentTime - startOffset;
    this.currentSource.start(0, startOffset);
    this.isPlaying = true;
    
    // Handle end of audio
    this.currentSource.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.currentSource = null;
      }
    };
  }

  pause() {
    // Check for currentSource regardless of isPlaying flag
    if (this.currentSource) {
      this.pauseTime = this.audioContext.currentTime - this.startTime;
      this.stop();
    }
  }

  resume() {
    if (!this.isPlaying && this.pauseTime > 0 && this.currentMovement) {
      this.play(this.currentMovement, 0, this.pauseTime);
    }
  }

  stop() {
    // Always try to stop any playing source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Source might have already stopped
      }
      try {
        this.currentSource.disconnect();
      } catch (e) {
        // Source might have already been disconnected
      }
      this.currentSource = null;
    }
    
    // Always reset state regardless of whether source existed
    this.isPlaying = false;
    this.pauseTime = 0;
    this.currentMovement = null;
  }

  // Emergency stop - forcefully stops all audio
  emergencyStop() {
    // Stop metronome
    this.stopMetronome();
    
    // Disconnect and null everything
    if (this.currentSource) {
      try {
        this.currentSource.stop(0);
        this.currentSource.disconnect();
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Create a new gain node to ensure complete disconnection
    if (this.audioContext && this.gainNode) {
      try {
        this.gainNode.disconnect();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Reset all state
    this.currentSource = null;
    this.isPlaying = false;
    this.pauseTime = 0;
    this.currentMovement = null;
  }

  setVolume(volume) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
  
  setPlaybackRate(rate) {
    if (this.currentSource) {
      this.currentSource.playbackRate.value = rate;
    }
  }

  getCurrentTime() {
    if (this.isPlaying && this.audioContext) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pauseTime;
  }
  
  // Get the audio context for timing sync
  getAudioContext() {
    return this.audioContext;
  }
  
  // Get the start time for sync calculations
  getStartTime() {
    return this.startTime;
  }
  
  // Check if currently playing
  getIsPlaying() {
    return this.isPlaying;
  }
  
  // Play metronome count-off
  async playCountOff(movement, counts = 8, playbackRate = 1.0) {
    await this.initialize();
    
    const baseTempo = this.tempos[movement] || 120;
    const adjustedTempo = baseTempo * playbackRate; // Adjust tempo for playback speed
    const beatDuration = 60 / adjustedTempo; // Duration of one beat in seconds
    const currentTime = this.audioContext.currentTime;
    
    // Stop any existing metronome sounds
    this.stopMetronome();
    
    // Create clicks for each count
    for (let i = 0; i < counts; i++) {
      const startTime = currentTime + (i * beatDuration);
      
      // Create oscillator for click sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.gainNode);
      
      // Higher pitch for beat 1, lower for other beats
      const isDownbeat = i === 0 || i === 4; // Emphasize counts 1 and 5
      oscillator.frequency.value = isDownbeat ? 1000 : 800;
      
      // Set up envelope for click sound
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.001);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.02);
      gainNode.gain.setValueAtTime(0, startTime + 0.02);
      
      // Schedule the click
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.03);
      
      // Store reference for cleanup
      this.metronomeNodes.push({ oscillator, gainNode });
    }
    
    // Return duration of count-off
    return counts * beatDuration;
  }
  
  // Stop metronome sounds
  stopMetronome() {
    this.metronomeNodes.forEach(({ oscillator, gainNode }) => {
      try {
        oscillator.stop();
        oscillator.disconnect();
        gainNode.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
    });
    this.metronomeNodes = [];
  }
}

// Export singleton instance
export const audioService = new AudioService();