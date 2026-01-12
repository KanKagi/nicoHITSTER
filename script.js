let player;
let currentState = 'START';
let videoStream = null;
let currentMusic = {};

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '200', width: '100%',
        videoId: '',
        playerVars: { 'autoplay': 0, 'controls': 1 },
        events: { 'onReady': () => console.log("Player Ready") }
    });
}

async function requestSensorPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
        }
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

function handleOrientation(event) {
    if (currentState !== 'AWAITING_FLIP') return;

    if (Math.abs(event.beta) > 160) {
        startPlayback();
    }
}

async function startScanner() {
    const video = document.getElementById('camera-preview');
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = videoStream;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const scan = () => {
        if (currentState !== 'SCANNING') return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                processQRCode(code.data);
                return;
            }
        }
        requestAnimationFrame(scan);
    };
    scan();
}

function processQRCode(raw) {
    const parts = raw.split(',');
    const id = parts[0].includes('v=') ? parts[0].split('v=')[1].split('&')[0] : parts[0];
    
    currentMusic = {
        id: id.trim(),
        title: parts[1] || 'Unknown Title',
        artist: parts[2] || 'Unknown Artist',
        year: parts[3] || '----'
    };

    currentState = 'AWAITING_FLIP';
    if (videoStream) videoStream.getTracks().forEach(t => t.stop());
    showScreen('layout-flip-wait');
}

function startPlayback() {
    currentState = 'PLAYING';
    showScreen('layout-play');

    document.getElementById('mv-blur-bg').style.backgroundImage = 
        `url(https://img.youtube.com/vi/${currentMusic.id}/hqdefault.jpg)`;
    
    document.getElementById('txt-song-title').innerText = currentMusic.title;
    document.getElementById('txt-artist-info').innerText = currentMusic.artist;
    document.getElementById('txt-release-year').innerText = currentMusic.year;

    player.loadVideoById({
        videoId: currentMusic.id,
        startSeconds: Math.floor(Math.random() * 50) + 30
    });
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'flex';
}

document.getElementById('btn-start-game').addEventListener('click', () => {
    requestSensorPermission();
    currentState = 'SCANNING';
    showScreen('layout-scan');
    startScanner();
});

document.getElementById('btn-next-song').addEventListener('click', () => {
    player.pauseVideo();
    currentState = 'SCANNING';
    showScreen('layout-scan');
    startScanner();
});