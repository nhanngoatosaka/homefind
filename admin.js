/**
 * BIG不動産 — Admin Quản trị & Kiểm duyệt BĐS (homefind)
 * Tuân thủ nghiêm ngặt SCHEMA.md và STYLE_GUIDE.md
 */

const $ = id => document.getElementById(id);
const MODEL = 'gemini-2.5-flash';
const DRAFT_STORAGE_KEY = 'homefind_admin_draft_v1';

// Tập hợp mã các căn gốc đã có sẵn trong data/properties.json (nạp động khi khởi chạy để bảo toàn nguyên vẹn)
let PROTECTED_IDS = new Set();

// 7 trường bắt buộc
const REQUIRED_FIELDS = ['id', 'name_jp', 'price', 'type', 'area', 'size_m2', 'station'];

// 22 trường chuẩn + 5 trường tùy chọn hợp pháp (tổng cộng 27 trường được phép trong schema)
const CORE_FIELDS = [
  'id', 'name_jp', 'name_vi', 'price', 'price_label', 'type', 'area',
  'address', 'size_m2', 'land_m2', 'balcony_m2', 'layout', 'station',
  'management_fee', 'repair_fund', 'year_built', 'structure', 'renovation',
  'images', 'status', 'featured', 'notes'
];
const OPTIONAL_META_FIELDS = [
  'source_url', 'source_agency', 'imported_at', 'last_verified_at', 'image_rights'
];
const ALLOWED_FIELDS_SET = new Set([...CORE_FIELDS, ...OPTIONAL_META_FIELDS]);

// Ảnh minh họa trung tính khi chưa tick image_rights
const ILLUSTRATIVE_IMAGE = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop';

// Bộ nhớ dữ kiện ĐÃ DUYỆT (nạp từ data/properties.json)
let APPROVED_DB = {
  properties: [],
  articles: []
};
let ORIGINAL_SNAPSHOT = null;
let maisokuFiles = [];
let currentLifecycleState = 'draft'; // 'draft' | 'approved'
let previewActiveImageIdx = 0;

// Prompt Gemini chuẩn SCHEMA.md (Không có price_label, không có trường thế hệ cũ)
const GEMINI_MAISOKU_PROMPT = `Bạn là chuyên gia thẩm định bất động sản Nhật Bản của BIG不動産.
Hãy đọc tờ Maisoku (マイソク) đính kèm và trích xuất thông tin thành đúng 1 JSON object duy nhất theo đúng schema chuẩn dưới đây:
{
  "id": "slug-tieng-anh-ngan-gon-duy-nhat",
  "name_jp": "Tên tòa nhà/căn nhà bằng tiếng Nhật trên tờ Maisoku",
  "name_vi": "Tên căn dịch sang tiếng Việt tự nhiên",
  "price": 0,
  "type": "buy hoặc rent",
  "area": "Osaka hoặc Kyoto (hoặc tên tỉnh/thành phố)",
  "address": "Địa chỉ tiếng Nhật kèm quận/thành phố tiếng Anh",
  "size_m2": 0,
  "land_m2": 0,
  "balcony_m2": 0,
  "layout": "Ví dụ: 3LDK, 1LDK, 1K",
  "station": "Tên tuyến + tên ga tiếng Nhật + số phút đi bộ (ví dụ: 阪急京都線「上新庄」 đi bộ 7 phút)",
  "management_fee": 0,
  "repair_fund": 0,
  "year_built": 0,
  "structure": "Kết cấu tòa nhà + số tầng + quyền sở hữu đất (ví dụ: Bê tông cốt thép (RC), 6 tầng · Sở hữu vĩnh viễn (所有権))",
  "renovation": "Thông tin cải tạo / reform hoặc điều kiện cọc lễ nổi bật",
  "images": [],
  "status": "available",
  "featured": false,
  "notes": "Tóm tắt 2-3 câu tiếng Việt trung thực nêu điểm mạnh của căn nhà từ tài liệu",
  "source_agency": "Tên công ty BĐS trên tờ Maisoku nếu có"
}
Quy tắc bắt buộc:
1. price, management_fee, repair_fund là số nguyên tính bằng JPY (ví dụ 3480万円 -> 34800000).
2. year_built là năm dương lịch 4 chữ số (tự động đổi từ niên hiệu Nhật: 昭和 year + 1925, 平成 year + 1988, 令和 year + 2018).
3. Chỉ trả về đúng các khóa đã khai báo trong cấu trúc JSON ở trên; tuyệt đối không tự sinh nhãn giá và không thêm bất kỳ khóa nào khác ngoài danh sách.
4. Số liệu không có trên tài liệu thì để 0 (với số) hoặc "" (với chuỗi). Tuyệt đối KHÔNG bịa số liệu. Chỉ trả về JSON hợp lệ.`;

