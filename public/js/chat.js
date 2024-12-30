// 在文件顶部添加全局变量
let currentRoom = roomId;  // roomId 来自 EJS 模板

// 连接成功
socket.on('connect', () => {
    socket.emit('joinRoom', { 
        roomId, 
        username,
        avatar: userAvatar
    });
});

// 初始化 markdown-it
let md;

// HTML转义函数 - 移到全局作用域
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 添加表情符号处理函数 - 移到全局作用域
function processEmojis(text) {
    if (!window.joypixels || !text) return text || '';
    
    // 处理短代码表情符号 (例如 :smile:)
    return text.replace(/:([a-z0-9_+-]+):/g, (match, name) => {
        const emoji = window.joypixels.shortnameToUnicode(match);
        return emoji || match;
    });
}

// 消息处理函数 - 移到全局作用域
function processMessage(messageContent) {
    if (!messageContent) return '';
    
    // 先处理表情符号
    messageContent = processEmojis(messageContent);

    // 检查是否是数学公式
    const isMathFormula = messageContent.includes('$$') && 
                        messageContent.split('$$').length === 3 && // 确保只有一对 $$
                        !messageContent.trim().startsWith('```'); // 不是代码块

    // 检查是否包含单个 $ 但不是数学公式
    const hasSingleDollar = messageContent.includes('$') && 
                           !messageContent.includes('$$') &&
                           !messageContent.trim().startsWith('```');

    if (isMathFormula) {
        // 是数学公式，直接返回原内容
        return messageContent;
    } else if (hasSingleDollar) {
        // 包含单个 $，作为代码处理
        return '```javascript\n' + messageContent + '\n```';
    }
    
    // 其他情况直接返回原内容
    return messageContent;
}

// Lightbox 相关变量和函数
let currentImageIndex = 0;
let imageUrls = [];

function showLightbox(imageUrl) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const lightboxImage = lightbox.querySelector('.lightbox-image');
    if (!lightboxImage) return;
    
    // 收集当前聊天室中所有可预览的图片
    imageUrls = Array.from(document.querySelectorAll('.message-content img:not(.user-avatar):not(.emoji):not(.katex-img)'))
        .map(img => img.src)
        .filter(src => src); // 过滤掉空的src
    
    currentImageIndex = imageUrls.indexOf(imageUrl);
    if (currentImageIndex === -1) return;
    
    // 先设置图片源
    lightboxImage.src = imageUrl;
    
    // 显示 lightbox
    lightbox.style.display = 'flex';
    lightbox.classList.add('active');
    
    // 更新导航按钮状态
    updateNavigationButtons();
}

function hideLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    
    lightbox.classList.remove('active');
    
    setTimeout(() => {
        lightbox.style.display = 'none';
        const lightboxImage = lightbox.querySelector('.lightbox-image');
        if (lightboxImage) {
            lightboxImage.src = '';
        }
    }, 300);
}

function showPreviousImage() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        const lightboxImage = document.querySelector('.lightbox-image');
        if (lightboxImage) {
            lightboxImage.src = imageUrls[currentImageIndex];
            updateNavigationButtons();
        }
    }
}

function showNextImage() {
    if (currentImageIndex < imageUrls.length - 1) {
        currentImageIndex++;
        const lightboxImage = document.querySelector('.lightbox-image');
        if (lightboxImage) {
            lightboxImage.src = imageUrls[currentImageIndex];
            updateNavigationButtons();
        }
    }
}

function updateNavigationButtons() {
    const prevButton = document.querySelector('.lightbox-prev');
    const nextButton = document.querySelector('.lightbox-next');
    
    if (prevButton && nextButton) {
        // 只有一张图片时隐藏导航按钮
        if (imageUrls.length <= 1) {
            prevButton.style.display = 'none';
            nextButton.style.display = 'none';
            return;
        }
        
        prevButton.style.display = 'flex';
        nextButton.style.display = 'flex';
        
        prevButton.style.visibility = currentImageIndex === 0 ? 'hidden' : 'visible';
        nextButton.style.visibility = currentImageIndex === imageUrls.length - 1 ? 'hidden' : 'visible';
    }
}

