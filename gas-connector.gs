/**
 * ════════════════════════════════════════════════════════════════
 *  GAS v3.0 — 臺北市政府工務局鼠類防治稽查報告
 *  檔案名稱：gas-connector.gs
 *
 *  【部署步驟】
 *  1. 開啟 https://script.google.com → 新增空白專案
 *  2. 將本檔案全部內容貼入編輯器
 *  3. 將下方 SPREADSHEET_ID 替換為你的 Google 試算表 ID
 *     （試算表網址中 /d/【這段】/edit）
 *  4. 點選「部署」→「管理部署」→「新增部署」
 *     類型：Web 應用程式
 *     執行身分：我（你的帳號）
 *     存取對象：所有人（含匿名）
 *  5. 授予權限後，複製「Web App 網址」
 *  6. 將網址與試算表 ID 填入 App 設定頁
 * ════════════════════════════════════════════════════════════════
 */

// ★ 請替換為你的 Google 試算表 ID
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// 分頁名稱設定
const RAW_SHEET  = 'Raw Data';       // 原始資料分頁
const VIEW_SHEET = '報告檢視面板';   // 視覺化分頁（請手動建立）

// 欄位標題（依序對應寫入順序）
const HEADERS = [
  'ID', '稽查日期', '地點名稱', '地點屬性', '重點巡查場域',
  '鄰近場域', '稽查小組成員', '受查單位', '管理單位', '率隊人員', '陪同人員',
  '1-1 巡查場域', '1-1 補充說明',
  '1-2 自主檢查表', '1-2 補充說明',
  '2-1 處稽查', '2-1 補充說明',
  '3-1 環境清潔', '3-1 補充說明',
  '3-2 植栽修剪', '3-2 補充說明',
  '3-3 垃圾清運', '3-3 補充說明',
  '3-4 禁止餵食告示', '餵食熱點（處）', '3-4 補充說明',
  '3-5 勸導餵食', '3-5 補充說明',
  '3-6 加設鋼線網', '3-6 補充說明',
  '4-1 捕鼠籠餌站', '捕鼠籠數量（個）', '4-1 補充說明',
  '4-2 鼠藥告示牌', '4-2 補充說明',
  '4-3 藥物數量紀錄', '4-3 補充說明',
  '4-4 封填鼠洞', '4-4 補充說明',
  '4-5 發現鼠跡', '4-5 補充說明',
  '4-6 發現鼠屍', '4-6 補充說明',
  '工地適用',
  '5-1 工地巡查', '5-1 補充說明',
  '5-2 不當堆置', '5-2 補充說明',
  '5-3 工地清潔', '5-3 補充說明',
  '5-4 工地垃圾清運', '5-4 補充說明',
  '5-5 廚餘加蓋', '5-5 補充說明',
  '5-6 剩飯丟棄', '5-6 補充說明',
  '5-7 食物密封', '5-7 補充說明',
  '5-8 工地捕鼠籠', '工地捕鼠籠數', '5-8 補充說明',
  '5-9 工地告示牌', '5-9 補充說明',
  '5-10 工地藥物記錄', '5-10 補充說明',
  '5-11 工地封填', '5-11 補充說明',
  '5-12 工地鼠跡', '5-12 補充說明',
  '5-13 工地鼠屍', '5-13 補充說明',
  '其他稽查意見', '照片組數', '上傳時間', '裝置資訊'
];

