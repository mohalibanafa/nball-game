/**
 * N-Ball Particle System
 * Reproduces the authentic spark particles on jump and impacts using spark.png
 */
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.sparkImg = new Image();
        this.sparkImg.src = 'media/spark.png';
        this.sparkReady = false;
        this.sparkImg.onload = () => {
            this.sparkReady = true;
        };
    }

    emitSparks(x, y, count = 12, color = 'rgba(255, 230, 100, 1)') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 1.5;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                life: 1.0,
                decay: Math.random() * 0.04 + 0.02,
                size: Math.random() * 16 + 8,
                color
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // particle gravity
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx, camera) {
        ctx.save();
        for (const p of this.particles) {
            const screenX = p.x - camera.x;
            const screenY = p.y - camera.y;
            ctx.globalAlpha = Math.max(0, p.life);

            if (this.sparkReady) {
                const s = p.size * p.life;
                ctx.drawImage(this.sparkImg, screenX - s / 2, screenY - s / 2, s, s);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(screenX, screenY, p.size * p.life * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    clear() {
        this.particles = [];
    }
}

window.ParticleSystem = ParticleSystem;
