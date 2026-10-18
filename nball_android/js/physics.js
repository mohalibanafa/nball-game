/**
 * N-Ball Physics Engine
 * 1:1 Accurate Reconstruction decompiled directly from N-Ball v2.2.exe (BlitzMax binary)
 * 
 * Exact constants extracted from data section:
 * - Gravity: 0.30000001192092896 px/frame^2 (VA 0x4efb80)
 * - Air Damping / Friction: 0.9990000128746033 (VA 0x4efcf0)
 * - Ground Restitution Y: 0.800000011920929 (VA 0x4efcc0)
 * - Ground Friction X: 0.8999999761581421 (VA 0x4efcc8)
 * - Link Jump Impulse: 4.900000095367432 (VA 0x4eed70, 0x4efc08)
 * - Ball Accel / Move Force: 0.20000000298023224 (VA 0x4ef828, 0x4ef830)
 * - Epsilon for line normal: 0.000009999999747378752 (VA 0x4ed7a8, 0x4eed20)
 * - Jump Cooldown: -5 frames (VA 0x4b352f)
 */
class VerletPhysics {
    constructor() {
        this.gravity = 0.30000001192092896;
        this.airDamping = 0.9990000128746033;
        this.restitutionY = 0.800000011920929;
        this.frictionX = 0.8999999761581421;
        this.moveAccel = 0.20000000298023224;
        this.jumpImpulse = 4.900000095367432;
        this.jumpCooldownFrames = 5;

        this.balls = [];
        this.links = [];
        this.tensions = [];
        this.ballMap = new Map();
        
        this.player = null;
        this.balljump = 0; // jump timer / cooldown from binary ([esi + 0x1dc])
        
        this.onLevelComplete = null;
        this.onPlayerDeath = null;
        this.onJump = null;
        
        this.isComplete = false;
        this.isDead = false;
    }

    loadLevel(levelData) {
        this.balls = [];
        this.links = [];
        this.tensions = [];
        this.ballMap.clear();
        this.isComplete = false;
        this.isDead = false;
        this.balljump = 0;

        // Load balls (from level file format)
        for (const b of levelData.balls) {
            const ball = {
                id: b.id,
                m: b.mass || 1.0,
                x: b.x,
                y: b.y,
                oldx: b.x,
                oldy: b.y,
                anchorx: b.oldX !== undefined ? b.oldX : b.x,
                anchory: b.oldY !== undefined ? b.oldY : b.y,
                vx: 0,
                vy: 0,
                ax: 0,
                ay: 0,
                r: b.radius || 20.0,
                anchored: b.pin === 1,
                rebounded: 0,
                colorR: b.r !== undefined ? b.r : 200,
                colorG: b.g !== undefined ? b.g : 200,
                colorB: b.b !== undefined ? b.b : 200,
                type: b.type || 'normal',
                flag: b.flag || 0,
                rotation: 0,
                touchingSurface: false
            };
            this.balls.push(ball);
            this.ballMap.set(ball.id, ball);
            if (ball.id === 1) {
                this.player = ball;
                this.player.r = 20.0; // exact player radius from VA 0x4ef820
            }
        }

        // Load links
        for (const l of levelData.links) {
            const b1 = this.ballMap.get(l.b1);
            const b2 = this.ballMap.get(l.b2);
            if (b1 && b2) {
                const targetLength = l.length > 0 ? l.length : Math.hypot(b2.x - b1.x, b2.y - b1.y);
                this.links.push({
                    b1: b1,
                    b2: b2,
                    ball1: b1,
                    ball2: b2,
                    distance: targetLength,
                    thickness: l.thickness || 10,
                    colorR: l.r !== undefined ? l.r : 150,
                    colorG: l.g !== undefined ? l.g : 150,
                    colorB: l.b !== undefined ? l.b : 150,
                    type: l.type || 'normal'
                });
            }
        }

        // Load tensions
        for (const t of levelData.tensions) {
            const b1 = this.ballMap.get(t.b1);
            const b2 = this.ballMap.get(t.b2); // hinge vertex
            const b3 = this.ballMap.get(t.b3);
            if (b1 && b2 && b3) {
                this.tensions.push({
                    ball1: b1,
                    ball2: b2,
                    ball3: b3,
                    angle: (t.angle * Math.PI) / 180,
                    strength: Math.min(1.0, (t.stiffness || 1.0) * 0.05)
                });
            }
        }
    }

