// 更新用户信息
router.put('/profile', async (req, res) => {
    try {
        await User.updateOne(
            { _id: req.session.user.id },
            { $set: { ...req.body } }
        );
        // ... 其他代码
    }
}); 

// 更新主题设置
router.post('/theme', async (req, res) => {
    try {
        const { theme } = req.body;
        const userId = req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ success: false, msg: '未登录' });
        }
        
        // 验证主题值
        if (!['light', 'dark'].includes(theme)) {
            return res.status(400).json({ success: false, msg: '无效的主题值' });
        }
        
        // 更新用户主题设置
        const user = await User.findByIdAndUpdate(userId, { theme }, { new: true });
        
        // 通过 socket 广播主题更改
        const io = req.app.get('io');
        const userSockets = Object.values(io.sockets.sockets)
            .filter(socket => socket.userId === userId);
            
        userSockets.forEach(socket => {
            socket.emit('theme_change', { theme });
        });
        
        res.json({ success: true, theme: user.theme });
    } catch (error) {
        res.status(500).json({ success: false, msg: '更新主题失败' });
    }
});

// 获取用户设置
router.get('/settings', async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ success: false, msg: '未登录' });
        }
        
        const user = await User.findById(userId);
        res.json({
            success: true,
            theme: user.theme
        });
    } catch (error) {
        res.status(500).json({ success: false, msg: '获取用户设置失败' });
    }
});

module.exports = router; 