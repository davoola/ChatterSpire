const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const parseMarkdown = require('../utils/markdown');
const Room = require('../models/Room');
const Message = require('../models/Message');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', 'public', 'avatar');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 使用时间戳和用户ID确保文件名唯一
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${req.session.user.id}-${timestamp}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制5MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(null, false);
        cb(new Error('只支持 JPG、PNG、GIF 格式的图片文件!'));
    }
});

// 中间件：检查用户是否登录
const auth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// 获取个人信息
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ msg: '用户不存在' });
        }

        if (!user.avatar.startsWith('/')) {
            user.avatar = '/' + user.avatar;
        }

        // 解析个人简介中的 Markdown
        const userObj = user.toObject();
        userObj.parsedBio = userObj.bio ? parseMarkdown(userObj.bio.toString()) : '';
        userObj.role = req.session.user.role;

        res.render('profile', { user: userObj });
    } catch (err) {
        console.error('获取个人信息错误：', err);
        res.status(500).json({ msg: '服务器错误: ' + err.message });
    }
});

// 更新个人信息
router.post('/update', auth, async (req, res) => {
    try {
        const { nickname, email, city, gender, bio } = req.body;

        // 先查找用户
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.status(404).json({ msg: '用户不存在' });
        }

        // 更新用户信息
        const updatedUser = await User.findByIdAndUpdate(
            req.session.user.id,
            {
                nickname: nickname || user.nickname,
                email: email || user.email,
                city: city || user.city,
                gender: gender || user.gender,
                bio: bio || user.bio
            },
            { 
                new: true,
                runValidators: true 
            }
        );

        // 解析更新后的 bio
        const parsedBio = updatedUser.bio ? parseMarkdown(updatedUser.bio.toString()) : '';

        res.json({ 
            msg: '更新成功',
            user: {
                ...updatedUser.toObject(),
                parsedBio
            }
        });
    } catch (err) {
        console.error('更新个人信息错误：', err);
        res.status(500).json({ msg: '更新失败', error: err.message });
    }
});

// 上传头像
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: '请选择有效的图片文件' });
        }

        // 先查找用户
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.status(404).json({ msg: '用户不存在' });
        }

        // 删除旧头像（如果不是默认头像）
        if (user.avatar && user.avatar !== '/avatar/default.png') {
            const oldAvatarPath = path.join(__dirname, '..', 'public', user.avatar);
            if (fs.existsSync(oldAvatarPath)) {
                try {
                    fs.unlinkSync(oldAvatarPath);
                } catch (err) {
                    console.error('删除旧头像失败:', err);
                }
            }
        }

        // 更新头像路径
        const avatarPath = '/avatar/' + req.file.filename;
        const updatedUser = await User.findByIdAndUpdate(
            req.session.user.id,
            { avatar: avatarPath },
            { new: true }
        );

        // 更新 session 中的用户头像
        req.session.user.avatar = avatarPath;

        res.json({ msg: '上传成功', path: avatarPath });
    } catch (err) {
        console.error('头像上传错误:', err);
        res.status(500).json({ msg: '上传失败', error: err.message });
    }
});

// 修改密码
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // 获取用户信息
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.status(404).json({ msg: '用户不存在' });
        }

        // 验证当前密码
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: '当前密码错误' });
        }

        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // 更新密码
        await User.findByIdAndUpdate(req.session.user.id, {
            password: hashedPassword
        });

        res.json({ msg: '密码修改成功' });
    } catch (err) {
        console.error('修改密码错误：', err);
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 获取用户创建的房间列表
router.get('/my-rooms', async (req, res) => {
    try {
        const rooms = await Room.find({ createdBy: req.session.user.id })
            .select('roomId name status saveMessages createdAt')
            .lean();

        // 格式化每个房间的创建时间
        const formattedRooms = rooms.map(room => ({
            ...room,
            createdAt: room.createdAt ? room.createdAt.toISOString() : null,
            saveMessages: Boolean(room.saveMessages)  // 确保 saveMessages 是布尔值
        }));
        
        res.json(formattedRooms);
    } catch (err) {
        console.error('获取房间列表错误:', err);
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 切换房间状态
router.post('/rooms/:roomId/toggle-status', async (req, res) => {
    try {
        const room = await Room.findOne({ 
            _id: req.params.roomId,
            createdBy: req.session.user.id 
        });
        
        if (!room) {
            return res.status(404).json({ msg: '房间不存在' });
        }

        const newStatus = room.status === 'active' ? 'disabled' : 'active';
        await Room.updateOne(
            { _id: req.params.roomId },
            { status: newStatus }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 删除房间
router.delete('/rooms/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ 
            _id: req.params.roomId,
            createdBy: req.session.user.id 
        });
        
        if (!room) {
            return res.status(404).json({ msg: '房间不存在' });
        }

        await Room.deleteOne({ _id: req.params.roomId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 清除房间消息
router.delete('/rooms/:roomId/messages', async (req, res) => {
    try {
        const room = await Room.findOne({ 
            _id: req.params.roomId,
            createdBy: req.session.user.id 
        });
        
        if (!room) {
            return res.status(404).json({ msg: '房间不存在' });
        }

        await Message.deleteMany({ roomId: room.roomId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 获取房间详情
router.get('/rooms/:roomId', async (req, res) => {
    try {
        // 使用 lean() 转换为普通 JavaScript 对象
        const room = await Room.findOne({ 
            _id: req.params.roomId,
            createdBy: req.session.user.id 
        })
        .select('roomId name description password saveMessages status')
        .lean();
        
        if (!room) {
            return res.status(404).json({ msg: '房间不存在' });
        }
        
        res.json(room);
    } catch (err) {
        console.error('获取房间详情错误:', err);
        res.status(500).json({ msg: '服务器错误' });
    }
});

// 更新房间信息
router.put('/rooms/:roomId', async (req, res) => {
    try {
        const { name, description, password, saveMessages } = req.body;
        
        // 使用 findByIdAndUpdate 而不是先查找再保存
        const updatedRoom = await Room.findByIdAndUpdate(
            req.params.roomId,
            {
                $set: {
                    name,
                    description,
                    saveMessages: saveMessages === true,  // 直接在更新时转换为布尔值
                    ...(password ? { password } : {})  // 如果有密码才更新密码
                }
            },
            { new: true }  // 返回更新后的文档
        ).select('roomId name description saveMessages status');

        if (!updatedRoom) {
            return res.status(404).json({ msg: '房间不存在' });
        }

        res.json({
            success: true,
            msg: '房间信息更新成功',
            room: updatedRoom
        });
    } catch (err) {
        console.error('更新房间错误:', err);
        res.status(500).json({ msg: '服务器错误' });
    }
});

module.exports = router; 