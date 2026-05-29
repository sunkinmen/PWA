/**
 * GAS v3.1 — 鼠類防治稽查報告 (支援 Drive 照片上傳)
 */

// ★ 預設的 Google 試算表 ID
const SPREADSHEET_ID = '1hyP91ywNhmwPhjyJPsC50GWi-SP88-AEA3hSXjK6wHU';

// ★ 請在此填入您的 Google Drive「公開」資料夾 ID，用於存放上傳的照片
// (例如資料夾網址為 drive.google.com/drive/folders/1aBcDeFg... 則 ID 為 1aBcDeFg...)
const DRIVE_FOLDER_ID = '在這裡填入您的Google雲端資料夾ID'; 

const RAW_SHEET  = 'Raw Data';

const HEADERS = [
  '序號(ID)', '稽查日期', '地點名稱', '地點屬性', '重點巡查場域',
  '鄰近場域', '稽查小組成員', '受查單位', '管理單位', '率隊人員', '陪同人員',
  '1-1 巡查場域', '1-1 補充說明', '1-2 自主檢查表', '1-2 補充說明',
  '2-1 處稽查', '2-1 補充說明',
  '3-1 環境清潔', '3-1 補充說明', '3-2 植栽修剪', '3-2 補充說明',
  '3-3 垃圾清運', '3-3 補充說明', '3-4 禁止餵食告示', '餵食熱點(處)', '3-4 補充說明',
  '3-5 勸導餵食', '3-5 補充說明', '3-6 加設鋼線網', '3-6 補充說明',
  '4-1 捕鼠籠餌站', '捕鼠籠數量', '4-1 補充說明', '4-2 鼠藥告示牌', '4-2 補充說明',
  '4-3 藥物數量紀錄', '4-3 補充說明', '4-4 封填鼠洞', '4-4 補充說明',
  '4-5 發現鼠跡', '4-5 補充說明', '4-6 發現鼠屍', '4-6 補充說明',
  '工地適用',
  '5-1 工地巡查', '5-1 補充說明', '5-2 不當堆置', '5-2 補充說明',
  '5-3 工地清潔', '5-3 補充說明', '5-4 工地垃圾清運', '5-4 補充說明',
  '5-5 廚餘加蓋', '5-5 補充說明', '5-6 剩飯丟棄', '5-6 補充說明',
  '5-7 食物密封', '5-7 補充說明', '5-8 工地捕鼠籠', '工地捕鼠籠數', '5-8 補充說明',
  '5-9 工地告示牌', '5-9 補充說明', '5-10 工地記錄', '5-10 補充說明',
  '5-11 工地封填', '5-11 補充說明', '5-12 工地鼠跡', '5-12 補充說明',
  '5-13 工地鼠屍', '5-13 補充說明',
  '其他稽查意見', '照片組數', '上傳時間', '裝置資訊',
  '📷照片預覽區(自動轉圖)', '🔗所有照片網址(備用)'
];

