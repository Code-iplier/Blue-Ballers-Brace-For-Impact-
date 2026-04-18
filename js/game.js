

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'menu';
let gameTime = 0;
let finishPopupShown = false;
let lastTime = 0;
let playerCollisionCount = 0;
let crashPopupShown = false;

function startGame() {
    // Play music FIRST — must happen immediately in the user gesture callstack
    // before heavy computation exhausts the browser's autoplay allowance
    if (!window.bgMusicElement) {
        window.bgMusicElement = new Audio('sounds/bgmusic.mp3');
        window.bgMusicElement.loop = true;
        window.bgMusicElement.volume = 0.05;
    }
    window.bgMusicElement.currentTime = 0;
    window.bgMusicElement.play().then(() => {
        isMusicPlaying = true;
    }).catch(() => {
        // Fallback to generated music
        initAudio();
        createGeneratedMusic();
        isMusicPlaying = true;
    });

    if (trackPoints.length === 0) generateTrack();
    if (obstacles.length === 0) generateObstacles();
    grassObjects = [];
    generateGrassObjects();
    if (cars.length === 0) initGame();
    finishPopupShown = false;
    crashPopupShown = false;
    playerCollisionCount = 0;
    gameState = 'playing';
    gameTime = 0;
    lastTime = performance.now();
    showMenu(null);
    document.getElementById('hud').classList.remove('hidden');
    updateHUD();
}

// Audio system
let audioCtx = null;
let isMusicPlaying = false;
let musicOscillators = [];
let beatInterval = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function loadBackgroundMusic() {
    initAudio();

    const audio = new Audio();
    audio.src = 'sounds/bgmusic.mp3';
    audio.loop = true;
    audio.volume = 0.05;

    audio.addEventListener('error', () => {
        console.log('Music file not found, using generated fallback');
    });

    window.bgMusicElement = audio;
}

function playCollisionSound() {
    const collisionSounds = [
        'sounds/collision1.mp3',
        'sounds/collision2.mp3',
        'sounds/collision3.mp3',
        'sounds/collision4.mp3'
    ];

    const randomSound = collisionSounds[Math.floor(Math.random() * collisionSounds.length)];

    const audio = new Audio(randomSound);
    audio.volume = 0.5;

    audio.play().catch(() => {
        // Fallback: create a crash sound
        if (!audioCtx) initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    });
}