/* ════════════════════════
   doPost：接收 App 上傳的資料
════════════════════════ */
function doPost(e) {
  // 允許跨域（CORS）
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const raw  = e.postData ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    // 讀取試算表（優先用 payload 中的 sheetId，fallback 用常數）
    const sid = data.sheetId || SPREADSHEET_ID;
    if (!sid || sid === 'YOUR_SPREADSHEET_ID_HERE') {
      throw new Error('試算表 ID 未設定，請在 GAS 程式碼中填入 SPREADSHEET_ID');
    }

    const ss    = SpreadsheetApp.openById(sid);
    const sheet = getOrCreateSheet(ss, RAW_SHEET);

    // 寫入標題（首次）
    if (sheet.getLastRow() === 0) {
      writeHeaders(sheet);
    }

    // 組合成員字串
    const members = [
      ...(data.namedMembers || []),
      data.memberCivil ? '土木建築科：' + data.memberCivil : '',
      data.memberWater ? '水利科：'     + data.memberWater : '',
      data.memberPark  ? '公園大地科：' + data.memberPark  : '',
    ].filter(Boolean).join('、');

    const dateStr = [data.dateYear, data.dateMonth, data.dateDay]
      .filter(Boolean).join('/');

    // 依 HEADERS 順序組成資料列
    const row = [
      data.id                        || '',
      dateStr,
      data.locationName              || '',
      data.locationAttr              || '',
      data.isKeySite                 || '',
      (data.nearbyTypes || []).join('、'),
      members,
      (data.inspectedUnits || []).join('、'),
      data.unitMgmt                  || '',
      data.unitLeader                || '',
      data.unitCompanion             || '',
      data.q1_1  || '', data.q1_1n  || '',
      data.q1_2  || '', data.q1_2n  || '',
      data.q2_1  || '', data.q2_1n  || '',
      data.q3_1  || '', data.q3_1n  || '',
      data.q3_2  || '', data.q3_2n  || '',
      data.q3_3  || '', data.q3_3n  || '',
      data.q3_4  || '', data.q3_4c  || 0, data.q3_4n || '',
      data.q3_5  || '', data.q3_5n  || '',
      data.q3_6  || '', data.q3_6n  || '',
      data.q4_1  || '', data.q4_1c  || 0, data.q4_1n || '',
      data.q4_2  || '', data.q4_2n  || '',
      data.q4_3  || '', data.q4_3n  || '',
      data.q4_4  || '', data.q4_4n  || '',
      data.q4_5  || '', data.q4_5n  || '',
      data.q4_6  || '', data.q4_6n  || '',
      data.siteOn ? '是' : '否（免填）',
      data.q5_1  || '', data.q5_1n  || '',
      data.q5_2  || '', data.q5_2n  || '',
      data.q5_3  || '', data.q5_3n  || '',
      data.q5_4  || '', data.q5_4n  || '',
      data.q5_5  || '', data.q5_5n  || '',
      data.q5_6  || '', data.q5_6n  || '',
      data.q5_7  || '', data.q5_7n  || '',
      data.q5_8  || '', data.q5_8c  || 0, data.q5_8n || '',
      data.q5_9  || '', data.q5_9n  || '',
      data.q5_10 || '', data.q5_10n || '',
      data.q5_11 || '', data.q5_11n || '',
      data.q5_12 || '', data.q5_12n || '',
      data.q5_13 || '', data.q5_13n || '',
      data.otherOpinions             || '',
      (data.photos || []).length,
      new Date().toLocaleString('zh-TW'),
      data.deviceInfo                || ''
    ];

    sheet.appendRow(row);

    // 交替底色
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, row.length)
      .setBackground(lastRow % 2 === 0 ? '#f5f0eb' : '#ffffff');

    // 是/否 欄位條件格式化（後端套用一次）
    applyResultFormat(sheet, lastRow);

    return respond({ status: 'success', row: lastRow, id: data.id }, 200, headers);

  } catch (err) {
    console.error('[GAS doPost Error]', err.message, err.stack);
    return respond({ status: 'error', message: err.message }, 500, headers);
  }
}

/* ════════════════════════
   doGet：健康檢查 & CORS preflight
════════════════════════ */
function doGet(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  return respond({
    status: 'ok',
    version: '3.0',
    spreadsheetId: SPREADSHEET_ID,
    time: new Date().toISOString()
  }, 200, headers);
}

/* ════════════════════════
   輔助函式
════════════════════════ */

/** 取得或建立分頁 */
function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/** 寫入標題列並格式化 */
function writeHeaders(sheet) {
  sheet.appendRow(HEADERS);
  const hdr = sheet.getRange(1, 1, 1, HEADERS.length);
  hdr.setBackground('#8a9a7a')     // 莫蘭迪鼠尾草綠
     .setFontColor('#ffffff')
     .setFontWeight('bold')
     .setFontSize(10)
     .setHorizontalAlignment('center')
     .setWrap(true);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 40);
  // 自動調整前幾欄寬度
  for (let i = 1; i <= 10; i++) {
    sheet.setColumnWidth(i, 120);
  }
}

/** 對結果欄套用是/否顏色 */
function applyResultFormat(sheet, row) {
  // 判斷欄位是否為稽查結果（奇數欄，從第12欄開始的「是/否/其他」欄）
  const resultCols = [12,14,16,18,20,22,24,27,29,31,34,36,38,40,42,
                      45,47,49,51,53,55,57,59,62,64,66,68,70,72];
  resultCols.forEach(col => {
    if (col > HEADERS.length) return;
    const cell = sheet.getRange(row, col);
    const val  = cell.getValue();
    if (val === '是')   cell.setBackground('#d9ead3').setFontColor('#274e13');
    else if (val === '否')   cell.setBackground('#f4cccc').setFontColor('#990000');
    else if (val === '其他') cell.setBackground('#cfe2f3').setFontColor('#1155cc');
  });
}

/** 統一的 JSON 回應 */
function respond(obj, code, headers) {
  const output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
