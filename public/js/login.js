// 主题切换按钮事件监听
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
}

document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });
        const data = await res.json();
        if (res.ok) {
            window.location.href = data.redirectUrl;
        } else {
            const errorMsg = document.getElementById('errorMsg');
            errorMsg.style.display = 'block';
            errorMsg.textContent = data.msg;
        }
    } catch (err) {
        console.error('登录失败:', err);
    }
};