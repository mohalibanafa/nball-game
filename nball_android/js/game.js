/**
 * N-Ball Main Game Controller
 * Faithfully matches N-Ball v2.2 (BlitzMax Windows binary)
 * 
 * Exact formulas extracted:
 * - cycles increment per 60Hz tick (VA 0x4b4d78)
 * - Base Level Score: level * 1000 (VA 0x4bc302)
 * - Time Bonus: Floor(((level * 1000) * (7200 - cycles)) / 7200) (VA 0x4bc311 - 0x4bc358)
 * - Total Score: cumulative level scores + bonuses (VA 0x4bc364)
 * - Initial Lives: 2 (from campaign file header)
 * - Authentic 10-slot High Score Table matching scores.txt
 */
class NBallGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.physics = new VerletPhysics();
        this.renderer = new Renderer(this.canvas);
        this.particles = new ParticleSystem();
        this.audio = new AudioManager();
        this.input = new InputManager();

        this.currentCampaign = parseInt(localStorage.getItem('nball_current_camp') || '1');
        this.currentLevel = parseInt(localStorage.getItem('nball_current_lvl') || '1');
        this.selectedCampaignTab = 1;
        this.totalScore = parseInt(localStorage.getItem('nball_total_score') || '0');
        this.lives = 2; // Default starting lives
        this.cycles = 0; // 60Hz frame counter from binary
        
        this.state = 'TITLE'; // TITLE, PLAYING, PAUSED, LEVEL_COMPLETE, GAMEOVER
        this.levelScore = 0;
        this.timeBonus = 0;

        this.loadHighScores();
        this.setupCallbacks();
        this.setupUI();
        this.startLoop();
    }

    loadHighScores() {
        const stored = localStorage.getItem('nball_highscores');
        if (stored) {
            try {
                this.highScores = JSON.parse(stored);
            } catch (e) {
                this.highScores = this.getDefaultHighScores();
            }
        } else {
            this.highScores = this.getDefaultHighScores();
        }
    }

    getDefaultHighScores() {
        const list = [];
        for (let i = 0; i < 10; i++) {
            list.push({ name: 'NOBODY', score: 0 });
        }
        return list;
    }

    saveHighScores() {
        localStorage.setItem('nball_highscores', JSON.stringify(this.highScores));
    }

    addHighScore(name, score) {
        if (!name || name.trim() === '') name = 'PLAYER';
        this.highScores.push({ name: name.trim().toUpperCase(), score });
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 10);
        this.saveHighScores();
    }

    setupCallbacks() {
        this.physics.onJump = (x, y) => {
            this.audio.playJump();
            this.particles.emitSparks(x, y, 14, '#ffffff');
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(15); } catch (e) {}
            }
        };

        this.physics.onLevelComplete = () => {
            this.handleLevelComplete();
        };

        this.physics.onPlayerDeath = () => {
            this.handlePlayerDeath();
        };
    }

    setupUI() {
        // Title Screen Actions
        document.getElementById('btn-start-game').onclick = () => {
            this.audio.unlock();
            this.lives = 2;
            this.startLevel(this.currentCampaign, this.currentLevel);
        };

        document.getElementById('btn-select-level').onclick = () => {
            this.showScreen('screen-level-select');
            this.renderLevelSelectGrid(this.selectedCampaignTab);
        };

        document.getElementById('btn-instructions').onclick = () => {
            this.showScreen('screen-instructions');
        };

        document.getElementById('btn-options').onclick = () => {
            this.showScreen('screen-options');
        };

        document.getElementById('btn-highscores').onclick = () => {
            this.showScreen('screen-highscores');
            this.renderHighScoresTable();
        };

        document.getElementById('btn-about').onclick = () => {
            this.showScreen('screen-about');
        };

        // Back Buttons
        document.getElementById('btn-back-from-levels').onclick = () => this.showScreen('screen-title');
        document.getElementById('btn-back-from-inst').onclick = () => this.showScreen('screen-title');
        document.getElementById('btn-back-from-options').onclick = () => this.showScreen('screen-title');
        document.getElementById('btn-back-from-scores').onclick = () => this.showScreen('screen-title');
        document.getElementById('btn-back-from-about').onclick = () => this.showScreen('screen-title');

        // Reset Scores
        document.getElementById('btn-reset-scores').onclick = () => {
            if (confirm('Reset high scores to default?')) {
                this.highScores = this.getDefaultHighScores();
                this.saveHighScores();
                this.renderHighScoresTable();
            }
        };

        // Campaign selection tabs
        document.querySelectorAll('.camp-tab').forEach(tab => {
            tab.onclick = (e) => {
                document.querySelectorAll('.camp-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const camp = parseInt(tab.getAttribute('data-camp'));
                this.selectedCampaignTab = camp;
                this.renderLevelSelectGrid(camp);
            };
        });

        // Pause Menu Buttons
        document.getElementById('btn-resume').onclick = () => this.resumeGame();
        document.getElementById('btn-pause-restart').onclick = () => {
            this.hideAllOverlays();
            this.startLevel(this.currentCampaign, this.currentLevel);
        };
        document.getElementById('btn-pause-quit').onclick = () => {
            this.hideAllOverlays();
            this.showScreen('screen-title');
            this.state = 'TITLE';
            this.audio.pauseMusic();
        };

        // Level Complete Button
        document.getElementById('btn-next-level').onclick = () => this.advanceToNextLevel();

        // Game Over Buttons
        document.getElementById('btn-save-score').onclick = () => {
            const nameInput = document.getElementById('input-player-name');
            const name = nameInput ? nameInput.value : 'PLAYER';
            this.addHighScore(name, this.totalScore);
            this.totalScore = 0;
            localStorage.setItem('nball_total_score', '0');
            this.lives = 2;
            this.startLevel(this.currentCampaign, this.currentLevel);
        };

        document.getElementById('btn-gameover-quit').onclick = () => {
            this.hideAllOverlays();
            this.showScreen('screen-title');
            this.state = 'TITLE';
            this.audio.pauseMusic();
        };

        // HUD Quick Actions
        const btnRestart = document.getElementById('btn-restart');
        if (btnRestart) {
            btnRestart.onclick = () => {
                if (this.state === 'PLAYING' || this.state === 'PAUSED') {
                    this.startLevel(this.currentCampaign, this.currentLevel);
                }
            };
        }

        const btnPause = document.getElementById('btn-pause');
        if (btnPause) {
            btnPause.onclick = () => {
                if (this.state === 'PLAYING') this.pauseGame();
                else if (this.state === 'PAUSED') this.resumeGame();
            };
        }

        // Options Sliders
        const trailSlider = document.getElementById('slider-trail');
        const trailVal = document.getElementById('label-trail-val');
        if (trailSlider && trailVal) {
            trailSlider.value = this.renderer.trailSize;
            trailVal.textContent = this.renderer.trailSize;
            trailSlider.oninput = (e) => {
                const val = parseInt(e.target.value);
                trailVal.textContent = val;
                this.renderer.setTrailSize(val);
                localStorage.setItem('nball_trail_size', val.toString());
            };
        }

        const sfxSlider = document.getElementById('slider-sfx');
        const sfxVal = document.getElementById('label-sfx-val');
        if (sfxSlider && sfxVal) {
            sfxSlider.value = this.audio.sfxVolume * 100;
            sfxVal.textContent = `${Math.round(this.audio.sfxVolume * 100)}%`;
            sfxSlider.oninput = (e) => {
                const val = e.target.value;
                sfxVal.textContent = `${val}%`;
                this.audio.setSfxVolume(val / 100);
            };
        }

        const musicSlider = document.getElementById('slider-music');
        const musicVal = document.getElementById('label-music-val');
        if (musicSlider && musicVal) {
            musicSlider.value = this.audio.musicVolume * 100;
            musicVal.textContent = `${Math.round(this.audio.musicVolume * 100)}%`;
            musicSlider.oninput = (e) => {
                const val = e.target.value;
                musicVal.textContent = `${val}%`;
                this.audio.setMusicVolume(val / 100);
            };
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.ui-screen').forEach(el => el.classList.remove('active'));
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
    }

    hideAllOverlays() {
        document.querySelectorAll('.ui-screen').forEach(el => el.classList.remove('active'));
    }

    renderLevelSelectGrid(campaignNum) {
        const container = document.getElementById('level-grid-container');
        if (!container) return;
        container.innerHTML = '';

        const levels = window.NBALL_LEVELS;
        for (let l = 1; l <= 10; l++) {
            const btn = document.createElement('button');
            btn.className = 'level-box';
            btn.textContent = `LEVEL ${l}`;
            
            const hasData = levels && levels[campaignNum] && levels[campaignNum][l];
            if (!hasData) {
                btn.classList.add('locked');
            } else {
                btn.onclick = () => {
                    this.currentCampaign = campaignNum;
                    this.currentLevel = l;
                    this.lives = 2;
                    this.startLevel(campaignNum, l);
                };
            }
            container.appendChild(btn);
        }
    }

    renderHighScoresTable() {
        const tbody = document.getElementById('scores-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        this.highScores.forEach((entry, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${entry.name}</td>
                <td>${entry.score.toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    updateHudLives() {
        const hudLives = document.getElementById('hud-lives');
        if (!hudLives) return;
        let dots = '';
        for (let i = 0; i < this.lives; i++) {
            dots += '<span class="life-dot">●</span>';
        }
        hudLives.innerHTML = `LIVES: ${dots || 'NONE'}`;
    }

    startLevel(campaign, level) {
        this.hideAllOverlays();
        this.currentCampaign = campaign;
        this.currentLevel = level;
        localStorage.setItem('nball_current_camp', campaign.toString());
        localStorage.setItem('nball_current_lvl', level.toString());

        const levels = window.NBALL_LEVELS;
        if (!levels || !levels[campaign] || !levels[campaign][level]) {
            alert(`Level data not found for Campaign ${campaign} Level ${level}`);
            return;
        }

        const levelData = levels[campaign][level];
        this.physics.loadLevel(levelData);
        this.renderer.clearTrail();
        this.particles.clear();
        this.input.reset();

        this.cycles = 0; // reset 60Hz frame counter
        this.state = 'PLAYING';

        this.audio.unlock();
        this.audio.playMusic();

        // Update HUD
        document.getElementById('hud-campaign-level').textContent = `CAMPAIGN ${campaign} - LEVEL ${level}`;
        this.updateHudLives();
        document.getElementById('hud-score').textContent = `SCORE: ${this.totalScore}`;
        document.getElementById('hud-time').textContent = `TIME: 0.0s`;
        document.getElementById('hud').style.display = 'flex';
        document.getElementById('touch-controls').style.display = 'block';
    }

    /**
     * Exact decompiled passedlevel() routine (VA 0x4bc2e7 - 0x4bc358)
     */
    handleLevelComplete() {
        this.state = 'LEVEL_COMPLETE';

        const baseScore = this.currentLevel * 1000;
        this.timeBonus = Math.max(0, Math.floor((baseScore * (7200 - this.cycles)) / 7200));
        this.levelScore = baseScore + this.timeBonus;
        this.totalScore += this.levelScore;
        localStorage.setItem('nball_total_score', this.totalScore.toString());

        document.getElementById('lc-level-name').textContent = `CAMPAIGN ${this.currentCampaign} - LEVEL ${this.currentLevel}`;
        document.getElementById('lc-base-score').textContent = baseScore.toLocaleString();
        document.getElementById('lc-time-bonus').textContent = this.timeBonus.toLocaleString();
        document.getElementById('lc-level-score').textContent = this.levelScore.toLocaleString();
        document.getElementById('lc-total-score').textContent = this.totalScore.toLocaleString();

        this.showScreen('screen-level-complete');
    }

    /**
     * Exact decompiled died() routine with lives decrement
     */
    handlePlayerDeath() {
        this.state = 'GAMEOVER';
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate([40, 30, 40]); } catch (e) {}
        }
        if (this.physics.player) {
            this.particles.emitSparks(this.physics.player.x, this.physics.player.y, 40, '#ff3333');
        }

        this.lives--;
        this.updateHudLives();

        setTimeout(() => {
            if (this.lives > 0) {
                // Still have lives, restart current level
                this.startLevel(this.currentCampaign, this.currentLevel);
            } else {
                // Game Over
                document.getElementById('go-final-score').textContent = this.totalScore.toLocaleString();
                this.showScreen('screen-gameover');
            }
        }, 700);
    }

    advanceToNextLevel() {
        if (this.currentLevel < 10) {
            this.currentLevel++;
        } else if (this.currentCampaign < 4) {
            this.currentCampaign++;
            this.currentLevel = 1;
        } else {
            alert('CONGRATULATIONS! You completed all 40 levels of N-Ball!');
            this.currentCampaign = 1;
            this.currentLevel = 1;
        }
        this.startLevel(this.currentCampaign, this.currentLevel);
    }

    pauseGame() {
        if (this.state !== 'PLAYING') return;
        this.state = 'PAUSED';
        this.showScreen('screen-pause');
    }

    resumeGame() {
        if (this.state !== 'PAUSED') return;
        this.hideAllOverlays();
        this.state = 'PLAYING';
    }

    startLoop() {
        let lastTime = performance.now();
        const timestep = 1000 / 60; // 60Hz deterministic tick
        let accumulator = 0;

        const loop = (currentTime) => {
            const dt = Math.min(100, currentTime - lastTime);
            lastTime = currentTime;
            accumulator += dt;

            // Handle pause & restart triggers
            if (this.input.consumePause()) {
                if (this.state === 'PLAYING') this.pauseGame();
                else if (this.state === 'PAUSED') this.resumeGame();
            }
            if (this.input.consumeRestart() && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
                this.startLevel(this.currentCampaign, this.currentLevel);
            }

            // Fixed 60Hz physics steps
            while (accumulator >= timestep) {
                if (this.state === 'PLAYING') {
                    this.cycles++;
                    const elapsedSeconds = this.cycles / 60;
                    const hudTime = document.getElementById('hud-time');
                    const hudScore = document.getElementById('hud-score');
                    if (hudTime) hudTime.textContent = `TIME: ${elapsedSeconds.toFixed(1)}s`;
                    if (hudScore) hudScore.textContent = `SCORE: ${this.totalScore}`;

                    this.physics.update(this.input.state);
                    this.particles.update();
                    this.renderer.updateCamera(this.physics.player);
                }
                accumulator -= timestep;
            }

            this.renderer.render(this.physics, this.particles);
            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new NBallGame();
    if (window.location.search.includes('autoplay=1')) {
        setTimeout(() => {
            const btn = document.getElementById('btn-start-game');
            if (btn) btn.click();
        }, 150);
    }
    if (window.location.search.includes('test_move=1')) {
        setTimeout(() => {
            const btn = document.getElementById('btn-start-game');
            if (btn) btn.click();
            setTimeout(() => {
                window.game.input.state.right = true;
                setTimeout(() => {
                    window.game.input.state.jump = true;
                }, 400);
            }, 200);
        }, 150);
    }
    if (window.location.search.includes('screen=about')) {
        setTimeout(() => {
            const btn = document.getElementById('btn-about');
            if (btn) btn.click();
        }, 150);
    }
    if (window.location.search.includes('screen=scores')) {
        setTimeout(() => {
            const btn = document.getElementById('btn-highscores');
            if (btn) btn.click();
        }, 150);
    }
});
