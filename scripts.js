        const defaultData = {
            roster: [
                { rank: "Admin", color: "var(--color-admin)", users: [] },
                { rank: "Senior Mod", color: "var(--color-srmod)", users: [] },
                { rank: "Mod", color: "var(--color-mod)", users: [] },
                { rank: "Helper", color: "var(--color-helper)", users: [] },
                { rank: "Junior Staff", color: "var(--color-jrstaff)", users: [] }
            ],
            strikes: [],
            interviews: []
        };

        let systemData = JSON.parse(localStorage.getItem('systemStaffData')) || defaultData;
        
        if(Array.isArray(systemData)) systemData = { roster: systemData, strikes: [], interviews: [] };

        let isEditorView = false;
        let promptTarget = '';

        function showToast(message, type = "success") {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = 'toast';
            if (type === 'error') toast.style.borderLeftColor = '#ff4757';
            toast.innerText = message;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        function checkLogin() {
            const pass = document.getElementById('main-password').value;
            if (pass === PASSWORD) {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app-screen').style.display = 'flex';
                showToast('Login Successful');
                renderAll();
            } else {
                showToast('Incorrect Password', 'error');
            }
        }

        function switchTab(tabId, element) {
            document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
            document.getElementById(`page-${tabId}`).classList.remove('hidden');

            document.querySelectorAll('.sidebar-section:first-child .sidebar-item').forEach(el => el.classList.remove('active'));
            element.classList.add('active');
        }

        function renderAll() {
            renderRoster();
            renderStrikes();
            renderInterviews();

            document.querySelectorAll('.editor-only-th').forEach(el => {
                el.style.display = isEditorView ? 'table-cell' : 'none';
            });
        }

        function triggerPrompt(target) {
            if (target === 'editor' && isEditorView) {
                toggleEditorView(false);
                return;
            }
            promptTarget = target;
            document.getElementById('prompt-password').value = '';
            document.getElementById('prompt-modal').style.display = 'flex';
            document.getElementById('prompt-password').focus();
        }

        function closePrompt() { document.getElementById('prompt-modal').style.display = 'none'; }

        function submitPrompt() {
            const pass = document.getElementById('prompt-password').value;
            closePrompt();

            if (promptTarget === 'editor') {
                if (pass === 'editor') toggleEditorView(true);
                else showToast('Incorrect Editor Password', 'error');
            }
        }

        function toggleEditorView(enable) {
            isEditorView = enable;
            const toggleBtn = document.getElementById('editor-toggle-btn');
            const mainContent = document.getElementById('main-content');
            const sidebar = document.getElementById('sidebar');

            if (isEditorView) {
                toggleBtn.classList.add('toggled');
                mainContent.classList.add('editor-mode');
                sidebar.classList.add('editor-mode');
                showToast('Editor View Enabled');
            } else {
                toggleBtn.classList.remove('toggled');
                mainContent.classList.remove('editor-mode');
                sidebar.classList.remove('editor-mode');
                showToast('Editor View Disabled');
            }
            renderAll();
        }

        function calcActivityFormula(a1, a2, a3) {
            if (a1 === "" && a2 === "" && a3 === "") return "No Data";
            if (a1 === "-" && a2 === "-" && a3 === "-") return "Exempt";

            let h = parseFloat(a1) || 0;
            let i = parseFloat(a2) || 0;
            let j = parseFloat(a3) || 0;

            let k = (h > 300) ? 5 : (h >= 181) ? 4 : (h >= 131) ? 3 : (h >= 60) ? 2 : 1;
            let l = (i > 20) ? 5 : (i >= 16) ? 4 : (i >= 10) ? 3 : (i >= 6) ? 2 : 1;
            let m = (j > 12) ? 5 : (j >= 7) ? 4 : (j >= 5) ? 3 : (j >= 3) ? 2 : 1;

            const map = (x) => {
                if (x >= 6) return "Great";
                if (x >= 4) return "Good";
                if (x >= 3) return "Okay";
                if (x >= 2) return "Low";
                return "E. Low";
            };

            return `${map(k + (k === 5 ? 1 : 0))} | ${map(l + (l === 5 ? 1 : 0))} | ${map(m + (m === 5 ? 1 : 0))}`;
        }

        function calcPassFailFormula(arr) {
            const pass = arr.filter(v => v === 'P').length;
            const fail = arr.filter(v => v === 'F').length;
            return `Pass: ${pass} | Fail: ${fail}`;
        }

        function renderRoster() {
            const container = document.getElementById('roster-container');
            const searchQ = document.getElementById('search-bar').value.toLowerCase();
            container.innerHTML = '';

            const disabledState = isEditorView ? '' : 'disabled';
            const pfOptions = ['-', 'P', 'F', 'E', 'LOA'];

            const rankSelectOptions = systemData.roster.map((r, idx) => `<option value="${idx}">${r.rank}</option>`).join('');

            systemData.roster.forEach((rankGroup, rankIndex) => {
                let html = `<div class="rank-section">
                    <div class="rank-header">
                        <h3>${rankGroup.rank}</h3>
                        <button class="add-user-btn" onclick="addNewUser(${rankIndex})">+ Add to ${rankGroup.rank}</button>
                    </div>`;
                
                let hasUsersInSearch = false;

                const sortedUsers = [...rankGroup.users].map((u, i) => ({...u, originalIndex: i})).sort((a, b) => {
                    const aBad = (a.empStatus === 'resigned' || a.empStatus === 'demoted') ? 1 : 0;
                    const bBad = (b.empStatus === 'resigned' || b.empStatus === 'demoted') ? 1 : 0;
                    return aBad - bBad;
                });

                sortedUsers.forEach((user) => {
                    if (!user.username.toLowerCase().includes(searchQ)) return;
                    hasUsersInSearch = true;

                    const actResult = calcActivityFormula(user.a1, user.a2, user.a3);
                    const pfResult = calcPassFailFormula([user.s1, user.s2, user.s3, user.s4, user.s5]);

                    const buildSelect = (val, field) => {
                        let opts = pfOptions.map(o => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join('');
                        return `<select onchange="updateUser(${rankIndex}, ${user.originalIndex}, '${field}', this.value)" ${disabledState}>${opts}</select>`;
                    };

                    let empClass = user.empStatus ? `status-${user.empStatus}` : '';

                    html += `
                    <div class="user-card ${empClass}">
                        <div class="user-header">
                            <div class="user-name" style="color: ${rankGroup.color}">
                                ${isEditorView ? `<input type="text" value="${user.username}" onchange="updateUser(${rankIndex}, ${user.originalIndex}, 'username', this.value)" style="width:150px; text-align:left;">` : user.username}
                            </div>
                            <div class="user-controls">
                                ${isEditorView ? `
                                    <select onchange="moveUserRank(${rankIndex}, ${user.originalIndex}, this.value)" class="btn-small bg-secondary" style="width: auto;">
                                        <option value="" disabled selected>Move Rank...</option>
                                        ${rankSelectOptions}
                                    </select>
                                    <button class="btn-small bg-warning" onclick="setUserStatus(${rankIndex}, ${user.originalIndex}, 'resigned')">Resigned</button>
                                    <button class="btn-small bg-warning" onclick="setUserStatus(${rankIndex}, ${user.originalIndex}, 'demoted')">Demoted</button>
                                    <button class="btn-small bg-danger" onclick="deleteUser(${rankIndex}, ${user.originalIndex})">Remove</button>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="user-info-row">
                            <span>Promoted: ${isEditorView ? `<input type="text" value="${user.promoted || ''}" onchange="updateUser(${rankIndex}, ${user.originalIndex}, 'promoted', this.value)" style="width:100px;">` : (user.promoted || 'N/A')}</span>
                            <span>Region: ${isEditorView ? `<input type="text" value="${user.region || ''}" onchange="updateUser(${rankIndex}, ${user.originalIndex}, 'region', this.value)" style="width:60px;">` : (user.region || 'N/A')}</span>
                            ${user.empStatus ? `<span style="color: #ff4757; font-weight: bold; text-transform: uppercase;">(${user.empStatus})</span>` : ''}
                        </div>
                        
                        <div class="data-row">
                            <span class="data-label">Activity:</span>
                            <div class="input-group">
                                <span class="input-label">Msgs</span>
                                <input type="number" value="${user.a1}" onchange="updateUser(${rankIndex}, ${user.originalIndex}, 'a1', this.value)" ${disabledState}>
                            </div>
                            <div class="input-group">
                                <span class="input-label">Puns</span>
                                <input type="number" value="${user.a2}" onchange="updateUser(${rankIndex}, ${user.originalIndex}, 'a2', this.value)" ${disabledState}>
                            </div>
                            <div class="input-group">
                                <span class="input-label">Tix</span>
                                <input type="number" value="${user.a3}" onchange="updateUser(${rankIndex}, ${user.originalIndex}, 'a3', this.value)" ${disabledState}>
                            </div>
                            <div class="output-box">${actResult}</div>
                        </div>

                        <div class="data-row">
                            <span class="data-label">Status:</span>
                            <div class="input-group"><span class="input-label">W1</span>${buildSelect(user.s1, 's1')}</div>
                            <div class="input-group"><span class="input-label">W2</span>${buildSelect(user.s2, 's2')}</div>
                            <div class="input-group"><span class="input-label">W3</span>${buildSelect(user.s3, 's3')}</div>
                            <div class="input-group"><span class="input-label">W4</span>${buildSelect(user.s4, 's4')}</div>
                            <div class="input-group"><span class="input-label">W5</span>${buildSelect(user.s5, 's5')}</div>
                            <div class="output-box">${pfResult}</div>
                        </div>
                    </div>`;
                });

                html += `</div>`;
                if (hasUsersInSearch || rankGroup.users.length === 0) container.innerHTML += html;
            });
        }

        function renderStrikes() {
            const tbody = document.getElementById('strikes-container');
            tbody.innerHTML = '';
            const dis = isEditorView ? '' : 'disabled';
            
            systemData.strikes.forEach((strike, idx) => {
                tbody.innerHTML += `
                <tr>
                    <td><input type="text" value="${strike.username}" onchange="updateArrayItem('strikes', ${idx}, 'username', this.value)" ${dis}></td>
                    <td><input type="text" value="${strike.userid}" onchange="updateArrayItem('strikes', ${idx}, 'userid', this.value)" ${dis}></td>
                    <td><input type="date" value="${strike.date}" onchange="updateArrayItem('strikes', ${idx}, 'date', this.value)" ${dis}></td>
                    <td><input type="text" value="${strike.reason}" onchange="updateArrayItem('strikes', ${idx}, 'reason', this.value)" ${dis}></td>
                    <td><input type="number" value="${strike.strikeNum}" onchange="updateArrayItem('strikes', ${idx}, 'strikeNum', this.value)" ${dis}></td>
                    <td>
                        <select onchange="updateArrayItem('strikes', ${idx}, 'status', this.value)" ${dis}>
                            <option value="Active" ${strike.status==='Active'?'selected':''}>Active</option>
                            <option value="Appealed" ${strike.status==='Appealed'?'selected':''}>Appealed</option>
                            <option value="Expired" ${strike.status==='Expired'?'selected':''}>Expired</option>
                            <option value="Demoted" ${strike.status==='Demoted'?'selected':''}>Demoted</option>
                        </select>
                    </td>
                    <td class="editor-only-th" style="display: ${isEditorView ? 'table-cell' : 'none'}">
                        <button class="btn-small bg-danger" onclick="deleteArrayItem('strikes', ${idx})">Del</button>
                    </td>
                </tr>`;
            });
        }

        function renderInterviews() {
            const tbody = document.getElementById('interviews-container');
            tbody.innerHTML = '';
            const dis = isEditorView ? '' : 'disabled';
            
            systemData.interviews.forEach((iv, idx) => {
                tbody.innerHTML += `
                <tr>
                    <td><input type="text" value="${iv.interviewee}" onchange="updateArrayItem('interviews', ${idx}, 'interviewee', this.value)" ${dis}></td>
                    <td><input type="date" value="${iv.date}" onchange="updateArrayItem('interviews', ${idx}, 'date', this.value)" ${dis}></td>
                    <td><input type="text" value="${iv.interviewer}" onchange="updateArrayItem('interviews', ${idx}, 'interviewer', this.value)" ${dis}></td>
                    <td><input type="text" value="${iv.staffPresent}" onchange="updateArrayItem('interviews', ${idx}, 'staffPresent', this.value)" ${dis}></td>
                    <td>
                        <select onchange="updateArrayItem('interviews', ${idx}, 'status', this.value)" ${dis}>
                            <option value="Pending" ${iv.status==='Pending'?'selected':''}>Pending</option>
                            <option value="Hired" ${iv.status==='Hired'?'selected':''}>Hired</option>
                            <option value="Denied" ${iv.status==='Denied'?'selected':''}>Denied</option>
                            <option value="Direct Hire" ${iv.status==='Direct Hire'?'selected':''}>Direct Hire</option>
                        </select>
                    </td>
                    <td><input type="text" value="${iv.notes}" onchange="updateArrayItem('interviews', ${idx}, 'notes', this.value)" ${dis}></td>
                    <td class="editor-only-th" style="display: ${isEditorView ? 'table-cell' : 'none'}">
                        <button class="btn-small bg-danger" onclick="deleteArrayItem('interviews', ${idx})">Del</button>
                    </td>
                </tr>`;
            });
        }

        function updateUser(rankIdx, userIdx, field, value) {
            systemData.roster[rankIdx].users[userIdx][field] = value;
            saveData();
            renderRoster();
        }

        function setUserStatus(rankIdx, userIdx, status) {
            let currentStatus = systemData.roster[rankIdx].users[userIdx].empStatus;
            systemData.roster[rankIdx].users[userIdx].empStatus = (currentStatus === status) ? null : status; 
            saveData();
            renderRoster();
        }

        function moveUserRank(oldRankIdx, userIdx, newRankIdx) {
            if (newRankIdx === "" || oldRankIdx == newRankIdx) return;
            const user = systemData.roster[oldRankIdx].users.splice(userIdx, 1)[0];
            systemData.roster[newRankIdx].users.push(user);
            saveData();
            renderRoster();
        }

        function deleteUser(rankIdx, userIdx) {
            if (confirm("Are you sure you want to remove this user?")) {
                systemData.roster[rankIdx].users.splice(userIdx, 1);
                saveData();
                renderRoster();
            }
        }

        function addNewUser(rankIndex) {
            systemData.roster[rankIndex].users.unshift({
                id: Date.now(), username: "New_User", promoted: "YYYY-MM-DD", region: "TBD", empStatus: null,
                a1: 0, a2: 0, a3: 0, s1: "-", s2: "-", s3: "-", s4: "-", s5: "-"
            });
            saveData();
            renderRoster();
        }

        function updateArrayItem(arrayName, idx, field, value) {
            systemData[arrayName][idx][field] = value;
            saveData();
        }

        function deleteArrayItem(arrayName, idx) {
            if (confirm("Are you sure you want to delete this row?")) {
                systemData[arrayName].splice(idx, 1);
                saveData();
                if(arrayName === 'strikes') renderStrikes();
                if(arrayName === 'interviews') renderInterviews();
            }
        }

        function addStrike() {
            systemData.strikes.unshift({ username: "Username", userid: "12345", date: "", reason: "Reason", strikeNum: 1, status: "Active" });
            saveData();
            renderStrikes();
        }

        function addInterview() {
            systemData.interviews.unshift({ interviewee: "Name", date: "", interviewer: "Name", staffPresent: "None", status: "Pending", notes: "" });
            saveData();
            renderInterviews();
        }

        function saveData() { localStorage.setItem('systemStaffData', JSON.stringify(systemData)); }

        function exportData() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(systemData));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "staff_management_backup.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }

        function importData(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const imported = JSON.parse(e.target.result);
                    if(imported.roster) {
                        systemData = imported;
                        saveData();
                        renderAll();
                        showToast('Backup Imported Successfully!');
                    } else throw new Error("Invalid Format");
                } catch (err) {
                    showToast('Failed to import backup file.', 'error');
                }
            };
            reader.readAsText(file);
        }
