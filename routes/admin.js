const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

// 中间件：检查是否是管理员
const isAdmin = async (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ msg: '请先登录' });
    }
    try {
        const user = await User.findOne({ _id: req.session.user.id });
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: '需要管理员权限' });
        }
        next();
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
};

// 获取所有用户
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 }); // 按创建时间倒序排列

        // 返回完整的用户信息，包括最后登录时间
        const usersWithDetails = users.map(user => ({
            _id: user._id,
            username: user.username,
            nickname: user.nickname,
            role: user.role,
            status: user.status,
            avatar: user.avatar,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            email: user.email,
            city: user.city,
            gender: user.gender
        }));

        res.json(usersWithDetails);
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 添加新用户
router.post('/users', isAdmin, async (req, res) => {
    try {
        const { username, password, role, nickname, email, city, gender } = req.body;
        
        // 验证必填字段
        if (!username || !password) {
            return res.status(400).json({ msg: '用户名和密码为必填项' });
        }

        // 检查用户名是否已存在
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ msg: '用户名已存在' });
        }

        // 创建新用户
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword,
            role: role || 'user',
            nickname: nickname || username,
            email: email || '',
            city: city || '未设置',
            gender: gender || '未设置',
            status: 'active',
            createdAt: new Date(),
            lastLoginAt: null
        });

        await user.save();

        // 返回成功消息和用户信息（不包含密码）
        const userResponse = {
            _id: user._id,
            username: user.username,
            nickname: user.nickname,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt
        };

        res.json({ 
            msg: '用户创建成功',
            user: userResponse
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: '输入数据验证失败' });
        }
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 删除用户
router.delete('/users/:userId', isAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ _id: userId });
        if (user && user.role === 'admin') {
            return res.status(403).json({ success: false, message: '不能删除管理员账号' });
        }
        await User.deleteOne({ _id: userId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 获取所有房间
router.get('/rooms', isAdmin, async (req, res) => {
    try {
        const rooms = await Room.find().populate('createdBy', 'username');
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 创建房间
router.post('/rooms', isAdmin, async (req, res) => {
    try {
        const { roomId, name, description, password } = req.body;
        
        // 检查房间ID是否已存在
        const existingRoomById = await Room.findOne({ roomId });
        if (existingRoomById) {
            return res.status(400).json({ msg: '房间ID已存在' });
        }

        // 检查房间名称是否已存在
        const existingRoomByName = await Room.findOne({ name });
        if (existingRoomByName) {
            return res.status(400).json({ msg: '房间名称已存在' });
        }

        const room = new Room({
            roomId,
            name,
            description,
            password: password || '',
            createdBy: req.session.user.id,
            status: 'active'
        });

        await room.save();
        res.json({ msg: '房间创建成功' });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 删除房间
router.delete('/rooms/:roomId', isAdmin, async (req, res) => {
    try {
        const roomId = req.params.roomId;
        await Room.deleteOne({ _id: roomId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 修改用户信息
router.put('/users/:id', isAdmin, async (req, res) => {
    try {
        const { nickname, email, city, gender, role } = req.body;
        
        // 检查是否存在
        const user = await User.findOne({ _id: req.params.id });
        if (!user) {
            return res.status(404).json({ msg: '用户不存在' });
        }

        // 不允许修改最后一个管理员的角色
        if (user.role === 'admin' && role !== 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ msg: '必须保留至少一个管理员账号' });
            }
        }

        // 更新用户信息
        await User.updateOne(
            { _id: req.params.id },
            {
                nickname,
                email,
                city,
                gender,
                role
            }
        );

        const updatedUser = await User.findOne({ _id: req.params.id }).select('-password');
        res.json({ msg: '更新成功', user: updatedUser });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 重置用户密码
router.post('/users/:id/reset-password', isAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        
        const user = await User.findOne({ _id: req.params.id });
        if (!user) {
            return res.status(404).json({ msg: '用户不存在' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await User.updateOne(
            { _id: req.params.id },
            { password: hashedPassword }
        );

        res.json({ msg: '密码重置成功' });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 搜索用户
router.get('/users/search', isAdmin, async (req, res) => {
    try {
        const { query } = req.query;
        const users = await User.find({
            $or: [
                { username: new RegExp(query, 'i') },
                { nickname: new RegExp(query, 'i') },
                { email: new RegExp(query, 'i') }
            ]
        }).select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 获取用户详细信息
router.get('/users/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: '用户不存在' });
        }
        // 返回完整的用户信息
        res.json({
            _id: user._id,
            username: user.username,
            role: user.role,
            nickname: user.nickname,
            email: user.email,
            city: user.city,
            gender: user.gender
        });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 获取房间详细信息
router.get('/rooms/:id', isAdmin, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id).populate('createdBy', 'username');
        if (!room) {
            return res.status(404).json({ msg: '房间不存在' });
        }

        // 确保返回所有需要的字段
        res.json({
            _id: room._id,
            roomId: room.roomId,
            name: room.name,
            description: room.description || '',
            createdBy: room.createdBy,
            createdAt: room.createdAt,
            status: room.status,
            saveMessages: room.saveMessages,
            password: room.password ? true : false  // 只返回是否有密码
        });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 更新房间信息
router.put('/rooms/:id', isAdmin, async (req, res) => {
    try {
        const { name, description, password, saveMessages } = req.body;
        
        // 检查新名称是否与其他房间重复
        const existingRoom = await Room.findOne({ 
            name, 
            _id: { $ne: req.params.id } 
        });
        
        if (existingRoom) {
            return res.status(400).json({ msg: '房间名称已存在' });
        }

        // 构建更新对象
        const updateData = {
            name,
            description,
            saveMessages: !!saveMessages
        };

        if (password !== undefined) {
            updateData.password = password;
        }

        // 使用 updateOne 替代 findByIdAndUpdate
        await Room.updateOne(
            { _id: req.params.id },
            updateData
        );

        const updatedRoom = await Room.findOne({ _id: req.params.id })
            .populate('createdBy', 'username');

        if (!updatedRoom) {
            return res.status(404).json({ msg: '房间不存在' });
        }

        res.json({ 
            msg: '更新成功', 
            room: {
                ...updatedRoom.toObject(),
                hasPassword: !!updatedRoom.password
            }
        });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 切换用户状态（启用/禁用）
router.post('/users/:id/toggle-status', isAdmin, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id });
        if (!user) {
            return res.status(404).json({ msg: '用户不存在' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ msg: '不能禁用管理员账号' });
        }

        const newStatus = user.status === 'active' ? 'disabled' : 'active';
        
        await User.updateOne(
            { _id: req.params.id },
            { status: newStatus }
        );

        const updatedUser = await User.findOne({ _id: req.params.id })
            .select('-password');

        res.json({ 
            msg: `用户${newStatus === 'active' ? '启用' : '禁用'}成功`,
            user: updatedUser
        });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 切换房间状态（启用/禁用）
router.post('/rooms/:id/toggle-status', isAdmin, async (req, res) => {
    try {
        const room = await Room.findOne({ _id: req.params.id });
        if (!room) {
            return res.status(404).json({ msg: '房间不存在' });
        }

        const newStatus = room.status === 'active' ? 'disabled' : 'active';
        
        await Room.updateOne(
            { _id: req.params.id },
            { status: newStatus }
        );

        const updatedRoom = await Room.findOne({ _id: req.params.id })
            .populate('createdBy', 'username');

        res.json({ 
            msg: `房间${newStatus === 'active' ? '启用' : '禁用'}成功`,
            room: updatedRoom
        });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 清除房间聊天记录
router.delete('/rooms/:id/messages', isAdmin, async (req, res) => {
    try {
        const room = await Room.findOne({ _id: req.params.id });
        if (!room) {
            return res.status(404).json({ msg: '房间不存在' });
        }

        await Message.deleteMany({ roomId: room.roomId });
        res.json({ msg: '聊天记录清除成功' });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

module.exports = router; 