let honkCooldown = false;
function playHonk() {
    if (honkCooldown) return;
    honkCooldown = true;
    const audio = new Audio('sounds/honk.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => { });
    setTimeout(() => { honkCooldown = false; }, 800);
}

function createGeneratedMusic() {
    if (!audioCtx) return;

    musicOscillators = [];
    const frequencies = [110, 146.83, 164.81, 196];

    const bassOsc = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bassOsc.type = 'square';
    bassOsc.frequency.value = 55;
    bassGain.gain.value = 0.15;
    bassOsc.connect(bassGain);
    bassGain.connect(audioCtx.destination);
    bassOsc.start();
    musicOscillators.push({ osc: bassOsc, gain: bassGain });

    const melodyOsc = audioCtx.createOscillator();
    const melodyGain = audioCtx.createGain();
    melodyOsc.type = 'sine';
    melodyOsc.frequency.value = 220;
    melodyGain.gain.value = 0.1;
    melodyOsc.connect(melodyGain);
    melodyGain.connect(audioCtx.destination);
    melodyOsc.start();
    musicOscillators.push({ osc: melodyOsc, gain: melodyGain });

    let beatCount = 0;
    beatInterval = setInterval(() => {
        if (!isMusicPlaying || gameState !== 'playing') {
            clearInterval(beatInterval);
            return;
        }

        if (beatCount % 2 === 0) {
            const kickOsc = audioCtx.createOscillator();
            const kickGain = audioCtx.createGain();
            kickOsc.type = 'sine';
            kickOsc.frequency.value = 150;
            kickGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            kickGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            kickOsc.connect(kickGain);
            kickGain.connect(audioCtx.destination);
            kickOsc.start();
            kickOsc.stop(audioCtx.currentTime + 0.1);
        }

        melodyOsc.frequency.value = frequencies[beatCount % 4];
        beatCount++;
    }, 500);
}

function playBackgroundMusic() {
    initAudio();
    if (!window.bgMusicElement) loadBackgroundMusic();
    const audio = window.bgMusicElement;

    if (audio) {
        audio.play().then(() => {
            isMusicPlaying = true;
        }).catch(() => {
            createGeneratedMusic();
            isMusicPlaying = true;
        });
    } else {
        createGeneratedMusic();
        isMusicPlaying = true;
    }
}

function stopBackgroundMusic() {
    const audio = window.bgMusicElement;
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    if (beatInterval) {
        clearInterval(beatInterval);
        beatInterval = null;
    }

    for (const item of musicOscillators) {
        try { item.osc.stop(); } catch (e) { }
    }
    musicOscillators = [];

    isMusicPlaying = false;
}

function stopBackgroundMusic() {
    if (bgMusicSource && isMusicPlaying) {
        bgMusicSource.stop();
        bgMusicSource = null;
    }

    // Stop generated oscillators
    for (const item of musicOscillators) {
        item.osc.stop();
    }
    musicOscillators = [];

    isMusicPlaying = false;
}

function toggleMusic(play) {
    initAudio();
    if (play && !isMusicPlaying) {
        playBackgroundMusic();
    } else if (!play && isMusicPlaying) {
        stopBackgroundMusic();
    }
}

const COLORS = {
    player: '#e63946',
    aiCars: ['#457b9d', '#2a9d8f', '#e9c46a', '#f4a261', '#9b5de5']
};

let trackPoints = [];
let trackWidth = 120;
let obstacles = [];
let cars = [];
let camera = { x: 0, y: 0 };

const keys = { w: false, a: false, s: false, d: false, h: false };

function generateTrack() {
    trackPoints = [];
    const startX = 200, startY = 1500;
    trackPoints.push({ x: startX, y: startY });
    trackPoints.push({ x: startX + 400, y: startY });
    trackPoints.push({ x: startX + 600, y: startY - 200 });
    trackPoints.push({ x: startX + 800, y: startY - 400 });
    trackPoints.push({ x: startX + 600, y: startY - 600 });
    trackPoints.push({ x: startX + 400, y: startY - 800 });
    trackPoints.push({ x: startX + 200, y: startY - 1000 });
    trackPoints.push({ x: startX - 200, y: startY - 1000 });
    trackPoints.push({ x: startX - 500, y: startY - 800 });
    trackPoints.push({ x: startX - 700, y: startY - 600 });
    trackPoints.push({ x: startX - 900, y: startY - 400 });
    trackPoints.push({ x: startX - 700, y: startY - 200 });
    trackPoints.push({ x: startX - 500, y: startY });
    trackPoints.push({ x: startX - 300, y: startY + 200 });
    trackPoints.push({ x: startX - 100, y: startY + 400 });
    trackPoints.push({ x: startX + 100, y: startY + 600 });
    trackPoints.push({ x: startX + 300, y: startY + 800 });
    trackPoints.push({ x: startX + 600, y: startY + 800 });
    trackPoints.push({ x: startX + 900, y: startY + 600 });
    trackPoints.push({ x: startX + 1200, y: startY + 400 });
    trackPoints.push({ x: startX + 1500, y: startY + 200 });
    trackPoints.push({ x: startX + 1800, y: startY - 100 });
    trackPoints.push({ x: startX + 2000, y: startY - 400 });
    trackPoints.push({ x: startX + 2200, y: startY - 600 });
    trackPoints.push({ x: startX + 2400, y: startY - 800 });
    trackPoints.push({ x: startX + 2500, y: startY - 1000 });
    trackPoints.push({ x: startX + 2600, y: startY - 1200 });
    trackPoints.push({ x: startX + 2800, y: startY - 1200 });
}

function generateObstacles() {
    obstacles = [];
    const trackLength = trackPoints.length;
    const spacing = 2;

    for (let i = 5; i < trackLength - 5; i += spacing) {
        if (Math.random() < 1.0) {
            const p1 = trackPoints[i], p2 = trackPoints[i + 1];
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

            // Create 3 obstacles per group evenly spaced
            const numObstacles = 3;

            for (let o = 0; o < numObstacles; o++) {
                const offsetDir = Math.random() < 0.5 ? -1 : 1;
                const offsetDist = Math.random() * 30 + 15;
                const offset = offsetDir * offsetDist;

                const types = ['barrel', 'cone', 'barrier', 'tire', 'oil', 'crate', 'pallet', 'rock', 'sandbag', 'wreckage'];
                const type = types[Math.floor(Math.random() * types.length)];
                const radius = type === 'barrel' ? 18 : type === 'barrier' ? 22 : type === 'tire' ? 16 : type === 'oil' ? 20 : type === 'crate' ? 24 : type === 'rock' ? 15 : type === 'sandbag' ? 20 : 22;

                obstacles.push({
                    x: p1.x + Math.cos(angle + Math.PI / 2) * offset,
                    y: p1.y + Math.sin(angle + Math.PI / 2) * offset,
                    type: type,
                    radius: radius
                });
            }
        }
    }
}

function Car(x, y, angle, color, isPlayer, aiIndex) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.maxSpeed = isPlayer ? 280 : 220 + (aiIndex || 0) * 10;
    this.acceleration = isPlayer ? 400 : 180;
    this.turnSpeed = 3.5;
    this.color = color;
    this.isPlayer = isPlayer;
    this.width = 30;
    this.height = 18;
    this.currentWaypoint = 0;
    this.finished = false;
    this.finishTime = 0;
    this.spinning = false;
    this.spinAngle = 0;
}

