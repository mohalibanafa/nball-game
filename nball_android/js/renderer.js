/**
 * N-Ball Authentic Canvas Renderer
 * Faithfully reproduces the visuals of N-Ball v2.2 (BlitzMax DirectX/OpenGL release)
 * 
 * Authentic features:
 * - Pure deep space background with camera-scrolling retro coordinate grid
 * - Accurate platform drawing using stretched & rotated plat.png
 * - Authentic 3D shaded ball rendering (ball.png) with physics rolling rotation
 * - Authentic ghost echo trail based on TRAIL SIZE
 * - Additive glowing particle sparks using spark.png
 */
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.camera = { x: 0, y: 0 };
        this.trail = [];
        this.trailSize = parseInt(localStorage.getItem('nball_trail_size') || '5');
        this.maxTrail = Math.max(2, this.trailSize * 3);

        // Load visual textures
        this.ballImg = new Image();
        this.ballImg.src = 'media/ball.png';

        this.platImg = new Image();
        this.platImg.src = 'media/plat.png';

        this.sparkImg = new Image();
        this.sparkImg.src = 'media/spark.png';

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    setTrailSize(size) {
        this.trailSize = size;
        this.maxTrail = Math.max(2, size * 3);
        this.trail = [];
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
    }

    updateCamera(target) {
        if (!target) return;
        const targetX = target.x - this.width / 2;
        const targetY = target.y - this.height / 2;
        
        // Smooth camera follow (matching BlitzMax scroll)
        this.camera.x += (targetX - this.camera.x) * 0.12;
        this.camera.y += (targetY - this.camera.y) * 0.12;

        // Update player trail (ghost echoes)
        if (this.trailSize > 0) {
            this.trail.push({ x: target.x, y: target.y, rotation: target.rotation || 0 });
            if (this.trail.length > this.maxTrail) {
                this.trail.shift();
            }
        }
    }

    render(physics, particles) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. Draw Authentic Retro Grid Background (Black space + Cyan coordinate grid)
        ctx.fillStyle = '#06090e';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.save();
        const gridSize = 40;
        const majorGridSize = 200;
        const startX = -((this.camera.x) % gridSize);
        const startY = -((this.camera.y) % gridSize);

        // Minor grid lines
        ctx.strokeStyle = 'rgba(18, 42, 54, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = startX; x < this.width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
        }
        for (let y = startY; y < this.height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
        }
        ctx.stroke();

        // Major grid lines
        const majorStartX = -((this.camera.x) % majorGridSize);
        const majorStartY = -((this.camera.y) % majorGridSize);
        ctx.strokeStyle = 'rgba(28, 70, 88, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = majorStartX; x < this.width; x += majorGridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
        }
        for (let y = majorStartY; y < this.height; y += majorGridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
        }
        ctx.stroke();
        ctx.restore();

        // World-space rendering
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        // 2. Draw Authentic Player Trail (Echo of ball.png fading in velocity)
        if (this.trail.length > 1 && this.trailSize > 0) {
            const playerRadius = physics.player ? (physics.player.r || physics.player.radius || 20) : 20;
            for (let i = 0; i < this.trail.length; i++) {
                const pt = this.trail[i];
                const ratio = (i + 1) / this.trail.length;
                const alpha = ratio * 0.35;
                const r = playerRadius * (0.65 + 0.35 * ratio);

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(pt.x, pt.y);
                ctx.rotate(pt.rotation || 0);

                if (this.ballImg.complete && this.ballImg.naturalWidth > 0) {
                    ctx.drawImage(this.ballImg, -r, -r, r * 2, r * 2);
                } else {
                    ctx.fillStyle = `rgba(110, 220, 220, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // 3. Draw Links (Platforms with plat.png texture)
        for (const link of physics.links) {
            const b1 = link.ball1 || link.b1;
            const b2 = link.ball2 || link.b2;
            if (!b1 || !b2) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const len = Math.hypot(dx, dy);
            if (len < 0.001) continue;
            const angle = Math.atan2(dy, dx);
            const thickness = Math.max(4, link.thickness || 12);

            ctx.save();
            ctx.translate(b1.x, b1.y);
            ctx.rotate(angle);

            if (link.type === 'background') {
                ctx.globalAlpha = 0.35;
            }

            if (link.type === 'stop') {
                // Pulsing Goal Platform
                const pulse = Math.sin(Date.now() * 0.007) * 0.2 + 0.8;
                ctx.shadowColor = '#ff3cb4';
                ctx.shadowBlur = 18;
                ctx.fillStyle = `rgba(255, 60, 180, ${pulse})`;
                ctx.beginPath();
                ctx.roundRect ? ctx.roundRect(0, -thickness / 2, len, thickness, thickness / 2) : ctx.rect(0, -thickness / 2, len, thickness);
                ctx.fill();
            } else if (link.type === 'damaging') {
                // Hazardous Red Spikes / Platform
                ctx.shadowColor = '#ff2020';
                ctx.shadowBlur = 14;
                ctx.fillStyle = 'rgba(255, 35, 35, 0.9)';
                ctx.beginPath();
                ctx.roundRect ? ctx.roundRect(0, -thickness / 2, len, thickness, thickness / 2) : ctx.rect(0, -thickness / 2, len, thickness);
                ctx.fill();
            } else {
                // Standard N-Ball Platform rendered with plat.png texture
                if (this.platImg.complete && this.platImg.naturalWidth > 0) {
                    ctx.drawImage(this.platImg, 0, -thickness / 2, len, thickness);
                } else {
                    // Fallback authentic metallic gradient
                    const grad = ctx.createLinearGradient(0, -thickness / 2, 0, thickness / 2);
                    grad.addColorStop(0, '#ffffff');
                    grad.addColorStop(0.25, '#d4f2f2');
                    grad.addColorStop(0.8, '#3d8282');
                    grad.addColorStop(1, '#1b4a4a');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.roundRect ? ctx.roundRect(0, -thickness / 2, len, thickness, thickness / 2) : ctx.rect(0, -thickness / 2, len, thickness);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        // 4. Draw Balls (Player with ball.png + rotating joints and hazards)
        for (const ball of physics.balls) {
            ctx.save();
            ctx.translate(ball.x, ball.y);
            const r = ball.r || ball.radius || 20;

            if (ball.id === 1) {
                // Player Ball
                ctx.rotate(ball.rotation || 0);
                if (this.ballImg.complete && this.ballImg.naturalWidth > 0) {
                    ctx.drawImage(this.ballImg, -r, -r, r * 2, r * 2);
                } else {
                    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
                    grad.addColorStop(0, '#ffffff');
                    grad.addColorStop(0.35, '#8be2e2');
                    grad.addColorStop(1, '#276868');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Other Objects / Joints
                if (ball.type === 'background') {
                    ctx.globalAlpha = 0.35;
                }

                if (ball.type === 'stop') {
                    // Stop target: glowing orb
                    const pulse = Math.sin(Date.now() * 0.008) * 3;
                    ctx.shadowColor = '#ff3cb4';
                    ctx.shadowBlur = 22;
                    ctx.fillStyle = '#ff3cb4';
                    ctx.beginPath();
                    ctx.arc(0, 0, r + pulse, 0, Math.PI * 2);
                    ctx.fill();
                } else if (ball.type === 'damaging') {
                    // Damaging red hazard
                    ctx.shadowColor = '#ff2020';
                    ctx.shadowBlur = 14;
                    ctx.fillStyle = '#ff2828';
                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.fill();
                } else if (ball.anchored) {
                    // Static Anchor Pin
                    ctx.fillStyle = '#546e7a';
                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner metallic bolt
                    ctx.fillStyle = '#b0bec5';
                    ctx.beginPath();
                    ctx.arc(0, 0, Math.max(3, r * 0.45), 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Dynamic World Joint / Ball
                    if (this.ballImg.complete && this.ballImg.naturalWidth > 0 && (ball.colorR === undefined || (ball.colorR > 180 && ball.colorG > 180 && ball.colorB > 180))) {
                        ctx.drawImage(this.ballImg, -r, -r, r * 2, r * 2);
                    } else {
                        const cr = ball.colorR !== undefined ? ball.colorR : 200;
                        const cg = ball.colorG !== undefined ? ball.colorG : 200;
                        const cb = ball.colorB !== undefined ? ball.colorB : 200;
                        const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
                        grad.addColorStop(0, '#ffffff');
                        grad.addColorStop(0.3, `rgb(${cr}, ${cg}, ${cb})`);
                        grad.addColorStop(1, `rgb(${Math.max(0, cr - 80)}, ${Math.max(0, cg - 80)}, ${Math.max(0, cb - 80)})`);
                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(0, 0, r, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
            ctx.restore();
        }

        // 5. Draw Particle Sparks (Jump & Impact Sparks with Additive Blending)
        if (particles) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            particles.render(ctx, { x: 0, y: 0 }); // already in world coordinates
            ctx.restore();
        }

        ctx.restore();
    }

    clearTrail() {
        this.trail = [];
    }
}

window.Renderer = Renderer;
