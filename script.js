let player;
let currentState = 'START';
let videoStream = null;
let currentMusic = {};
let scanAnimId = null;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '100%', width: '100%', videoId: 'vnw8zra4284',
        playerVars: { 'autoplay': 0, 'controls': 1, 'modestbranding': 1, 'rel': 0 },
        events: { 'onReady': () => console.log("YouTube Ready") }
    });
}

async function startApp() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try { await DeviceOrientationEvent.requestPermission(); } catch (e) { console.error(e); }
    }
    window.addEventListener('deviceorientation', handleOrientation);

    if (player && player.playVideo) {
        player.mute(); player.playVideo();
        setTimeout(() => { player.pauseVideo(); player.unMute(); }, 500);
    }

    currentState = 'SCANNING';
    showScreen('layout-scan');
    startScanner();
}

function handleOrientation(event) {
    if (currentState !== 'AWAITING_FLIP') return;
    if (Math.abs(event.beta) > 160) { startPlayback(); }
}

async function startScanner() {
    const video = document.getElementById('camera-preview');
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        video.srcObject = videoStream;
        await video.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scan = () => {
            if (currentState !== 'SCANNING') return;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.height = video.videoHeight; canvas.width = video.videoWidth;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) { processQRCode(code.data); return; }
            }
            scanAnimId = requestAnimationFrame(scan);
        };
        scan();
    } catch (err) { console.error("Camera Error"); }
}

function processQRCode(raw) {
    const parts = raw.split(',');
    const id = parts[0].includes('v=') ? parts[0].split('v=')[1].split('&')[0] : parts[0].trim();
    currentMusic = { id: id, title: parts[1] || 'Unknown', artist: parts[2] || 'Unknown', year: parts[3] || '----' };
    currentState = 'AWAITING_FLIP';
    if (videoStream) videoStream.getTracks().forEach(t => t.stop());
    showScreen('layout-flip-wait');
}

function startPlayback() {
    if (currentState === 'PLAYING') return;
    currentState = 'PLAYING';
    
    const bgElement = document.getElementById('mv-blur-bg');
    const thumbnailUrl = `https://img.youtube.com/vi/${currentMusic.id}/hqdefault.jpg`;
    bgElement.style.backgroundImage = `url('${thumbnailUrl}')`;
    
    document.getElementById('txt-song-title').innerText = currentMusic.title;
    document.getElementById('txt-artist-info').innerText = currentMusic.artist;
    document.getElementById('txt-release-year').innerText = currentMusic.year;

    showScreen('layout-play');

    const randomStart = Math.floor(Math.random() * 51) + 30;
    if (player && player.loadVideoById) {
        player.loadVideoById({ videoId: currentMusic.id, startSeconds: randomStart });
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'flex';
}

document.getElementById('btn-start-game').addEventListener('click', () => { startApp(); });
document.getElementById('btn-next-song').addEventListener('click', () => {
    if (player) player.pauseVideo();
    currentState = 'SCANNING';
    showScreen('layout-scan');
    startScanner();
});
