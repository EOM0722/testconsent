const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzrbRcC7B-TcuQAZ1fKIOxlsE9V3HfYZ4ky6LnWbw8dZzdsO1j_y7s4MwMFSeMkRW-g/exec';
const API_URL = 'https://consent.ngrok.app';

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("signatureCanvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let isDrawing = false, lastX = 0, lastY = 0;
    let hasSignature = false;

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

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const oldData = canvas.toDataURL();

        // CSS 크기 설정
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = '200px';

        // 실제 캔버스 크기 설정
        canvas.width = rect.width * dpr;
        canvas.height = 200 * dpr;

        // 컨텍스트 스케일 조정
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2 * dpr;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 이전 데이터 복원
        if (oldData !== canvas.toDataURL()) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = oldData;
        }
    }

    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;

        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        const coords = getCoordinates(e);
        [lastX, lastY] = [coords.x, coords.y];
        
        // 시작점 그리기
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(lastX, lastY);
        ctx.stroke();
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();

        const coords = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        [lastX, lastY] = [coords.x, coords.y];
        hasSignature = true;
    }

    function stopDrawing(e) {
        if (e) e.preventDefault();
        isDrawing = false;
        ctx.beginPath(); // 현재 경로 초기화
    }

    function initializeEvents() {
        resizeCanvas();

        // 터치 이벤트
        canvas.addEventListener("touchstart", startDrawing, { passive: false });
        canvas.addEventListener("touchmove", draw, { passive: false });
        canvas.addEventListener("touchend", stopDrawing, { passive: false });
        canvas.addEventListener("touchcancel", stopDrawing, { passive: false });

        // 마우스 이벤트
        canvas.addEventListener("mousedown", startDrawing);
        canvas.addEventListener("mousemove", draw);
        canvas.addEventListener("mouseup", stopDrawing);
        canvas.addEventListener("mouseout", stopDrawing);

        // 리사이즈 이벤트
        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resizeCanvas, 250);
        });

        // 스크롤/줌 방지
        document.addEventListener('touchmove', (e) => {
            if (e.target === canvas) {
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('gesturestart', (e) => {
            if (e.target === canvas) {
                e.preventDefault();
            }
        });
    }

    window.clearSignature = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasSignature = false;
    };

    function isCanvasEmpty() {
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        return !pixels.some(pixel => pixel !== 0);
    }

    function validateForm() {
        const requiredFields = {
            name: "성명",
            birthYear: "생년월일(년)",
            birthMonth: "생년월일(월)",
            birthDay: "생년월일(일)",
            gender: "성별",
            address: "주소",
            phone: "연락처",
        };

        for (const [id, label] of Object.entries(requiredFields)) {
            const value = document.getElementById(id).value;
            if (!value) {
                alert(`${label}을(를) 입력해주세요.`);
                return false;
            }
        }

        if (!document.getElementById("consent").checked) {
            alert("동의 체크박스를 선택해주세요.");
            return false;
        }

        if (isCanvasEmpty()) {
            alert("서명을 해주세요.");
            return false;
        }

        return true;
    }

    window.submitForm = async function() {
        try {
            if (!validateForm()) return;

            const submitButton = document.querySelector('button[aria-label="기증 동의서 제출"]');
            submitButton.disabled = true;
            submitButton.textContent = "제출 중...";

            const formData = {
                name: document.getElementById("name").value,
                birthYear: document.getElementById("birthYear").value,
                birthMonth: document.getElementById("birthMonth").value,
                birthDay: document.getElementById("birthDay").value,
                gender: document.getElementById("gender").value,
                address: document.getElementById("address").value,
                phone: document.getElementById("phone").value,
                consentYear: document.getElementById("consentYear").value,
                consentMonth: document.getElementById("consentMonth").value,
                consentDay: document.getElementById("consentDay").value,
                signature: canvas.toDataURL()
            };

            // 서명 이미지 저장
            const signatureResponse = await fetch(`${API_URL}/save-signature`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    name: formData.name, 
                    signature: formData.signature 
                })
            });

            if (!signatureResponse.ok) {
                throw new Error('서명 저장 실패');
            }

            // 구글 시트 저장
            await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    name: formData.name,
                    birthdate: `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`,
                    address: formData.address,
                    phone: formData.phone,
                    gender: formData.gender,
                    consentDate: `${formData.consentYear}-${formData.consentMonth}-${formData.consentDay}`,
                    consent: "TRUE"
                })
            }).catch(err => console.log('구글 시트 저장 중 오류 (무시해도 됨)'));

            alert("기증 동의서가 성공적으로 제출되었습니다. 문진 버튼을 클릭하여 다음 단계를 진행해주세요.");
            submitButton.textContent = "제출 완료";
            submitButton.disabled = true;

        } catch (error) {
            console.error('제출 중 오류:', error);
            alert("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
            const submitButton = document.querySelector('button[aria-label="기증 동의서 제출"]');
            submitButton.disabled = false;
            submitButton.textContent = "기증 동의서 제출";
        }
    };

    initializeDateSelectors();
    initializeEvents();
});
