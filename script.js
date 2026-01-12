let player;
let currentState = 'START';
let videoStream = null;
let currentMusic = {};
let scanAnimId = null;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '240', width: '100%',
        videoId: '',
        playerVars: { 'autoplay': 0, 'controls': 1, 'modestbranding': 1 },
        events: { 'onReady': () => console.log("YouTube Player Ready") }
    });
}

async function requestSensorPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const response = await DeviceOrientationEvent.requestPermission();
            if (response === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
            }
        } catch (e) { console.error("Sensor Permission Denied", e); }
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
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
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
            scanAnimId = requestAnimationFrame(scan);
        };
        scan();
    } catch (err) {
        alert("カメラの起動に失敗しました。設定を確認してください。");
    }
}

function stopScanner() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    if (scanAnimId) cancelAnimationFrame(scanAnimId);
}

function processQRCode(raw) {
    const parts = raw.split(',');
    const rawId = parts[0].trim();
    const id = rawId.includes('v=') ? rawId.split('v=')[1].split('&')[0] : 
               rawId.includes('be/') ? rawId.split('be/')[1] : rawId;
    
    currentMusic = {
        id: id,
        title: parts[1] || 'Unknown Title',
        artist: parts[2] || 'Unknown Artist',
        year: parts[3] || '----'
    };

    currentState = 'AWAITING_FLIP';
    stopScanner();
    showScreen('layout-flip-wait');
}

function startPlayback() {
    currentState = 'PLAYING';
    showScreen('layout-play');

    const bgElement = document.getElementById('mv-blur-bg');
    const maxResUrl = `https://img.youtube.com/vi/${currentMusic.id}/maxresdefault.jpg`;
    const hqUrl = `https://img.youtube.com/vi/${currentMusic.id}/hqdefault.jpg`;

    const img = new Image();
    img.onload = () => { bgElement.style.backgroundImage = `url(${maxResUrl})`; };
    img.onerror = () => { bgElement.style.backgroundImage = `url(${hqUrl})`; };
    img.src = maxResUrl;
    
    document.getElementById('txt-song-title').innerText = currentMusic.title;
    document.getElementById('txt-artist-info').innerText = currentMusic.artist;
    document.getElementById('txt-release-year').innerText = currentMusic.year;

    const randomStart = Math.floor(Math.random() * 51) + 30;
    player.loadVideoById({
        videoId: currentMusic.id,
        startSeconds: randomStart
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
    if (player) player.pauseVideo();
    
    document.getElementById('mv-blur-bg').style.backgroundImage = 'none';
    
    currentState = 'SCANNING';
    showScreen('layout-scan');
    startScanner();
});