// 初始化 Lightbox 事件监听器
function initializeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const closeButton = lightbox.querySelector('.lightbox-close');
    const prevButton = lightbox.querySelector('.lightbox-prev');
    const nextButton = lightbox.querySelector('.lightbox-next');
    
    // 关闭按钮事件
    if (closeButton) {
        closeButton.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止事件冒泡
            hideLightbox();
        });
    }
    
    // 点击背景关闭
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
            hideLightbox();
        }
    });
    
    // 导航按钮事件
    if (prevButton) {
        prevButton.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止事件冒泡
            showPreviousImage();
        });
    }
    if (nextButton) {
        nextButton.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止事件冒泡
            showNextImage();
        });
    }
    
    // 键盘事件
    document.addEventListener('keydown', function(e) {
        if (lightbox.style.display === 'flex') {
            if (e.key === 'Escape') {
                hideLightbox();
            } else if (e.key === 'ArrowLeft') {
                showPreviousImage();
            } else if (e.key === 'ArrowRight') {
                showNextImage();
            }
        }
    });
}

// 在 DOMContentLoaded 事件中初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeLightbox();
    
    // 其他初始化代码...
    
    // 移除重复的 Lightbox 事件监听器代
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        // 移除旧的事件监听器，因为已经在 initializeLightbox 中添加了
        const oldCloseBtn = lightbox.querySelector('.lightbox-close');
        const oldPrevBtn = lightbox.querySelector('.prev-button');
        const oldNextBtn = lightbox.querySelector('.next-button');
        
        if (oldCloseBtn) {
            oldCloseBtn.removeEventListener('click', hideLightbox);
        }
        if (oldPrevBtn) {
            oldPrevBtn.removeEventListener('click', showPreviousImage);
        }
        if (oldNextBtn) {
            oldNextBtn.removeEventListener('click', showNextImage);
        }
    }
});

// 修改键盘事件处理函数
function handleLightboxKeydown(e) {
    switch(e.key) {
        case 'Escape':
            hideLightbox();
            break;
        case 'ArrowLeft':
            showPreviousImage();
            break;
        case 'ArrowRight':
            showNextImage();
            break;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 初始化 Mermaid
    mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        sequence: {
            diagramMarginX: 50,
            diagramMarginY: 10,
            actorMargin: 50,
            width: 150,
            height: 65,
            boxMargin: 10,
            boxTextMargin: 5,
            noteMargin: 10,
            messageMargin: 35
        },
        flowchart: {
            htmlLabels: true,
            curve: 'basis'
        },
        logLevel: 'error'
    });

    // 配置 markdown-it 和数学公式
    md = window.markdownit({
        html: true,
        breaks: true,
        linkify: true,
        typographer: true,
        quotes: ['""', '\'\''],
        highlight: function (code, lang) {
            if (!code) return '';
            
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { 
                        language: lang,
                        ignoreIllegals: true
                    }).value;
                } catch (err) {
                    console.warn('代码高亮警告:', err);
                }
            }
            
            try {
                return hljs.highlightAuto(code).value;
            } catch (err) {
                console.warn('自动代码高亮警告:', err);
                return code;
            }
        }
    }).use(texmath, {
        engine: katex,
        delimiters: ['dollars'],
        katexOptions: { macros: { "\\RR": "\\mathbb{R}" } }
    }).use(window.markdownitTaskLists, {
        enabled: true,
        label: true,
        labelAfter: true
    });

    // 初始化代码块渲染器
    if (typeof initializeCodeBlockRenderer === 'function') {
        initializeCodeBlockRenderer(md);
    }

    // 添加表情符号渲染规则
    const defaultRender = md.renderer.rules.text || function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.text = function(tokens, idx, options, env, self) {
        let text = defaultRender(tokens, idx, options, env, self);
        return processEmojis(text);
    };

    // 确保所有规则都被启用
    md.enable([
        'blockquote',
        'table',
        'list',
        'fence',
        'backticks',
        'strikethrough',
        'emphasis'
    ]);

    const savedTheme = localStorage.getItem('theme');
    const headerThemeToggle = document.getElementById('headerThemeToggle');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('themeIcon').textContent = '🌜';
        document.getElementById('themeText').textContent = '切换亮色';
        headerThemeToggle.textContent = '☀️';
    }

    // 加头部主题切换按钮件
    if (headerThemeToggle) {
        headerThemeToggle.addEventListener('click', () => {
            toggleTheme();
            headerThemeToggle.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
        });
    }

    // 除重复的 Lightbox 事件监听器
    document.removeEventListener('keydown', handleLightboxKeydown);
});

