const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzrbRcC7B-TcuQAZ1fKIOxlsE9V3HfYZ4ky6LnWbw8dZzdsO1j_y7s4MwMFSeMkRW-g/exec';
const API_URL = 'http://localhost:8080';

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("signatureCanvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let isDrawing = false, lastX = 0, lastY = 0;
    let hasSignature = false;
    let previousWidth = 0; // 이전 캔버스 너비 저장

    // Canvas 크기 및 초기화
    function initializeCanvas() {
        const containerWidth = canvas.parentElement.offsetWidth - 20; // 양쪽 여백 20px
        if (containerWidth !== previousWidth) {
            // 기존 내용을 저장
            const existingContent = canvas.toDataURL();

            // 캔버스 크기 조정
            canvas.width = containerWidth;
            canvas.height = 200; // 고정 높이
            ctx.fillStyle = '#ffffff'; // 흰색 배경 추가
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#000'; // 검은색 선
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            // 기존 내용을 다시 그리기
            const img = new Image();
            img.src = existingContent;
            img.onload = () => ctx.drawImage(img, 0, 0);

            previousWidth = containerWidth;
        }
    }

    initializeCanvas();
    window.addEventListener('resize', initializeCanvas); // 창 크기 변경 시 재조정

    // 마우스 이벤트
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // 터치 이벤트
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', () => (isDrawing = false), { passive: false });

    // 입력 필드와 체크박스 클릭 시 캔버스 초기화 방지
    preventCanvasResetOnInput();

    // 날짜 선택기 초기화
    initializeDateSelectors();

    // 이벤트 초기화
    initializeEvents();

    function initializeDateSelectors() {
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= 1900; i--) {
            document.getElementById("birthYear").add(new Option(i, i));
            document.getElementById("consentYear").add(new Option(i, i));
        }
        for (let i = 1; i <= 12; i++) {
            const month = i.toString().padStart(2, '0');
            document.getElementById("birthMonth").add(new Option(month, month));
            document.getElementById("consentMonth").add(new Option(month, month));
        }
        for (let i = 1; i <= 31; i++) {
            const day = i.toString().padStart(2, '0');
            document.getElementById("birthDay").add(new Option(day, day));
            document.getElementById("consentDay").add(new Option(day, day));
        }

        const today = new Date();
        document.getElementById("consentYear").value = today.getFullYear();
        document.getElementById("consentMonth").value = String(today.getMonth() + 1).padStart(2, '0');
        document.getElementById("consentDay").value = String(today.getDate()).padStart(2, '0');
    }

    function startDrawing(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = e.offsetX || (e.touches ? e.touches[0].clientX - rect.left : 0);
        lastY = e.offsetY || (e.touches ? e.touches[0].clientY - rect.top : 0);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const x = e.offsetX || (e.touches ? e.touches[0].clientX - rect.left : 0);
        const y = e.offsetY || (e.touches ? e.touches[0].clientY - rect.top : 0);

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastX = x;
        lastY = y;
        hasSignature = true;
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function clearSignature() {
        ctx.fillStyle = '#ffffff'; // 캔버스를 흰색으로 초기화
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        hasSignature = false;
    }

    function preventCanvasResetOnInput() {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', (e) => e.stopPropagation());
        });
    }

    function initializeEvents() {
        let resizeTimer;
        window.addEventListener("resize", function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                initializeCanvas();
            }, 250);
        });
    }

    window.submitForm = async function () {
        const name = document.getElementById('name').value;
        const birthdate =
            document.getElementById('birthYear').value +
            '-' +
            String(document.getElementById('birthMonth').value).padStart(2, '0') +
            '-' +
            String(document.getElementById('birthDay').value).padStart(2, '0');
        const address = document.getElementById('address').value;
        const phone = document.getElementById('phone').value;
        const gender = document.getElementById('gender').value;
        const consentDate =
            document.getElementById('consentYear').value +
            '-' +
            String(document.getElementById('consentMonth').value).padStart(2, '0') +
            '-' +
            String(document.getElementById('consentDay').value).padStart(2, '0');
        const consent = document.getElementById('consent').checked;

        if (!consent) {
            alert('인체유래물등 기증 동의가 필요합니다.');
            return;
        }

        const signatureData = canvas.toDataURL('image/png');

        try {
            const response = await fetch(`${API_URL}/save-signature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    signature: signatureData,
                    name: name,
                }),
            });

            const data = await response.json();
            if (data.success) {
                alert('서명이 성공적으로 저장되었습니다.');
            } else {
                alert('서명 저장 실패: ' + data.error);
            }
        } catch (error) {
            console.error('서명 저장 중 오류 발생:', error);
            alert('서명 저장 중 오류가 발생했습니다.');
        }
    };
});
