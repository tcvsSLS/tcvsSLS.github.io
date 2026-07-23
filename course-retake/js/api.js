/**
 * 🌟 系統 API 通訊與通用介面控制模組 (js/api.js)
 */

// ==========================================
// 1. 動態組件載入器 (Dynamic Component Loader)
// ==========================================
async function loadComponents() {
  try {
    const [courseRes, scheduleRes] = await Promise.all([
      fetch('components/course_zone.html'),
      fetch('components/schedule_zone.html')
    ]);

    if (!courseRes.ok || !scheduleRes.ok) {
      throw new Error("HTTP 載入組件失敗");
    }

    document.getElementById('courseZoneContainer').innerHTML = await courseRes.text();
    document.getElementById('scheduleZoneContainer').innerHTML = await scheduleRes.text();

    console.log("✓ HTML 動態組件載入完成！");
    initSystem();
  } catch (err) {
    console.error("❌ 載入 HTML 組件失敗:", err);
  }
}

// 當 DOM 準備完成時，自動觸發動態組件載入
document.addEventListener("DOMContentLoaded", loadComponents);

function initSystem() {
  console.log("重補修系統優化版（無縫防空白行更新機制與排課模組）初始化完成");
}

// ==========================================
// 2. 後端 API 通訊函式
// ==========================================
function callBackendAPI(payload, successCallback, failureCallback) {
  fetch(GAS_WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "text/plain;charset=utf-8" }
  })
  .then(res => {
    if (!res.ok) throw new Error("網路回應不正常");
    return res.json();
  })
  .then(data => successCallback(data))
  .catch(err => failureCallback(err));
}

// ==========================================
// 3. 資料準備功能區 (建立、整合、上傳)
// ==========================================
function handleConvert() {
  hideAllWorkZones();
  toggleActionButtons(true, 'primary', '正在檢查並轉換檔案，請稍候...');
  callBackendAPI({ action: "convert" }, function(response) {
    toggleActionButtons(false);
    showStatusMessage(response.success, response.message);
    if (!response.success && response.fileNotFound) {
      document.getElementById("uploadArea").style.display = "block";
    }
  }, function(error) {
    toggleActionButtons(false);
    showStatusMessage(false, "系統連線錯誤: " + error.message);
  });
}

function handleConsolidate() {
  hideAllWorkZones();
  toggleActionButtons(true, 'success', '正在掃描各班級資料表並整合申請資料，請稍候...');
  callBackendAPI({ action: "consolidate" }, function(response) {
    toggleActionButtons(false);
    showStatusMessage(response.success, response.message);
  }, function(error) {
    toggleActionButtons(false);
    showStatusMessage(false, "系統連線錯誤: " + error.message);
  });
}

function handleUpload() {
  const fileInput = document.getElementById("excelFileSelector");
  const btnUpload = document.getElementById("btnUpload");
  
  if (fileInput.files.length === 0) {
    alert("請先選擇要上傳的 .xlsx 檔案！");
    return;
  }
  
  btnUpload.disabled = true;
  showStatusMessage(true, '正在上傳檔案至雲端資料夾，請稍候...', 'warning');
  
  const reader = new FileReader();
  reader.onload = function(e) {
    callBackendAPI({ 
      action: "upload", 
      base64Data: e.target.result, 
      fileName: fileInput.files[0].name 
    }, function(response) {
      btnUpload.disabled = false;
      fileInput.value = ""; 
      showStatusMessage(response.success, response.message);
      if (response.success) document.getElementById("uploadArea").style.display = "none";
    }, function(error) {
      btnUpload.disabled = false;
      showStatusMessage(false, "上傳時發生連線錯誤: " + error.message);
    });
  };
  reader.readAsDataURL(fileInput.files[0]);
}

// ==========================================
// 4. 通用 UI 切換與輔助函式
// ==========================================
function hideAllWorkZones() {
  const courseZone = document.getElementById("courseZone");
  const scheduleZone = document.getElementById("scheduleZone");
  if (courseZone) courseZone.style.display = "none";
  if (scheduleZone) scheduleZone.style.display = "none";
}

function toggleActionButtons(disabled, spinnerStyle = 'primary', text = '') {
  const ids = ["btnConvert", "btnConsolidate", "btnCourse", "btnSchedule"];
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled;
  });
  
  const statusDiv = document.getElementById("statusMessage");
  if (disabled) {
    document.getElementById("uploadArea").style.display = "none";
    statusDiv.style.display = "block";
    statusDiv.className = "mt-3 text-muted";
    statusDiv.innerHTML = `<span class="spinner-border spinner-border-sm text-${spinnerStyle}" role="status"></span> ${text}`;
  }
}

function showStatusMessage(isSuccess, text, overrideStyle = null) {
  const statusDiv = document.getElementById("statusMessage");
  statusDiv.style.display = "block";
  if (overrideStyle) {
    statusDiv.className = `mt-3 text-${overrideStyle} fw-bold`;
    statusDiv.innerHTML = text;
  } else {
    statusDiv.className = isSuccess ? "mt-3 text-success fw-bold" : "mt-3 text-danger fw-bold";
    statusDiv.innerHTML = isSuccess ? "✓ " + text : "❌ " + text;
  }
}

function showButtonFeedback(btn, errorText) {
  btn.textContent = errorText;
  btn.classList.add("btn-danger");
  setTimeout(() => {
    btn.textContent = "更新班次";
    btn.classList.remove("btn-danger");
  }, 4000);
}