Car.prototype.update = function (dt) {
    if (this.spinning) {
        this.spinAngle += 15 * dt;
        this.speed *= 0.95;
        if (this.speed < 10) { this.spinning = false; this.spinAngle = 0; }
        return;
    }

    // Check if on track - slow down significantly on grass
    if (!isOnTrack(this)) {
        this.speed *= 0.92; // Significant slowdown on grass
    }

    if (this.isPlayer) {
        if (keys.w) this.speed += this.acceleration * dt;
        if (keys.s) this.speed -= this.acceleration * 1.5 * dt;
        if (keys.a && Math.abs(this.speed) > 20) this.angle -= this.turnSpeed * dt * Math.min(1, this.speed / 150);
        if (keys.d && Math.abs(this.speed) > 20) this.angle += this.turnSpeed * dt * Math.min(1, this.speed / 150);
        if (this.currentWaypoint < trackPoints.length) {
            const target = trackPoints[this.currentWaypoint];
            const dist = Math.sqrt((target.x - this.x) ** 2 + (target.y - this.y) ** 2);
            if (dist < 80) this.currentWaypoint++;
        }
    } else {
        this.updateAI(dt);
    }
    this.speed = Math.max(-50, Math.min(this.maxSpeed, this.speed));
    this.speed *= this.speed > 0 ? 0.99 : 1;
    if (!keys.w && !keys.s && this.isPlayer) this.speed *= 0.98;
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
};

Car.prototype.updateAI = function (dt) {
    if (this.currentWaypoint >= trackPoints.length) { this.finished = true; return; }
    const target = trackPoints[this.currentWaypoint];
    const dx = target.x - this.x, dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 80) this.currentWaypoint++;
    if (this.currentWaypoint < trackPoints.length) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (Math.abs(angleDiff) > 0.1) this.angle += Math.sign(angleDiff) * this.turnSpeed * 0.8 * dt;
        this.speed += this.acceleration * dt;
    }
};

Car.prototype.draw = function (ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + (this.spinning ? this.spinAngle : 0));
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(this.width / 2 - 8, -this.height / 2 + 3, 5, 4);
    ctx.fillRect(this.width / 2 - 8, this.height / 2 - 7, 5, 4);
    ctx.fillRect(-this.width / 2 + 2, -this.height / 2 + 2, 6, 4);
    ctx.fillRect(-this.width / 2 + 2, this.height / 2 - 6, 6, 4);
    ctx.restore();
};

function initGame() {
    camera = { x: trackPoints[0].x - 400, y: trackPoints[0].y - 300 };
    cars = [];
    const startX = trackPoints[0].x + 50;
    const startY = trackPoints[0].y;

    // Starting grid positions (inside track)
    const positions = [
        { x: 0, y: 0 },      // Player
        { x: -60, y: 30 },   // AI 1
        { x: -120, y: -30 }, // AI 2
        { x: -180, y: 30 }, // AI 3
        { x: -240, y: -30 },// AI 4
        { x: -300, y: 30 }  // AI 5
    ];

    for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        if (i === 0) {
            cars.push(new Car(startX + pos.x, startY + pos.y, 0, COLORS.player, true, 0));
        } else {
            cars.push(new Car(startX + pos.x, startY + pos.y, 0, COLORS.aiCars[i - 1], false, i - 1));
        }
    }
    gameTime = 0;
    finishPopupShown = false;
}

