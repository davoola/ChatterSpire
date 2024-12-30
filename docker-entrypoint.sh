#!/bin/sh
set -e

# 等待 MongoDB 就绪
echo "Waiting for MongoDB to be ready..."
MAX_RETRIES=30
RETRY_INTERVAL=1

for i in $(seq 1 $MAX_RETRIES); do
    if node -e "
        const mongoose = require('mongoose');
        mongoose.connect('mongodb://mongo:27017/chatterspire', { serverSelectionTimeoutMS: 1000 })
            .then(() => {
                console.log('MongoDB connection successful');
                process.exit(0);
            })
            .catch(() => {
                console.log('MongoDB connection failed');
                process.exit(1);
            });
    "; then
        echo "MongoDB is ready!"
        break
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        echo "Error: MongoDB did not become ready in time"
        exit 1
    fi
    
    echo "Attempt $i/$MAX_RETRIES: MongoDB is not ready yet..."
    sleep $RETRY_INTERVAL
done

# 初始化管理员账号
echo "Initializing admin account..."
node -e "
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function initAdmin() {
    try {
        await mongoose.connect('mongodb://mongo:27017/chatterspire');
        
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
            console.log('Admin account created successfully');
        } else {
            console.log('Admin account already exists');
        }
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Failed to initialize admin account:', err);
        process.exit(1);
    }
}

initAdmin();
"

# 启动应用
echo "Starting ChatterSpire..."
exec npm start 