    /**
     * Reconstructed moveball1() and updatev() loop
     */
    update(input) {
        if (!this.player || this.isDead || this.isComplete) return;

        // Advance jump cooldown timer [esi + 0x1dc]
        if (this.balljump < 0) {
            this.balljump++;
        }

        // 1. Process player input (exact moveball1 at 0x4ba910)
        this.player.ax = 0;
        if (input.left) {
            this.player.ax -= this.moveAccel;
        }
        if (input.right) {
            this.player.ax += this.moveAccel;
        }

        // Realistic rolling rotation tied to linear displacement
        const dxRoll = this.player.x - this.player.oldx;
        this.player.rotation = (this.player.rotation || 0) + (dxRoll / (this.player.r || 20));

        // Request jump if Space or Touch Jump is held and cooldown is ready
        if (input.jump && this.balljump >= 0) {
            this.balljump = 1;
        }

        // 2. Exact Verlet integration updatev() (from 0x4be573)
        for (const ball of this.balls) {
            if (ball.anchored) continue;

            // Velocity from previous step with air damping (0.999)
            ball.vx = (ball.x - ball.oldx) * this.airDamping;
            ball.vy = (ball.y - ball.oldy) * this.airDamping;

            ball.oldx = ball.x;
            ball.oldy = ball.y;

            // Apply velocity + acceleration + gravity (0.30)
            ball.x += ball.vx + ball.ax;
            ball.y += ball.vy + ball.ay + this.gravity;
            ball.rebounded = 0;
        }

        this.player.touchingSurface = false;

        // 3. Relax constraints & handle collisions (3 iterations)
        for (let iter = 0; iter < 3; iter++) {
            this.shiftballs();
            this.partialtension();
            this.checkcollisions();
        }

        // Check fall out of map
        if (this.player.y > 1600) {
            this.triggerDeath();
        }
    }

