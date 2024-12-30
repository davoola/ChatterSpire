// 代码块处理相关函数
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 修改代码块渲染规则
function initializeCodeBlockRenderer(md) {
    md.renderer.rules.fence = function (tokens, idx, options, env, slf) {
        const token = tokens[idx];
        const code = token.content.trim();
        const lang = token.info.trim();

        if (lang === 'mermaid') {
            return `<div class="mermaid">${escapeHtml(code)}</div>`;
        } else if (lang === 'flow') {
            const flowchartId = 'flowchart-' + Math.random().toString(36).substr(2, 9);
            return `<div class="flowchart" id="${flowchartId}">${escapeHtml(code)}</div>`;
        }

        // 为代码块添加复制按钮
        const copyBtnId = 'copy-btn-' + Math.random().toString(36).substr(2, 9);
        let highlightedCode;
        
        try {
            if (lang && hljs.getLanguage(lang)) {
                highlightedCode = hljs.highlight(code, { 
                    language: lang,
                    ignoreIllegals: true
                }).value;
            } else {
                highlightedCode = hljs.highlightAuto(code).value;
            }
        } catch (e) {
            console.warn('代码高亮警告:', e);
            highlightedCode = escapeHtml(code);
        }

        const escapedLang = escapeHtml(lang);
        
        return `
            <div class="code-block-wrapper">
                <div class="code-block-header">
                    ${escapedLang ? `<span class="code-language">${escapedLang}</span>` : ''}
                    <button class="code-copy-btn" id="${copyBtnId}" onclick="copyCode(this)">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <pre><code class="hljs ${escapedLang}">${highlightedCode}</code></pre>
            </div>`;
    };

    // 修改普通代码块的渲染规则
    md.renderer.rules.code_block = function(tokens, idx) {
        const code = tokens[idx].content || '';
        const escapedCode = escapeHtml(code);
        try {
            const highlightedCode = hljs.highlightAuto(escapedCode).value;
            return `<pre><code class="hljs">${highlightedCode}</code></pre>`;
        } catch (e) {
            return `<pre><code class="hljs">${escapedCode}</code></pre>`;
        }
    };

    // 修改行内代码的渲染规则
    md.renderer.rules.code_inline = function(tokens, idx) {
        const code = tokens[idx].content || '';
        return `<code>${escapeHtml(code)}</code>`;
    };
}

// 复制代码功能
window.copyCode = function(button) {
    const wrapper = button.closest('.code-block-wrapper');
    const codeElement = wrapper.querySelector('code');
    
    // 创建临时元素来存储代码HTML实体
    const temp = document.createElement('div');
    temp.innerHTML = codeElement.innerHTML;
    const code = temp.textContent || temp.innerText;

    // 创建临时文本区域
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        // 尝试复制
        document.execCommand('copy');
        // 更新按钮状态
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.classList.add('copied');
        
        // 2秒后恢复原始状态
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i>';
            button.classList.remove('copied');
        }, 2000);
    } catch (err) {
        console.error('复制失败:', err);
        button.innerHTML = '<i class="fas fa-times"></i>';
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    }
    
    // 移除临时文本区域
    document.body.removeChild(textarea);
}; 