function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const data = JSON.parse(e.postData ? e.postData.contents : '{}');
    const sid = data.sheetId || SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(sid);
    let sheet = ss.getSheetByName(RAW_SHEET);
    
    if (!sheet) sheet = ss.insertSheet(RAW_SHEET);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setBackground('#8a9a7a').setFontColor('#ffffff').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // 處理照片存入 Drive
    let imgFormulas = [];
    let imgUrls = [];
    if (data.photos && data.photos.length > 0 && DRIVE_FOLDER_ID && DRIVE_FOLDER_ID !== '在這裡填入您的Google雲端資料夾ID') {
      try {
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        data.photos.forEach((p, idx) => {
          if (p.defect) {
            const blob = Utilities.newBlob(Utilities.base64Decode(p.defect.split(',')[1]), 'image/jpeg', `${data.id}_缺失_${idx+1}.jpg`);
            const file = folder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            const url = `https://drive.google.com/uc?export=view&id=${file.getId()}`;
            imgUrls.push(url);
            imgFormulas.push(`=IMAGE("${url}")`);
          }
          if (p.improved) {
            const blob = Utilities.newBlob(Utilities.base64Decode(p.improved.split(',')[1]), 'image/jpeg', `${data.id}_改善_${idx+1}.jpg`);
            const file = folder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            const url = `https://drive.google.com/uc?export=view&id=${file.getId()}`;
            imgUrls.push(url);
            imgFormulas.push(`=IMAGE("${url}")`);
          }
        });
      } catch (err) {
        console.error("照片上傳 Drive 失敗", err);
      }
    }

    const members = [
      ...(data.namedMembers || []),
      data.memberCivil ? '土木建築科：' + data.memberCivil : '',
      data.memberWater ? '水利科：' + data.memberWater : '',
      data.memberPark  ? '公園大地科：' + data.memberPark : '',
    ].filter(Boolean).join('、');

    const dateStr = [data.dateYear, data.dateMonth, data.dateDay].filter(Boolean).join('/');

    const row = [
      data.id || '', dateStr, data.locationName || '', data.locationAttr || '', data.isKeySite || '',
      (data.nearbyTypes || []).join('、'), members, 
      (data.inspectedUnits || []).join('、'), 
      data.unitMgmt || '', data.unitLeader || '', data.unitCompanion || '', // 補正的缺漏欄位
      data.q1_1 || '', data.q1_1n || '', data.q1_2 || '', data.q1_2n || '',
      data.q2_1 || '', data.q2_1n || '',
      data.q3_1 || '', data.q3_1n || '', data.q3_2 || '', data.q3_2n || '', data.q3_3 || '', data.q3_3n || '', data.q3_4 || '', data.q3_4c || 0, data.q3_4n || '', data.q3_5 || '', data.q3_5n || '', data.q3_6 || '', data.q3_6n || '',
      data.q4_1 || '', data.q4_1c || 0, data.q4_1n || '', data.q4_2 || '', data.q4_2n || '', data.q4_3 || '', data.q4_3n || '', data.q4_4 || '', data.q4_4n || '', data.q4_5 || '', data.q4_5n || '', data.q4_6 || '', data.q4_6n || '',
      data.siteOn ? '是' : '否(免填)',
      data.q5_1 || '', data.q5_1n || '', data.q5_2 || '', data.q5_2n || '', data.q5_3 || '', data.q5_3n || '', data.q5_4 || '', data.q5_4n || '', data.q5_5 || '', data.q5_5n || '', data.q5_6 || '', data.q5_6n || '', data.q5_7 || '', data.q5_7n || '', data.q5_8 || '', data.q5_8c || 0, data.q5_8n || '', data.q5_9 || '', data.q5_9n || '', data.q5_10 || '', data.q5_10n || '', data.q5_11 || '', data.q5_11n || '', data.q5_12 || '', data.q5_12n || '', data.q5_13 || '', data.q5_13n || '',
      data.otherOpinions || '', (data.photos || []).length, new Date().toLocaleString('zh-TW'), data.deviceInfo || '',
      imgFormulas.join(' '),   // 將多張圖的 IMAGE 公式放在同一格或分開(這裡以空格串接展示)
      imgUrls.join('\n')      // 原始網址換行備用
    ];

    sheet.appendRow(row);
    
    // 如果圖片公式被視為純文字，可強制設定回公式
    const lastRow = sheet.getLastRow();
    if(imgFormulas.length > 0) {
      const formulaCol = HEADERS.length - 1; 
      // 若需要每個圖一張格，可自行拆分；若以空格並列 IMAGE() 雖有時Sheets不吃多個，但可透過 SPLIT 或純粹存連結
      // 在此我們儲存第一個圖片當縮圖
      sheet.getRange(lastRow, formulaCol).setFormula(imgFormulas[0] || "");
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', id: data.id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', version: '3.1' }))
    .setMimeType(ContentService.MimeType.JSON);
}
