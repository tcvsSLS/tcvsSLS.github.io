// 純 JS 程式碼，不需要寫 <script> 標籤了！
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
  
  callBackendAPI({ action: "getImportantDates" }, function(response) {
    btn.disabled = false;
    btn.innerHTML = '📅 填寫重要日期';
    if (response.success) {
      globalImportantDates = response.dateData || [];
      renderImportantDatesTable();
    }
  }, function(error) {
    btn.disabled = false;
    alert("連線錯誤: " + error.message);
  });
}
