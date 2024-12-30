// 视频播放器相关变量
let syncVideoPlayer = null;
let currentVideoId = null;
let isSyncHost = false;
let isProcessingSync = false;

// 初始化视频播放器
function initVideoPlayer(videoElement) {
    return videojs(videoElement, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        fluid: true,
        html5: {
            vhs: {
                overrideNative: true,
                fastQualityChange: true
            }
        }
    });
}

// 检查是否为流媒体URL
function isStreamingUrl(url) {
    return url.includes('.m3u8') || url.includes('.mpd');
}

// 播放视频
function playVideo(url) {
    const player = videojs('syncVideo');
    
    try {
        player.src({
            src: url,
            type: isStreamingUrl(url) ? 'application/x-mpegURL' : 'video/mp4'
        });
        
        player.on('error', function(error) {
            console.error('视频播放错误:', player.error());
            showNotification('视频加载失败，请检查URL是否正确', 'error');
        });

        player.play().catch(function(error) {
            console.error('视频播放失败:', error);
            showNotification('视频播放失败，请重试', 'error');
        });
    } catch (error) {
        console.error('设置视频源时出错:', error);
        showNotification('视频加载失败，请重试', 'error');
    }
}

// 发起视频同步播放
function playVideoFromUrl(url) {
    // 如果没有传入 url，则从输入框获取
    const videoUrl = url || document.getElementById('videoUrl').value.trim();
    if (!videoUrl) {
        showNotification('请输入视频URL', 'error');
        return;
    }

    // 普通视频同步播放
    currentVideoId = Date.now().toString();
    socket.emit('start_sync_video', {
        videoId: currentVideoId,
        url: videoUrl,
        roomID: roomId,
        username: username
    });

    createVideoPlayer(videoUrl, true);
    isSyncHost = true;
    showNotification('已发送同步观看邀请', 'info');
}

