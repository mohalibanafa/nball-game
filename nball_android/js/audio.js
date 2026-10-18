/**
 * N-Ball Audio Manager
 * Uses Web Audio API for zero-latency sound effects and music streaming on Android
 */
class AudioManager {
    constructor() {
        this.ctx = null;
        this.jumpBuffer = null;
        this.musicAudio = null;
        this.sfxVolume = parseFloat(localStorage.getItem('nball_sfx_vol') || '0.8');
        this.musicVolume = parseFloat(localStorage.getItem('nball_music_vol') || '0.6');
        this.initialized = false;
        this.musicStarted = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.loadJumpSfx();
            this.setupMusic();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio not supported or blocked:', e);
        }
    }

    unlock() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (!this.musicStarted && this.musicAudio) {
            this.playMusic();
        }
    }

    async loadJumpSfx() {
        try {
            const resp = await fetch('media/jump.wav');
            const arrayBuffer = await resp.arrayBuffer();
            this.jumpBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.warn('Could not load jump.wav:', e);
        }
    }

    setupMusic() {
        this.musicAudio = new Audio('media/1.ogg');
        this.musicAudio.loop = true;
        this.musicAudio.volume = this.musicVolume;
    }

    playJump() {
        this.unlock();
        if (!this.ctx || !this.jumpBuffer) return;
        try {
            const source = this.ctx.createBufferSource();
            const gain = this.ctx.createGain();
            source.buffer = this.jumpBuffer;
            gain.gain.value = this.sfxVolume;
            source.connect(gain);
            gain.connect(this.ctx.destination);
            source.start(0);
        } catch (e) {
            console.warn('Error playing jump sfx:', e);
        }
    }

    playMusic() {
        if (this.musicAudio) {
            this.musicAudio.volume = this.musicVolume;
            this.musicAudio.play().then(() => {
                this.musicStarted = true;
            }).catch(() => {
                // Autoplay blocked until gesture
            });
        }
    }

    pauseMusic() {
        if (this.musicAudio) {
            this.musicAudio.pause();
            this.musicStarted = false;
        }
    }

    setSfxVolume(vol) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
        localStorage.setItem('nball_sfx_vol', this.sfxVolume.toString());
    }

    setMusicVolume(vol) {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        if (this.musicAudio) {
            this.musicAudio.volume = this.musicVolume;
        }
        localStorage.setItem('nball_music_vol', this.musicVolume.toString());
    }
}

window.AudioManager = AudioManager;