// 题切功能
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        themeIcon.textContent = '🌞';
        themeText.textContent = '切换深色';
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-theme');
        themeIcon.textContent = '🌙';
        themeText.textContent = '切换亮色';
        localStorage.setItem('theme', 'dark');
    }
}

// 消息发送功能
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message) {
        socket.emit('chatMessage', {
            roomId: roomId,  // 使用从 EJS 模板传入的 roomId
            userId: userId,  // 使用从 EJS 模板传入的 userId
            username: username,
            message: message,
            type: 'text',
            avatar: userAvatar
        });
        messageInput.value = '';
        messageInput.style.height = '42px';
        messageInput.focus();
    }
}

// 监听消息输入框的键盘件
document.getElementById('messageInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        // 如果按下 Shift + Enter，则插入换行
        if (e.shiftKey) {
            return;  // 让浏览器
        }
        // 如果只按下 Enter，则发送消息
        e.preventDefault();  // 阻止默认的换行行为
        sendMessage();
    }
});

// 自动调整文本框高度
document.getElementById('messageInput').addEventListener('input', function() {
    this.style.height = 'auto';  // 重置高度
    const newHeight = Math.min(this.scrollHeight, 150);  // 限制最大高度
    this.style.height = Math.max(42, newHeight) + 'px';  // 设置新高度，不小于最小高度
});

// 渲染房间描述
document.addEventListener('DOMContentLoaded', function() {
    const roomDescriptionData = document.getElementById('roomDescriptionData');
    const roomDescriptionEl = document.getElementById('roomDescription');
    
    if (roomDescriptionData && roomDescriptionEl) {
        const description = roomDescriptionData.dataset.description;
        roomDescriptionEl.innerHTML = marked.parse(description);
    }
});

// 接收消息
socket.on('message', (data) => {
    addMessage(data);
});

// 更新在线用户列表和人数
socket.on('updateOnlineUsers', (data) => {
    // 更新在线人数
    const onlineCount = document.getElementById('onlineCount');
    if (onlineCount) {
        onlineCount.textContent = data.count;
    }

    // 更新在线用户列表
    const onlineUsersList = document.getElementById('onlineUsersList');
    if (onlineUsersList) {
        onlineUsersList.innerHTML = data.users.map(user => `
            <div class="online-user-item">
                <img src="${user.avatar}" alt="头像" class="online-user-avatar" 
                     onerror="this.src='/avatar/default.png'">
                <span class="online-user-name">${user.username}</span>
            </div>
        `).join('');
    }
});

// 加载历史消息
socket.on('loadMessages', (messages) => {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';
    
    if (Array.isArray(messages)) {
        messages.forEach(message => {
            addMessage(message);
        });
    }
});