// Khởi chạy khi trang tải xong
document.addEventListener('DOMContentLoaded', async () => {
  initGeminiKey();
  setupIntakeEvents();
  setupFormEvents();
  await loadApprovedDatabase();
  restoreDraftFromLocalStorage();
  validateAndRenderAll();
});

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Tự sinh price_label từ price và type (Không nhập tay, không nhờ Gemini sinh)
function computePriceLabel(priceNum, typeVal) {
  const p = Number(priceNum);
  if (!p || Number.isNaN(p) || p <= 0) return '';
  if (typeVal === 'rent') {
    return `¥${Math.round(p).toLocaleString('en-US')}/tháng`;
  }
  // Nhà bán (buy): đổi sang đơn vị 万円 (1万円 = 10,000 JPY)
  if (p >= 10000) {
    const man = p / 10000;
    const formattedMan = Number.isInteger(man)
      ? man.toLocaleString('en-US')
      : Number(man.toFixed(2)).toLocaleString('en-US');
    return `${formattedMan}万円`;
  }
  return `¥${Math.round(p).toLocaleString('en-US')}`;
}

// --------------------------------------------------------------------------
// 1. NẠP FILE DUY NHẤT data/properties.json
// --------------------------------------------------------------------------
async function loadApprovedDatabase() {
  try {
    const ts = Date.now();
    const res = await fetch(`data/properties.json?v=${ts}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && Array.isArray(data.properties) && Array.isArray(data.articles)) {
      APPROVED_DB = data;
      ORIGINAL_SNAPSHOT = JSON.parse(JSON.stringify(data));
      PROTECTED_IDS = new Set(data.properties.map(p => p.id));
      renderExistingSelector();
      renderApprovedTable();
    }
  } catch (err) {
    console.error('Không thể nạp data/properties.json:', err);
  }
}

function renderExistingSelector() {
  const sel = $('select-existing');
  if (!sel) return;
  const opts = ['<option value="">— Chọn căn đã duyệt để xem trên Form —</option>'];
  APPROVED_DB.properties.forEach(p => {
    const lockTag = PROTECTED_IDS.has(p.id) ? ' [Căn gốc bảo toàn]' : '';
    opts.push(`<option value="${p.id}">${p.id} — ${p.name_jp} (${p.price_label})${lockTag}</option>`);
  });
  sel.innerHTML = opts.join('');
}

// --------------------------------------------------------------------------
// 2. BA NGUỒN VÀO: MAISOKU AI / DÁN JSON TRÍCH SẴN / NHẬP TAY
// --------------------------------------------------------------------------
function initGeminiKey() {
  const keyInput = $('gemini-key');
  if (!keyInput) return;
  keyInput.value = localStorage.getItem('gkey') || '';
  keyInput.addEventListener('change', () => {
    localStorage.setItem('gkey', keyInput.value.trim());
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setupIntakeEvents() {
  const drop = $('maisoku-drop');
  const fileInput = $('maisoku-file');
  const dropLabel = $('maisoku-drop-label');

  if (drop && fileInput) {
    drop.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
      maisokuFiles = [...e.target.files];
      dropLabel.textContent = maisokuFiles.length
        ? `Đã chọn (${maisokuFiles.length} file): ${maisokuFiles.map(f => f.name).join(', ')}`
        : 'Kéo thả tờ Maisoku (PDF / Ảnh) hoặc bấm để chọn file';
    });
    drop.addEventListener('dragover', e => {
      e.preventDefault();
      drop.classList.add('over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => {
      e.preventDefault();
      drop.classList.remove('over');
      maisokuFiles = [...e.dataTransfer.files];
      dropLabel.textContent = maisokuFiles.length
        ? `Đã chọn (${maisokuFiles.length} file): ${maisokuFiles.map(f => f.name).join(', ')}`
        : 'Kéo thả tờ Maisoku (PDF / Ảnh) hoặc bấm để chọn file';
    });
  }

  // (a) Đọc Maisoku bằng Gemini AI
  const btnExtract = $('btn-extract-maisoku');
  if (btnExtract) {
    btnExtract.addEventListener('click', async () => {
      const key = $('gemini-key').value.trim();
      const statusEl = $('ai-status');
      if (!key) {
        statusEl.textContent = 'Vui lòng nhập Gemini API Key trước khi đọc Maisoku.';
        return;
      }
      if (!maisokuFiles.length) {
        statusEl.textContent = 'Vui lòng chọn hoặc kéo thả ít nhất 1 file Maisoku (PDF/ảnh).';
        return;
      }
      localStorage.setItem('gkey', key);
      statusEl.textContent = 'Gemini đang đọc tờ Maisoku và trích dữ kiện theo SCHEMA.md...';
      btnExtract.disabled = true;

      try {
        const parts = [{ text: GEMINI_MAISOKU_PROMPT }];
        for (const f of maisokuFiles) {
          parts.push({
            inline_data: {
              mime_type: f.type || 'image/jpeg',
              data: await fileToBase64(f)
            }
          });
        }
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error?.message || `HTTP ${res.status}`);

        const rawText = j.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(rawText);
        const obj = Array.isArray(parsed) ? parsed[0] : parsed;

        if (!obj.imported_at) obj.imported_at = todayISO();
        populateFormFromObject(obj, 'draft');
        saveDraftToLocalStorage();
        validateAndRenderAll();
        statusEl.textContent = '✓ Đã trích Maisoku vào Form bên dưới! Hãy kiểm tra các trường trước khi Duyệt.';
      } catch (err) {
        statusEl.textContent = `Lỗi đọc AI: ${err.message}`;
      } finally {
        btnExtract.disabled = false;
      }
    });
  }

  // (b) Nạp JSON trích sẵn (từ Muse / SUUMO) vào Form
  const btnLoadJson = $('btn-load-json');
  if (btnLoadJson) {
    btnLoadJson.addEventListener('click', () => {
      const pasteInput = $('json-paste-input');
      const statusEl = $('paste-status');
      const raw = pasteInput.value.trim();
      if (!raw) {
        statusEl.textContent = 'Vui lòng dán dữ kiện JSON vào ô trước khi bấm Nạp.';
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        const obj = Array.isArray(parsed) ? parsed[0] : (parsed.properties ? parsed.properties[0] : parsed);
        if (!obj || typeof obj !== 'object') throw new Error('Dữ kiện không phải object hợp lệ.');
        if (!obj.imported_at) obj.imported_at = todayISO();

        populateFormFromObject(obj, 'draft');
        pasteInput.value = ''; // Xóa ô dán sau khi đã chuyển vào Form kiểm soát
        saveDraftToLocalStorage();
        validateAndRenderAll();
        statusEl.textContent = '✓ Đã nạp dữ kiện vào Form kiểm soát! Chỉnh sửa trực tiếp trên Form bên dưới.';
      } catch (err) {
        statusEl.textContent = `JSON đầu vào không hợp lệ: ${err.message}`;
      }
    });
  }

  // (c) Nhập tay từ đầu / Chọn căn đã có
  const btnNewManual = $('btn-new-manual');
  if (btnNewManual) {
    btnNewManual.addEventListener('click', () => {
      resetFormToBlankDraft();
      saveDraftToLocalStorage();
      validateAndRenderAll();
      $('approve-feedback').textContent = 'Đã tạo bản nháp mới để nhập tay.';
    });
  }

  const btnClearDraft = $('btn-clear-draft');
  if (btnClearDraft) {
    btnClearDraft.addEventListener('click', () => {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      resetFormToBlankDraft();
      validateAndRenderAll();
      $('draft-autosave-indicator').textContent = 'Đã xóa bản nháp khỏi localStorage.';
    });
  }

  const selExisting = $('select-existing');
  if (selExisting) {
    selExisting.addEventListener('change', () => {
      const selectedId = selExisting.value;
      if (!selectedId) return;
      const found = APPROVED_DB.properties.find(p => p.id === selectedId);
      if (found) {
        populateFormFromObject(found, 'approved');
        validateAndRenderAll();
      }
    });
  }
}

// --------------------------------------------------------------------------
// 3. ĐỌC / GHI FORM & TỰ LƯU NHÁP TRONG LOCALSTORAGE
// --------------------------------------------------------------------------
function resetFormToBlankDraft() {
  populateFormFromObject({
    id: '',
    name_jp: '',
    name_vi: '',
    price: '',
    type: 'buy',
    area: 'Osaka',
    address: '',
    size_m2: '',
    land_m2: '',
    balcony_m2: '',
    layout: '',
    station: '',
    management_fee: 0,
    repair_fund: 0,
    year_built: '',
    structure: '',
    renovation: '',
    images: [],
    status: 'available',
    featured: false,
    notes: '',
    source_url: '',
    source_agency: '',
    imported_at: todayISO(),
    last_verified_at: '',
    image_rights: false
  }, 'draft');
  $('f-compare_price').value = '';
  $('confirm-price-mismatch').checked = false;
  if ($('select-existing')) $('select-existing').value = '';
}

function populateFormFromObject(obj, lifecycleMode = 'draft') {
  currentLifecycleState = lifecycleMode;
  previewActiveImageIdx = 0;

  $('f-id').value = obj.id || '';
  $('f-type').value = obj.type === 'rent' ? 'rent' : 'buy';
  $('f-name_jp').value = obj.name_jp || '';
  $('f-name_vi').value = obj.name_vi || '';
  $('f-price').value = obj.price !== undefined && obj.price !== null && obj.price !== '' ? obj.price : '';
  $('f-price_label').value = computePriceLabel($('f-price').value, $('f-type').value);
  $('f-area').value = obj.area || '';
  $('f-layout').value = obj.layout || '';
  $('f-address').value = obj.address || '';
  $('f-station').value = obj.station || '';
  $('f-size_m2').value = obj.size_m2 !== undefined && obj.size_m2 !== null && obj.size_m2 !== '' ? obj.size_m2 : '';
  $('f-land_m2').value = obj.land_m2 !== undefined && obj.land_m2 !== null && obj.land_m2 !== '' ? obj.land_m2 : '';
  $('f-balcony_m2').value = obj.balcony_m2 !== undefined && obj.balcony_m2 !== null && obj.balcony_m2 !== '' ? obj.balcony_m2 : '';
  $('f-year_built').value = obj.year_built !== undefined && obj.year_built !== null && obj.year_built !== '' ? obj.year_built : '';
  $('f-management_fee').value = obj.management_fee !== undefined && obj.management_fee !== null ? obj.management_fee : 0;
  $('f-repair_fund').value = obj.repair_fund !== undefined && obj.repair_fund !== null ? obj.repair_fund : 0;
  $('f-structure').value = obj.structure || '';
  $('f-renovation').value = obj.renovation || '';
  $('f-images').value = Array.isArray(obj.images) ? obj.images.join('\n') : (obj.images || '');
  $('f-image_rights').checked = Boolean(obj.image_rights);
  $('f-status').value = ['available', 'sold', 'hidden'].includes(obj.status) ? obj.status : 'available';
  $('f-featured').checked = Boolean(obj.featured);
  $('f-notes').value = obj.notes || '';

  // 5 trường tùy chọn
  $('f-source_url').value = obj.source_url || '';
  $('f-source_agency').value = obj.source_agency || '';
  $('f-imported_at').value = obj.imported_at || todayISO();
  $('f-last_verified_at').value = obj.last_verified_at || '';

  if (obj._compare_price !== undefined) {
    $('f-compare_price').value = obj._compare_price;
  }
}

function readFormToObject() {
  const priceVal = Number($('f-price').value);
  const typeVal = $('f-type').value === 'rent' ? 'rent' : 'buy';
  const autoPriceLabel = computePriceLabel(priceVal, typeVal);
  $('f-price_label').value = autoPriceLabel;

  const imagesRaw = $('f-images').value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const prop = {
    id: $('f-id').value.trim(),
    name_jp: $('f-name_jp').value.trim(),
    name_vi: $('f-name_vi').value.trim(),
    price: Number.isNaN(priceVal) ? 0 : Math.round(priceVal),
    price_label: autoPriceLabel,
    type: typeVal,
    area: $('f-area').value.trim(),
    address: $('f-address').value.trim(),
    size_m2: $('f-size_m2').value !== '' ? Number($('f-size_m2').value) : 0,
    land_m2: $('f-land_m2').value !== '' ? Number($('f-land_m2').value) : 0,
    layout: $('f-layout').value.trim(),
    station: $('f-station').value.trim(),
    management_fee: $('f-management_fee').value !== '' ? Math.round(Number($('f-management_fee').value)) : 0,
    repair_fund: $('f-repair_fund').value !== '' ? Math.round(Number($('f-repair_fund').value)) : 0,
    year_built: $('f-year_built').value !== '' ? Math.round(Number($('f-year_built').value)) : 0,
    structure: $('f-structure').value.trim(),
    renovation: $('f-renovation').value.trim(),
    images: imagesRaw,
    status: $('f-status').value,
    featured: $('f-featured').checked,
    notes: $('f-notes').value.trim()
  };

  // balcony_m2 là tùy chọn: chỉ đưa vào nếu > 0
  const balVal = Number($('f-balcony_m2').value);
  if ($('f-balcony_m2').value !== '' && !Number.isNaN(balVal) && balVal > 0) {
    prop.balcony_m2 = balVal;
  }

  // 5 trường tùy chọn hợp pháp
  const sourceUrl = $('f-source_url').value.trim();
  const sourceAgency = $('f-source_agency').value.trim();
  const importedAt = $('f-imported_at').value.trim();
  const lastVerifiedAt = $('f-last_verified_at').value.trim();
  const imageRights = $('f-image_rights').checked;

  if (sourceUrl) prop.source_url = sourceUrl;
  if (sourceAgency) prop.source_agency = sourceAgency;
  if (importedAt) prop.imported_at = importedAt;
  if (lastVerifiedAt) prop.last_verified_at = lastVerifiedAt;
  prop.image_rights = imageRights;

  // Khử mọi trường lạ ngoài danh sách hợp đồng
  Object.keys(prop).forEach(k => {
    if (!ALLOWED_FIELDS_SET.has(k)) delete prop[k];
  });

  return prop;
}

function saveDraftToLocalStorage() {
  currentLifecycleState = 'draft';
  const draftObj = readFormToObject();
  draftObj._compare_price = $('f-compare_price').value;
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftObj));
  const ind = $('draft-autosave-indicator');
  if (ind) {
    ind.textContent = `Đã tự lưu bản nháp vào localStorage lúc ${new Date().toLocaleTimeString('vi-VN')} (chưa lọt vào data/properties.json).`;
  }
}

function restoreDraftFromLocalStorage() {
  const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!saved) {
    resetFormToBlankDraft();
    return;
  }
  try {
    const parsed = JSON.parse(saved);
    populateFormFromObject(parsed, 'draft');
    const ind = $('draft-autosave-indicator');
    if (ind) {
      ind.textContent = 'Đã khôi phục bản nháp đang làm dở từ localStorage.';
    }
  } catch {
    resetFormToBlankDraft();
  }
}

// --------------------------------------------------------------------------
// 4. KIỂM TRA TỰ ĐỘNG + XEM TRƯỚC TRỰC TIẾP + DUYỆT / XUẤT BẢN
// --------------------------------------------------------------------------
function setupFormEvents() {
  const form = $('property-form');
  if (!form) return;

  // Khi đổi price hoặc compare_price thì bắt xác nhận lại cờ lệch giá
  ['f-price', 'f-compare_price'].forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('input', () => {
        $('confirm-price-mismatch').checked = false;
      });
    }
  });

  form.addEventListener('input', e => {
    if (e.target.id !== 'confirm-price-mismatch') {
      saveDraftToLocalStorage();
    }
    validateAndRenderAll();
  });

  form.addEventListener('change', e => {
    if (e.target.id !== 'confirm-price-mismatch') {
      saveDraftToLocalStorage();
    }
    validateAndRenderAll();
  });

  // Nút Duyệt căn này
  const btnApprove = $('btn-approve');
  if (btnApprove) {
    btnApprove.addEventListener('click', handleApproveProperty);
  }

  // Nút Xuất bản — Tải data/properties.json
  const btnDownload = $('btn-download-json');
  if (btnDownload) {
    btnDownload.addEventListener('click', handleDownloadPublishedJson);
  }
}

function validateAndRenderAll() {
  const prop = readFormToObject();
  const missingFields = [];

  // (i) Kiểm tra 7 trường bắt buộc
  REQUIRED_FIELDS.forEach(field => {
    const grp = $(`grp-${field}`);
    const val = prop[field];
    let isValid = true;
    if (val === undefined || val === null) isValid = false;
    else if (typeof val === 'string' && val.trim() === '') isValid = false;
    else if ((field === 'price' || field === 'size_m2') && (typeof val !== 'number' || Number.isNaN(val) || val <= 0)) isValid = false;

    if (grp) {
      grp.classList.toggle('field-invalid', !isValid);
    }
    if (!isValid) missingFields.push(field);
  });

  // (ii) Cảnh báo trùng id và source_url so với danh sách căn hiện có trong data/properties.json
  const dupAlert = $('alert-duplicate');
  const dupMessages = [];
  if (prop.id) {
    const dupIdItem = APPROVED_DB.properties.find(p => p.id === prop.id);
    if (dupIdItem) {
      if (PROTECTED_IDS.has(prop.id)) {
        dupMessages.push(`⚠️ CẢNH BÁO TRÙNG MÃ GỐC: Mã "${prop.id}" thuộc 4 căn gốc bắt buộc giữ nguyên vẹn (${dupIdItem.name_jp}). Hãy đổi sang mã id mới nếu bạn muốn thêm căn mới.`);
      } else {
        dupMessages.push(`ℹ️ Trùng mã id: "${prop.id}" đã có trong danh sách đã duyệt (${dupIdItem.name_jp}). Nếu bấm Duyệt sẽ cập nhật căn đã duyệt này.`);
      }
    }
  }
  if (prop.source_url) {
    const dupSourceItem = APPROVED_DB.properties.find(p => p.source_url && p.source_url === prop.source_url && p.id !== prop.id);
    if (dupSourceItem) {
      dupMessages.push(`⚠️ CẢNH BÁO TRÙNG LINK NGUỒN (source_url): Link nguồn này đã được đăng ở căn "${dupSourceItem.id}" (${dupSourceItem.name_jp}).`);
    }
  }
  if (dupAlert) {
    if (dupMessages.length > 0) {
      dupAlert.innerHTML = dupMessages.join('<br>');
      dupAlert.classList.add('active');
    } else {
      dupAlert.classList.remove('active');
      dupAlert.innerHTML = '';
    }
  }

  // (iii) Cờ lệch giá: so sánh compare_price và price
  const compareRaw = $('f-compare_price').value.trim();
  const compareNum = compareRaw !== '' ? Number(compareRaw) : 0;
  const priceMismatchAlert = $('alert-price-mismatch');
  const priceMismatchText = $('price-mismatch-text');
  const isPriceMismatch = compareRaw !== '' && !Number.isNaN(compareNum) && compareNum > 0 && compareNum !== prop.price;
  const isMismatchConfirmed = $('confirm-price-mismatch').checked;

  if (priceMismatchAlert) {
    if (isPriceMismatch) {
      const diff = Math.abs(prop.price - compareNum).toLocaleString('en-US');
      priceMismatchText.textContent = `⚠️ Cờ vàng lệch giá: Giá chính thức (¥${prop.price.toLocaleString('en-US')}) khác với Giá đối chiếu (¥${compareNum.toLocaleString('en-US')}) — chênh lệch ¥${diff}. Bạn bắt buộc xác nhận bên dưới trước khi Duyệt.`;
      priceMismatchAlert.classList.add('active');
    } else {
      priceMismatchAlert.classList.remove('active');
    }
  }

  // Kiểm tra điều kiện featured (chỉ đúng 1 căn là true tại một thời điểm)
  const isLockedId = PROTECTED_IDS.has(prop.id);
  const existingFeatured = APPROVED_DB.properties.find(p => p.featured === true && p.id !== prop.id);
  let featuredConflictMsg = '';
  if (prop.featured && existingFeatured && PROTECTED_IDS.has(existingFeatured.id)) {
    featuredConflictMsg = `Lưu ý: Căn gốc "${existingFeatured.id}" đang giữ featured: true và được khóa bảo toàn nguyên vẹn. Bỏ chọn featured để đảm bảo đúng 1 căn nổi bật.`;
  }

  // Hộp tổng hợp trạng thái kiểm tra
  const summaryAlert = $('alert-validation-summary');
  const blockingReasons = [];
  if (missingFields.length > 0) {
    blockingReasons.push(`Thiếu trường bắt buộc: ${missingFields.join(', ')}`);
  }
  if (isPriceMismatch && !isMismatchConfirmed) {
    blockingReasons.push('Chưa tick xác nhận Cờ lệch giá');
  }
  if (isLockedId) {
    blockingReasons.push(`Mã "${prop.id}" là 1 trong 4 căn gốc được bảo vệ nguyên vẹn — hãy đổi mã id khác để duyệt căn mới`);
  }
  if (featuredConflictMsg) {
    blockingReasons.push(featuredConflictMsg);
  }

  if (summaryAlert) {
    if (blockingReasons.length > 0) {
      summaryAlert.innerHTML = `<strong>Chưa thể Duyệt / Xuất bản căn đang nhập:</strong> ${blockingReasons.join(' · ')}`;
      summaryAlert.classList.add('active');
    } else {
      summaryAlert.classList.remove('active');
      summaryAlert.innerHTML = '';
    }
  }

  // Khóa / mở nút Duyệt
  const btnApprove = $('btn-approve');
  if (btnApprove) {
    btnApprove.disabled = blockingReasons.length > 0;
  }

  // Cập nhật thanh vòng đời (Lifecycle Bar)
  updateLifecycleBar(prop);

  // Render Xem trước trực tiếp (Live Preview)
  renderLivePreview(prop);

  return blockingReasons.length === 0;
}

function updateLifecycleBar(prop) {
  const lcDraft = $('lc-draft');
  const lcApproved = $('lc-approved');
  const lcAvailable = $('lc-available');
  const lcSoldHidden = $('lc-sold-hidden');
  [lcDraft, lcApproved, lcAvailable, lcSoldHidden].forEach(el => {
    if (el) el.classList.remove('current');
  });

  if (currentLifecycleState === 'draft') {
    if (lcDraft) lcDraft.classList.add('current');
  } else {
    if (lcApproved) lcApproved.classList.add('current');
    if (prop.status === 'available') {
      if (lcAvailable) lcAvailable.classList.add('current');
    } else {
      if (lcSoldHidden) lcSoldHidden.classList.add('current');
    }
  }
}

// --------------------------------------------------------------------------
// 5. XEM TRƯỚC TRỰC TIẾP (LIVE PREVIEW DÙNG ĐÚNG CLASS TRANG CÔNG KHAI)
// --------------------------------------------------------------------------
function renderLivePreview(p) {
  const cardWrap = $('preview-card-container');
  const detailWrap = $('preview-detail-container');
  if (!cardWrap || !detailWrap) return;

  const hasImageRights = Boolean(p.image_rights);
  const rawImages = (p.images && p.images.length > 0) ? p.images : [];
  const displayImages = (hasImageRights && rawImages.length > 0) ? rawImages : [ILLUSTRATIVE_IMAGE];
  if (previewActiveImageIdx >= displayImages.length) previewActiveImageIdx = 0;
  const activeImg = displayImages[previewActiveImageIdx] || ILLUSTRATIVE_IMAGE;

  const illustrativeBannerHtml = !hasImageRights
    ? `<div class="illustrative-badge">ẢNH MINH HỌA — Chưa xác nhận quyền ảnh (image_rights = false)</div>`
    : '';

  const isSold = p.status === 'sold';
  const isHidden = p.status === 'hidden';
  const typeLabelCard = p.type === 'buy' ? 'Bán · 売買' : 'Cho thuê · 賃貸';
  const typeLabelDetail = p.type === 'buy' ? 'Nhà bán · 売買' : 'Cho thuê · 賃貸';

  const extraSpecs = [];
  if (p.renovation) extraSpecs.push(p.renovation);
  if (p.management_fee) extraSpecs.push(`Phí QL ¥${p.management_fee.toLocaleString()}/tháng`);
  if (p.repair_fund) extraSpecs.push(`Quỹ SC ¥${p.repair_fund.toLocaleString()}/tháng`);
  const extraSpecLine = extraSpecs.slice(0, 3).join(' · ');

  const layoutSize = [p.layout, p.size_m2 ? `${p.size_m2}㎡` : ''].filter(Boolean).join(' · ');
  const displayPrice = p.price_label || 'Chưa nhập giá';

  // 1. Thẻ nhà (.property-card)
  cardWrap.innerHTML = `
    <div class="property-card">
      <div class="card-image-wrap">
        ${illustrativeBannerHtml}
        <img src="${displayImages[0]}" alt="${p.name_jp || 'Xem trước'}">
      </div>
      <div class="card-body">
        <div class="card-meta-row">
          <span>${typeLabelCard}</span>
          <span>${p.area || 'Khu vực'} ${isSold ? '· (Đã giao dịch)' : (isHidden ? '· (Đang ẩn)' : '')}</span>
        </div>
        <h3 class="card-name serif">${p.name_jp || 'Tên căn tiếng Nhật (name_jp)'}</h3>
        <div class="card-address">${p.station || p.address || 'Ga gần nhất / Địa chỉ'}</div>
        <div class="card-price-row">
          <span class="card-price">${displayPrice}</span>
          ${layoutSize ? `<span style="font-size: 13px; color: var(--muted); margin-left: 6px;">· ${layoutSize}</span>` : ''}
        </div>
        <div class="card-spec-inline">${extraSpecLine || 'Vị trí thuận tiện'}</div>
        <div class="card-footer">
          <span class="card-btn-detail">Xem chi tiết →</span>
        </div>
      </div>
    </div>
  `;

  // 2. Bảng chi tiết căn (.dialog-box + .spec-table)
  const thumbsHtml = displayImages.length > 1 ? `
    <div class="gallery-thumbs" style="padding: 12px 24px 0;">
      ${displayImages.map((imgUrl, idx) => `
        <div class="gallery-thumb ${idx === previewActiveImageIdx ? 'active' : ''}" onclick="switchPreviewImage(${idx})">
          <img src="${imgUrl}" alt="Ảnh ${idx + 1}">
        </div>
      `).join('')}
    </div>
  ` : '';

  detailWrap.innerHTML = `
    <div class="dialog-box" style="max-height: none; box-shadow: none;">
      <div style="position: relative;">
        ${illustrativeBannerHtml}
        <img src="${activeImg}" alt="${p.name_jp || 'Xem trước'}" class="dialog-image">
      </div>
      ${thumbsHtml}
      <div class="dialog-body" style="padding: 22px 24px;">
        <div class="dialog-header-meta">
          <span class="status-pill">${typeLabelDetail} ${isSold ? '· Đã giao dịch' : (isHidden ? '· Ẩn' : '')}</span>
          <span style="font-size: 13px; color: var(--faint);">Mã: ${p.id || '—'}</span>
        </div>
        <h3 class="dialog-title serif">${p.name_jp || 'Tên căn tiếng Nhật'}</h3>
        ${p.name_vi ? `<div style="font-size: 13.5px; color: var(--muted); margin-bottom: 4px;">${p.name_vi}</div>` : ''}
        <div class="dialog-address">${p.address || 'Địa chỉ hiển thị'}</div>
        <div class="dialog-price">${displayPrice}</div>

        <table class="spec-table">
          <tbody>
            ${p.layout ? `<tr><td>Loại căn / Bố cục</td><td>${p.layout}</td></tr>` : ''}
            ${p.size_m2 ? `<tr><td>Diện tích sàn</td><td>${p.size_m2} ㎡ ${p.balcony_m2 ? `(Ban công ${p.balcony_m2} ㎡)` : ''}</td></tr>` : ''}
            ${p.land_m2 ? `<tr><td>Diện tích đất</td><td>${p.land_m2} ㎡</td></tr>` : ''}
            ${p.station ? `<tr><td>Ga gần nhất &amp; Đi bộ</td><td>${p.station}</td></tr>` : ''}
            ${(p.year_built || p.structure) ? `<tr><td>Năm xây &amp; Kết cấu</td><td>${p.year_built ? `Xây năm ${p.year_built}` : ''} ${p.structure ? `· ${p.structure}` : ''}</td></tr>` : ''}
            ${p.management_fee ? `<tr><td>Phí quản lý</td><td>¥${p.management_fee.toLocaleString()}/tháng</td></tr>` : ''}
            ${p.repair_fund ? `<tr><td>Quỹ sửa chữa</td><td>¥${p.repair_fund.toLocaleString()}/tháng</td></tr>` : ''}
            ${p.renovation ? `<tr><td>Tình trạng / Ghi chú</td><td>${p.renovation}</td></tr>` : ''}
          </tbody>
        </table>

        ${p.notes ? `<p class="featured-note" style="margin-bottom: 0;">${p.notes}</p>` : ''}
      </div>
    </div>
  `;
}

window.switchPreviewImage = function(idx) {
  previewActiveImageIdx = idx;
  validateAndRenderAll();
};

// --------------------------------------------------------------------------
// 6. DUYỆT CĂN VÀ XUẤT BẢN FILE data/properties.json HOÀN CHỈNH
// --------------------------------------------------------------------------
function handleApproveProperty() {
  if (!validateAndRenderAll()) return;

  const today = todayISO();
  $('f-last_verified_at').value = today;
  if (!$('f-imported_at').value) {
    $('f-imported_at').value = today;
  }

  const approvedProp = readFormToObject();

  // Không cho phép ghi đè 4 căn gốc bảo toàn
  if (PROTECTED_IDS.has(approvedProp.id)) {
    alert(`Căn "${approvedProp.id}" nằm trong 4 căn gốc bắt buộc giữ nguyên vẹn. Vui lòng đặt mã id mới.`);
    return;
  }

  const existingIdx = APPROVED_DB.properties.findIndex(p => p.id === approvedProp.id);
  if (existingIdx >= 0) {
    APPROVED_DB.properties[existingIdx] = approvedProp;
  } else {
    APPROVED_DB.properties.unshift(approvedProp);
  }

  // Xóa bản nháp khỏi localStorage vì căn này đã chính thức được Duyệt
  localStorage.removeItem(DRAFT_STORAGE_KEY);
  currentLifecycleState = 'approved';

  renderExistingSelector();
  renderApprovedTable();
  validateAndRenderAll();

  $('approve-feedback').textContent = `✓ Đã duyệt căn "${approvedProp.id}" (last_verified_at = ${today}). Bấm "Xuất bản — Tải data/properties.json" ở bảng dưới để tải file.`;
  $('draft-autosave-indicator').textContent = `Căn "${approvedProp.id}" đã được Duyệt và sẵn sàng xuất bản.`;
}

function renderApprovedTable() {
  const tbody = $('approved-table-body');
  const countEl = $('approved-count');
  const artCountEl = $('articles-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = APPROVED_DB.properties.length;
  if (artCountEl) artCountEl.textContent = (APPROVED_DB.articles || []).length;

  tbody.innerHTML = APPROVED_DB.properties.map(p => {
    const isProtected = PROTECTED_IDS.has(p.id);
    return `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td class="serif">${p.name_jp}</td>
        <td>${p.type === 'buy' ? 'Bán' : 'Thuê'} · ${p.area}</td>
        <td style="color: var(--amber-ink); font-weight: 500;" class="serif">${p.price_label}</td>
        <td>${p.status}</td>
        <td>${p.featured ? '★ Có' : '—'}</td>
        <td>${p.last_verified_at || (isProtected ? 'Căn gốc bảo toàn' : '—')}</td>
        <td>
          <button type="button" class="btn-outline-amber" style="padding: 4px 10px; font-size: 12px;" onclick="loadApprovedToForm('${p.id}')">
            Xem trên Form
          </button>
          ${!isProtected ? `
            <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 12px; margin-left: 4px;" onclick="removeCustomApproved('${p.id}')">
              Gỡ
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

window.loadApprovedToForm = function(id) {
  const found = APPROVED_DB.properties.find(p => p.id === id);
  if (!found) return;
  populateFormFromObject(found, 'approved');
  validateAndRenderAll();
  $('form-section').scrollIntoView({ behavior: 'smooth' });
};

window.removeCustomApproved = function(id) {
  if (PROTECTED_IDS.has(id)) return;
  APPROVED_DB.properties = APPROVED_DB.properties.filter(p => p.id !== id);
  renderExistingSelector();
  renderApprovedTable();
  validateAndRenderAll();
};

function buildPublishPayload() {
  // Bảo đảm 4 căn gốc và mảng articles luôn nguyên vẹn 100% từ ORIGINAL_SNAPSHOT
  const customApproved = APPROVED_DB.properties.filter(p => !PROTECTED_IDS.has(p.id));
  const originalProtected = ORIGINAL_SNAPSHOT
    ? JSON.parse(JSON.stringify(ORIGINAL_SNAPSHOT.properties.filter(p => PROTECTED_IDS.has(p.id))))
    : APPROVED_DB.properties.filter(p => PROTECTED_IDS.has(p.id));
  const originalArticles = ORIGINAL_SNAPSHOT
    ? JSON.parse(JSON.stringify(ORIGINAL_SNAPSHOT.articles))
    : APPROVED_DB.articles;

  return {
    properties: [...customApproved, ...originalProtected],
    articles: originalArticles
  };
}

function handleDownloadPublishedJson() {
  const payload = buildPublishPayload();
  const jsonString = JSON.stringify(payload, null, 2) + '\n';
  const blob = new Blob([jsonString], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'properties.json';
  a.click();
}