function checkCollisions() {
    for (let i = 0; i < cars.length; i++) {
        for (let j = i + 1; j < cars.length; j++) {
            const c1 = cars[i], c2 = cars[j];
            const dx = c2.x - c1.x, dy = c2.y - c1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 20) {
                const angle = Math.atan2(dy, dx);
                const push = (20 - dist) / 2;
                c1.x -= Math.cos(angle) * push;
                c1.y -= Math.sin(angle) * push;
                c2.x += Math.cos(angle) * push;
                c2.y += Math.sin(angle) * push;
                c1.speed *= 0.7;
                c2.speed *= 0.7;

                // Play collision sound for cars
                const speedDiff = Math.abs(c1.speed - c2.speed);
                if (speedDiff > 50) {
                    if (c1.isPlayer || c2.isPlayer) {
                        playCollisionSound();
                        playerCollisionCount++;
                        if (playerCollisionCount >= 5 && !crashPopupShown) showCrashPopup();
                    }
                }
            }
        }
    }
    for (let car of cars) {
        if (car.spinning) continue;
        for (let obs of obstacles) {
            const dx = car.x - obs.x, dy = car.y - obs.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < obs.radius + 20) {
                if (obs.type === 'barrel' || obs.type === 'tire' || obs.type === 'crate' || obs.type === 'pallet' || obs.type === 'wreckage') {
                    car.spinning = true;
                    if (car.isPlayer) {
                        playCollisionSound();
                        playerCollisionCount++;
                        if (playerCollisionCount >= 5 && !crashPopupShown) showCrashPopup();
                    }
                } else if (obs.type === 'barrier' || obs.type === 'rock') {
                    car.speed *= 0.3;
                    if (car.isPlayer) {
                        playCollisionSound();
                        playerCollisionCount++;
                        if (playerCollisionCount >= 5 && !crashPopupShown) showCrashPopup();
                    }
                } else if (obs.type === 'oil') {
                    car.speed *= 0.5;
                    if (car.isPlayer) {
                        playCollisionSound();
                        playerCollisionCount++;
                        if (playerCollisionCount >= 5 && !crashPopupShown) showCrashPopup();
                    }
                } else if (obs.type === 'sandbag') {
                    car.speed *= 0.6;
                    if (car.isPlayer) {
                        playCollisionSound();
                        playerCollisionCount++;
                        if (playerCollisionCount >= 5 && !crashPopupShown) showCrashPopup();
                    }
                } else {
                    car.speed *= 0.7;
                    if (car.isPlayer) {
                        playCollisionSound();
                        playerCollisionCount++;
                        if (playerCollisionCount >= 5 && !crashPopupShown) showCrashPopup();
                    }
                }
                car.x += (dx / dist) * 5;
                car.y += (dy / dist) * 5;
            }
        }
    }
}

function checkFinish() {
    if (!cars.length || !cars[0]) return;
    const player = cars[0];
    if (player.finished) return;
    if (trackPoints.length < 2) return;
    const endPt = trackPoints[trackPoints.length - 1];
    const distToFinish = Math.sqrt((player.x - endPt.x) ** 2 + (player.y - endPt.y) ** 2);
    if (distToFinish < 40) {
        player.finished = true;
        player.finishTime = gameTime;
        const position = 1;
        showFinishPopup(position, player.finishTime);
    }
}

function showFinishPopup(position, time) {
    if (finishPopupShown) return;
    finishPopupShown = true;
    gameState = 'finished';
    const posEl = document.getElementById('finishPosition');
    const timeEl = document.getElementById('finishTime');
    if (position === 1) { posEl.textContent = '1st PLACE!'; posEl.style.color = '#00f5d4'; }
    else if (position === 2) { posEl.textContent = '2nd PLACE!'; posEl.style.color = '#fee440'; }
    else if (position === 3) { posEl.textContent = '3rd PLACE!'; posEl.style.color = '#f4a261'; }
    else { posEl.textContent = position + 'th PLACE'; posEl.style.color = '#ffffff'; }
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    timeEl.textContent = 'Time: ' + mins + ':' + secs.toString().padStart(2, '0') + '.' + ms.toString().padStart(2, '0');
    const rewardBtn = document.getElementById('rewardBtn');
    if (position === 1) {
        rewardBtn.classList.remove('hidden');
        rewardBtn.style.display = 'block';
    } else {
        rewardBtn.classList.add('hidden');
        rewardBtn.style.display = 'none';
    }
    document.getElementById('finishPopup').classList.remove('hidden');
}

