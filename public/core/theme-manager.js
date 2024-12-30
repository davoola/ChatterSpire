// 主题管理器
class ThemeManager {
    constructor() {
        this.initialized = false;
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        // 立即应用保存的主题，避免闪烁
        this.applyTheme(this.currentTheme);
        
        // 初始化主题切换按钮
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeButtons();
            this.syncWithServer();
        });

        // 监听socket事件（如果存在）
        if (typeof socket !== 'undefined') {
            socket.on('theme_change', (data) => {
                this.setTheme(data.theme, false);
            });
        }

        this.initialized = true;
    }

    initializeButtons() {
        // 初始化所有主题切换按钮
        const headerThemeToggle = document.getElementById('headerThemeToggle');
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');

        if (headerThemeToggle) {
            headerThemeToggle.onclick = () => this.toggle();
            headerThemeToggle.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
        }

        if (themeIcon && themeText) {
            const menuItem = themeIcon.closest('.menu-item');
            if (menuItem) {
                menuItem.onclick = () => this.toggle();
            }
            themeIcon.textContent = this.currentTheme === 'dark' ? '🌜' : '🌞';
            themeText.textContent = this.currentTheme === 'dark' ? '切换亮色' : '切换深色';
        }
    }

    applyTheme(theme) {
        document.documentElement.classList.toggle('dark-theme', theme === 'dark');
        this.updateButtonsState(theme);
    }

    updateButtonsState(theme) {
        const headerThemeToggle = document.getElementById('headerThemeToggle');
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');

        if (headerThemeToggle) {
            headerThemeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '🌜' : '🌞';
        }
        if (themeText) {
            themeText.textContent = theme === 'dark' ? '切换亮色' : '切换深色';
        }
    }

    async syncWithServer() {
        if (!document.cookie.includes('connect.sid')) return;

        try {
            const response = await fetch('/user/settings');
            if (!response.ok) return;
            
            const data = await response.json();
            if (data.success && data.theme && data.theme !== this.currentTheme) {
                this.setTheme(data.theme, false);
            }
        } catch (error) {
            console.error('获取主题设置失败:', error);
        }
    }

    async setTheme(theme, updateServer = true) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme(theme);

        if (updateServer && document.cookie.includes('connect.sid')) {
            try {
                await fetch('/user/theme', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ theme })
                });
            } catch (error) {
                console.error('更新主题失败:', error);
            }
        }
    }

    toggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme, true);
    }
}

// 创建单例实例
const themeManager = new ThemeManager();

// 导出切换方法供全局使用
window.toggleTheme = () => themeManager.toggle(); 