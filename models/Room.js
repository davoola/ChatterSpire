const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    password: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'disabled'],
        default: 'active'
    },
    saveMessages: {
        type: Boolean,
        default: false
    }
});

RoomSchema.pre('save', function(next) {
    if (this.isModified('saveMessages')) {
        this.saveMessages = Boolean(this.saveMessages);
    }
    next();
});

RoomSchema.pre('find', function() {
    this.select('+saveMessages');
});

RoomSchema.pre('findOne', function() {
    this.select('+saveMessages');
});

module.exports = mongoose.model('Room', RoomSchema); 