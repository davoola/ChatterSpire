const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { validatePassword } = require('../utils/passwordValidator');

// 注册路由
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 验证密码强度
        const validation = validatePassword(password);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.errors.join(', ')
            });
        }
        
        // 检查用户是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '用户名已存在'
            });
        }
        
        // 创建新用户
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword
        });
        
        await user.save();
        
        res.json({
            success: true,
            message: '注册成功'
        });
    } catch (err) {
        console.error('注册错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 修改密码路由
router.post('/change-password', async (req, res) => {
    try {
        // 检查用户是否登录
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({
                success: false,
                message: '请先登录'
            });
        }

        const { currentPassword, newPassword } = req.body;

        // 验证新密码强度
        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.errors.join(', ')
            });
        }
        
        // 验证当前密码
        const user = await User.findById(req.session.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: '当前密码错误'
            });
        }
        
        // 更新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        
        res.json({
            success: true,
            message: '密码修改成功'
        });
    } catch (err) {
        console.error('修改密码错误:', err);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 登录路由
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
            return res.status(400).json({ msg: '用户不存在' });
        }

        // 检查用户状态
        if (user.status === 'disabled' && user.role !== 'admin') {
            return res.status(403).json({ msg: '账号已被禁用，请联系管理员' });
        }

        // 验证密码
        const isMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: '密码错误' });
        }

        // 更新最后登录时间
        await User.updateOne(
            { _id: user._id },
            { lastLoginAt: new Date() }
        );

        // 设置session
        req.session.user = {
            id: user._id,
            username: user.username,
            role: user.role
        };

        res.json({ 
            msg: '登录成功',
            redirectUrl: '/profile'
        });
    } catch (err) {
        console.error('登录错误：', err);
        res.status(500).json({ msg: '服务器错误: ' + err.message });
    }
});

// 添加退出登录路由
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router; 