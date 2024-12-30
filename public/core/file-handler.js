// 使用立即执行函数创建独立作用域
(function() {
    // 文件上传和处理相关的代码
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    // 处理文件上传
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 检查文件大小
        if (file.size > 100 * 1024 * 1024) { // 100MB
            alert('文件大小不能超过100MB');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('上传失败');
            }

            const data = await response.json();
            
            // 发送文件消息，只包含必要的信息
            socket.emit('chatMessage', {
                roomId: roomId,
                userId: userId,
                username: username,
                message: createFileMessage(data),
                type: 'file',
                avatar: userAvatar
            });

            // 清空文件输入框
            event.target.value = '';

        } catch (error) {
            alert('文件上传失败');
        }
    }

    // 创建文件消息内容 - 只返回文件相关的HTML
    function createFileMessage(fileData) {
        const { url, type, name, size } = fileData;
        const ext = name.split('.').pop().toLowerCase();
        
        // 图片类型
        if (type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            return `![${name}](${url})`;
        }
        
        // 视频类型
        if (type === 'video' || ['mp4', 'webm', 'ogg'].includes(ext)) {
            return `<div class="video-message">
                <video src="${url}" controls></video>
                <button class="sync-video-btn" onclick="startVideoSync('${url}')">同步播放</button>
            </div>`;
        }
        
        // 音频类型
        if (type === 'audio' || ['mp3', 'wav', 'ogg'].includes(ext)) {
            return `<audio src="${url}" controls></audio>`;
        }
        
        // 其他文件类型
        const fileSize = formatFileSize(size);
        return `<div class="file-attachment">
            <a href="${url}" class="file-link" target="_blank" download="${name}">
                <div class="file-icon">📎</div>
                <span class="file-name">${name}</span>
                <span class="file-size">[${fileSize}]</span>
            </a>
        </div>`;
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (!bytes) return '未知大小';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    // 开始视频同步播放
    function startVideoSync(url) {
        document.getElementById('videoUrl').value = url;
        playVideoFromUrl();
    }

    // 将函数暴露到全局作用域
    window.startVideoSync = startVideoSync;
    window.handleFileUpload = handleFileUpload;
})();