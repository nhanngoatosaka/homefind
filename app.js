/**
 * BIG不動産 — Core Application JS
 * Đọc dữ liệu từ properties.json và render theo đúng STYLE_GUIDE.md
 */

let APP_DATA = {
  properties: [],
  articles: []
};

let currentFilter = 'all';

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupFilterEvents();
  setupContactForm();
  setupDialogClose();
});

const REQUIRED_PROPERTY_FIELDS = ['id', 'name_jp', 'price', 'type', 'area', 'size_m2', 'station'];

function validateProperty(p, index, logWarn = true) {
  if (!p || typeof p !== 'object') {
    if (logWarn) console.warn(`[BIG不動産] Bỏ qua căn tại vị trí #${index}: dữ liệu không phải object.`);
    return false;
  }
  const missing = REQUIRED_PROPERTY_FIELDS.filter(field => {
    const val = p[field];
    if (val === undefined || val === null) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    if ((field === 'price' || field === 'size_m2') && (typeof val !== 'number' || Number.isNaN(val) || val <= 0)) return true;
    return false;
  });
  if (missing.length > 0) {
    if (logWarn) console.warn(`[BIG不動産] Bỏ qua căn "${p.id || `#${index}`}" vì thiếu trường bắt buộc: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

function getValidPublicProperties(logWarn = true) {
  if (!APP_DATA || !Array.isArray(APP_DATA.properties)) return [];
  return APP_DATA.properties.filter((p, idx) => {
    if (!validateProperty(p, idx, logWarn)) return false;
    if (p.status === 'hidden') return false;
    return true;
  });
}

async function loadData() {
  try {
    const ts = Date.now();
    const res = await fetch(`data/properties.json?v=${ts}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể tải data/properties.json`);
    const json = await res.json();
    if (json && Array.isArray(json.properties)) {
      APP_DATA = json;
    }
  } catch (err) {
    console.error('Lỗi nạp dữ liệu:', err);
  }

  renderFeatured();
  renderPortfolio();
  renderArticles();
}

// --------------------------------------------------------------------------
// 4. Render CĂN NỔI BẬT (Khối 4)
// --------------------------------------------------------------------------
function renderFeatured() {
  const container = document.getElementById('featured-content');
  if (!container) return;

  const validProps = getValidPublicProperties(false);
  const featured = validProps.find(p => p.featured === true) || validProps[0];
  if (!featured) {
    container.innerHTML = '<p class="empty-message">Hiện chưa có căn nổi bật.</p>';
    return;
  }

  const images = (featured.images && featured.images.length > 0) 
    ? featured.images 
    : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200'];

  const thumbsHtml = images.map((imgUrl, idx) => `
    <div class="gallery-thumb ${idx === 0 ? 'active' : ''}" onclick="switchFeaturedImage('${imgUrl}', this)">
      <img src="${imgUrl}" alt="Thumbnail ${idx + 1}" loading="lazy">
    </div>
  `).join('');

  const statusLabel = featured.status === 'sold' 
    ? 'Đã bán · 成約済み' 
    : (featured.type === 'buy' ? 'Đang bán · 売出し中' : 'Đang cho thuê · 募集中');

  const balconyText = featured.balcony_m2 ? ` (ban công ${featured.balcony_m2}㎡)` : '';
  const mgmtText = featured.management_fee ? `¥${featured.management_fee.toLocaleString()}/tháng` : '—';
  const repairText = featured.repair_fund ? `¥${featured.repair_fund.toLocaleString()}/tháng` : '—';

  container.innerHTML = `
    <!-- Thư viện ảnh bên trái -->
    <div class="featured-gallery">
      <div class="gallery-main">
        <img id="featured-main-img" src="${images[0]}" alt="${featured.name_jp}">
      </div>
      <div class="gallery-thumbs">
        ${thumbsHtml}
      </div>
    </div>

    <!-- Thông tin bên phải -->
    <div class="featured-info">
      <span class="status-pill">${statusLabel}</span>
      <h2 class="featured-name serif">${featured.name_jp}</h2>
      <div class="featured-address">${featured.address || ''}</div>
      <div class="featured-price">${featured.price_label || (featured.price ? featured.price.toLocaleString() + '円' : 'Liên hệ')}</div>

      <table class="spec-table">
        <tbody>
          <tr>
            <td>Bố cục · Diện tích</td>
            <td>${featured.layout || '—'} · ${featured.size_m2 || '—'}㎡${balconyText}</td>
          </tr>
          <tr>
            <td>Ga gần nhất</td>
            <td>${featured.station || '—'}</td>
          </tr>
          <tr>
            <td>Tình trạng cải tạo</td>
            <td>${featured.renovation || 'Nguyên trạng'}</td>
          </tr>
          <tr>
            <td>Tòa nhà &amp; Kết cấu</td>
            <td>${featured.year_built ? `Xây năm ${featured.year_built}` : ''} ${featured.structure ? `· ${featured.structure}` : ''}</td>
          </tr>
          <tr>
            <td>Phí quản lý</td>
            <td>${mgmtText}</td>
          </tr>
          <tr>
            <td>Quỹ sửa chữa</td>
            <td>${repairText}</td>
          </tr>
        </tbody>
      </table>

      ${featured.notes ? `<p class="featured-note">${featured.notes}</p>` : ''}

      <div>
        ${featured.status !== 'sold' ? `
          <a href="#contact" class="btn-primary" onclick="selectPropertyForContact('${featured.id}', '${featured.name_jp}')">
            Đặt lịch xem căn này
          </a>
        ` : ''}
      </div>
    </div>
  `;
}

window.switchFeaturedImage = function(src, element) {
  const mainImg = document.getElementById('featured-main-img');
  if (mainImg) mainImg.src = src;

  const thumbs = document.querySelectorAll('.gallery-thumb');
  thumbs.forEach(t => t.classList.remove('active'));
  if (element) element.classList.add('active');
};

// --------------------------------------------------------------------------
// 5. Render LƯỚI PORTFOLIO (Khối 5)
// --------------------------------------------------------------------------
function setupFilterEvents() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderPortfolio();
    });
  });
}

