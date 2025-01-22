const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const http = require('http');
const socketio = require('socket.io');
const Room = require('./models/Room');
const User = require('./models/User');
const multer = require('multer');
const fs = require('fs');
const fsPromises = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 连接数据库
connectDB();

// Session 中间件配置
const sessionMiddleware = session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // 如果不是 https，需要设置为 false
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
});

// 中间件设置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(sessionMiddleware);

// 设置板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 路由
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/profile', require('./routes/profile'));
app.use('/admin', require('./routes/admin'));
app.use('/chat', require('./routes/chat'));

// Socket.IO 处理
// 创建全局的房间用户管理
const roomUsers = new Map();  // 用于存储每个房间的在线用户列表

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'public/upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);  // 使用绝对路径
    },
    filename: function (req, file, cb) {
        // 解决中文文件名问题
        const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        // 生成文件名: 时间戳-原始文件名
        const filename = Date.now() + '-' + originalname;
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 限制文件大小为 50MB
    }
});

// 添加文件上传路由
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有文件被上传' });
        }

        // 确保文件名是正确的 UTF-8 编码
        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const fileUrl = '/upload/' + req.file.filename;
        const fileType = req.file.mimetype.split('/')[0]; // 获取文件类型（image/video/audio）

        res.json({
            url: fileUrl,
            type: fileType,
            name: originalName,  // 使用转换后的原始文件名
            size: req.file.size
        });
    } catch (error) {
        res.status(500).json({ error: '文件上传失败' });
    }
});

// 创建records目录（如果不存在）
const recordsDir = path.join(__dirname, 'records');
if (!fs.existsSync(recordsDir)) {
    fs.mkdirSync(recordsDir, { recursive: true });
}

// 读取房间消息记录
async function readRoomMessages(roomId) {
    try {
        const filePath = path.join(recordsDir, `_records-${roomId}.json`);
        const data = await fsPromises.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }
}

// 保存房间消息记录
async function saveRoomMessage(roomId, message) {
    try {
        const filePath = path.join(recordsDir, `_records-${roomId}.json`);
        let messages = await readRoomMessages(roomId);
        messages.push(message);
        await fsPromises.writeFile(filePath, JSON.stringify(messages, null, 2), 'utf8');
    } catch (err) {
        console.error('保存消息失败:', err);
    }
}

// 添加 getRoom 函数
function getRoom(roomId) {
    if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, {
            users: new Map(),
            currentSyncVideo: null,
            syncParticipants: new Set()
        });
    }
    return roomUsers.get(roomId);
} 

