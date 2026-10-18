/**
 * N-Ball Input Manager
 * Handles both touch controls (Android touch screen with multi-touch) and keyboard
 */
class InputManager {
    constructor() {
        this.state = {
            left: false,
            right: false,
            jump: false,
            pauseRequested: false,
            restartRequested: false
        };

        this.touchMap = new Map(); // identifier -> action
        this.setupKeyboard();
        this.setupTouch();
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.state.left = true;
            }
            if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.state.right = true;
            }
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                this.state.jump = true;
            }
            if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
                this.state.pauseRequested = true;
            }
            if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
                this.state.restartRequested = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.state.left = false;
            }
            if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.state.right = false;
            }
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                this.state.jump = false;
            }
        });
    }

    setupTouch() {
        const bindTouchBtn = (elementId, action) => {
            const btn = document.getElementById(elementId);
            if (!btn) return;

            const handleStart = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (action === 'pause') {
                    this.state.pauseRequested = true;
                } else if (action === 'restart') {
                    this.state.restartRequested = true;
                } else {
                    this.state[action] = true;
                }
                btn.classList.add('active');
            };

            const handleEnd = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (action !== 'pause' && action !== 'restart') {
                    this.state[action] = false;
                }
                btn.classList.remove('active');
            };

            btn.addEventListener('touchstart', handleStart, { passive: false });
            btn.addEventListener('touchend', handleEnd, { passive: false });
            btn.addEventListener('touchcancel', handleEnd, { passive: false });

            // Mouse fallbacks for PC testing
            btn.addEventListener('mousedown', handleStart);
            btn.addEventListener('mouseup', handleEnd);
            btn.addEventListener('mouseleave', handleEnd);
        };

        // Delay slightly until DOM loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindAllButtons(bindTouchBtn));
        } else {
            this.bindAllButtons(bindTouchBtn);
        }
    }

    bindAllButtons(bindFn) {
        bindFn('btn-left', 'left');
        bindFn('btn-right', 'right');
        bindFn('btn-jump', 'jump');
        bindFn('btn-pause', 'pause');
        bindFn('btn-restart', 'restart');
    }

    consumePause() {
        const p = this.state.pauseRequested;
        this.state.pauseRequested = false;
        return p;
    }

    consumeRestart() {
        const r = this.state.restartRequested;
        this.state.restartRequested = false;
        return r;
    }

    reset() {
        this.state.left = false;
        this.state.right = false;
        this.state.jump = false;
        this.state.pauseRequested = false;
        this.state.restartRequested = false;
    }
}

window.InputManager = InputManager;
