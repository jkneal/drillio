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
    this.userInteracted = false;
    
    // Tempo configuration for each movement (BPM)
    this.tempos = {
      1: 140,
      2: 170
    };
    
    // Store set markers for each movement (in seconds)
    this.setMarkers = new Map();
    
    // Setup user interaction listener for Safari
    this.setupUserInteractionListener();
  }
  
  setupUserInteractionListener() {
    const handleUserInteraction = async () => {
      if (!this.userInteracted) {
        this.userInteracted = true;
        console.log('User interaction detected, initializing audio context');
        await this.initialize();
        // Remove listeners after first interaction
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('click', handleUserInteraction);
      }
    };
    
    // Add listeners for user interaction
    document.addEventListener('touchstart', handleUserInteraction, { once: false });
    document.addEventListener('click', handleUserInteraction, { once: false });
  }

  async initialize() {
    if (!this.audioContext) {
      // Use webkitAudioContext for better Safari compatibility
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }
    
    // Always try to resume audio context (critical for Safari)
    if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
      try {
        await this.audioContext.resume();
        console.log('Audio context resumed, state:', this.audioContext.state);
      } catch (error) {
        console.error('Failed to resume audio context:', error);
        // Try creating a new context as fallback
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.audioContext = new AudioContext();
          this.gainNode = this.audioContext.createGain();
          this.gainNode.connect(this.audioContext.destination);
          await this.audioContext.resume();
          console.log('Created new audio context, state:', this.audioContext.state);
        } catch (fallbackError) {
          console.error('Failed to create new audio context:', fallbackError);
        }
      }
    }
  }

  async loadMovementAudio(movement) {
    await this.initialize();
    
    const movementNum = parseInt(movement);
    if (this.audioBuffers.has(movementNum)) {
      return this.audioBuffers.get(movementNum);
    }

    try {
      const response = await fetch(`/audio/${movementNum}.mp3`, {
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Safari sometimes needs a fresh copy of the buffer
      const bufferCopy = arrayBuffer.slice(0);
      
      const audioBuffer = await this.audioContext.decodeAudioData(bufferCopy);
      this.audioBuffers.set(movementNum, audioBuffer);
      
      // Calculate set markers based on tempo and counts
      this.calculateSetMarkers(movementNum);
      
      console.log(`Audio loaded for movement ${movement}, duration: ${audioBuffer.duration}s`);
      return audioBuffer;
    } catch (error) {
      console.error(`Failed to load audio for movement ${movement}:`, error);
      // Try alternative loading method for Safari
      try {
        console.log('Trying alternative audio loading method...');
        const response = await fetch(`/audio/${movementNum}.mp3`);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        // Create audio element as fallback
        const audio = new Audio(objectUrl);
        audio.preload = 'auto';
        
        return new Promise((resolve) => {
          audio.addEventListener('canplaythrough', () => {
            console.log('Audio loaded via fallback method');
            resolve(null); // Return null to indicate fallback method
          });
          audio.addEventListener('error', () => {
            console.error('Fallback audio loading also failed');
            resolve(null);
          });
        });
      } catch (fallbackError) {
        console.error('All audio loading methods failed:', fallbackError);
        return null;
      }
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
    
    // Ensure audio context is resumed (critical for Safari/mobile)
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
        try {
          await this.audioContext.resume();
          console.log('Audio context resumed in play(), state:', this.audioContext.state);
        } catch (error) {
          console.error('Failed to resume audio context in play():', error);
          return;
        }
      }
    }
    
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
    
    // Ensure audio context is resumed (important for mobile)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
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