function showCrashPopup() {
    if (crashPopupShown) return;
    crashPopupShown = true;
    gameState = 'crashed';
    const popup = document.getElementById('crashPopup');
    if (popup) {
        popup.classList.remove('hidden');
        const crashAudio = new Audio('sounds/crashpopup.mp3');
        crashAudio.volume = 0.5;
        crashAudio.play().catch(() => { });
    }
}

function restartAfterCrash() {
    crashPopupShown = false;
    playerCollisionCount = 0;
    const popup = document.getElementById('crashPopup');
    if (popup) popup.classList.add('hidden');
    startGame();
}

function updateCamera() {
    if (!cars.length || !cars[0]) return;
    camera.x += (cars[0].x - canvas.width / 2 - camera.x) * 0.1;
    camera.y += (cars[0].y - canvas.height / 2 - camera.y) * 0.1;
}

function getCarProgress(car) {
    if (car.currentWaypoint >= trackPoints.length - 1) {
        const end = trackPoints[trackPoints.length - 1];
        return trackPoints.length * 1000 - Math.sqrt((car.x - end.x) ** 2 + (car.y - end.y) ** 2);
    }
    let totalDist = 0;
    for (let i = 0; i < car.currentWaypoint; i++) {
        totalDist += Math.sqrt((trackPoints[i + 1].x - trackPoints[i].x) ** 2 + (trackPoints[i + 1].y - trackPoints[i].y) ** 2);
    }
    if (car.currentWaypoint > 0) {
        const curr = trackPoints[car.currentWaypoint];
        totalDist += Math.sqrt((car.x - curr.x) ** 2 + (car.y - curr.y) ** 2);
    }
    return totalDist;
}

function updateHUD() {
    if (!cars || cars.length === 0) return;
    if (gameState !== 'playing' && gameState !== 'finished') return;

    const player = cars[0];
    const playerProgress = getCarProgress(player);

    let position = 1;
    for (let i = 1; i < cars.length; i++) {
        if (getCarProgress(cars[i]) > playerProgress) {
            position++;
        }
    }

    const speed = Math.max(0, Math.round(player.speed / 10));
    const mins = Math.floor(gameTime / 60);
    const secs = Math.floor(gameTime % 60);
    const ms = Math.floor((gameTime % 1) * 100);

    document.getElementById('positionHud').innerText = 'POS: ' + position + '/6';
    document.getElementById('speedHud').innerText = speed + ' MPH';
    document.getElementById('timerHud').innerText = mins + ':' + secs.toString().padStart(2, '0') + '.' + ms.toString().padStart(2, '0');
}

