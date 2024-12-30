// 主题切换相关函数
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.add('dark-theme');
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggle) {
            themeToggle.textContent = '☀️';
        }
    }

    // 添加主题切换按钮事件监听
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // 获取所有需要的 DOM 元素
    const editProfileBtn = document.getElementById('editProfileBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const profileForm = document.getElementById('profileForm');
    const displayMode = document.getElementById('displayMode');
    const editAvatarBtn = document.getElementById('editAvatarBtn');
    const bioEditor = document.getElementById('bioEditor');
    const markdownPreview = document.getElementById('markdownPreview');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const passwordError = document.getElementById('passwordError');

    // 加载用户创建的房间列表
    loadMyRooms();

    // 密码修改按钮事件
    if (changePasswordBtn && changePasswordForm) {
        changePasswordBtn.addEventListener('click', () => {
            changePasswordForm.style.display = 'block';
            changePasswordBtn.style.display = 'none';
            // 清除之前的错误提示
            if (passwordError) {
                passwordError.style.display = 'none';
            }
        });
    }

    // 取消密码修改
    if (cancelPasswordBtn && changePasswordForm && changePasswordBtn) {
        cancelPasswordBtn.addEventListener('click', () => {
            changePasswordForm.style.display = 'none';
            changePasswordBtn.style.display = 'block';
            if (changePasswordForm) {
                changePasswordForm.reset();
            }
            // 清除错误提示
            if (passwordError) {
                passwordError.style.display = 'none';
            }
        });
    }

    // 密码修改表单提交
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword')?.value || '';
            const confirmPassword = document.querySelector('input[name="confirmPassword"]')?.value || '';
            
            // 检查密码是否匹配
            if (newPassword !== confirmPassword) {
                if (passwordError) {
                    passwordError.innerHTML = '两次输入的密码不匹配';
                    passwordError.style.display = 'block';
                }
                return;
            }
            
            // 验证新密码强度
            const validation = validatePasswordStrength(newPassword);
            if (!validation.isValid && passwordError) {
                passwordError.innerHTML = validation.errors.join('<br>');
                passwordError.style.display = 'block';
                return;
            }
            
            const formData = new FormData(e.target);
            const data = {
                currentPassword: formData.get('currentPassword'),
                newPassword: formData.get('newPassword')
            };
            
            try {
                const response = await fetch('/auth/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('密码修改成功');
                    if (changePasswordForm) {
                        changePasswordForm.reset();
                        changePasswordForm.style.display = 'none';
                    }
                    if (changePasswordBtn) {
                        changePasswordBtn.style.display = 'block';
                    }
                    if (passwordError) {
                        passwordError.style.display = 'none';
                    }
                } else {
                    if (passwordError) {
                        passwordError.textContent = result.message || '密码修改失败，请重试';
                        passwordError.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error('修改密码错误:', err);
                if (passwordError) {
                    passwordError.textContent = '密码修改失败，请重试';
                    passwordError.style.display = 'block';
                }
            }
        });
    }

    // 创建自定义渲染器
    const renderer = new marked.Renderer();

    // 自定义任务列表渲染
    renderer.listitem = function(text, task, checked) {
        if (task) {
            return `<li class="task-list-item">
                        <input type="checkbox" ${checked ? 'checked' : ''} disabled>
                        <span class="task-list-item-text">${text}</span>
                    </li>`;
        }
        return `<li>${text}</li>`;
    };

    // 自定义表格渲染
    renderer.table = function(header, body) {
        return `<div class="table-responsive">
                    <table class="table">
                        <thead>${header}</thead>
                        <tbody>${body}</tbody>
                    </table>
                </div>`;
    };

    // 配置 marked
    marked.setOptions({
        renderer: renderer,
        gfm: true,
        breaks: true,
        headerIds: true,
        mangle: false,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: true,
        xhtml: true,
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (err) {}
            }
            return hljs.highlightAuto(code).value;
        }
    });

    // 切换到编辑模式
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            if (displayMode) displayMode.style.display = 'none';
            if (profileForm) profileForm.style.display = 'block';
            if (editAvatarBtn) editAvatarBtn.style.display = 'flex';
            if (editProfileBtn) editProfileBtn.style.display = 'none';
            // 初始化 Markdown 预览
            if (bioEditor && markdownPreview) {
                updatePreview();
            }
        });
    }

    // 取消编辑
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            if (displayMode) displayMode.style.display = 'block';
            if (profileForm) profileForm.style.display = 'none';
            if (editAvatarBtn) editAvatarBtn.style.display = 'none';
            if (editProfileBtn) editProfileBtn.style.display = 'block';
        });
    }

    // 实时预览 Markdown
    if (bioEditor) {
        bioEditor.addEventListener('input', updatePreview);
    }

    function updatePreview() {
        if (bioEditor && markdownPreview) {
            const text = bioEditor.value || '';
            try {
                const emojiText = joypixels.shortnameToUnicode(text);
                const html = marked.parse(emojiText);
                markdownPreview.innerHTML = html;
                hljs.highlightAll();
            } catch (err) {
                console.error('预览更新错误:', err);
                markdownPreview.innerHTML = '<div class="error">预览生成失败</div>';
            }
        }
    }

    // 初始预览
    if (bioEditor && markdownPreview) {
        updatePreview();
    }

    // 头像上传预览处理
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const avatarPreview = document.getElementById('avatarPreview');
                    if (avatarPreview) {
                        avatarPreview.src = e.target.result;
                    }
                }
                reader.readAsDataURL(file);

                const formData = new FormData();
                formData.append('avatar', file);
                try {
                    const res = await fetch('/profile/avatar', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        alert(data.msg || '上传失败');
                    }
                } catch (err) {
                    console.error('上传失败:', err);
                    alert('上传失败');
                }
            }
        });
    }

    // 个人信息更新
    if (profileForm) {
        // 防止重复提交的标志
        let isSubmitting = false;

        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // 如果正在提交，则返回
            if (isSubmitting) return;
            
            // 设置提交标志
            isSubmitting = true;

            const formData = new FormData(this);
            const formDataObj = {};
            formData.forEach((value, key) => {
                formDataObj[key] = value;
            });

            try {
                const res = await fetch('/profile/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formDataObj)
                });

                const data = await res.json();
                if (res.ok) {
                    // 更新显示的内容
                    const bioContent = document.querySelector('.bio-content');
                    if (bioContent) {
                        bioContent.innerHTML = data.user.parsedBio || '<p>这个人很懒，什么都没写~</p>';
                    }
                    
                    // 更新显示模式下的信息
                    try {
                        const displayElements = {
                            nickname: document.getElementById('displayNickname'),
                            email: document.getElementById('displayEmail'),
                            city: document.getElementById('displayCity'),
                            gender: document.getElementById('displayGender')
                        };
                        
                        // 检查所有元素是否存在
                        if (Object.values(displayElements).every(el => el)) {
                            displayElements.nickname.textContent = data.user.nickname || '';
                            displayElements.email.textContent = data.user.email || '';
                            displayElements.city.textContent = data.user.city || '';
                            // 转换性别显示
                            const genderMap = {
                                'male': '男',
                                'female': '女',
                                'other': '其他'
                            };
                            displayElements.gender.textContent = genderMap[data.user.gender] || '其他';
                        } else {
                            console.error('某些显示元素未找到');
                        }
                    } catch (err) {
                        console.error('更新显示内容时出错:', err);
                    }

                    // 切换回显示模式
                    document.getElementById('displayMode').style.display = 'block';
                    document.getElementById('profileForm').style.display = 'none';
                    document.getElementById('editAvatarBtn').style.display = 'none';
                    document.getElementById('editProfileBtn').style.display = 'block';

                    alert('更新成功！');
                } else {
                    alert(data.msg || '更新失败');
                }
            } catch (err) {
                console.error('更新失败:', err);
                alert('更新失败，请稍后重试');
            } finally {
                // 重置提交标志
                isSubmitting = false;
            }
        });
    }

    // 添加回车键监听
    document.getElementById('roomId').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinRoom();
        }
    });

    document.getElementById('roomPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinRoom();
        }
    });

    // 头像上传处理
    const avatarUpload = document.getElementById('avatarUpload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const res = await fetch('/profile/avatar', {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();
                if (res.ok) {
                    document.getElementById('avatar').src = data.path;
                    alert('上传成功！');
                } else {
                    alert(data.msg || '上传失败');
                }
            } catch (err) {
                console.error('上传失败:', err);
                alert('上传失败，请稍后重试');
            }
        });
    }

    // 添加拖拽功能
    document.addEventListener('DOMContentLoaded', function() {
        const modal = document.querySelector('.modal-content');
        const header = document.querySelector('.modal-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, modal);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate(${xPos}px, ${yPos}px)`;
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
    });

    // 修改时间格式化函数
    function formatDate(date) {
        if (!date || date === 'Invalid Date') {
            return 'N/A';
        }
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) {
                return 'N/A';
            }
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (error) {
            console.error('日期格式化错误:', error);
            return 'N/A';
        }
    }

    // 密码验证函数
    function validatePasswordStrength(password) {
        const minLength = 8;
        const maxLength = 20;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasNoSpaces = !/\s/.test(password);
        
        const errors = [];
        
        if (password.length < minLength) errors.push(`密码长度不能少于${minLength}个字符`);
        if (password.length > maxLength) errors.push(`密码长度不能超过${maxLength}个字符`);
        if (!hasUpperCase) errors.push('需要包含大写字母');
        if (!hasLowerCase) errors.push('需要包含小写字母');
        if (!hasNumbers) errors.push('需要包含数字');
        if (!hasNoSpaces) errors.push('不能包含空格');
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
});

