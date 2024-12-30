// 页面切换功能
function showSection(section) {
    // 隐藏所有部分
    document.getElementById('usersSection').style.display = 'none';
    document.getElementById('roomsSection').style.display = 'none';
    
    // 移除所有按钮的活动状态
    document.getElementById('usersBtn').classList.remove('active');
    document.getElementById('roomsBtn').classList.remove('active');
    
    // 显示选中的部分
    document.getElementById(section + 'Section').style.display = 'block';
    document.getElementById(section + 'Btn').classList.add('active');
    
    // 加载相应的数据
    if (section === 'users') {
        loadUsers();
    } else if (section === 'rooms') {
        loadRooms();
    }
}

// 加载用户列表
async function loadUsers() {
    try {
        const response = await fetch('/admin/users');
        const users = await response.json();
        
        const userTableBody = document.getElementById('userTableBody');
        userTableBody.innerHTML = users.map(user => `
            <tr>
                <td class="avatar-column">
                    <img src="${user.avatar}" alt="头像" class="user-avatar" 
                         onerror="this.src='/avatar/default.png'">
                </td>
                <td class="username-column">${user.username}</td>
                <td class="nickname-column">${user.nickname || '-'}</td>
                <td class="role-column">${user.role === 'admin' ? '管理员' : '用户'}</td>
                <td class="timestamp-column">${formatDate(user.createdAt)}</td>
                <td class="timestamp-column">${formatDate(user.lastLoginAt)}</td>
                <td class="status-column">
                    <span class="status-badge ${user.status === 'active' ? 'status-active' : 'status-disabled'}">
                        ${user.status === 'active' ? '正常' : '已禁用'}
                    </span>
                </td>
                <td class="actions-column">
                    <button class="btn btn-sm btn-primary" onclick="editUser('${user._id}')">编辑</button>
                    <button class="btn btn-sm ${user.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleUserStatus('${user._id}', '${user.status}')">
                        ${user.status === 'active' ? '禁用' : '启用'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user._id}')">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

// 加载房间列表
async function loadRooms() {
    try {
        const response = await fetch('/admin/rooms');
        const rooms = await response.json();
        
        const roomTableBody = document.getElementById('roomTableBody');
        roomTableBody.innerHTML = rooms.map(room => `
            <tr>
                <td class="room-id-column">${room.roomId}</td>
                <td class="name-column">${room.name}</td>
                <td class="creator-column">${room.createdBy.username}</td>
                <td class="timestamp-column">${new Date(room.createdAt).toLocaleString()}</td>
                <td class="password-column">${room.password ? '是' : '否'}</td>
                <td class="status-column">
                    <span class="status-badge ${room.status === 'active' ? 'status-active' : 'status-disabled'}">
                        ${room.status === 'active' ? '正常' : '已禁用'}
                    </span>
                </td>
                <td class="save-column">${room.saveMessages ? '是' : '否'}</td>
                <td class="actions-column">
                    <button class="btn btn-sm btn-primary" onclick="editRoom('${room._id}')">编辑</button>
                    <button class="btn btn-sm ${room.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleRoomStatus('${room._id}', '${room.status}')">
                        ${room.status === 'active' ? '禁用' : '启用'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRoom('${room._id}')">删除</button>
                    <button class="btn btn-sm btn-secondary" onclick="clearRoomMessages('${room._id}')">清除记录</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载房间列表失败:', error);
    }
}

// 格式化日期
function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}



        // 修改显示模态框的函数
        function showModal(modalId) {
            const modal = document.getElementById(modalId);
            modal.style.display = 'block';
            
            // 重置模态框位置
            const modalContent = modal.querySelector('.modal-content');
            modalContent.style.transform = 'translate(-50%, -50%)';
            
            // 初始化拖动功能
            initDraggable(modalId);
        }

        // 修改关闭模态框的函数
        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            modal.style.display = 'none';
        }

        // 修改现有的显示函数
        function showAddUserModal() {
            showModal('addUserModal');
        }

        function showEditUserModal() {
            showModal('editUserModal');
        }

        function showAddRoomModal() {
            showModal('addRoomModal');
        }

        function showEditRoomModal() {
            showModal('editRoomModal');
        }
