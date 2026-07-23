/**
 * 🌟 排課模組商務邏輯 (js/schedule.js)
 */

let globalImportantDates = [];
let selectedDateIndex = -1;

function handleScheduleClick() {
  hideAllWorkZones();
  document.getElementById("scheduleZone").style.display = "block";
  handleImportantDatesClick();
}

function handleImportantDatesClick() {
  const btn = document.getElementById("btnImportantDates");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 載入中...';
  
  document.getElementById("scheduleLeftTitle").textContent = "填寫重要日期";
  
  callBackendAPI({ action: "getImportantDates" }, function(response) {
    btn.disabled = false;
    btn.innerHTML = '📅 填寫重要日期';
    
    if (!response.success) {
      alert("載入失敗: " + response.message);
      return;
    }
    
    globalImportantDates = response.dateData || [];
    selectedDateIndex = -1;
    renderImportantDatesTable();
  }, function(error) {
    btn.disabled = false;
    btn.innerHTML = '📅 填寫重要日期';
    alert("連線錯誤: " + error.message);
  });
}

function renderImportantDatesTable() {
  const container = document.getElementById("scheduleLeftContent");
  
  let tableHtml = `
    <div class="table-responsive" style="max-height: 480px; overflow-y: auto;">
      <table class="table table-bordered table-hover align-middle bg-white">
        <thead class="table-light text-center sticky-top">
          <tr>
            <th style="width: 12%;">選擇</th>
            <th style="width: 38%;">日期</th>
            <th style="width: 50%;">說明</th>
          </tr>
        </thead>
        <tbody id="importantDatesTableBody">`;
        
  if (globalImportantDates.length === 0) {
    tableHtml += '<tr><td colspan="3" class="text-center text-muted py-3">尚無重要日期，請點擊下方「新增」按鈕建立。</td></tr>';
  } else {
    globalImportantDates.forEach((item, index) => {
      const isSelected = (index === selectedDateIndex);
      const isFixedRow = (index < 8); 
      
      const dateDisabledStr = isSelected ? "" : "disabled";
      const descDisabledStr = (isSelected && !isFixedRow) ? "" : "disabled";
      
      tableHtml += `
        <tr>
          <td class="text-center">
            <input type="radio" name="dateSelectRadio" class="form-check-input" ${isSelected ? "checked" : ""} onchange="handleDateRadioChange(${index})">
          </td>
          <td>
            <input type="date" class="form-control form-control-sm date-input fw-bold text-dark" value="${item.date || ''}" ${dateDisabledStr}>
          </td>
          <td>
            <input type="text" class="form-control form-control-sm desc-input" value="${item.description || ''}" ${descDisabledStr} ${isFixedRow ? 'placeholder="系統預設固定欄位"' : 'placeholder="請輸入說明..."'}>
          </td>
        </tr>`;
    });
  }
  
  tableHtml += `
        </tbody>
      </table>
    </div>
    <div class="d-flex gap-2 mt-3">
      <button id="btnAddDateRow" class="btn btn-outline-success flex-fill" onclick="addImportantDateRow()">新增</button>
      <button id="btnSaveDates" class="btn btn-primary flex-fill fw-bold" onclick="handleSaveImportantDates()">更新</button>
    </div>
    <small class="text-muted d-block mt-2 text-center">※ 提示：點選 RADIO 即可開啟該列編輯能力；前 8 列說明為系統預設項目，無法刪除或修改說明內容。</small>`;
    
  container.innerHTML = tableHtml;
}

function handleDateRadioChange(selectedIndex) {
  selectedDateIndex = selectedIndex;
  saveDateInputsToCache();
  
  const rows = document.querySelectorAll("#importantDatesTableBody tr");
  rows.forEach((tr, idx) => {
    const isSelected = (idx === selectedIndex);
    const isFixedRow = (idx < 8);
    
    const dateInput = tr.querySelector(".date-input");
    const descInput = tr.querySelector(".desc-input");
    
    if (dateInput) {
      if (isSelected) dateInput.removeAttribute("disabled");
      else dateInput.setAttribute("disabled", "true");
    }
    
    if (descInput) {
      if (isSelected && !isFixedRow) descInput.removeAttribute("disabled");
      else descInput.setAttribute("disabled", "true");
    }
  });
}

function saveDateInputsToCache() {
  const rows = document.querySelectorAll("#importantDatesTableBody tr");
  rows.forEach((tr, idx) => {
    if (globalImportantDates[idx]) {
      const dateInput = tr.querySelector(".date-input");
      const descInput = tr.querySelector(".desc-input");
      
      if (dateInput) globalImportantDates[idx].date = dateInput.value;
      if (descInput && idx >= 8) {
        globalImportantDates[idx].description = descInput.value.trim();
      }
    }
  });
}

function addImportantDateRow() {
  saveDateInputsToCache();
  const today = new Date().toISOString().split('T')[0];
  
  globalImportantDates.push({ date: today, description: "" });
  selectedDateIndex = globalImportantDates.length - 1;
  
  renderImportantDatesTable();
  
  const descInputs = document.querySelectorAll("#importantDatesTableBody .desc-input");
  if (descInputs.length > 0) {
    const lastDescInput = descInputs[descInputs.length - 1];
    lastDescInput.removeAttribute("disabled");
    lastDescInput.focus();
  }
}

function handleSaveImportantDates() {
  saveDateInputsToCache();
  
  const btnSave = document.getElementById("btnSaveDates");
  btnSave.disabled = true;
  btnSave.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 正在寫回試算表...';
  
  callBackendAPI({
    action: "updateImportantDates",
    payload: { dateData: globalImportantDates }
  }, function(response) {
    btnSave.disabled = false;
    btnSave.textContent = "更新";
    
    if (response.success) {
      globalImportantDates = response.dateData || [];
      selectedDateIndex = -1;
      renderImportantDatesTable();
      alert("✓ 重要日期已成功儲存並同步至試算表！");
    } else {
      alert("❌ 更新失敗：" + response.message);
    }
  }, function(error) {
    btnSave.disabled = false;
    btnSave.textContent = "更新";
    alert("❌ 連線錯誤: " + error.message);
  });
}
