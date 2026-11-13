/*!
 * 台美檢驗｜正式版詢價表單外掛 line-addon.js
 * ---------------------------------------------------------------------
 * 用法：放在表單 repo 根目錄，並在正式版 index.html 的 </body> 前加一行：
 *   <script src="line-addon.js"></script>
 * 不需要修改表單原本的程式。找不到對應欄位時，這支外掛什麼都不做，表單照常運作。
 *
 * 做兩件事：
 *  1. 從「檢驗建議單」開啟時（網址帶 src=advice），自動帶入信件主旨、產品類別、
 *     公司營業項目與建議內容。欄位已有內容就不覆蓋，聯絡資料一律不碰。
 *  2. 在「訊息」欄下方加一題「下次送驗提醒」（3／6／12 個月或不需要），
 *     送出時把選擇附在訊息最後一行：「下次送驗提醒：6 個月後」，
 *     服務小幫手讀這一行來排提醒；不需要改後端程式。
 */
(function () {
  'use strict';
  var REMIND_PREFIX = '下次送驗提醒：';
  var REMIND_RE = /\n*下次送驗提醒：.*$/;
  var REMIND_OPTS = [['', '不需要提醒'], ['3', '3 個月後提醒我'], ['6', '6 個月後提醒我'], ['12', '12 個月後提醒我']];

  function $(sel) { return document.querySelector(sel); }
  function clip(v, n) { return String(v || '').slice(0, n); }

  // ---------- 1. 建議單帶入 ----------
  var adviceApplied = false;
  var adviceBiz = '';
  var bizTouched = false;

  function readAdvice() {
    var p = new URLSearchParams(location.search);
    var st = p.get('liff.state');
    if (st) p = new URLSearchParams(st.replace(/^[^?]*\?/, ''));
    return p.get('src') === 'advice' ? p : null;
  }

  function checkBiz() {
    if (!adviceBiz || bizTouched) return;
    var boxes = document.querySelectorAll('input[name="bizCategories"]');
    for (var i = 0; i < boxes.length; i++) if (boxes[i].value === adviceBiz) boxes[i].checked = true;
  }

  function applyAdvice() {
    if (adviceApplied) return;
    var p = readAdvice();
    if (!p) return;
    var subject = $('#subject'), product = $('#productName'), message = $('#message'), testItems = $('#testItems');
    if (!message) { console.warn('[line-addon] 找不到 #message，略過建議單帶入'); adviceApplied = true; return; }
    adviceApplied = true;
    var ind = clip(p.get('ind'), 10);
    var type = clip(p.get('type'), 40);
    adviceBiz = ind;
    checkBiz();
    if (subject && !subject.value) {
      for (var i = 0; i < subject.options.length; i++) {
        if (subject.options[i].value && subject.options[i].text.indexOf('報價') >= 0) { subject.value = subject.options[i].value; break; }
      }
      subject.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (product && !product.value.trim() && type) product.value = type;
    var tests = clip(p.get('tests'), 400);
    var lines = [
      '【台美檢驗建議單】' + (ind ? ind + '類' : ''),
      '業者類別：' + clip(p.get('role'), 40),
      '產品類別：' + type,
      '送驗目的：' + clip(p.get('goal'), 120),
    ];
    // 正式版表單有「需要檢驗的項目」欄位：建議檢驗類別放那裡；沒有這個欄位時才併入訊息
    if (testItems) { if (!testItems.value.trim()) testItems.value = tests; }
    else lines.push('建議檢驗類別：' + tests);
    var svc = clip(p.get('svc'), 200);
    if (svc) lines.push('希望協助：' + svc);
    lines.push('（以上由檢驗建議單帶入，可自行修改或補充）');
    if (!message.value.trim()) message.value = lines.join('\n');
    message.style.minHeight = '200px';
    var form = message.form || message.closest('form');
    if (form && !document.getElementById('lineAddonNote')) {
      var note = document.createElement('div');
      note.id = 'lineAddonNote';
      note.setAttribute('style', 'background:#fff4f5;border:1.5px solid #e8a9b4;color:#6b3a2a;border-radius:12px;padding:12px 14px;font-size:13.5px;line-height:1.6;margin-bottom:14px;');
      note.textContent = '已帶入您的「檢驗建議單」內容（信件主旨、產品類別、需要檢驗的項目、訊息）。請確認產品名稱，補上聯絡資料後送出。';
      form.parentNode.insertBefore(note, form);
    }
  }

  // ---------- 2. 下次送驗提醒 ----------
  function addReminderField() {
    var message = $('#message');
    if (!message || document.getElementById('remindMonths')) return;
    var wrap = document.createElement('div');
    wrap.id = 'field-remindMonths';
    wrap.setAttribute('style', 'margin:14px 0 4px;');
    var label = document.createElement('label');
    label.setAttribute('for', 'remindMonths');
    label.setAttribute('style', 'display:block;font-weight:700;margin-bottom:6px;');
    label.textContent = '下次送驗提醒（選填）';
    var sel = document.createElement('select');
    sel.id = 'remindMonths';
    sel.setAttribute('style', 'width:100%;font:inherit;font-size:16px;padding:10px 12px;border-radius:10px;border:1.5px solid #ddd;background:#fff;');
    REMIND_OPTS.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op); });
    var help = document.createElement('div');
    help.setAttribute('style', 'font-size:12.5px;color:#7d6a60;margin-top:4px;');
    help.textContent = '從今天起算，時間到了會在 LINE 提醒您安排下次送驗。';
    wrap.appendChild(label); wrap.appendChild(sel); wrap.appendChild(help);
    var field = message.closest('.field') || message.parentNode;
    field.parentNode.insertBefore(wrap, field.nextSibling);
  }

  function applyReminder() {
    var message = $('#message'), sel = document.getElementById('remindMonths');
    if (!message || !sel) return;
    var base = message.value.replace(REMIND_RE, '');
    message.value = sel.value ? base.replace(/\s+$/, '') + '\n' + REMIND_PREFIX + sel.value + ' 個月後' : base;
  }

  // 在表單自己的送出程式之前（捕獲階段）寫入提醒選擇；重送也不會重複附加
  document.addEventListener('submit', function (e) { if (e.target && e.target.querySelector && e.target.querySelector('#message')) applyReminder(); }, true);
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('button[type="submit"], input[type="submit"], #submitBtn');
    if (b && b.form && b.form.querySelector('#message')) applyReminder();
  }, true);
  document.addEventListener('change', function (e) { if (e.target && e.target.name === 'bizCategories' && e.isTrusted) bizTouched = true; }, true);

  function boot() {
    addReminderField();
    applyAdvice();
    // 在 LINE 裡開啟時，參數要等 liff.init() 完成才回到網址上；表單也可能在之後才帶入上次資料，所以持續檢查 15 秒
    var n = 0;
    var timer = setInterval(function () {
      addReminderField();
      applyAdvice();
      checkBiz();
      if (++n >= 30) clearInterval(timer);
    }, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
