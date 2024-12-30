// 密码验证函数
function validatePasswordStrength(password) {
    const minLength = 8;
    const maxLength = 20;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNoSpaces = !/\s/.test(password);
    
    const errors = [];
    
    if (password.length < minLength) errors.push(`密码长度不能少于${minLength}个字符`);
    if (password.length > maxLength) errors.push(`密码长度不能超过${maxLength}个字符`);
    if (!hasUpperCase) errors.push('需要包含大写字母');
    if (!hasLowerCase) errors.push('需要包含小写字母');
    if (!hasNumbers) errors.push('需要包含数字');
    if (!hasNoSpaces) errors.push('不能包含空格');
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// 注册表单提交处理
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const validation = validatePasswordStrength(password);
    
    if (!validation.isValid) {
        const errorDiv = document.getElementById('passwordError');
        errorDiv.innerHTML = validation.errors.join('<br>');
        errorDiv.style.display = 'block';
        return;
    }
    
    // 继续原有的提交逻辑...
    const formData = new FormData(e.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.location.href = '/login';
        } else {
            const errorDiv = document.getElementById('registerError');
            errorDiv.textContent = result.message || '注册失败，请重试';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        console.error('注册错误:', err);
        const errorDiv = document.getElementById('registerError');
        errorDiv.textContent = '注册失败，请重试';
        errorDiv.style.display = 'block';
    }
}); 