// 侧边栏滑动功能
document.addEventListener('DOMContentLoaded', function() {
    let touchStartX = 0;
    let touchEndX = 0;
    
    // 添加遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // 处理手势
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        console.log('Touch start at:', touchStartX); // 添加调试日志
    });

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        console.log('Touch end at:', touchEndX); // 添加调试日志
        handleSwipe();
    });

    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        const threshold = 50;

        console.log('Swipe distance:', swipeDistance); // 添加调试日志

        if (Math.abs(swipeDistance) < threshold) return;

        const leftSidebar = document.querySelector('.left-sidebar');
        const rightSidebar = document.querySelector('.right-sidebar');

        // 从左向右滑动（示左侧边栏）
        if (swipeDistance > 0 && touchStartX < 30) {
            console.log('Showing left sidebar'); // 添加调试日志
            leftSidebar.classList.add('active');
            overlay.classList.add('active');
        } 
        // 从右向左滑动（显示右侧边栏）
        else if (swipeDistance < 0 && touchStartX > window.innerWidth - 30) {
            console.log('Showing right sidebar'); // 添加调试日志
            rightSidebar.classList.add('active');
            overlay.classList.add('active');
        }
    }

    // 点击遮罩层关闭侧边栏
    overlay.addEventListener('click', () => {
        const sidebars = document.querySelectorAll('.sidebar');
        sidebars.forEach(sidebar => {
            sidebar.classList.remove('active');
        });
        overlay.classList.remove('active');
    });
});