// 将 joinRoom 函数移到全局作用域
async function joinRoom() {
    const roomId = document.getElementById('roomId').value;
    const password = document.getElementById('roomPassword').value;
    
    if (!roomId) {
        alert('请输入房间ID');
        return;
    }

    try {
        // 先验证房间
        const verifyResponse = await fetch('/chat/verify-room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomId,
                password
            })
        });

        const verifyData = await verifyResponse.json();
        
        if (!verifyResponse.ok) {
            alert(verifyData.msg || '无法进入房间');
            return;
        }

        if (verifyData.isNewRoom) {
            alert('房间创建成功！' + (password ? '已设置密码' : '未设置密码'));
        }

        // 验证成功后进入房间
        window.location.href = `/chat/${roomId}`;
    } catch (err) {
        console.error('验证房间失败:', err);
        alert('验证房间失败');
    }
}

// 房间管理相关函数移到全局作用域
async function loadMyRooms() {
    try {
        const response = await fetch('/profile/my-rooms');
        const rooms = await response.json();
        
        const roomsList = document.getElementById('myRoomsList');
        roomsList.innerHTML = rooms.map(room => `
            <tr>
                <td class="fixed-column">${room.roomId}</td>
                <td>${room.name}</td>
                <td>
                    <span class="status-badge ${room.status === 'active' ? 'status-active' : 'status-disabled'}">
                        ${room.status === 'active' ? '正常' : '已禁用'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editRoom('${room._id}')">编辑</button>
                    <button class="btn btn-sm ${room.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleRoomStatus('${room._id}', '${room.status}')">
                        ${room.status === 'active' ? '禁用' : '启用'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRoom('${room._id}')">删除</button>
                    <button class="btn btn-sm btn-secondary" onclick="clearMessages('${room._id}')">清除记录</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载房间列表失败:', error);
    }
}

async function editRoom(roomId) {
    try {
        const response = await fetch(`/profile/rooms/${roomId}`);
        if (!response.ok) {
            throw new Error('获取房间信息失败');
        }
        const room = await response.json();

        // 设置表单字段值
        document.getElementById('editRoomId').value = room.roomId;
        document.getElementById('editRoomName').value = room.name;
        document.getElementById('editRoomDescription').value = room.description || '';
        document.getElementById('editRoomPassword').value = '';
        document.getElementById('editSaveMessages').checked = room.saveMessages;

        // 显示模态框
        const modal = document.getElementById('editRoomModal');
        modal.style.display = 'block';

        // 处理表单提交
        const form = document.getElementById('editRoomForm');
        form.onsubmit = async (e) => {
            e.preventDefault();

            const formData = {
                name: document.getElementById('editRoomName').value.trim(),
                description: document.getElementById('editRoomDescription').value.trim(),
                password: document.getElementById('editRoomPassword').value,
                saveMessages: document.getElementById('editSaveMessages').checked
            };

            try {
                const updateResponse = await fetch(`/profile/rooms/${roomId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await updateResponse.json();

                if (updateResponse.ok && result.success) {
                    closeEditModal();
                    loadMyRooms();
                    alert(result.msg || '更新成功');
                } else {
                    alert(result.msg || '更新失败');
                }
            } catch (error) {
                console.error('更新房间失败:', error);
                alert('更新失败，请重试');
            }
        };
    } catch (error) {
        console.error('获取房间信息失败:', error);
        alert('获取房间信息失败');
    }
}

