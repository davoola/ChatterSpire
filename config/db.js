const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        mongoose.set('strictQuery', false);
        
        // MongoDB 数据库连接配置
        // 支持环境变量 MONGODB_URI 覆盖默认连接
        // 默认连接：mongodb://localhost:27017/chatterspire
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatterspire';
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000, // 增加超时时间到 10 秒
            socketTimeoutMS: 45000, // Socket 超时时间
            connectTimeoutMS: 10000, // 连接超时时间
        }); 
        console.log('MongoDB连接成功');
    } catch (err) {
        console.error('MongoDB连接失败:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB; 