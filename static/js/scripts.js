const API_URL = 'http://localhost:8080'; // Python 서버 URL을 정확히 설정하세요.

let canvas, ctx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// 서명 패드 초기화
document.addEventListener('DOMContentLoaded', function () {
    canvas = document.getElementById('signatureCanvas');
    ctx = canvas.getContext('2d');

    // Canvas 크기 설정
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = 200;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 마우스 이벤트
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // 터치 이벤트
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', () => (isDrawing = false));
});

// 터치 이벤트 처리
function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (e.type === 'touchstart') {
        isDrawing = true;
        lastX = x;
        lastY = y;
    } else if (e.type === 'touchmove' && isDrawing) {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastX = x;
        lastY = y;
    }
}

// 서명 드로잉 시작
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

// 드로잉 중
function draw(e) {
    if (!isDrawing) return;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

// 드로잉 종료
function stopDrawing() {
    isDrawing = false;
}

// 서명 초기화
function clearSignature() {
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// 서명 저장
async function saveSignature() {
    const signatureData = canvas.toDataURL('image/png');
    const name = document.getElementById('name').value;

    if (!name) {
        alert('이름을 입력하세요.');
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/save-signature`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                signature: signatureData,
                name: name,
            }),
        });

        const data = await response.json();
        if (data.success) {
            alert(`서명이 저장되었습니다: ${data.filename}`);
            return true;
        } else {
            alert(`서명 저장 실패: ${data.error}`);
            return false;
        }
    } catch (error) {
        console.error('서명 저장 중 오류 발생:', error);
        alert('서명 저장 중 오류가 발생했습니다.');
        return false;
    }
}

// 폼 제출
async function submitForm() {
    const name = document.getElementById('name').value;
    const birthdate = `${document.getElementById('birthYear').value}-${document.getElementById('birthMonth').value}-${document.getElementById('birthDay').value}`;
    const address = document.getElementById('address').value;
    const phone = document.getElementById('phone').value;
    const gender = document.getElementById('gender').value;
    const consentDate = `${document.getElementById('consentYear').value}-${document.getElementById('consentMonth').value}-${document.getElementById('consentDay').value}`;
    const consent = document.getElementById('consent').checked;

    if (!consent) {
        alert('기증 동의가 필요합니다.');
        return;
    }

    // 서명 저장
    const isSignatureSaved = await saveSignature();
    if (!isSignatureSaved) {
        return;
    }

    alert('기증 정보가 성공적으로 제출되었습니다.');
    window.location.href = '/health'; // 성공 후 리디렉션
}