function isOnTrack(car) {
    for (let i = 0; i < trackPoints.length - 1; i++) {
        const p1 = trackPoints[i];
        const p2 = trackPoints[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const t = Math.max(0, Math.min(1, ((car.x - p1.x) * dx + (car.y - p1.y) * dy) / (dx * dx + dy * dy)));
        const nearX = p1.x + t * dx;
        const nearY = p1.y + t * dy;
        const dist = Math.sqrt((car.x - nearX) ** 2 + (car.y - nearY) ** 2);
        if (dist < trackWidth / 2 + 15) return true;
    }
    return false;
}

function drawTree(x, y) {
    ctx.fillStyle = '#4a2c0a';
    ctx.fillRect(x - 5, y, 10, 20);
    ctx.fillStyle = '#228b22';
    ctx.beginPath();
    ctx.arc(x, y - 5, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 10, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 10, y, 10, 0, Math.PI * 2);
    ctx.fill();
}

function drawRock(x, y) {
    ctx.fillStyle = '#696969';
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.ellipse(x - 5, y - 5, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawBush(x, y) {
    ctx.fillStyle = '#1e5631';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 10, y + 5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 10, y + 5, 10, 0, Math.PI * 2);
    ctx.fill();
}

let grassObjects = [];
let customGrassObjects = [];

function addCustomGrassObject(x, y, type) {
    customGrassObjects.push({ x, y, type: type });
}

function generateGrassObjects() {
    grassObjects = [];
    console.log('generateGrassObjects called. trackPoints:', trackPoints.length, 'trackWidth:', trackWidth);

    const memeTypes = ['meme1', 'meme2', 'meme3', 'meme4'];
    const memeCount = 12;

    for (let m = 0; m < memeTypes.length; m++) {
        for (let i = 0; i < memeCount; i++) {
            let x, y, onTrack;
            let attempts = 0;
            const trackCenterX = trackPoints[10] ? trackPoints[10].x : 500;
            const trackCenterY = trackPoints[10] ? trackPoints[10].y : 800;
            do {
                onTrack = false;
                x = trackCenterX + (Math.random() - 0.5) * 3000;
                y = trackCenterY + (Math.random() - 0.5) * 2500;
                for (let j = 0; j < trackPoints.length - 1; j++) {
                    const p1 = trackPoints[j];
                    const p2 = trackPoints[j + 1];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const t = Math.max(0, Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / (dx * dx + dy * dy)));
                    const nearX = p1.x + t * dx;
                    const nearY = p1.y + t * dy;
                    const dist = Math.sqrt((x - nearX) ** 2 + (y - nearY) ** 2);
                    if (dist < trackWidth / 2 + 30) {
                        onTrack = true;
                        break;
                    }
                }
                attempts++;
            } while (onTrack && attempts < 10);
            if (!onTrack) {
                grassObjects.push({ x, y, type: memeTypes[m] });
            }
        }
    }

    const sceneryTypes = ['tree', 'rock', 'bush'];
    for (let i = 0; i < 30; i++) {
        let x, y, onTrack;
        let attempts = 0;
        const sceneryCenterX = trackPoints[10] ? trackPoints[10].x : 500;
        const sceneryCenterY = trackPoints[10] ? trackPoints[10].y : 800;
        do {
            onTrack = false;
            x = sceneryCenterX + (Math.random() - 0.5) * 3000;
            y = sceneryCenterY + (Math.random() - 0.5) * 2500;
            for (let j = 0; j < trackPoints.length - 1; j++) {
                const p1 = trackPoints[j];
                const p2 = trackPoints[j + 1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const t = Math.max(0, Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / (dx * dx + dy * dy)));
                const nearX = p1.x + t * dx;
                const nearY = p1.y + t * dy;
                const dist = Math.sqrt((x - nearX) ** 2 + (y - nearY) ** 2);
                if (dist < trackWidth / 2 + 30) {
                    onTrack = true;
                    break;
                }
            }
            attempts++;
        } while (onTrack && attempts < 10);
        if (!onTrack) {
            const type = sceneryTypes[Math.floor(Math.random() * sceneryTypes.length)];
            grassObjects.push({ x, y, type: type });
        }
    }
}

const images = {};
let memesLoaded = false;
let imagesReady = false;

function loadImage(name, src) {
    const img = new Image();
    img.onload = () => {
        images[name] = img;
        checkMemesLoaded();
    };
    img.onerror = () => {
        images[name] = null;
        checkMemesLoaded();
    };
    img.src = src;
}

function checkMemesLoaded() {
    const needed = ['meme1', 'meme2', 'meme3', 'meme4'];
    const loaded = needed.filter(m => images[m] && images[m].complete && images[m].naturalWidth > 0);
    if (loaded.length === needed.length) {
        memesLoaded = true;
        imagesReady = true;
        generateGrassObjects();
    }
}

loadImage('tree', 'images/tree.png');
loadImage('rock', 'images/rock.png');
loadImage('bush', 'images/bush.png');
loadImage('meme1', 'images/meme1.jpeg');
loadImage('meme2', 'images/meme2.jpeg');
loadImage('meme3', 'images/meme3.jpg');
loadImage('meme4', 'images/meme4.jpeg');

function drawImage(x, y, name, size) {
    const img = images[name];
    if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    } else {
        if (name === 'tree') drawTree(x, y);
        else if (name === 'rock') drawRock(x, y);
        else if (name === 'bush') drawBush(x, y);
    }
}

