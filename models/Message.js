const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true  // 添加索引以提高查询性能
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    avatar: {  // 添加头像字段
        type: String,
        default: '/avatar/default.png'
    },
    avatar: String,
    userId: String,
    nickname: String,
    gender: String,
    city: String,
    bio: String
});

module.exports = mongoose.model('Message', MessageSchema); 