// 创建视频播放器
function createVideoPlayer(url, isHost) {
    const container = document.getElementById('syncVideoContainer');
    const video = document.getElementById('syncVideo');
    const header = container.querySelector('.sync-video-header');
    
    video.src = url;
    container.style.display = 'block';
    
    syncVideoPlayer = video;
    isSyncHost = isHost;
    
    // 添加事件监听
    video.addEventListener('play', onVideoPlay);
    video.addEventListener('pause', onVideoPause);
    video.addEventListener('seeked', onVideoSeeked);
    video.addEventListener('seeking', onVideoSeeking);
    video.addEventListener('timeupdate', onTimeUpdate);

    // 添加拖拽功能
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    // 添加缩放手柄
    const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(position => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${position}`;
        container.appendChild(handle);
        return handle;
    });

    // 拖拽功能
    function dragStart(e) {
        if (e.type === "touchstart") {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }

        if (e.target === header) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();

            if (e.type === "touchmove") {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }

            xOffset = currentX;
            yOffset = currentY;

            // 重置 transform 属性，只应用位移
            container.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    }

    function dragEnd() {
        isDragging = false;
    }

    // 添加拖拽事件监听
    header.addEventListener('mousedown', dragStart);
    header.addEventListener('touchstart', dragStart, { passive: false });

    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });

    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);

    // 缩放功能
    handles.forEach(handle => {
        let isResizing = false;
        let originalWidth;
        let originalHeight;
        let originalX;
        let originalY;
        let originalMouseX;
        let originalMouseY;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            e.stopPropagation();

            originalWidth = container.offsetWidth;
            originalHeight = container.offsetHeight;
            originalX = container.offsetLeft;
            originalY = container.offsetTop;
            originalMouseX = e.pageX;
            originalMouseY = e.pageY;

            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResize);
        });

        function resize(e) {
            if (!isResizing) return;

            const deltaX = e.pageX - originalMouseX;
            const deltaY = e.pageY - originalMouseY;
            const isLeft = handle.classList.contains('top-left') || handle.classList.contains('bottom-left');
            const isTop = handle.classList.contains('top-left') || handle.classList.contains('top-right');

            let newWidth = isLeft ? originalWidth - deltaX : originalWidth + deltaX;
            let newHeight = isTop ? originalHeight - deltaY : originalHeight + deltaY;

            // 设置最小尺寸
            newWidth = Math.max(320, newWidth);
            newHeight = Math.max(240, newHeight);

            container.style.width = newWidth + 'px';
            container.style.height = newHeight + 'px';

            if (isLeft) {
                container.style.left = (originalX + deltaX) + 'px';
            }
            if (isTop) {
                container.style.top = (originalY + deltaY) + 'px';
            }
        }

        function stopResize() {
            isResizing = false;
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResize);
        }
    });
}

// 接受视频同步邀请
function acceptSync(videoId, url) {
    currentVideoId = videoId;
    socket.emit('sync_video_accepted', {
        videoId: videoId,
        roomId: roomId,
        username: username
    });

    createVideoPlayer(url, false);
    showNotification('已接受同步观看邀请', 'success');

    const invitation = document.querySelector('.sync-invitation');
    if (invitation) {
        invitation.remove();
    }
}

// 拒绝视频同步邀请
function declineSync() {
    const invitation = document.querySelector('.sync-invitation');
    if (invitation) {
        const videoId = invitation.getAttribute('data-video-id');
        socket.emit('sync_video_declined', {
            videoId: videoId,
            roomId: roomId,
            username: username
        });
        invitation.remove();
    }
}

// 关闭视频播放器
function closeSyncVideo() {
    if (isSyncHost) {
        socket.emit('sync_video_ended', { 
            roomID: roomId,
            username: username
        });
    } else {
        socket.emit('sync_video_left', { 
            roomId: roomId,
            username: username
        });
    }
    closeVideoPlayer();
}

// 关闭视频播放器
function closeVideoPlayer() {
    const container = document.getElementById('syncVideoContainer');
    if (syncVideoPlayer) {
        syncVideoPlayer.pause();
        syncVideoPlayer.removeEventListener('play', onVideoPlay);
        syncVideoPlayer.removeEventListener('pause', onVideoPause);
        syncVideoPlayer.removeEventListener('seeked', onVideoSeeked);
        syncVideoPlayer.removeEventListener('seeking', onVideoSeeking);
        syncVideoPlayer.removeEventListener('timeupdate', onTimeUpdate);
        syncVideoPlayer.src = '';
    }
    container.style.display = 'none';
    syncVideoPlayer = null;
    isSyncHost = false;
    currentVideoId = null;
}

// 视频播放事件处理函数
function onVideoPlay() {
    if (isProcessingSync) return;
    
    if (isSyncHost) {
        socket.emit('sync_video_control', {
            type: 'play',
            time: syncVideoPlayer.currentTime,
            videoId: currentVideoId,
            roomID: roomId
        });
    }
}

function onVideoPause() {
    if (isProcessingSync) return;
    
    if (isSyncHost) {
        socket.emit('sync_video_control', {
            type: 'pause',
            time: syncVideoPlayer.currentTime,
            videoId: currentVideoId,
            roomID: roomId
        });
    }
}

function onVideoSeeking() {
    if (isProcessingSync) return;
    
    if (isSyncHost) {
        socket.emit('sync_video_control', {
            type: 'seeking',
            time: syncVideoPlayer.currentTime,
            videoId: currentVideoId,
            roomID: roomId
        });
    }
}

function onVideoSeeked() {
    if (isProcessingSync) return;
    
    if (isSyncHost) {
        socket.emit('sync_video_control', {
            type: 'seek',
            time: syncVideoPlayer.currentTime,
            videoId: currentVideoId,
            roomID: roomId
        });
    }
}

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 1000; // 1秒更新一次

function onTimeUpdate() {
    if (isProcessingSync || !isSyncHost) return;
    
    const now = Date.now();
    if (now - lastUpdateTime >= UPDATE_INTERVAL) {
        socket.emit('sync_video_state', {
            videoId: currentVideoId,
            time: syncVideoPlayer.currentTime,
            playing: !syncVideoPlayer.paused,
            roomID: roomId
        });
        lastUpdateTime = now;
    }
}

// Socket.IO 事件监听
socket.on('sync_video_start', (data) => {    
    showNotification(`${data.username} 邀请您一起观看视频`, 'info');
    // 创建邀请UI
    const invitation = document.createElement('div');
    invitation.className = 'sync-invitation';
    invitation.setAttribute('data-video-id', data.videoId);
    invitation.innerHTML = `
        <p>${data.username} 邀请您一起观看视频</p>
        <button onclick="acceptSync('${data.videoId}', '${data.url}')">接受</button>
        <button onclick="declineSync()">拒绝</button>
    `;
    document.body.appendChild(invitation);
});

socket.on('sync_video_control', (data) => {
    if (!syncVideoPlayer || data.videoId !== currentVideoId) return;
    
    isProcessingSync = true;
    syncVideoPlayer.currentTime = data.time;
    
    if (data.type === 'play') {
        syncVideoPlayer.play();
    } else if (data.type === 'pause') {
        syncVideoPlayer.pause();
    }
    
    setTimeout(() => {
        isProcessingSync = false;
    }, 100);
});

socket.on('sync_video_state', (data) => {
    if (!syncVideoPlayer || data.videoId !== currentVideoId || isSyncHost) return;
    
    isProcessingSync = true;
    const timeDiff = Math.abs(syncVideoPlayer.currentTime - data.time);
    
    if (timeDiff > 1) {
        syncVideoPlayer.currentTime = data.time;
    }
    
    if (data.playing && syncVideoPlayer.paused) {
        syncVideoPlayer.play();
    } else if (!data.playing && !syncVideoPlayer.paused) {
        syncVideoPlayer.pause();
    }
    
    setTimeout(() => {
        isProcessingSync = false;
    }, 100);
});

socket.on('sync_video_end', () => {
    showNotification('同步观看已结束', 'info');
    closeVideoPlayer();
});

socket.on('sync_video_error', (error) => {
    showNotification(error.message, 'error');
});

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notificationContainer');
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 处理视频URL的函数
function handleVideoUrl(url) {
    if (!url) {
        showNotification('请输入视频URL', 'error');
        return;
    }

    try {
        // 验证URL格式
        new URL(url);
        
        // 检查视频格式
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.m3u8'];
        const hasValidExtension = videoExtensions.some(ext => 
            url.toLowerCase().includes(ext) || url.toLowerCase().includes('video')
        );

        if (!hasValidExtension) {
            showNotification('不支持的视频格式', 'error');
            return;
        }

        // 发起视频同步播放
        playVideoFromUrl(url);
    } catch (e) {
        showNotification('无效的视频URL', 'error');
        console.error('URL解析错误:', e);
    }
}

// 修改视频URL输入框的处理
document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('videoUrl');
    if (videoUrlInput) {
        videoUrlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const url = this.value.trim();
                handleVideoUrl(url);
            }
        });
    }

    // 修改播放按钮的处理
    const syncButton = document.querySelector('.sync-button');
    if (syncButton) {
        syncButton.addEventListener('click', function() {
            const url = document.getElementById('videoUrl').value.trim();
            handleVideoUrl(url);
        });
    }

    // 添加拖拽和缩放功能
    const container = document.getElementById('syncVideoContainer');
    const header = container.querySelector('.sync-video-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    // 添加缩放手柄
    const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(position => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${position}`;
        container.appendChild(handle);
        return handle;
    });

    // 拖拽功能
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === header) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            setTranslate(currentX, currentY, container);
        }
    }

    function dragEnd() {
        isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }

    // 缩放功能
    let isResizing = false;
    let currentHandle = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let originalX = 0;
    let originalY = 0;
    let originalMouseX = 0;
    let originalMouseY = 0;

    handles.forEach(handle => {
        handle.addEventListener('mousedown', resizeStart);
    });

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', resizeEnd);

    function resizeStart(e) {
        isResizing = true;
        currentHandle = e.target;
        originalWidth = container.offsetWidth;
        originalHeight = container.offsetHeight;
        originalX = container.offsetLeft;
        originalY = container.offsetTop;
        originalMouseX = e.pageX;
        originalMouseY = e.pageY;
        e.preventDefault();
    }

    function resize(e) {
        if (!isResizing) return;

        const deltaX = e.pageX - originalMouseX;
        const deltaY = e.pageY - originalMouseY;
        const position = currentHandle.className.split(' ')[1];
        let newWidth = originalWidth;
        let newHeight = originalHeight;

        switch (position) {
            case 'top-left':
                newWidth = originalWidth - deltaX;
                newHeight = originalHeight - deltaY;
                if (newWidth > 400) container.style.width = newWidth + 'px';
                if (newHeight > 300) container.style.height = newHeight + 'px';
                break;
            case 'top-right':
                newWidth = originalWidth + deltaX;
                newHeight = originalHeight - deltaY;
                if (newWidth > 400) container.style.width = newWidth + 'px';
                if (newHeight > 300) container.style.height = newHeight + 'px';
                break;
            case 'bottom-left':
                newWidth = originalWidth - deltaX;
                newHeight = originalHeight + deltaY;
                if (newWidth > 400) container.style.width = newWidth + 'px';
                if (newHeight > 300) container.style.height = newHeight + 'px';
                break;
            case 'bottom-right':
                newWidth = originalWidth + deltaX;
                newHeight = originalHeight + deltaY;
                if (newWidth > 400) container.style.width = newWidth + 'px';
                if (newHeight > 300) container.style.height = newHeight + 'px';
                break;
        }

        // 调整视频播放器大小
        const video = document.getElementById('syncVideo');
        if (video) {
            video.style.height = (newHeight - 60) + 'px';  // 减去header的高度
        }
    }

    function resizeEnd() {
        isResizing = false;
        currentHandle = null;
    }

    // 触摸设备支持
    header.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);

    handles.forEach(handle => {
        handle.addEventListener('touchstart', resizeStart);
    });
    document.addEventListener('touchmove', resize);
    document.addEventListener('touchend', resizeEnd);
});





