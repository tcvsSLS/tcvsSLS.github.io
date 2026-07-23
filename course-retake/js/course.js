/**
 * 🌟 開課模組商務邏輯 (js/course.js)
 */

let globalStudentData = []; 
let globalSessionData = [];
let selectedSessionIndex = -1;
let deletedSessionsQueue = [];

function handleCourseClick() {
  hideAllWorkZones();
  toggleActionButtons(true, 'info', '正在讀取學生申請明細與最新數據，請稍候...');
  
  callBackendAPI({ action: "getCourseStats" }, function(response) {
    toggleActionButtons(false);
    if (!response.success) {
      showStatusMessage(false, response.message);
      return;
    }
    
    document.getElementById("statusMessage").style.display = "none";
    const rawData = response.studentData || response.data || [];
    
    if (rawData.length > 0 && !Array.isArray(rawData[0])) {
      alert("⚠️ 格式錯誤提示：後端回傳格式不符，請同步更新後端 GAS 程式碼！");
      globalStudentData = [];
    } else {
      globalStudentData = rawData;
    }
    
    globalSessionData = (response.sessionData || []).map(s => ({
      session: s.session,
      count: s.count,
      maxHours: s.maxHours || s.maxCredit || 0,
      originalSession: s.session,
      isNew: false,
      courseType: s.courseType || "專班",
      extendedStatus: s.extendedStatus || ""
    }));
    
    selectedSessionIndex = -1;
    deletedSessionsQueue = [];
    
    document.getElementById("courseZone").style.display = "block";
    renderStudentTable();
    recalculateSessionCounts();
    syncStudentCheckboxesWithSelectedSession();
  }, function(error) {
    toggleActionButtons(false);
    showStatusMessage(false, "系統連線錯誤: " + error.message);
  });
}

function renderStudentTable() {
  const thead = document.getElementById("courseTableHead");
  const tbody = document.getElementById("courseTableBody");
  
  if (!globalStudentData || globalStudentData.length <= 1) {
    thead.innerHTML = "";
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">（目前無符合格式之學生申請資料）</td></tr>';
    return;
  }
  
  const headerRow = globalStudentData[0];
  
  let headHtml = `<tr>
    <th style="width: 75px;" class="text-center">
      <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size: 13px;" onclick="clearAllStudentCheckboxes()">清空</button>
    </th>`;
  for (let i = 1; i <= 8; i++) {
    const colName = headerRow[i] || "";
    const styleAttr = colName.includes("科目") ? 'style="width: 22%;" class="text-start ps-3"' : '';
    headHtml += `<th ${styleAttr}>${colName}</th>`;
  }
  headHtml += '</tr>';
  thead.innerHTML = headHtml;
  
  let bodyHtml = "";
  for (let r = 1; r < globalStudentData.length; r++) {
    const rowData = globalStudentData[r];
    
    const classNum = parseInt(String(rowData[2]).trim(), 10);
    const isExtendedStudent = !isNaN(classNum) && classNum > 400;
    const isMakeUp = String(rowData[7]).trim() === "補修";
    
    const cellBgClass = isMakeUp ? " bg-light-green" : "";
    
    bodyHtml += `<tr data-row-index="${r}">
      <td class="text-center${cellBgClass}"><input type="checkbox" class="form-check-input student-item-checkbox"></td>`;
    for (let c = 1; c <= 8; c++) {
      const val = rowData[c] !== undefined ? rowData[c] : "";
      let tdClass = "text-center" + cellBgClass;
      
      if (c === 8) {
        tdClass += " fw-bold text-primary cell-student-session";
      } else if (headerRow[c] && headerRow[c].includes("科目")) {
        tdClass += " text-start ps-3";
      }
      
      if (isExtendedStudent && !isMakeUp && c !== 8) {
        tdClass += " text-deep-green";
      }
      
      bodyHtml += `<td class="${tdClass}">${val}</td>`;
    }
    bodyHtml += '</tr>';
  }
  tbody.innerHTML = bodyHtml;
}

