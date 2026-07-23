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