async function toggleRoomStatus(roomId, currentStatus) {
    const action = currentStatus === 'active' ? '禁用' : '启用';
    if (confirm(`确定要${action}这个房间吗？`)) {
        try {
            const response = await fetch(`/profile/rooms/${roomId}/toggle-status`, {
                method: 'POST'
            });
            if (response.ok) {
                loadMyRooms();
            }
        } catch (error) {
            console.error('切换房间状态失败:', error);
        }
    }
}

async function deleteRoom(roomId) {
    if (confirm('确定要删除这个房间吗？')) {
        try {
            const response = await fetch(`/profile/rooms/${roomId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                loadMyRooms();
            }
        } catch (error) {
            console.error('删除房间失败:', error);
        }
    }
}

async function clearMessages(roomId) {
    if (confirm('确定要清除该房间的所有聊天记录吗？')) {
        try {
            const response = await fetch(`/profile/rooms/${roomId}/messages`, {
                method: 'DELETE'
            });
            if (response.ok) {
                alert('聊天记录已清除');
            }
        } catch (error) {
            console.error('清除聊天记录失败:', error);
        }
    }
}

function closeEditModal() {
    const modal = document.getElementById('editRoomModal');
    modal.style.display = 'none';
    document.getElementById('editRoomForm').reset();
}