function renderSessionTable() {
  const tbody = document.getElementById("sessionTableBody");
  if (globalSessionData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">「配課」工作表中尚無上課班次。</td></tr>';
    return;
  }
  
  let sumSessions = 0;
  let bodyHtml = "";
  
  globalSessionData.forEach((item, index) => {
    const isSelected = (index === selectedSessionIndex);
    const disabledAttr = isSelected ? "" : "disabled";
    const displayHours = Number.isInteger(item.maxHours) ? item.maxHours : (item.maxHours || 0).toFixed(1);
    
    bodyHtml += `
      <tr>
        <td class="text-center">
          <input type="radio" name="editSessionRadio" class="form-check-input" ${isSelected ? "checked" : ""} onchange="handleRadioChange(${index})">
        </td>
        <td class="p-1">
          <input type="text" class="form-control form-control-sm session-name-input fw-bold text-success" 
                 value="${item.session}" ${disabledAttr} ${item.isNew ? 'data-is-new="true" placeholder="請輸入新班次..."' : `data-old-name="${item.session}"`}>
        </td>
        <td class="text-center fw-bold text-secondary">${displayHours} 節</td>
        <td class="text-center fw-bold text-secondary">${item.count} 人</td>
        <td class="p-2 text-start">
          <div class="form-check">
            <input type="radio" name="courseType_${index}" value="專班" id="type1_${index}" class="form-check-input course-type-radio" 
                   ${item.courseType === "專班" ? "checked" : ""} ${disabledAttr} onchange="globalSessionData[${index}].courseType='專班'; recalculateSessionCounts();">
            <label class="form-check-label fw-bold text-dark" for="type1_${index}">專班</label>
          </div>
          <div class="form-check">
            <input type="radio" name="courseType_${index}" value="自學輔導" id="type2_${index}" class="form-check-input course-type-radio" 
                   ${item.courseType === "自學輔導" ? "checked" : ""} ${disabledAttr} onchange="globalSessionData[${index}].courseType='自學輔導'; recalculateSessionCounts();">
            <label class="form-check-label fw-bold text-dark" for="type2_${index}">自學輔導</label>
          </div>
        </td>
      </tr>`;
    sumSessions += item.count;
  });
  
  bodyHtml += `
    <tr class="table-success fw-bold text-dark">
      <td></td>
      <td class="ps-3 text-success">人數總計</td>
      <td></td>
      <td class="text-center text-success">${sumSessions} 人</td>
      <td></td>
    </tr>`;
    
  tbody.innerHTML = bodyHtml;
}

function handleRadioChange(selectedIndex) {
  selectedSessionIndex = selectedIndex;
  
  const inputs = document.querySelectorAll(".session-name-input");
  inputs.forEach((input, idx) => {
    if (idx === selectedIndex) { input.removeAttribute("disabled"); input.focus(); }
    else { input.setAttribute("disabled", "true"); }
  });
  
  globalSessionData.forEach((_, idx) => {
    document.querySelectorAll(`input[name="courseType_${idx}"]`).forEach(r => {
      if (idx === selectedIndex) r.removeAttribute("disabled");
      else r.setAttribute("disabled", "true");
    });
  });

  syncStudentCheckboxesWithSelectedSession();
}

function saveCurrentInputsToCache() {
  const inputs = document.querySelectorAll(".session-name-input");
  inputs.forEach((input, index) => {
    if (globalSessionData[index]) {
      globalSessionData[index].session = input.value.trim();
      const checkedRadio = document.querySelector(`input[name="courseType_${index}"]:checked`);
      if (checkedRadio) globalSessionData[index].courseType = checkedRadio.value;
    }
  });
}

function addNewSessionRow() {
  saveCurrentInputsToCache();
  globalSessionData.push({ session: "", count: 0, maxHours: 0, originalSession: "", isNew: true, courseType: "專班", extendedStatus: "" });
  selectedSessionIndex = globalSessionData.length - 1;
  renderSessionTable();
  syncStudentCheckboxesWithSelectedSession();
  const inputs = document.querySelectorAll(".session-name-input");
  if (inputs.length > 0) inputs[inputs.length - 1].focus();
}

function deleteSessionRow() {
  if (selectedSessionIndex === -1) return; 
  saveCurrentInputsToCache();
  
  const target = globalSessionData[selectedSessionIndex];
  const sessionName = target.session ? target.session.trim() : "";
  
  if (sessionName) {
    for (let r = 1; r < globalStudentData.length; r++) {
      if (String(globalStudentData[r][8]).trim() === sessionName) globalStudentData[r][8] = "";
    }
  }
  if (!target.isNew && target.originalSession) deletedSessionsQueue.push(target.originalSession);
  
  globalSessionData.splice(selectedSessionIndex, 1);
  selectedSessionIndex = -1;
  
  renderStudentTable();
  recalculateSessionCounts();
  syncStudentCheckboxesWithSelectedSession();
}

function handleDistribution() {
  if (selectedSessionIndex === -1) return;
  saveCurrentInputsToCache();
  
  const targetSessionName = globalSessionData[selectedSessionIndex].session.trim();
  if (!targetSessionName) return;
  
  document.querySelectorAll("#courseTableBody tr").forEach(tr => {
    const chk = tr.querySelector(".student-item-checkbox");
    if (!chk) return;
    
    const arrayIndex = parseInt(tr.getAttribute("data-row-index"), 10);
    const currentSession = String(globalStudentData[arrayIndex][8]).trim();
    const cellSession = tr.querySelector(".cell-student-session");
    
    if (chk.checked) {
      if (currentSession !== targetSessionName) {
        globalStudentData[arrayIndex][8] = targetSessionName; 
        if (cellSession) cellSession.textContent = targetSessionName; 
      }
    } else {
      if (currentSession === targetSessionName) {
        globalStudentData[arrayIndex][8] = ""; 
        if (cellSession) cellSession.textContent = ""; 
      }
    }
  });
  
  recalculateSessionCounts();
}