function drawMemePlaceholder(x, y, name, size) {
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'];
    const idx = parseInt(name.replace('meme', '')) - 1;
    ctx.fillStyle = colors[idx % colors.length];
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold ' + (size / 3) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('?', x, y + size / 6);
}

function drawTrack() {
    // Draw grass background
    const grassColor = '#1a4d1a';
    ctx.fillStyle = grassColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add grass texture
    for (let i = 0; i < 100; i++) {
        const gx = camera.x + (Math.random() - 0.5) * canvas.width * 2;
        const gy = camera.y + (Math.random() - 0.5) * canvas.height * 2;
        ctx.fillStyle = Math.random() > 0.5 ? '#225522' : '#155515';
        ctx.beginPath();
        ctx.arc(gx, gy, 5 + Math.random() * 10, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw grass objects - ensure they're generated
    if (grassObjects.length === 0 && trackPoints.length > 0) {
        generateGrassObjects();
    }

    // Draw grass objects
    if (grassObjects.length === 0 && trackPoints.length > 0) {
        generateGrassObjects();
    }

    for (const obj of grassObjects) {
        let size;
        if (obj.type.startsWith('meme')) {
            size = 200;
        } else if (obj.type === 'tree') {
            size = 40;
        } else if (obj.type === 'rock') {
            size = 30;
        } else {
            size = 25;
        }
        drawImage(obj.x, obj.y, obj.type, size);
    }

    // Draw custom grass objects
    for (const obj of customGrassObjects) {
        let size;
        if (obj.type.startsWith('meme')) {
            size = 200;
        } else if (obj.type === 'tree') {
            size = 40;
        } else if (obj.type === 'rock') {
            size = 30;
        } else {
            size = 25;
        }
        drawImage(obj.x, obj.y, obj.type, size);
    }

    // Keep lava glow effect on track
    if (trackPoints.length < 2) return;
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
    for (let i = 1; i < trackPoints.length; i++) ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = trackWidth + 16;
    ctx.stroke();
    ctx.strokeStyle = '#3d3d3d';
    ctx.lineWidth = trackWidth;
    ctx.stroke();
    ctx.setLineDash([25, 25]);
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    const endPt = trackPoints[trackPoints.length - 1];
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('START', trackPoints[0].x, trackPoints[0].y - 50);
    ctx.fillText('FINISH', endPt.x, endPt.y - 50);
    ctx.fillStyle = '#fee440';
    ctx.fillRect(endPt.x - 8, endPt.y - 80, 16, 160);
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 8; i++) if (i % 2 === 0) ctx.fillRect(endPt.x - 8, endPt.y - 80 + i * 20, 16, 20);
    ctx.restore();
}

function drawObstacles() {
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    for (let obs of obstacles) {
        if (obs.type === 'barrel') {
            ctx.fillStyle = '#ff006e';
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(obs.x - 15, obs.y - 3, 30, 6);
            ctx.fillRect(obs.x - 3, obs.y - 15, 6, 30);
        } else if (obs.type === 'cone') {
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.moveTo(obs.x, obs.y - obs.radius);
            ctx.lineTo(obs.x + obs.radius, obs.y + obs.radius);
            ctx.lineTo(obs.x - obs.radius, obs.y + obs.radius);
            ctx.closePath();
            ctx.fill();
        } else if (obs.type === 'barrier') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(obs.x - obs.radius, obs.y - 8, obs.radius * 2, 16);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x - obs.radius, obs.y - 8, obs.radius * 2, 16);
        } else if (obs.type === 'tire') {
            ctx.fillStyle = '#333333';
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius - 5, 0, Math.PI * 2);
            ctx.fill();
        } else if (obs.type === 'oil') {
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius - 6, 0, Math.PI * 2);
            ctx.fill();
        } else if (obs.type === 'crate') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(obs.x - obs.radius, obs.y - obs.radius, obs.radius * 2, obs.radius * 2);
            ctx.strokeStyle = '#5D3A1A';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x - obs.radius, obs.y - obs.radius, obs.radius * 2, obs.radius * 2);
            ctx.beginPath();
            ctx.moveTo(obs.x - obs.radius + 4, obs.y - obs.radius + 4);
            ctx.lineTo(obs.x + obs.radius - 4, obs.y + obs.radius - 4);
            ctx.moveTo(obs.x + obs.radius - 4, obs.y - obs.radius + 4);
            ctx.lineTo(obs.x - obs.radius + 4, obs.y + obs.radius - 4);
            ctx.stroke();
        } else if (obs.type === 'pallet') {
            ctx.fillStyle = '#DEB887';
            ctx.fillRect(obs.x - obs.radius, obs.y - 8, obs.radius * 2, 16);
            ctx.fillRect(obs.x - obs.radius + 4, obs.y - 14, 8, 28);
            ctx.fillRect(obs.x + obs.radius - 12, obs.y - 14, 8, 28);
            ctx.strokeStyle = '#A0522D';
            ctx.lineWidth = 1;
            ctx.strokeRect(obs.x - obs.radius, obs.y - 8, obs.radius * 2, 16);
        } else if (obs.type === 'rock') {
            ctx.fillStyle = '#696969';
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#808080';
            ctx.beginPath();
            ctx.arc(obs.x - 3, obs.y - 3, obs.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (obs.type === 'sandbag') {
            ctx.fillStyle = '#C4A35A';
            ctx.beginPath();
            ctx.ellipse(obs.x, obs.y, obs.radius, obs.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#8B7355';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (obs.type === 'wreckage') {
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(obs.x - obs.radius, obs.y - 10, obs.radius * 2, 20);
            ctx.fillStyle = '#333';
            ctx.fillRect(obs.x - obs.radius + 5, obs.y - 5, 10, 10);
            ctx.fillRect(obs.x + obs.radius - 15, obs.y - 5, 10, 10);
        }
    }
    ctx.restore();
}

function drawCars() {
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    for (let car of cars) car.draw(ctx);
    ctx.restore();
}

function gameLoop(timestamp) {
    if (!timestamp) timestamp = performance.now();
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    if (gameState === 'playing') {
        gameTime += dt;
        for (let car of cars) car.update(dt);
        checkCollisions();
        checkFinish();
        updateCamera();
        updateHUD();
    }

    if (gameState === 'finished') {
        updateHUD();
    }

    drawTrack();
    drawObstacles();
    drawCars();
    requestAnimationFrame(gameLoop);
}

function showMenu(menuId) {
    // Hide all menus first
    document.querySelectorAll('.menu-overlay').forEach(m => m.classList.add('hidden'));
    // Show requested menu
    if (menuId) document.getElementById(menuId).classList.remove('hidden');
}

function resumeGame() {
    gameState = 'playing';
    lastTime = performance.now();
    showMenu(null);
    updateHUD();
    toggleMusic(true);
}

function restartGame() {
    trackPoints = [];
    generateTrack();
    obstacles = [];
    grassObjects = [];
    cars = [];
    initGame();
    generateObstacles();
    generateGrassObjects();
    gameState = 'playing';
    gameTime = 0;
    lastTime = performance.now();
    playerCollisionCount = 0;
    crashPopupShown = false;
    finishPopupShown = false;
    document.getElementById('finishPopup').classList.add('hidden');
    document.getElementById('crashPopup').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    updateHUD();
    toggleMusic(true);
}

function quitToMenu() {
    gameState = 'menu';
    showMenu('mainMenu');
    toggleMusic(false);
}

function quitToMenu() { gameState = 'menu'; showMenu('mainMenu'); }

document.addEventListener('keydown', function (e) {
    const key = e.key.toLowerCase();
    if (key in keys) keys[key] = true;
    if (key === 'h' && gameState === 'playing') playHonk();
    if (key === 'escape') {
        if (gameState === 'playing') {
            gameState = 'paused';
            showMenu('pauseMenu');
            toggleMusic(false);
        }
        else if (gameState === 'paused') resumeGame();
    }
});

document.addEventListener('keyup', function (e) {
    const key = e.key.toLowerCase();
    if (key in keys) keys[key] = false;
});

window.addEventListener('resize', function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Initialize game
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
generateTrack();
generateObstacles();
initGame();

// Pre-load background music audio element
loadBackgroundMusic();

requestAnimationFrame(gameLoop);

document.getElementById('startGameBtn').addEventListener('click', startGame);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
generateTrack();
generateObstacles();
initGame();

requestAnimationFrame(gameLoop);