function renderPortfolio() {
  const grid = document.getElementById('property-grid');
  if (!grid) return;

  const validProps = getValidPublicProperties(true);

  let filtered = validProps.filter(p => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'buy') return p.type === 'buy';
    if (currentFilter === 'rent-osaka') return p.type === 'rent' && p.area === 'Osaka';
    if (currentFilter === 'rent-kyoto') return p.type === 'rent' && p.area === 'Kyoto';
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="empty-message">Chưa có căn nào trong mục này.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const isSold = p.status === 'sold';
    const typeLabel = p.type === 'buy' ? 'Bán · 売買' : 'Cho thuê · 賃貸';
    const mainImg = (p.images && p.images.length > 0) ? p.images[0] : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800';

    // Dòng thông số phụ dưới giá (chỉ 2-3 thông số ngăn bởi ·)
    const extraSpecs = [];
    if (p.renovation) extraSpecs.push(p.renovation);
    if (p.management_fee) extraSpecs.push(`Phí QL ¥${p.management_fee.toLocaleString()}/tháng`);
    if (p.repair_fund) extraSpecs.push(`Quỹ SC ¥${p.repair_fund.toLocaleString()}/tháng`);
    const extraSpecLine = extraSpecs.slice(0, 3).join(' · ');

    const layoutSize = [p.layout, p.size_m2 ? `${p.size_m2}㎡` : ''].filter(Boolean).join(' · ');

    return `
      <div class="property-card">
        <div class="card-image-wrap">
          <img src="${mainImg}" alt="${p.name_jp}" loading="lazy">
        </div>
        <div class="card-body">
          <div class="card-meta-row">
            <span>${typeLabel}</span>
            <span>${p.area || ''} ${isSold ? '· (Đã giao dịch)' : ''}</span>
          </div>
          <h3 class="card-name serif">${p.name_jp}</h3>
          <div class="card-address">${p.station || p.address || ''}</div>
          <div class="card-price-row">
            <span class="card-price">${p.price_label || (p.price ? p.price.toLocaleString() + '円' : 'Liên hệ')}</span>
            ${layoutSize ? `<span style="font-size: 13px; color: var(--muted); margin-left: 6px;">· ${layoutSize}</span>` : ''}
          </div>
          <div class="card-spec-inline">${extraSpecLine || 'Vị trí thuận tiện'}</div>
          <div class="card-footer">
            <button class="card-btn-detail" onclick="openPropertyDialog('${p.id}')">Xem chi tiết →</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// 6. Render BÀI CHIA SẺ (Khối 6)
// --------------------------------------------------------------------------
function renderArticles() {
  const grid = document.getElementById('article-grid');
  if (!grid) return;

  if (!APP_DATA.articles || APP_DATA.articles.length === 0) {
    grid.innerHTML = '<p class="empty-message">Chưa có bài viết mới.</p>';
    return;
  }

  grid.innerHTML = APP_DATA.articles.map(a => `
    <article class="article-card">
      <div class="article-img-wrap">
        <img src="${a.image || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'}" alt="${a.title}" loading="lazy">
      </div>
      <div class="article-body">
        <span class="article-cat">${a.category || 'Chia sẻ'}</span>
        <h3 class="article-title serif">${a.title}</h3>
        <p class="article-summary">${a.summary}</p>
        <div class="article-content-full" id="article-body-${a.id}">
          ${a.body}
        </div>
        <button class="article-read-btn" id="article-btn-${a.id}" onclick="toggleArticle('${a.id}')">Đọc bài</button>
      </div>
    </article>
  `).join('');
}

window.toggleArticle = function(id) {
  const contentEl = document.getElementById(`article-body-${id}`);
  const btnEl = document.getElementById(`article-btn-${id}`);
  if (!contentEl || !btnEl) return;

  const isOpen = contentEl.classList.toggle('open');
  btnEl.textContent = isOpen ? 'Thu gọn' : 'Đọc bài';
};

// --------------------------------------------------------------------------
// HỘP THOẠI CHI TIẾT (Dialog Modal)
// --------------------------------------------------------------------------
window.openPropertyDialog = function(id) {
  const p = APP_DATA.properties.find(x => x.id === id);
  if (!p) return;

  const overlay = document.getElementById('property-dialog');
  const content = document.getElementById('dialog-content');
  if (!overlay || !content) return;

  const isSold = p.status === 'sold';
  const typeLabel = p.type === 'buy' ? 'Nhà bán · 売買' : 'Cho thuê · 賃貸';
  const images = (p.images && p.images.length > 0) ? p.images : [];
  const mainImg = images[0] || '';
  const thumbsHtml = images.length > 1 ? `
    <div class="gallery-thumbs" style="padding: 12px 28px 0;">
      ${images.map((imgUrl, idx) => `
        <div class="gallery-thumb ${idx === 0 ? 'active' : ''}" onclick="switchDialogImage('${imgUrl}', this)">
          <img src="${imgUrl}" alt="Ảnh ${idx + 1}" loading="lazy">
        </div>
      `).join('')}
    </div>
  ` : '';

  content.innerHTML = `
    ${mainImg ? `<img id="dialog-main-img" src="${mainImg}" alt="${p.name_jp}" class="dialog-image">` : ''}
    ${thumbsHtml}
    <div class="dialog-body">
      <div class="dialog-header-meta">
        <span class="status-pill">${typeLabel} ${isSold ? '· Đã giao dịch' : ''}</span>
        <span style="font-size: 13px; color: var(--faint);">Mã: ${p.id}</span>
      </div>
      <h2 class="dialog-title serif">${p.name_jp}</h2>
      <div class="dialog-address">${p.address || ''}</div>
      <div class="dialog-price">${p.price_label || (p.price ? p.price.toLocaleString() + '円' : 'Liên hệ')}</div>

      <table class="spec-table">
        <tbody>
          ${p.layout ? `
          <tr>
            <td>Loại căn / Bố cục</td>
            <td>${p.layout}</td>
          </tr>` : ''}
          ${p.size_m2 ? `
          <tr>
            <td>Diện tích sàn</td>
            <td>${p.size_m2} ㎡ ${p.balcony_m2 ? `(Ban công ${p.balcony_m2} ㎡)` : ''}</td>
          </tr>` : ''}
          ${p.land_m2 ? `
          <tr>
            <td>Diện tích đất</td>
            <td>${p.land_m2} ㎡</td>
          </tr>` : ''}
          ${p.station ? `
          <tr>
            <td>Ga gần nhất &amp; Đi bộ</td>
            <td>${p.station}</td>
          </tr>` : ''}
          ${(p.year_built || p.structure) ? `
          <tr>
            <td>Năm xây &amp; Kết cấu</td>
            <td>${p.year_built ? `Xây năm ${p.year_built}` : ''} ${p.structure ? `· ${p.structure}` : ''}</td>
          </tr>` : ''}
          ${p.management_fee ? `
          <tr>
            <td>Phí quản lý</td>
            <td>¥${p.management_fee.toLocaleString()}/tháng</td>
          </tr>` : ''}
          ${p.repair_fund ? `
          <tr>
            <td>Quỹ sửa chữa</td>
            <td>¥${p.repair_fund.toLocaleString()}/tháng</td>
          </tr>` : ''}
          ${p.renovation ? `
            <tr>
              <td>Tình trạng / Ghi chú</td>
              <td>${p.renovation}</td>
            </tr>
          ` : ''}
        </tbody>
      </table>

      ${p.notes ? `<p class="featured-note" style="margin-top: 14px;">${p.notes}</p>` : ''}

      <div class="dialog-actions">
        ${!isSold ? `
          <a href="#contact" class="btn-primary" onclick="selectPropertyForContact('${p.id}', '${p.name_jp}'); closePropertyDialog();">
            Đặt lịch xem căn này
          </a>
        ` : ''}
        <button class="btn-secondary" onclick="closePropertyDialog()">Đóng</button>
      </div>
    </div>
  `;

  overlay.classList.add('open');
};

window.switchDialogImage = function(src, element) {
  const mainImg = document.getElementById('dialog-main-img');
  if (mainImg) mainImg.src = src;

  const overlay = document.getElementById('property-dialog');
  if (!overlay) return;
  const thumbs = overlay.querySelectorAll('.gallery-thumb');
  thumbs.forEach(t => t.classList.remove('active'));
  if (element) element.classList.add('active');
};

window.closePropertyDialog = function() {
  const overlay = document.getElementById('property-dialog');
  if (overlay) overlay.classList.remove('open');
};

function setupDialogClose() {
  const overlay = document.getElementById('property-dialog');
  if (!overlay) return;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePropertyDialog();
    }
  });
}

// --------------------------------------------------------------------------
// 8. FORM LIÊN HỆ SOẠN SẴN TIN NHẮN (Khối 8)
// --------------------------------------------------------------------------
window.selectPropertyForContact = function(id, name) {
  const inputProp = document.getElementById('form-property');
  if (inputProp) {
    inputProp.value = `${name} (${id})`;
  }
};

function setupContactForm() {
  const form = document.getElementById('contact-form');
  const readyBox = document.getElementById('ready-message-box');
  const readyText = document.getElementById('ready-message-text');
  const copyBtn = document.getElementById('btn-copy-message');
  const copyStatus = document.getElementById('copy-status');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('form-name').value.trim();
    const contact = document.getElementById('form-contact').value.trim();
    const channel = document.getElementById('form-channel').value;
    const property = document.getElementById('form-property').value.trim();
    const message = document.getElementById('form-message').value.trim();

    // Soạn đoạn tin nhắn mẫu
    const template = [
      `Xin chào BIG不動産,`,
      `Tôi tên là: ${name}`,
      `Phương thức liên hệ lại (${channel}): ${contact}`,
      property ? `Căn nhà tôi đang quan tâm: ${property}` : '',
      message ? `Nội dung thắc mắc / Đặt lịch: ${message}` : 'Tôi muốn tìm hiểu thêm thông tin về căn nhà này và thủ tục vay mua.',
      `Rất mong nhận được phản hồi từ anh/chị. Cảm ơn!`
    ].filter(Boolean).join('\n\n');

    readyText.textContent = template;
    readyBox.classList.add('active');
    readyBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const textToCopy = readyText.textContent;
      navigator.clipboard.writeText(textToCopy).then(() => {
        copyStatus.textContent = '✓ Đã sao chép vào bộ nhớ tạm!';
        setTimeout(() => {
          copyStatus.textContent = '';
        }, 3000);
      }).catch(err => {
        console.error('Không thể copy:', err);
      });
    });
  }
}