function recalculateSessionCounts() {
  const studentIdx = 1; 
  const classIdx = 2;   
  const creditIdx = 6;  
  const statusIdx = 7;  

  globalSessionData.forEach(item => {
    item.count = 0;
    
    let studentDistinctMap = {}; 
    let studentHoursMap = {};    
    let hasExtendedStudent = false; 
    
    const currentSessionName = item.session.trim();
    const type = item.courseType || "專班";
    
    if (currentSessionName !== "") {
      for (let r = 1; r < globalStudentData.length; r++) {
        const studentSession = String(globalStudentData[r][8]).trim(); 
        
        if (studentSession === currentSessionName) {
          const sKey = String(globalStudentData[r][studentIdx]).trim();
          if (!sKey) continue;
          
          studentDistinctMap[sKey] = true;
          
          const creditValue = parseFloat(globalStudentData[r][creditIdx]) || 0;
          const statusValue = String(globalStudentData[r][statusIdx]).trim();
          
          let rowHours = 0;
          if (type === "專班") {
            rowHours = creditValue * 6;
          } else { 
            if (statusValue === "補修") {
              rowHours = creditValue * 6;
            } else { 
              rowHours = creditValue * 3;
            }
          }
          
          studentHoursMap[sKey] = (studentHoursMap[sKey] || 0) + rowHours;

          const classNum = parseInt(String(globalStudentData[r][classIdx]).trim(), 10);
          if (!isNaN(classNum) && classNum > 400) hasExtendedStudent = true;
        }
      }
    }
    
    item.count = Object.keys(studentDistinctMap).length;
    
    const allStudentAccumulatedHours = Object.values(studentHoursMap);
    item.maxHours = allStudentAccumulatedHours.length > 0 ? Math.max(...allStudentAccumulatedHours) : 0;
    
    item.extendedStatus = hasExtendedStudent ? "有延修生" : "";
  });
  
  renderSessionTable();
}

function syncStudentCheckboxesWithSelectedSession() {
  if (selectedSessionIndex === -1) {
    clearAllStudentCheckboxes();
    return;
  }
  saveCurrentInputsToCache();
  const targetSessionName = globalSessionData[selectedSessionIndex] ? globalSessionData[selectedSessionIndex].session.trim() : "";

  document.querySelectorAll("#courseTableBody tr").forEach(tr => {
    const arrayIndex = parseInt(tr.getAttribute("data-row-index"), 10);
    const chk = tr.querySelector(".student-item-checkbox");
    if (chk) {
      const studentSession = String(globalStudentData[arrayIndex][8]).trim();
      chk.checked = (targetSessionName !== "" && studentSession === targetSessionName);
    }
  });
}

function clearAllStudentCheckboxes() {
  document.querySelectorAll(".student-item-checkbox").forEach(chk => chk.checked = false);
}

function handleUpdateCourse() {
  const btnUpdate = document.getElementById("btnUpdateCourse");
  const sessionRenames = [];
  const newSessions = [];
  
  saveCurrentInputsToCache();
  
  const finalSessionData = [];
  
  globalSessionData.forEach((item) => {
    const currentName = item.session.trim();
    
    if (currentName === "") {
      if (!item.isNew && item.originalSession) {
        deletedSessionsQueue.push(item.originalSession);
        
        for (let r = 1; r < globalStudentData.length; r++) {
          if (String(globalStudentData[r][8]).trim() === item.originalSession) {
            globalStudentData[r][8] = "";
          }
        }
      }
    } else {
      if (!item.isNew && item.originalSession && item.originalSession !== currentName) {
        sessionRenames.push({ oldName: item.originalSession, newName: currentName });
      } else if (item.isNew) {
        newSessions.push(currentName);
      }
      finalSessionData.push(item);
    }
  });

  const sessionRows = finalSessionData.map(item => {
    return [
      item.session, 
      item.maxHours || 0, 
      item.count, 
      item.extendedStatus || "", 
      item.courseType || "專班"
    ];
  });
  
  btnUpdate.disabled = true;
  btnUpdate.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> 正在儲存班次並精準同步，請稍候...';
  
  callBackendAPI({ 
    action: "updateCourseStatus", 
    payload: { sessionRenames, newSessions, deletedSessions: deletedSessionsQueue, studentData: globalStudentData, sessionRows } 
  }, function(response) {
    btnUpdate.disabled = false;
    btnUpdate.textContent = "更新班次";
    
    if (response.success) {
      globalStudentData = response.studentData || response.data || [];
      globalSessionData = (response.sessionData || []).map(s => ({ 
        session: s.session, 
        count: s.count, 
        maxHours: s.maxHours || s.maxCredit || 0, 
        originalSession: s.session, 
        isNew: false, 
        courseType: s.courseType || "專班", 
        extendedStatus: s.extendedStatus || ""
      }));
      selectedSessionIndex = -1;
      deletedSessionsQueue = [];
      renderStudentTable();
      recalculateSessionCounts(); 
      syncStudentCheckboxesWithSelectedSession();
    } else {
      showButtonFeedback(btnUpdate, "更新失敗：" + response.message);
    }
  }, function(error) {
    btnUpdate.disabled = false;
    showButtonFeedback(btnUpdate, "連線錯誤");
  });
}
