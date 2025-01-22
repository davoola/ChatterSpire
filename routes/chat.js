const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises;

// 中间件：检查用户是否登录
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

// 获取房间列表
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const rooms = await Room.find({ status: 'active' })
            .select('roomId name description password')
            .lean();

        res.render('rooms', { 
            rooms,
            user: req.session.user
        });
    } catch (err) {
        console.error('获取房间列表错误:', err);
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 进入聊天室
router.get('/:roomId', isAuthenticated, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.redirect('/');
        }

        // 如果房间被禁用且用户不是管理员或房主
        if (room.status === 'disabled' && 
            req.session.user.role !== 'admin' && 
            room.createdBy.toString() !== req.session.user.id) {
            return res.redirect('/');
        }

        // 确保用户数据的完整性和安全性
        const user = await User.findById(req.session.user.id)
            .select('username nickname gender city bio avatar')
            .lean();

        if (!user) {
            return res.redirect('/auth/login');
        }

        const sanitizedUser = {
            id: user._id,
            username: user.username,
            nickname: user.nickname || user.username,
            gender: user.gender || '',
            city: user.city || '',
            bio: user.bio || '',
            avatar: user.avatar || '/avatar/default.png'
        };

        res.render('chat', {
            title: room.name,
            room: room,
            user: sanitizedUser,
            roomId: req.params.roomId
        });
    } catch (err) {
        console.error('加载聊天室失败:', err);
        res.redirect('/');
    }
});

// 验证房间密码
router.post('/:roomId/verify-password', async (req, res) => {
    try {
        const { password } = req.body;
        const room = await Room.findOne({ roomId: req.params.roomId });
        
        if (!room) {
            return res.status(404).json({ msg: '房间不存在' });
        }

        if (room.password !== password) {
            return res.status(400).json({ msg: '密码错误' });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
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

// 验证房间
router.post('/verify-room', async (req, res) => {
    try {
        const { roomId, password } = req.body;
        
        // 检查房间是否存在
        const room = await Room.findOne({ roomId });
        
        if (!room) {
            // 检查是否是管理员
            if (req.session.user.role !== 'admin') {
                return res.status(403).json({ msg: '只有管理员可以创建新房间' });
            }

            // 如果是管理员，创建新房间
            const newRoom = new Room({
                roomId,
                name: roomId,  // 使用 roomId 作为默认名称
                password: password || '',
                createdBy: req.session.user.id,
                status: 'active'
            });
            
            await newRoom.save();
            return res.json({ 
                success: true,
                isNewRoom: true
            });
        }
        
        // 如果房间存在且有密码，验证密码
        if (room.password && room.password !== password) {
            return res.status(400).json({ msg: '密码错误' });
        }
        
        // 如果房间被禁用且用户不是管理员或房主
        if (room.status === 'disabled' && 
            req.session.user.role !== 'admin' && 
            room.createdBy.toString() !== req.session.user.id) {
            return res.status(403).json({ msg: '该房间已被禁用' });
        }
        
        res.json({ 
            success: true,
            isNewRoom: false
        });
    } catch (err) {
        console.error('验证房间失败:', err);
        res.status(500).json({ msg: '服务器错误' });
    }
});

module.exports = router; 