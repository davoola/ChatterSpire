// 创建一个全局的 socket 连接
window.socket = io({
    transports: ['websocket', 'polling']
});

// 获取共享的用户和房间信息
window.roomId = document.querySelector('.room-header h2').textContent.split(': ')[1];
window.username = document.querySelector('.user-profile h3').textContent;
window.userAvatar = document.querySelector('.user-profile .user-avatar').src;
window.userId = document.querySelector('.user-profile').dataset.userId;



        // 视频同步相关事件监听
        socket.on('sync_video_invitation', function(data) {
            showNotification(`${data.username} 邀请您同步观看视频`, 'info');
            const invitation = document.createElement('div');
            invitation.className = 'sync-invitation';
            invitation.setAttribute('data-video-id', data.videoId);
            invitation.innerHTML = `
                <p>${data.username} 邀请您同观看视频</p>
                <div class="sync-invitation-buttons">
                    <button onclick="acceptSync('${data.videoId}', '${data.url}')">接受</button>
                    <button onclick="declineSync()">拒绝</button>
                </div>
            `;
            document.body.appendChild(invitation);
            
            setTimeout(() => {
                if (invitation.parentNode) {
                    invitation.parentNode.removeChild(invitation);
                }
            }, 10000);
        });

        socket.on('sync_video_accepted', function(data) {
            showNotification(`${data.username} 接受了同步观看邀请`, 'success');
        });

        socket.on('sync_video_declined', function(data) {
            showNotification(`${data.username} 拒绝了同步观看邀请`, 'warning');
        });

        socket.on('sync_video_control', function(data) {
            if (!syncVideoPlayer || currentVideoId !== data.videoId) return;
            
            const timeDiff = Math.abs(syncVideoPlayer.currentTime - data.time);
            
            syncVideoPlayer.removeEventListener('seeked', onVideoSeeked);
            syncVideoPlayer.removeEventListener('play', onVideoPlay);
            syncVideoPlayer.removeEventListener('pause', onVideoPause);

            switch (data.type) {
                case 'play':
                    if (timeDiff > 0.5) syncVideoPlayer.currentTime = data.time;
                    syncVideoPlayer.play().catch(console.error);
                    break;
                case 'pause':
                    if (timeDiff > 0.5) syncVideoPlayer.currentTime = data.time;
                    syncVideoPlayer.pause();
                    break;
                case 'seek':
                    syncVideoPlayer.currentTime = data.time;
                    break;
            }
            
            setTimeout(() => {
                syncVideoPlayer.addEventListener('seeked', onVideoSeeked);
                syncVideoPlayer.addEventListener('play', onVideoPlay);
                syncVideoPlayer.addEventListener('pause', onVideoPause);
            }, 100);
        });

        socket.on('sync_video_ended', () => {
            showNotification('主播结束了视频同步', 'info');
            closeVideoPlayer();
        });

        socket.on('sync_video_left', data => {
            showNotification(`${data.username} 退出了视频同步`, 'info');
        });