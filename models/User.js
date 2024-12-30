const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['active', 'disabled'],
        default: 'active'
    },
    nickname: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        default: '未设置'
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: 'other'
    },
    avatar: {
        type: String,
        default: '/avatar/default.png',
        get: function(avatar) {
            return avatar.startsWith('/') ? avatar : '/' + avatar;
        }
    },
    bio: {
        type: String,
        default: '这个用户很懒，什么都没写...'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLoginAt: {
        type: Date,
        default: null
    },
    joinedRooms: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    }],
    theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light'
    },
    messageCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

UserSchema.pre('save', async function(next) {
    // ... 检查中间件代码
});

module.exports = mongoose.model('User', UserSchema); 