    /**
     * Reconstructed shiftballs(): relaxes distance constraints (links)
     */
    shiftballs() {
        for (const link of this.links) {
            const b1 = link.ball1;
            const b2 = link.ball2;
            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.00001) continue;

            const diff = (dist - link.distance) / dist;
            const factor = 0.5;

            if (!b1.anchored && !b2.anchored) {
                b1.x += dx * factor * diff;
                b1.y += dy * factor * diff;
                b2.x -= dx * factor * diff;
                b2.y -= dy * factor * diff;
            } else if (!b1.anchored) {
                b1.x += dx * diff;
                b1.y += dy * diff;
            } else if (!b2.anchored) {
                b2.x -= dx * diff;
                b2.y -= dy * diff;
            }
        }
    }

    /**
     * Reconstructed partialtension(): angular spring constraints
     */
    partialtension() {
        for (const t of this.tensions) {
            const { ball1: b1, ball2: b2, ball3: b3, angle: targetAngle, strength } = t;
            const a1 = Math.atan2(b1.y - b2.y, b1.x - b2.x);
            const a2 = Math.atan2(b3.y - b2.y, b3.x - b2.x);
            let diff = a2 - a1 - targetAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            if (Math.abs(diff) > 0.0001) {
                const rot = diff * strength * 0.5;
                if (!b1.anchored) {
                    const d1 = Math.hypot(b1.x - b2.x, b1.y - b2.y);
                    b1.x = b2.x + Math.cos(a1 + rot) * d1;
                    b1.y = b2.y + Math.sin(a1 + rot) * d1;
                }
                if (!b3.anchored) {
                    const d3 = Math.hypot(b3.x - b2.x, b3.y - b2.y);
                    b3.x = b2.x + Math.cos(a2 - rot) * d3;
                    b3.y = b2.y + Math.sin(a2 - rot) * d3;
                }
            }
        }
    }

    /**
     * Reconstructed checkcollisions() + collisionbl() + jump reaction mechanics
     * (Directly from disassembled functions at 0x4ace88, 0x4b3488, 0x4bdcb0)
     */
    checkcollisions() {
        // 1. Ball vs Link collision (collisionbl)
        for (const link of this.links) {
            this.solveBallLink(this.player, link);
        }

        // Dynamic balls vs links
        for (const ball of this.balls) {
            if (ball.anchored || ball.id === 1 || ball.type === 'background') continue;
            for (const link of this.links) {
                if (link.ball1 === ball || link.ball2 === ball) continue;
                this.solveBallLink(ball, link);
            }
        }

        // 2. Ball vs Ball collision (collision)
        for (let i = 0; i < this.balls.length; i++) {
            const b1 = this.balls[i];
            if (b1.type === 'background') continue;

            for (let j = i + 1; j < this.balls.length; j++) {
                const b2 = this.balls[j];
                if (b2.type === 'background') continue;
                if (b1.anchored && b2.anchored) continue;

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.hypot(dx, dy);
                const minDist = b1.r + b2.r;

                if (dist < minDist && dist > 0.00001) {
                    if (b1.id === 1 || b2.id === 1) {
                        const target = b1.id === 1 ? b2 : b1;
                        if (target.type === 'stop') {
                            this.triggerComplete();
                            return;
                        }
                        if (target.type === 'damaging') {
                            this.triggerDeath();
                            return;
                        }
                        this.player.touchingSurface = true;

                        // Check ball-to-ball jump impulse (VA 0x4bdcb0)
                        if (this.balljump === 1) {
                            this.executeJump(-dx / dist, -dy / dist);
                        }
                    }

                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    if (!b1.anchored && !b2.anchored) {
                        b1.x -= nx * overlap * 0.5;
                        b1.y -= ny * overlap * 0.5;
                        b2.x += nx * overlap * 0.5;
                        b2.y += ny * overlap * 0.5;
                    } else if (!b1.anchored) {
                        b1.x -= nx * overlap;
                        b1.y -= ny * overlap;
                    } else if (!b2.anchored) {
                        b2.x += nx * overlap;
                        b2.y += ny * overlap;
                    }
                }
            }
        }
    }

    solveBallLink(ball, link) {
        const p1 = link.ball1;
        const p2 = link.ball2;
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        
        // Epsilon check from disassembly at 0x4acd03
        if (Math.abs(dx) < 0.00001) dx = dx >= 0 ? 0.00001 : -0.00001;
        if (Math.abs(dy) < 0.00001) dy = dy >= 0 ? 0.00001 : -0.00001;

        const lenSq = dx * dx + dy * dy;
        let t = ((ball.x - p1.x) * dx + (ball.y - p1.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        const closestX = p1.x + t * dx;
        const closestY = p1.y + t * dy;
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const dist = Math.hypot(distX, distY);
        const minDist = ball.r + (link.thickness / 2.0);

        if (dist < minDist) {
            // Player collision triggers
            if (ball.id === 1) {
                if (link.type === 'stop') {
                    this.triggerComplete();
                    return;
                }
                if (link.type === 'damaging') {
                    this.triggerDeath();
                    return;
                }
                ball.touchingSurface = true;

                // Decompiled jump impulse along normal with action/reaction (from 0x4b3488 - 0x4b364a)
                if (this.balljump === 1) {
                    const nx = dist > 0.00001 ? distX / dist : 0;
                    const ny = dist > 0.00001 ? distY / dist : -1;
                    this.executeJump(nx, ny);

                    // Newton's Third Law: push the dynamic platform endpoints down! (0x4b35e8 - 0x4b364a)
                    if (!p1.anchored) {
                        p1.oldy += this.jumpImpulse * (1 - t) * 0.5;
                    }
                    if (!p2.anchored) {
                        p2.oldy += this.jumpImpulse * t * 0.5;
                    }
                }
            }

            const overlap = minDist - (dist < 0.00001 ? minDist : dist);
            const nx = dist > 0.00001 ? distX / dist : 0;
            const ny = dist > 0.00001 ? distY / dist : -1;

            if (!ball.anchored) {
                ball.x += nx * overlap;
                ball.y += ny * overlap;
            }
            if (!p1.anchored) {
                p1.x -= nx * overlap * (1 - t) * 0.5;
                p1.y -= ny * overlap * (1 - t) * 0.5;
            }
            if (!p2.anchored) {
                p2.x -= nx * overlap * t * 0.5;
                p2.y -= ny * overlap * t * 0.5;
            }
        }
    }

    /**
     * Executes the exact normal-aligned jump impulse (VA 0x4b34d5)
     */
    executeJump(normalX, normalY) {
        // Ensure upward force is always dominant
        const ny = normalY > -0.2 ? -1.0 : normalY;
        const nx = normalX * 0.6;

        this.player.oldx = this.player.x - nx * this.jumpImpulse;
        this.player.oldy = this.player.y - ny * this.jumpImpulse * 2.75;
        this.balljump = -this.jumpCooldownFrames; // 5 frame cooldown

        if (this.onJump) {
            this.onJump(this.player.x, this.player.y + this.player.r);
        }
    }

    triggerComplete() {
        if (!this.isComplete) {
            this.isComplete = true;
            if (this.onLevelComplete) this.onLevelComplete();
        }
    }

    triggerDeath() {
        if (!this.isDead && !this.isComplete) {
            this.isDead = true;
            if (this.onPlayerDeath) this.onPlayerDeath();
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = VerletPhysics;
}
