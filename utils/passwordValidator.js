// 密码验证规则
const passwordRules = {
    minLength: 8,
    maxLength: 20,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    disallowSpaces: true
};

// 密码验证函数
function validatePassword(password) {
    const errors = [];
    
    if (password.length < passwordRules.minLength) {
        errors.push(`密码长度不能少于${passwordRules.minLength}个字符`);
    }
    
    if (password.length > passwordRules.maxLength) {
        errors.push(`密码长度不能超过${passwordRules.maxLength}个字符`);
    }
    
    if (passwordRules.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('密码必须包含至少一个大写字母');
    }
    
    if (passwordRules.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('密码必须包含至少一个小写字母');
    }
    
    if (passwordRules.requireNumbers && !/\d/.test(password)) {
        errors.push('密码必须包含至少一个数字');
    }
    
    if (passwordRules.disallowSpaces && /\s/.test(password)) {
        errors.push('密码不能包含空格');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

module.exports = { validatePassword, passwordRules }; 