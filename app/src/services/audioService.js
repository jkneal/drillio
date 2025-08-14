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
    
    // HTML5 Audio fallback for Safari
    this.audioElement = null;
    this.useFallback = false;
    
    // Tempo configuration for each movement (BPM)
    this.tempos = {
      1: 140,
      2: 170,
      3: 75
    };
    
    // Store set markers for each movement (in seconds)
    this.setMarkers = new Map();
    
    // Setup user interaction listener for Safari
    this.setupUserInteractionListener();
    
    // Check if we should use fallback (Safari detection)
    this.checkSafariFallback();
  }
  
  checkSafariFallback() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    this.useFallback = isSafari || isIOS;
    console.log('Safari/iOS detected:', this.useFallback);
  }
  
  // Get the audio startup delay for Safari (in milliseconds)
  getStartupDelay() {
    // No delay - it's inconsistent
    return 0;
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

  // Get tempo for a specific movement (returns default if not configured)
  getTempo(movement) {
    return this.tempos[movement] || 120;
  }

  calculateSetMarkers(movement, movementData) {
    const tempo = this.getTempo(movement);
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
    const tempo = this.getTempo(movement);
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
    const movementNum = parseInt(movement);
    
    // Use HTML5 Audio fallback for Safari
    if (this.useFallback) {
      return this.playWithFallback(movementNum, setIndex, totalCountsUpToPosition, playbackRate);
    }
    
    // Original Web Audio API implementation
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
  
  async playWithFallback(movement, setIndex, totalCountsUpToPosition, playbackRate) {
    console.log('Using HTML5 Audio fallback for Safari');
    
    // Stop any currently playing audio
    this.stop();
    
    // Create or reuse audio element
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';
      // Set crossorigin for better caching
      this.audioElement.crossOrigin = 'anonymous';
    }
    
    // Set the source if changed
    const audioSrc = `/audio/${movement}.mp3`;
    if (this.audioElement.src !== window.location.origin + audioSrc) {
      this.audioElement.src = audioSrc;
      
      // Wait for audio to be fully buffered
      await new Promise((resolve, reject) => {
        let timeout;
        
        const canPlay = () => {
          clearTimeout(timeout);
          this.audioElement.removeEventListener('canplaythrough', canPlay);
          this.audioElement.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = () => {
          clearTimeout(timeout);
          this.audioElement.removeEventListener('canplaythrough', canPlay);
          this.audioElement.removeEventListener('error', onError);
          reject(new Error('Failed to load audio'));
        };
        
        // Add timeout to prevent infinite waiting
        timeout = setTimeout(() => {
          this.audioElement.removeEventListener('canplaythrough', canPlay);
          this.audioElement.removeEventListener('error', onError);
          resolve(); // Proceed anyway after timeout
        }, 5000);
        
        this.audioElement.addEventListener('canplaythrough', canPlay);
        this.audioElement.addEventListener('error', onError);
        this.audioElement.load();
      });
    }
    
    // Set playback rate
    this.audioElement.playbackRate = playbackRate;
    
    // Calculate start time
    const startOffset = this.calculateTimeForSet(movement, setIndex, totalCountsUpToPosition);
    
    // Set start time
    this.audioElement.currentTime = startOffset;
    
    // Store start time for sync
    this.startTime = (performance.now() / 1000) - startOffset;
    
    try {
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      this.isPlaying = true;
      this.currentMovement = movement;
      console.log('HTML5 Audio playback started at offset:', startOffset);
    } catch (error) {
      console.error('HTML5 Audio playback failed:', error);
      // Don't retry - let user try again
      this.isPlaying = false;
    }
  }

  pause() {
    // Handle HTML5 audio pause
    if (this.audioElement && this.isPlaying) {
      try {
        this.pauseTime = this.audioElement.currentTime;
        this.audioElement.pause();
        this.isPlaying = false;
        return;
      } catch (e) {
        console.error('Error pausing HTML5 audio:', e);
      }
    }
    
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
    // Stop HTML5 audio if using fallback
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {
        console.error('Error stopping HTML5 audio:', e);
      }
    }
    
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
    
    // Stop HTML5 audio if using fallback
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        // Remove event listeners to prevent memory leaks
        this.audioElement.src = '';
        this.audioElement.load();
      } catch (e) {
        console.error('Error in emergency stop for HTML5 audio:', e);
      }
    }
    
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
    // Set volume for HTML5 audio if using fallback
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
    
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
  
  setPlaybackRate(rate) {
    // Set playback rate for HTML5 audio if using fallback
    if (this.audioElement) {
      this.audioElement.playbackRate = rate;
      console.log('Setting HTML5 audio playback rate to:', rate);
    }
    
    if (this.currentSource) {
      this.currentSource.playbackRate.value = rate;
    }
  }

  getCurrentTime() {
    // For Safari fallback, use HTML5 audio currentTime
    if (this.useFallback && this.audioElement) {
      return this.audioElement.currentTime;
    }
    
    if (this.isPlaying && this.audioContext) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pauseTime;
  }
  
  // Get the audio context for timing sync
  getAudioContext() {
    // For Safari fallback, return a mock object with current time
    if (this.useFallback) {
      return {
        currentTime: performance.now() / 1000
      };
    }
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
    // Skip metronome for Safari fallback - just return the duration
    if (this.useFallback) {
      const baseTempo = this.getTempo(movement);
      const adjustedTempo = baseTempo * playbackRate;
      const beatDuration = 60 / adjustedTempo;
      console.log('Skipping metronome for Safari, returning duration:', counts * beatDuration);
      return counts * beatDuration;
    }
    
    await this.initialize();
    
    // Ensure audio context is resumed (important for mobile)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    const baseTempo = this.getTempo(movement);
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