const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');

// 首页路由
router.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/profile');
    } else {
        res.redirect('/login');
    }
});

// 登录页面
router.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/profile');
    } else {
        res.render('login');
    }
});

// 注册页面
router.get('/register', (req, res) => {
    if (req.session.user) {
        res.redirect('/profile');
    } else {
        res.render('register');
    }
});

// 管理员面板路由
router.get('/admin', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || user.role !== 'admin') {
            return res.redirect('/profile');
        }
        res.render('admin/dashboard', { user });
    } catch (err) {
        console.error('加载管理员面板失败:', err);
        res.status(500).send('服务器错误');
    }
});

// 聊天室页面（需要登录）
router.get('/chat/:roomId', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        // 查找房间信息
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.redirect('/profile');
        }

        // 获取完整的用户信息
        const user = await User.findById(req.session.user.id).select('-password');
        if (!user) {
            return res.redirect('/login');
        }

        // 确保头像路径正确
        const userAvatar = user.avatar.startsWith('/') ? user.avatar : '/' + user.avatar;

        res.render('chat', { 
            roomId: req.params.roomId, 
            user: {
                ...user.toObject(),
                id: user._id,
                avatar: userAvatar
            },
            room: room,  // 传递房间信息
            isCreator: room.createdBy.toString() === req.session.user.id
        });
    } catch (err) {
        console.error('进入聊天室失败:', err);
        res.redirect('/profile');
    }
});

module.exports = router; 