// 修改消息渲染函数
function addMessage(data) {
    if (!md) {
        console.warn('Markdown 渲染器尚未初始化，等待初始化完成...');
        setTimeout(() => addMessage(data), 100);
        return;
    }
    
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${data.username === username ? 'self' : ''}`;
    
    if (data.username === 'System') {
        messageDiv.classList.add('system-message');
        messageDiv.innerHTML = `
            <div class="message-content">
                ${data.message}
            </div>
        `;
    } else {
        let messageContent = data.message;
        
        // 处理代码块和数学公式
        messageContent = processMessage(messageContent);
        
        // 使用 markdown-it 渲染
        try {
            messageContent = md.render(messageContent);
        } catch (error) {
            console.warn('Markdown 渲染警告:', error);
            messageContent = '<pre><code>' + messageContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>';
        }

        let bioContent = '';
        try {
            bioContent = md.render(data.bio || '这个用户很懒，什么都没写...');
        } catch (error) {
            bioContent = data.bio || '这个用户很懒，什么都没写...';
        }
        
        messageDiv.innerHTML = `
            <div class="message-content-wrapper">
                <div class="message-header">
                    <div class="user-avatar-wrapper">
                        <img src="${data.avatar}" alt="头像" class="user-avatar" onerror="this.src='/avatar/default.png'">
                        <div class="user-info-tooltip">
                            <div class="user-info-line">
                                ${data.nickname || data.username} | ${data.gender} | ${data.city}
                            </div>
                            <div class="user-info-bio">
                                ${bioContent}
                            </div>
                        </div>
                    </div>
                    <span class="username">${data.username}</span>
                    <span class="timestamp">${data.timestamp}</span>
                </div>
                <div class="message-content markdown-body">
                    ${messageContent}
                </div>
            </div>
        `;

        // 为所有可预览的图片添加点击事件
        const images = messageDiv.querySelectorAll('.message-content img:not(.user-avatar):not(.emoji):not(.katex-img)');
        images.forEach(img => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', function(e) {
                e.preventDefault();
                if (this.src) {
                    showLightbox(this.src);
                }
            });
        });

        // 高亮代码块
        messageDiv.querySelectorAll('pre code').forEach((block) => {
            try {
                const code = block.textContent || '';
                const result = hljs.highlightAuto(code);
                block.innerHTML = result.value;
                block.className = 'hljs ' + (result.language || '');
            } catch (e) {
                console.warn('代码块高亮警告:', e);
                block.textContent = block.textContent;
            }
        });

        // 渲染 Mermaid 图表
        messageDiv.querySelectorAll('.mermaid').forEach(element => {
            try {
                mermaid.init(undefined, element);
            } catch (e) {
                console.warn('Mermaid 初始化警告:', e);
            }
        });

        // 初始化 Flowchart
        messageDiv.querySelectorAll('.flowchart').forEach(element => {
            try {
                const diagram = flowchart.parse(element.textContent);
                // 创建一个新的容器用于渲染SVG
                const container = document.createElement('div');
                const flowchartId = element.id;
                container.id = flowchartId;
                
                // 设置容器样式
                container.style.width = '100%';
                container.style.minHeight = '400px'; // 增加最小高度
                container.style.backgroundColor = 'transparent';
                container.style.overflow = 'visible'; // 确保内容不被裁剪
                container.style.margin = '20px 0'; // 添加上下边距
                container.style.display = 'flex'; // 使用flex布局
                container.style.justifyContent = 'center'; // 水平居中
                container.style.alignItems = 'center'; // 垂直居中
                
                // 先添加容器到DOM
                element.innerHTML = '';
                element.appendChild(container);
                
                // 等待DOM更新完成后再渲染
                setTimeout(() => {
                    try {
                        if (document.getElementById(flowchartId)) {
                            diagram.drawSVG(flowchartId, {
                                'line-width': 3, // 增加线条宽度
                                'line-length': 50,
                                'text-margin': 10,
                                'font-size': 16, // 增加字体大小
                                'font-family': 'Arial, "Microsoft YaHei"', // 添加中文字体支持
                                'font-weight': 'normal',
                                'font-color': '#333',
                                'line-color': '#666',
                                'element-color': '#666',
                                'fill': 'white',
                                'yes-text': '是',
                                'no-text': '否',
                                'arrow-end': 'block',
                                'scale': 1,
                                'symbols': {
                                    'start': {
                                        'font-color': 'white',
                                        'element-color': '#4a90e2',
                                        'fill': '#4a90e2',
                                        'font-weight': 'bold',
                                        'font-size': 16
                                    },
                                    'end': {
                                        'font-color': 'white',
                                        'element-color': '#67c23a',
                                        'fill': '#67c23a',
                                        'font-weight': 'bold',
                                        'font-size': 16
                                    },
                                    'operation': {
                                        'font-color': '#333',
                                        'element-color': '#666',
                                        'fill': 'white',
                                        'font-size': 16
                                    },
                                    'subroutine': {
                                        'font-color': '#333',
                                        'element-color': '#666',
                                        'fill': 'white',
                                        'font-size': 16
                                    },
                                    'condition': {
                                        'font-color': '#333',
                                        'element-color': '#9c27b0',
                                        'fill': 'white',
                                        'font-size': 16,
                                        'line-width': 3
                                    },
                                    'inputoutput': {
                                        'font-color': '#333',
                                        'element-color': '#666',
                                        'fill': 'white',
                                        'font-size': 16
                                    }
                                }
                            });

                            // 获取SVG元素并设置样式
                            const svg = container.querySelector('svg');
                            if (svg) {
                                // 设置SVG样式
                                svg.style.maxWidth = '100%';
                                svg.style.width = '100%';
                                svg.style.height = 'auto';
                                svg.style.minHeight = '400px';
                                
                                // 确保SVG内容完可见
                                const bbox = svg.getBBox();
                                const padding = 40; // 增加内边距
                                svg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
                                
                                // 修复SVG中的文本和线条
                                const paths = svg.querySelectorAll('path');
                                const texts = svg.querySelectorAll('text');
                                
                                paths.forEach(path => {
                                    path.style.strokeWidth = '2';
                                    path.style.stroke = '#666';
                                });
                                
                                texts.forEach(text => {
                                    text.style.fill = '#333';
                                    text.style.fontSize = '16px';
                                    text.style.fontFamily = 'Arial, "Microsoft YaHei"';
                                });

                                // 监听主题变化
                                const observer = new MutationObserver((mutations) => {
                                    mutations.forEach((mutation) => {
                                        if (mutation.target.classList.contains('dark-theme')) {
                                            paths.forEach(path => {
                                                path.style.stroke = '#fff';
                                            });
                                            texts.forEach(text => {
                                                text.style.fill = '#fff';
                                            });
                                        } else {
                                            paths.forEach(path => {
                                                path.style.stroke = '#666';
                                            });
                                            texts.forEach(text => {
                                                text.style.fill = '#333';
                                            });
                                        }
                                    });
                                });
                                observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
                            }
                        } else {
                            console.warn('Flowchart 容器未找到:', flowchartId);
                        }
                    } catch (renderError) {
                        console.warn('Flowchart 渲染错误:', renderError);
                        container.innerHTML = `<pre>Flowchart 渲染失败: ${renderError.message}</pre>`;
                    }
                }, 200); // 增加等待时间
            } catch (parseError) {
                console.warn('Flowchart 解析错误:', parseError);
                element.innerHTML = `<pre>Flowchart 解析失败: ${parseError.message}</pre>`;
            }
        });
    }
    
    chatBox.appendChild(messageDiv);
    scrollToBottom();
}

// 添加滚动到底部的函数
function scrollToBottom() {
    const chatBox = document.getElementById('chatBox');
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 安全的消息添加函数
function safeAddMessage(message) {
    try {
        if (typeof message === 'string') {
            message = JSON.parse(message);
        }
        addMessage(message);
    } catch (e) {
        console.error('消息处理失败:', e);
    }
}

// 修改历史消息处理
socket.on('chatHistory', (messages) => {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';
    
    if (Array.isArray(messages)) {
        messages.forEach(message => {
            if (typeof message === 'string') {
                try {
                    message = JSON.parse(message);
                } catch (e) {
                    console.error('消息解析失败:', e);
                    return;
                }
            }
            safeAddMessage(message);
        });
    } else {
        console.error('历史消息格式错误:', messages);
    }

    // 等待所有内容（括图片、数学公式、图表等）加载完成后滚动
    setTimeout(() => {
        // 等 Mermaid 图表渲染
        mermaid.init(undefined, '.mermaid');
        
        // 等待 KaTeX 公式渲染
        document.querySelectorAll('.katex-display').forEach(element => {
            if (element.querySelector('.katex-html')) {
                element.style.visibility = 'visible';
            }
        });

        // 等图片加载
        const images = chatBox.getElementsByTagName('img');
        if (images.length === 0) {
            scrollToBottom();
            return;
        }

        let loadedImages = 0;
        const totalImages = images.length;

        function onImageLoad() {
            loadedImages++;
            if (loadedImages === totalImages) {
                scrollToBottom();
            }
        }

        Array.from(images).forEach(img => {
            if (img.complete) {
                onImageLoad();
            } else {
                img.addEventListener('load', onImageLoad);
                img.addEventListener('error', onImageLoad);
            }
        });
    }, 100);
});

// 在创建消息元素的函数中添加用户信息
function createMessageElement(data) {
    const template = document.getElementById('message-template');
    const messageElement = template.content.cloneNode(true);
    
    // 设置头像
    const avatar = messageElement.querySelector('.avatar');
    avatar.src = data.avatar || '/avatar/default.png';
    
    // 设置用户信息
    messageElement.querySelector('.user-nickname').textContent = data.username || 'Unknown';
    messageElement.querySelector('.user-gender').textContent = data.gender || 'N/A';
    messageElement.querySelector('.user-city').textContent = data.city || 'N/A';
    messageElement.querySelector('.user-bio').textContent = data.bio || '这个用户很懒，什么都没写...';
    
    // 设置消息内容
    messageElement.querySelector('.username').textContent = data.username;
    messageElement.querySelector('.time').textContent = data.timestamp;
    messageElement.querySelector('.message-text').innerHTML = formatMessage(data.message);
    
    return messageElement;
}

// 在发送消息时添加用户信息
socket.emit('chatMessage', {
    roomId: roomId,  // 使用从 EJS 模板传入的 roomId
    userId: userId,  // 使用从 EJS 模板传入的 userId
    username: username,
    message: messageInput.value,
    type: 'text',
    avatar: userAvatar
});

// 确保这些函数在全局作用域可用
window.showLightbox = showLightbox;
window.hideLightbox = hideLightbox;  // 改用 hideLightbox
window.showPreviousImage = showPreviousImage;
window.showNextImage = showNextImage;