io.on('connection', (socket) => {
    
    // 加入房间
    socket.on('joinRoom', async ({ roomId, username, avatar }) => {
        socket.join(roomId);
        
        try {
            // 获取用户完整信息
            const user = await User.findOne({ username })
                .select('username nickname gender city bio avatar')
                .lean();
            
            // 更新房间用户列表
            const currentRoom = getRoom(roomId);
            currentRoom.users.set(socket.id, {
                username: user.username,
                nickname: user.nickname || user.username,
                gender: user.gender === 'male' ? '男' : (user.gender === 'female' ? '女' : '未设置'),
                city: user.city || '未设置',
                bio: user.bio || '这个用户很懒，什么都没写...',
                avatar: user.avatar || '/avatar/default.png'
            });
            
            const currentUsersInRoom = Array.from(currentRoom.users.values());
            const onlineCount = currentUsersInRoom.length;
            
            io.to(roomId).emit('updateOnlineUsers', {
                count: onlineCount,
                users: currentUsersInRoom
            });
            
            io.to(roomId).emit('message', {
                username: 'System',
                message: `${username} 加入了聊天室`,
                timestamp: new Date().toLocaleTimeString(),
                avatar: '/avatar/default.png'
            });

            // 加载历史消息
            try {
                const dbRoom = await Room.findOne({ roomId });
                if (dbRoom && dbRoom.saveMessages) {
                    const messages = await readRoomMessages(roomId);
                    const formattedMessages = messages.map(msg => ({
                        username: msg.username,
                        nickname: msg.nickname,
                        message: msg.message,
                        timestamp: new Date(msg.timestamp).toLocaleTimeString(),
                        avatar: msg.avatar || '/avatar/default.png'
                    }));
                    socket.emit('loadMessages', formattedMessages);
                }
            } catch (err) {
                console.error('加载历史消息失败:', err);
            }
        } catch (err) {
            console.error('处理用户加入失败:', err);
        }
    });

    // 断开连接时更新在线人数和用户列表
    socket.on('disconnecting', () => {
        const rooms = Array.from(socket.rooms);
        rooms.forEach(roomId => {
            if (roomId !== socket.id && roomUsers.has(roomId)) {
                const room = roomUsers.get(roomId);
                const disconnectedUser = room.users.get(socket.id);
                
                if (disconnectedUser) {
                    // 从房间用户列表中移除
                    room.users.delete(socket.id);
                    
                    // 获取更新后的用户列表
                    const usersInRoom = Array.from(room.users.values());
                    const onlineCount = usersInRoom.length;
                    
                    // 广播更新后的在线人数和用户列表
                    io.to(roomId).emit('updateOnlineUsers', {
                        count: onlineCount,
                        users: usersInRoom
                    });

                    // 发送系统消息
                    io.to(roomId).emit('message', {
                        username: 'System',
                        message: `${disconnectedUser.username} 离开了聊天室`,
                        timestamp: new Date().toLocaleTimeString(),
                        avatar: '/avatar/default.png'
                    });
                }

                // 如果房间没有用户了，清理房间数据
                if (room.users.size === 0) {
                    roomUsers.delete(roomId);
                }
            }
        });
    });

    // 处理聊天消息
    socket.on('chatMessage', async (data) => {
        if (!data.message || !data.message.trim()) {
            return;
        }
        
        try {
            const room = await Room.findOne({ roomId: data.roomId });
            const user = await User.findById(data.userId)
                .select('username nickname avatar')
                .lean();

            if (!user) {
                throw new Error('用户不存在');
            }

            const messageData = {
                username: user.username,
                nickname: user.nickname || user.username,
                avatar: user.avatar || '/avatar/default.png',
                timestamp: new Date().toLocaleTimeString(),
                message: data.message.trim()
            };

            io.to(data.roomId).emit('message', messageData);

            if (room && room.saveMessages) {
                await saveRoomMessage(data.roomId, {
                    ...messageData,
                    timestamp: new Date(),
                    avatar: user.avatar || '/avatar/default.png'
                });
            }
        } catch (err) {
            console.error('处理消息失败:', err);
        }
    });

    // 处理文件上传消息
    socket.on('fileMessage', async (data) => {
        try {
            const messageData = {
                username: data.username,
                message: data.message,
                fileUrl: data.fileUrl,
                fileType: data.fileType,
                fileName: data.fileName,
                timestamp: new Date(),
                avatar: data.avatar,
                type: 'file'
            };

            // 广播消息给房间内所有用户
            io.to(data.roomId).emit('message', {
                ...messageData,
                timestamp: messageData.timestamp.toLocaleTimeString()
            });

            // 如果房间设置了保存消息，则保存到 JSON 文件
            const room = await Room.findOne({ roomId: data.roomId });
            if (room && room.saveMessages) {
                await saveRoomMessage(data.roomId, {
                    ...messageData,
                    timestamp: messageData.timestamp
                });
            }
        } catch (err) {
            console.error('处理文件消息失败:', err);
        }
    });

    // 断开连接
    socket.on('disconnect', () => {
    });

    // 视频同步相关事件

  socket.on('start_sync_video', function(data) {
    const room = getRoom(data.roomID);
    
    room.currentSyncVideo = {
      videoId: data.videoId,
      url: data.url,
      initiator: socket.id
    };
    room.syncParticipants = new Set([socket.id]);
    
    socket.to(data.roomID).emit('sync_video_invitation', {
      videoId: data.videoId,
      url: data.url,
      username: data.username
    });
  });

  socket.on('sync_video_join', function(data) {
    const room = getRoom(data.roomID);
    
    if (room.currentSyncVideo && room.currentSyncVideo.videoId === data.videoId) {
      room.syncParticipants.add(socket.id);
      socket.to(room.currentSyncVideo.initiator).emit('sync_video_join', {
        videoId: data.videoId
      });
    }
  });

  socket.on('sync_video_state', function(data) {
    const room = getRoom(data.roomID);
    
    if (room.currentSyncVideo && room.currentSyncVideo.videoId === data.videoId) {
      socket.to(data.roomID).emit('sync_video_state', {
        videoId: data.videoId,
        time: data.time,
        playing: data.playing
      });
    }
  });

  socket.on('sync_video_control', function(data) {
    const room = getRoom(data.roomID);
    
    if (room.currentSyncVideo && room.currentSyncVideo.videoId === data.videoId) {
      socket.to(data.roomID).emit('sync_video_control', {
        type: data.type,
        time: data.time,
        videoId: data.videoId
      });
    }
  });  

  socket.on('sync_video_accepted', function(data) {
    const room = getRoom(data.roomId);
    
    if (room?.currentSyncVideo && room.currentSyncVideo.videoId === data.videoId) {
        room.syncParticipants.add(socket.id);
        socket.to(data.roomId).emit('sync_video_accepted', {
            videoId: data.videoId,
            username: data.username
        });
    }
  });
  
  socket.on('sync_video_declined', function(data) {
    const room = getRoom(data.roomId);
    
    if (room?.currentSyncVideo && room.currentSyncVideo.videoId === data.videoId) {
        socket.to(room.currentSyncVideo.initiator).emit('sync_video_declined', {
            videoId: data.videoId,
            username: data.username
        });
    }
  });

  socket.on('sync_video_ended', function(data) {
    const room = getRoom(data.roomID);
    
    if (room.currentSyncVideo && room.currentSyncVideo.initiator === socket.id) {
      room.currentSyncVideo = null;
      room.syncParticipants.clear();
      socket.to(data.roomID).emit('sync_video_ended');
    }
  });

  socket.on('sync_video_left', function(data) {
    const room = getRoom(data.roomId);
    
    if (room?.syncParticipants) {
        room.syncParticipants.delete(socket.id);
        socket.to(data.roomId).emit('sync_video_left', {
            username: data.username
        });
    }
  });
});

app.get('/chat/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.redirect('/');
        }
        
        // 确保用户数据的完整性和安全性
        const sanitizedUser = {
            id: req.query.userId || '',
            username: req.query.username || '访客',
            nickname: req.query.nickname || '访客',
            gender: req.query.gender || '',
            city: req.query.city || '',
            bio: req.query.bio || '',
            avatar: req.query.avatar || '/avatar/default.png'
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

// 健康检查路由
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`服务器运行在端口 ${PORT}`)); 