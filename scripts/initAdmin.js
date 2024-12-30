const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function initAdmin() {
    try {
        // 设置 strictQuery 选项
        mongoose.set('strictQuery', false);
        
        // 使用环境变量中的 MongoDB URI，如果没有则使用默认值
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatterspire';
        
        // 连接数据库
        await mongoose.connect(mongoUri);
        console.log('MongoDB连接成功');

        // 检查管理员是否已存在
        const adminExists = await User.findOne({ username: 'Admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('Admin123', 10);
            const admin = new User({
                username: 'Admin',
                password: hashedPassword,
                role: 'admin',
                status: 'active',
                nickname: '管理员',
                gender: 'other',
                bio: '🛡️ 聊天室的守护者，🌟 秩序的捍卫者。',
                avatar: '/avatar/admin.png'
            });
            await admin.save();
            console.log('管理员账号创建成功');
        } else {
            console.log('管理员账号已存在');
        }
    } catch (err) {
        console.error('初始化管理员账号失败:', err);
        process.exit(1);
    } finally {
        // 确保在完成后关闭连接
        await mongoose.connection.close();
        console.log('数据库连接已关闭');
    }
}

initAdmin(); 