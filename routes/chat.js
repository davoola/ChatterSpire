const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const Message = require('../models/Message');

// 验证房间密码
router.post('/verify-room', async (req, res) => {
    try {
        const { roomId, password } = req.body;
        
        // 查找房间
        let room = await Room.findOne({ roomId });
        
        // 如果房间不存在，第一个用户可以创建
        if (!room) {
            room = new Room({
                roomId,
                name: `聊天室 ${roomId}`,
                password: password || '',
                createdBy: req.session.user.id,
                status: 'active'
            });
            await room.save();
            
            req.session.verifiedRooms = req.session.verifiedRooms || {};
            req.session.verifiedRooms[roomId] = true;
            
            return res.json({ 
                msg: '房间创建成功',
                isNewRoom: true
            });
        }

        // 检查房间状态
        if (room.status === 'disabled') {
            return res.status(403).json({ msg: '该房间已被禁用' });
        }

        // 检查密码
        if (room.password && room.password !== '') {
            // 如果房间有密码，必须提供正确的密码
            if (!password) {
                return res.status(403).json({ msg: '该房间需要密码' });
            }
            if (password !== room.password) {
                return res.status(403).json({ msg: '房间密码错误' });
            }
        } else {
            // 如果房间没有密码，但用户提供了密码
            if (password && password.trim() !== '') {
                return res.status(403).json({ msg: '该房间不需要密码' });
            }
        }

        // 验证通过，将房间信息存入 session
        req.session.verifiedRooms = req.session.verifiedRooms || {};
        req.session.verifiedRooms[roomId] = true;

        res.json({ msg: '验证成功' });
    } catch (err) {
        console.error('验证房间失败:', err);
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 进入聊天室
router.get('/:roomId', async (req, res) => {
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

        // 检查是否已验证密码
        if (room.password && room.password !== '') {
            const verifiedRooms = req.session.verifiedRooms || {};
            if (!verifiedRooms[req.params.roomId]) {
                return res.redirect('/profile');
            }
        }

        // 确保头像路径正确
        const userAvatar = user.avatar.startsWith('/') ? user.avatar : '/' + user.avatar;

        res.render('chat', { 
            roomId: req.params.roomId, 
            user: {
                ...user.toObject(),
                id: user._id,
                avatar: userAvatar,
                role: user.role
            },
            room: room,
            isCreator: room.createdBy.toString() === req.session.user.id
        });
    } catch (err) {
        console.error('进入聊天室失败:', err);
        res.redirect('/profile');
    }
});

// 设置房间密码（仅限房主）
router.post('/:roomId/set-password', async (req, res) => {
    try {
        const { password } = req.body;
        const room = await Room.findOne({ roomId: req.params.roomId });

        if (!room) {
            return res.status(404).json({ msg: '房间不存在' });
        }

        // 检查是否是房主
        if (room.createdBy.toString() !== req.session.user.id) {
            return res.status(403).json({ msg: '只有房主可以设置密码' });
        }

        room.password = password || '';
        await room.save();

        res.json({ msg: '密码设置成功' });
    } catch (err) {
        console.error('设置房间密码失败:', err);
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 退出房间时清除验证状态
router.post('/leave-room', (req, res) => {
    const { roomId } = req.body;
    if (req.session.verifiedRooms && req.session.verifiedRooms[roomId]) {
        delete req.session.verifiedRooms[roomId];
    }
    res.json({ msg: '已退出房间' });
});

// 获取房间信息
router.get('/room/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ msg: '房间不存在' });
        }
        res.json(room);
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 保存消息
router.post('/messages', async (req, res) => {
    try {
        const { roomId, content, type } = req.body;
        const message = new Message({
            roomId,
            userId: req.session.user.id,
            content,
            type: type || 'text'
        });
        await message.save();
        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

module.exports = router; 