// 拖动功能实现
function initDraggable(modalId) {
    const modal = document.getElementById(modalId);
    const modalContent = modal.querySelector('.modal-content');
    const modalHeader = modal.querySelector('.modal-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    modalHeader.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        
        if (e.target === modalHeader || e.target.tagName.toLowerCase() === 'h2') {
            isDragging = true;
            modalContent.classList.add('dragging');
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, modalContent);
        }
    }

    function dragEnd() {
        if (isDragging) {
            isDragging = false;
            modalContent.classList.remove('dragging');
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
}

// 用户相关操作
async function editUser(userId) {
    try {
        const response = await fetch(`/admin/users/${userId}`);
        const user = await response.json();
        
        // 填表单
        const form = document.getElementById('editUserForm');
        form.querySelector('[name="userId"]').value = user._id;
        form.querySelector('[name="username"]').value = user.username;
        form.querySelector('[name="nickname"]').value = user.nickname || '';
        form.querySelector('[name="email"]').value = user.email || '';
        form.querySelector('[name="city"]').value = user.city || '';
        form.querySelector('[name="gender"]').value = user.gender;
        form.querySelector('[name="role"]').value = user.role;
        
        showModal('editUserModal');
    } catch (error) {
        console.error('获取用户信息失败:', error);
    }
}

async function toggleUserStatus(userId, currentStatus) {
    if (confirm(`确定要${currentStatus === 'active' ? '禁用' : '启用'}该用户吗？`)) {
        try {
            const response = await fetch(`/admin/users/${userId}/toggle-status`, {
                method: 'POST'
            });
            if (response.ok) {
                loadUsers();
            }
        } catch (error) {
            console.error('切换用户状态失败:', error);
        }
    }
}

async function deleteUser(userId) {
    if (confirm('确定要删除该用户吗？此操作不可恢复！')) {
        try {
            const response = await fetch(`/admin/users/${userId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                loadUsers();
            }
        } catch (error) {
            console.error('删除用户失败:', error);
        }
    }
}

// 房间相关操作
async function editRoom(roomId) {
    try {
        const response = await fetch(`/admin/rooms/${roomId}`);
        const room = await response.json();
        
        // 填充表单
        const form = document.getElementById('editRoomForm');
        form.querySelector('#editRoomId').value = room._id;
        form.querySelector('[name="roomIdDisplay"]').value = room.roomId;
        form.querySelector('[name="name"]').value = room.name;
        form.querySelector('[name="description"]').value = room.description || '';
        form.querySelector('[name="saveMessages"]').checked = room.saveMessages;
        
        showModal('editRoomModal');
    } catch (error) {
        console.error('获取房间信息失败:', error);
    }
}

async function toggleRoomStatus(roomId, currentStatus) {
    if (confirm(`确定要${currentStatus === 'active' ? '禁用' : '启用'}该房间吗？`)) {
        try {
            const response = await fetch(`/admin/rooms/${roomId}/toggle-status`, {
                method: 'POST'
            });
            if (response.ok) {
                loadRooms();
            }
        } catch (error) {
            console.error('切换房间状态失败:', error);
        }
    }
}

async function deleteRoom(roomId) {
    if (confirm('确定要删除该房间吗？此操作不可恢复！')) {
        try {
            const response = await fetch(`/admin/rooms/${roomId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                loadRooms();
            }
        } catch (error) {
            console.error('删除房间失败:', error);
        }
    }
}

// 添加清除房间消息记录的功能
async function clearRoomMessages(roomId) {
    if (confirm('确定要清除该房间的所有聊天记录吗？此操作不可恢复！')) {
        try {
            const response = await fetch(`/admin/rooms/${roomId}/messages`, {
                method: 'DELETE'
            });
            if (response.ok) {
                alert('聊天记录已清除');
                loadRooms();
            } else {
                alert('清除失败');
            }
        } catch (error) {
            console.error('清除聊天记录失败:', error);
            alert('清除失败');
        }
    }
}

// 表单提交处理
document.addEventListener('DOMContentLoaded', function() {
    // 添加用户表单提交
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                const response = await fetch('/admin/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                const data = await response.json();
                if (response.ok) {
                    closeModal('addUserModal');
                    e.target.reset();
                    loadUsers();
                    alert('用户添加成功');
                } else {
                    alert(data.msg || '添加用户失败');
                }
            } catch (error) {
                console.error('添加用户失败:', error);
                alert('添加用户失败');
            }
        };
    }

    // 添加房间表单提交
    const addRoomForm = document.getElementById('addRoomForm');
    if (addRoomForm) {
        addRoomForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                const response = await fetch('/admin/rooms', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                const data = await response.json();
                if (response.ok) {
                    closeModal('addRoomModal');
                    e.target.reset();
                    loadRooms();
                    alert('房间添加成功');
                } else {
                    alert(data.msg || '添加房间失败');
                }
            } catch (error) {
                console.error('添加房间失败:', error);
                alert('添加房间失败');
            }
        };
    }

    // 编辑用户表单提交
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const userId = formData.get('userId');
            try {
                const response = await fetch(`/admin/users/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                const data = await response.json();
                if (response.ok) {
                    closeModal('editUserModal');
                    loadUsers();
                    alert('用户更新成功');
                } else {
                    alert(data.msg || '更新用户失败');
                }
            } catch (error) {
                console.error('更新用户失败:', error);
                alert('更新用户失败');
            }
        };
    }

    // 编辑房间表单提交
    const editRoomForm = document.getElementById('editRoomForm');
    if (editRoomForm) {
        editRoomForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const roomId = formData.get('roomId');
            try {
                const response = await fetch(`/admin/rooms/${roomId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                const data = await response.json();
                if (response.ok) {
                    closeModal('editRoomModal');
                    loadRooms();
                    alert('房间更新成功');
                } else {
                    alert(data.msg || '更新房间失败');
                }
            } catch (error) {
                console.error('更新房间失败:', error);
                alert('更新房间失败');
            }
        };
    }
});

// 页面加载时显示用户管理部分并初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 添加主题切换按钮事件监听
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.toggle('dark-theme');
                themeToggle.textContent = isDark ? '☀️' : '🌙';
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
            });
        }

        // 初始化主题
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            if (themeToggle) {
                themeToggle.textContent = '☀️';
            }
        }

        // 显示用户管理部分
        showSection('users');
    } catch (error) {
        console.error('初始化失败:', error);
    }
});

// 添加显示模态框的函数
function showAddUserModal() {
    showModal('addUserModal');
}

function showAddRoomModal() {
    showModal('addRoomModal');
}