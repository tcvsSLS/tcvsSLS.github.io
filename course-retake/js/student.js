/**
 * 🌟 學生端選課系統邏輯 (js/student.js)
 */

let globalStudentInfo = null;
let globalOriginalCourses = [];

function toggleLoading(show) {
  const overlay = document.getElementById("loading-overlay");
  if (show) overlay.classList.remove("d-none");
  else overlay.classList.add("d-none");
}

function fetchStudentData() {
  const studentId = document.getElementById("student-id").value.trim();
  const idCard4 = document.getElementById("id-card-4").value.trim();
  const msgDiv = document.getElementById("no-data-msg");
  const btnQuery = document.getElementById("btnQuery");

  if (!studentId || !idCard4) return;

  msgDiv.classList.add("d-none");
  document.getElementById("student-info-block").classList.add("d-none");
  document.getElementById("course-table-block").classList.add("d-none");

  btnQuery.disabled = true;
  toggleLoading(true);

  // 引用 config.js 裡定義的 STUDENT_WEB_APP_URL
  fetch(STUDENT_WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "getStudentData",
      studentId: studentId,
      idCard4: idCard4
    }),
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    }
  })
  .then(response => {
    if (!response.ok) throw new Error("網路連線回應異常");
    return response.json();
  })
  .then(data => {
    toggleLoading(false);
    btnQuery.disabled = false;
    
    if (data.success) {
      if (data.isEmpty) {
        msgDiv.innerText = "沒有可重補修的科目。";
        msgDiv.className = "alert alert-warning fw-bold text-center my-3";
        msgDiv.classList.remove("d-none");
        return;
      }

      globalStudentInfo = data.studentInfo;
      globalOriginalCourses = data.courseList;

      document.getElementById("info-class").innerText = data.studentInfo.className;
      document.getElementById("info-seat").innerText = data.studentInfo.seatNo;
      document.getElementById("info-name").innerText = data.studentInfo.name;
      document.getElementById("info-id").innerText = data.studentInfo.id;
      document.getElementById("student-info-block").classList.remove("d-none");

      renderCourseTable(data.courseList);
      document.getElementById("course-table-block").classList.remove("d-none");
    } else {
      msgDiv.innerText = data.msg;
      msgDiv.className = "alert alert-danger fw-bold text-center my-3";
      msgDiv.classList.remove("d-none");
    }
  })
  .catch(err => {
    toggleLoading(false);
    btnQuery.disabled = false;
    msgDiv.innerText = "系統連線錯誤：" + err.message + "，請稍後再試或洽實驗研究組（電子郵件：tcvschss@tcvs.ilc.edu.tw）。";
    msgDiv.className = "alert alert-danger fw-bold text-center my-3";
    msgDiv.classList.remove("d-none");
    console.error(err);
  });
}

function renderCourseTable(courses) {
  const tbody = document.getElementById("course-tbody");
  tbody.innerHTML = "";

  courses.forEach((course, index) => {
    const mainStatus = String(course.status).trim(); 
    const subjectName = String(course.subject).trim();

    // 核心條件：如果狀態是「補修」，且名稱包含「原住民族語文」或「客語文」，則跳過不渲染
    if (mainStatus === "補修" && (subjectName.includes("原住民族語文") || subjectName.includes("客語文"))) {
      return; 
    }

    const tr = document.createElement("tr");
    const isRegistered = course.reg === "已登記";
    if (isRegistered) {
      tr.className = "row-registered";
    }

    const checkedAttr = isRegistered ? "checked" : "";
    let statusDisplayHtml = "";
    const checkGet = String(course.get).trim();

    if (checkGet === "是-Y") {
      statusDisplayHtml = `
        <span class="badge bg-secondary status-badge me-2">重修</span>
        <span class="text-danger fw-bold small">已取得學分</span>
      `;
    } else {
      statusDisplayHtml = `<span class="badge bg-secondary status-badge">${mainStatus}</span>`;
    }

    tr.innerHTML = `
      <td class="text-center">
        <input type="checkbox" class="form-check-input course-checkbox" 
               data-index="${index}" ${checkedAttr} style="transform: scale(1.2); cursor: pointer;">
      </td>
      <td>${course.grade} / ${course.semester}學期</td>
      <td class="fw-bold">${course.subject}</td>
      <td class="text-center">${course.credit}</td>
      <td>
        ${statusDisplayHtml}
      </td>
      <td class="text-center fw-bold text-nowrap" id="status-text-${index}">
        ${isRegistered ? "★ 已登記申請" : "—"}
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll(".course-checkbox").forEach(chk => {
    chk.addEventListener("change", function() {
      const idx = this.getAttribute("data-index");
      const targetTr = this.closest("tr");
      const statusTd = document.getElementById(`status-text-${idx}`);
      const originalReg = courses[idx].reg === "已登記";

      if (this.checked) {
        targetTr.classList.add("row-registered");
        statusTd.innerText = originalReg ? "★ 已登記申請" : "＋ 本次待加選";
      } else {
        targetTr.classList.remove("row-registered");
        statusTd.innerText = originalReg ? "－ 本次待退選" : "—";
      }
    });
  });
}

function submitRegData() {
  if (!globalStudentInfo || globalOriginalCourses.length === 0) return;

  let addedCourses = [];
  let removedCourses = [];
  let currentTotalSelected = 0;

  const checkboxes = document.querySelectorAll(".course-checkbox");
  checkboxes.forEach(chk => {
    const idx = parseInt(chk.getAttribute("data-index"), 10);
    const course = globalOriginalCourses[idx];
    const isOriginallyChecked = course.reg === "已登記";
    const isCurrentlyChecked = chk.checked;

    if (isCurrentlyChecked) {
      currentTotalSelected++;
    }

    if (isCurrentlyChecked && !isOriginallyChecked) {
      addedCourses.push(course);
    } else if (!isCurrentlyChecked && isOriginallyChecked) {
      removedCourses.push(course);
    }
  });

  if (addedCourses.length === 0 && removedCourses.length === 0) {
    alert("您目前的勾選狀態，未有任何異動，無須提交。");
    return;
  }

  const confirmRun = confirm(`您目前共選取了 ${currentTotalSelected} 個科目。\n確認要提交本次的「加選/退選」異動嗎？`);
  if (!confirmRun) return;

  const btnSubmit = document.getElementById("btnSubmit");
  btnSubmit.disabled = true;
  toggleLoading(true);

  fetch(STUDENT_WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "submitRegistration",
      studentInfo: globalStudentInfo,
      addedCourses: addedCourses,
      removedCourses: removedCourses
    }),
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    }
  })
  .then(response => {
    if (!response.ok) throw new Error("網路連線回應異常");
    return response.json();
  })
  .then(res => {
    toggleLoading(false);
    btnSubmit.disabled = false;
    if (res.success) {
      alert("異動更新成功！異動明細已同步發送至您的學校信箱。");
      fetchStudentData(); 
    } else {
      alert("更新失敗：" + res.msg + "\n請洽教務處實驗研究組（電子郵件：tcvschss@tcvs.ilc.edu.tw）。");
    }
  })
  .catch(err => {
    toggleLoading(false);
    btnSubmit.disabled = false;
    alert("提交時發生連線錯誤：" + err.message + "\n請檢查網路連接，或洽教務處實驗研究組。");
    console.error(err);
  });
}
