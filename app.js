/**
 * BIG不動産 — Core Public Application JS (Đợt 2: Chuẩn Sale & Chuyển đổi)
 * Tuân thủ nghiêm ngặt STYLE_GUIDE.md và SCHEMA.md
 */

let APP_DATA = {
  properties: [],
  articles: []
};

let currentFilter = 'all';
let currentPriceFilter = 'all';
let currentMinSize = 0;
let currentLayoutFilter = 'all';
let currentSort = 'default';
let currentLang = 'vi';

let isDialogOpen = false;
let isContactSectionInView = false;

const REQUIRED_PROPERTY_FIELDS = ['id', 'name_jp', 'price', 'type', 'area', 'size_m2', 'station'];

// --------------------------------------------------------------------------
// KHỞI TẠO ỨNG DỤNG
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initAnalytics();
  initLanguageSelector();
  renderContactChannels();
  renderFooterCompanyInfo();
  initMobileStickyBar();
  setupFilterEvents();
  setupContactForm();
  setupDialogClose();
  loadData();
});

function getSiteConfig() {
  return window.SITE || {};
}

function t(key) {
  const dict = window.I18N || {};
  if (dict[currentLang] && dict[currentLang][key] !== undefined) {
    return dict[currentLang][key];
  }
  if (dict.vi && dict.vi[key] !== undefined) {
    return dict.vi[key];
  }
  return key;
}

// --------------------------------------------------------------------------
// VIỆC 9: ĐO LƯỜNG GA4 & META PIXEL (Chỉ tải khi ID trong config.js khác rỗng)
// --------------------------------------------------------------------------
function initAnalytics() {
  const site = getSiteConfig();
  const ga4Id = (site.ga4Id || '').trim();
  const pixelId = (site.metaPixelId || '').trim();

  // Chỉ gắn GA4 khi ga4Id khác rỗng
  if (ga4Id !== '') {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', ga4Id);
  }

  // Chỉ gắn Meta Pixel khi metaPixelId khác rỗng
  if (pixelId !== '') {
    /* eslint-disable */
    !(function(f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }
}

function trackEvent(eventName, params = {}) {
  const site = getSiteConfig();
  try {
    if ((site.ga4Id || '').trim() !== '' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
    if ((site.metaPixelId || '').trim() !== '' && typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, params);
    }
  } catch (err) {
    // Không làm gián đoạn trải nghiệm người dùng nếu trình chặn quảng cáo chặn script
  }
}

window.trackContactClick = function(channel, propertyId = '') {
  trackEvent('click_contact', {
    channel: channel,
    property_id: propertyId || 'general'
  });
};

// --------------------------------------------------------------------------
// NGÔN NGỮ & I18N (VIỆC 5 & VIỆC 7)
// --------------------------------------------------------------------------
function initLanguageSelector() {
  const sel = document.getElementById('lang-select');
  if (!sel) return;
  sel.value = currentLang;
  sel.addEventListener('change', () => {
    currentLang = sel.value || 'vi';
    applyStaticI18n();
    renderFeatured();
    renderPortfolio();
    renderContactChannels();
    initMobileStickyBar();
  });
}

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });
}

// --------------------------------------------------------------------------
// KIỂM TRA DỮ KIỆN & NẠP data/properties.json
// --------------------------------------------------------------------------
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

  populateLayoutFilterOptions();
  initArticleFilters();
  renderFeatured();
  renderPortfolio();
  renderArticles();
}

// --------------------------------------------------------------------------
// VIỆC 1: HÀNH ĐỘNG LIÊN HỆ THẬT (Đọc từ window.SITE, tự ẩn kênh rỗng)
// --------------------------------------------------------------------------
function buildPrefilledChatMessage(p) {
  const pageUrl = window.location.href.split('#')[0];
  if (!p) {
    return `Xin chào BIG不動産, tôi đang xem website ${pageUrl} và muốn được tư vấn bất động sản tại Osaka / Kansai.`;
  }
  const priceStr = p.price_label || (p.price ? `¥${p.price.toLocaleString()}` : '');
  return `Xin chào BIG不動産, tôi quan tâm căn "${p.name_jp}" (${priceStr} · Mã: ${p.id}). Tôi muốn gửi yêu cầu xem nhà. Link: ${pageUrl}`;
}

function getConfiguredDirectChatChannels(p) {
  const site = getSiteConfig();
  const msg = buildPrefilledChatMessage(p);
  const encodedMsg = encodeURIComponent(msg);
  const channels = [];

  const waRaw = (site.whatsappNumber || '').trim();
  if (waRaw !== '') {
    const cleanDigits = waRaw.replace(/[^\d]/g, '');
    if (cleanDigits) {
      channels.push({
        id: 'whatsapp',
        label: 'WhatsApp',
        url: `https://wa.me/${cleanDigits}?text=${encodedMsg}`
      });
    }
  }

  const zaloRaw = (site.zaloUrl || '').trim();
  if (zaloRaw !== '') {
    channels.push({
      id: 'zalo',
      label: 'Chat Zalo',
      url: zaloRaw
    });
  }

  const lineRaw = (site.lineUrl || '').trim();
  if (lineRaw !== '') {
    channels.push({
      id: 'line',
      label: 'Chat LINE',
      url: lineRaw
    });
  }

  return channels;
}

function renderPropertyDirectActionButtons(p) {
  const site = getSiteConfig();
  const btns = [];
  const propId = p ? p.id : 'general';

  // Nút gọi cố định
  const phoneTel = (site.phoneTel || '').trim();
  const phoneDisplay = (site.phoneDisplay || phoneTel).trim();
  if (phoneTel !== '') {
    btns.push(`
      <a href="tel:${phoneTel}" class="btn-outline-amber" onclick="trackContactClick('tel', '${propId}')">
        ${t('btn_call_now')}: ${phoneDisplay}
      </a>
    `);
  }

  // Các kênh chat trực tiếp (chỉ hiện khi được cấu hình khác rỗng)
  const chatChannels = getConfiguredDirectChatChannels(p);
  chatChannels.forEach(ch => {
    btns.push(`
      <a href="${ch.url}" target="_blank" rel="noopener" class="btn-outline-amber" onclick="trackContactClick('${ch.id}', '${propId}')">
        ${ch.label}
      </a>
    `);
  });

  if (btns.length === 0) return '';
  return `<div class="direct-contact-row">${btns.join('')}</div>`;
}

// Nút chính "Gửi yêu cầu xem nhà" trong hộp chi tiết và mục căn nổi bật
window.handleRequestViewing = function(propertyId) {
  const p = APP_DATA.properties.find(x => x.id === propertyId);
  const chatChannels = getConfiguredDirectChatChannels(p);

  if (chatChannels.length > 0) {
    // Mở thẳng kênh chat đầu tiên đã cấu hình kèm tin nhắn điền sẵn
    const primary = chatChannels[0];
    trackEvent('click_contact', { channel: primary.id, property_id: propertyId });
    window.open(primary.url, '_blank', 'noopener');
    return;
  }

  // Phương án dự phòng khi các link chat trong config.js đều đang để trống
  trackEvent('click_contact', { channel: 'form', property_id: propertyId });
  closePropertyDialog();

  const inputProp = document.getElementById('form-property');
  const inputMsg = document.getElementById('form-message');
  if (p && inputProp) {
    inputProp.value = `${p.name_jp} (${p.price_label || p.price} · Mã: ${p.id})`;
  }
  if (p && inputMsg && !inputMsg.value.trim()) {
    inputMsg.value = buildPrefilledChatMessage(p);
  }

  const contactSec = document.getElementById('contact');
  if (contactSec) {
    contactSec.scrollIntoView({ behavior: 'smooth' });
  }
  setTimeout(() => {
    const nameInput = document.getElementById('form-name');
    if (nameInput) nameInput.focus();
  }, 450);
};

// --------------------------------------------------------------------------
// VIỆC 2: THANH LIÊN HỆ DÍNH TRÊN DI ĐỘNG (<= 920px, tự ẩn khi mở Dialog / tới #contact)
// --------------------------------------------------------------------------
function initMobileStickyBar() {
  const bar = document.getElementById('mobile-sticky-bar');
  if (!bar) return;

  const site = getSiteConfig();
  const buttons = [];

  const phoneTel = (site.phoneTel || '').trim();
  const phoneDisplay = (site.phoneDisplay || phoneTel).trim();
  if (phoneTel !== '') {
    buttons.push(`
      <a href="tel:${phoneTel}" class="btn-primary mobile-sticky-btn" onclick="trackContactClick('tel', 'mobile_sticky')">
        ${t('sticky_call')} · ${phoneDisplay}
      </a>
    `);
  }

  const zaloUrl = (site.zaloUrl || '').trim();
  if (zaloUrl !== '') {
    buttons.push(`
      <a href="${zaloUrl}" target="_blank" rel="noopener" class="btn-secondary mobile-sticky-btn" onclick="trackContactClick('zalo', 'mobile_sticky')">
        ${t('sticky_zalo')}
      </a>
    `);
  }

  const waRaw = (site.whatsappNumber || '').trim();
  if (waRaw !== '') {
    const cleanDigits = waRaw.replace(/[^\d]/g, '');
    if (cleanDigits) {
      const encoded = encodeURIComponent(buildPrefilledChatMessage(null));
      buttons.push(`
        <a href="https://wa.me/${cleanDigits}?text=${encoded}" target="_blank" rel="noopener" class="btn-secondary mobile-sticky-btn" onclick="trackContactClick('whatsapp', 'mobile_sticky')">
          ${t('sticky_whatsapp')}
        </a>
      `);
    }
  }

  if (buttons.length === 0) {
    bar.innerHTML = '';
    bar.classList.add('is-hidden');
    document.body.classList.remove('has-mobile-sticky');
    return;
  }

  bar.innerHTML = buttons.slice(0, 3).join('');
  document.body.classList.add('has-mobile-sticky');
  updateMobileStickyVisibility();

  // Quan sát vùng #contact để tự ẩn thanh dính khi khách đã cuộn tới chân trang liên hệ
  const contactSection = document.getElementById('contact');
  if (contactSection && 'IntersectionObserver' in window && !window._stickyObserverAttached) {
    window._stickyObserverAttached = true;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        isContactSectionInView = entry.isIntersecting;
        updateMobileStickyVisibility();
      });
    }, { threshold: 0.12 });
    observer.observe(contactSection);
  }
}

function updateMobileStickyVisibility() {
  const bar = document.getElementById('mobile-sticky-bar');
  if (!bar) return;
  if (!bar.innerHTML.trim() || isDialogOpen || isContactSectionInView) {
    bar.classList.add('is-hidden');
  } else {
    bar.classList.remove('is-hidden');
  }
}

// --------------------------------------------------------------------------
// VIỆC 3: CTA GIỮA TRANG HỨNG KHÁCH ẤM ("Nhận nhà mới theo nhu cầu")
// --------------------------------------------------------------------------
window.requestCustomPropertyDemand = function() {
  trackEvent('click_contact', { channel: 'form', property_id: 'custom_demand' });
  const inputProp = document.getElementById('form-property');
  if (inputProp) {
    inputProp.value = 'Nhận nhà mới theo nhu cầu';
  }
  const contactSec = document.getElementById('contact');
  if (contactSec) {
    contactSec.scrollIntoView({ behavior: 'smooth' });
  }
  setTimeout(() => {
    const nameInput = document.getElementById('form-name');
    if (nameInput) nameInput.focus();
  }, 450);
};

// --------------------------------------------------------------------------
// 3. Render CĂN NỔI BẬT (#featured)
// --------------------------------------------------------------------------
function renderFeatured() {
  const container = document.getElementById('featured-content');
  if (!container) return;

  const validProps = getValidPublicProperties(false);
  const featured = validProps.find(p => p.featured === true) || validProps[0];
  if (!featured) {
    container.innerHTML = `<p class="empty-message">${t('empty_portfolio')}</p>`;
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
    ? t('status_sold')
    : (featured.type === 'buy' ? t('status_available_buy') : t('status_available_rent'));

  const { primaryTitle, secondaryTitle } = getLocalizedPropertyTitles(featured);
  const balconyText = featured.balcony_m2 ? ` (${t('balcony_m2')} ${featured.balcony_m2}㎡)` : '';
  const mgmtText = featured.management_fee ? `¥${featured.management_fee.toLocaleString()}${t('unit_per_month')}` : '—';
  const repairText = featured.repair_fund ? `¥${featured.repair_fund.toLocaleString()}${t('unit_per_month')}` : '—';

  const yieldRowsHtml = (featured.type === 'buy' && (featured.annual_rent > 0 || featured.gross_yield > 0)) ? `
    ${featured.annual_rent > 0 ? `
    <tr>
      <td>${t('annual_rent')}</td>
      <td>¥${featured.annual_rent.toLocaleString()}${t('unit_per_year')}</td>
    </tr>` : ''}
    ${featured.gross_yield > 0 ? `
    <tr>
      <td>${t('gross_yield')}</td>
      <td><strong style="color: var(--amber-ink);">${featured.gross_yield}%</strong></td>
    </tr>` : ''}
  ` : '';

  container.innerHTML = `
    <div class="featured-gallery">
      <div class="gallery-main" style="position: relative;">
        ${renderCornerBadgeHtml(featured)}
        <img id="featured-main-img" src="${images[0]}" alt="${featured.name_jp}">
      </div>
      <div class="gallery-thumbs">
        ${thumbsHtml}
      </div>
    </div>

    <div class="featured-info">
      <span class="status-pill">${statusLabel}</span>
      <h2 class="featured-name serif">${primaryTitle}</h2>
      ${secondaryTitle ? `<div class="card-name-sub" style="margin-bottom: 8px;">${secondaryTitle}</div>` : ''}
      <div class="featured-address">${featured.address || ''}</div>
      <div class="featured-price">${featured.price_label || (featured.price ? featured.price.toLocaleString() + '円' : 'Liên hệ')}</div>

      <table class="spec-table">
        <tbody>
          <tr>
            <td>${t('layout')} · ${t('size_m2')}</td>
            <td>${featured.layout || '—'} · ${featured.size_m2 || '—'}㎡${balconyText}</td>
          </tr>
          <tr>
            <td>${t('station')}</td>
            <td>${featured.station || '—'}</td>
          </tr>
          <tr>
            <td>${t('renovation')}</td>
            <td>${featured.renovation || 'Nguyên trạng'}</td>
          </tr>
          <tr>
            <td>${t('year_built')} · ${t('structure')}</td>
            <td>${featured.year_built ? `${featured.year_built}` : ''} ${featured.structure ? `· ${featured.structure}` : ''}</td>
          </tr>
          <tr>
            <td>${t('management_fee')}</td>
            <td>${mgmtText}</td>
          </tr>
          <tr>
            <td>${t('repair_fund')}</td>
            <td>${repairText}</td>
          </tr>
          ${yieldRowsHtml}
        </tbody>
      </table>

      ${featured.notes ? `<p class="featured-note">${featured.notes}</p>` : ''}

      <div>
        ${featured.status !== 'sold' ? `
          <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
            <button type="button" class="btn-primary" onclick="handleRequestViewing('${featured.id}')">
              ${t('btn_request_viewing')}
            </button>
            <button type="button" class="btn-secondary" onclick="openPropertyDialog('${featured.id}')">
              ${t('btn_view_detail')}
            </button>
          </div>
          ${renderPropertyDirectActionButtons(featured)}
        ` : ''}
      </div>
    </div>
  `;
}

window.switchFeaturedImage = function(src, element) {
  const mainImg = document.getElementById('featured-main-img');
  if (mainImg) mainImg.src = src;

  const thumbs = document.querySelectorAll('.gallery-thumb');
  thumbs.forEach(tEl => tEl.classList.remove('active'));
  if (element) element.classList.add('active');
};

// --------------------------------------------------------------------------
// VIỆC 4 & VIỆC 5: LỌC, SẮP XẾP & THẺ NHÀ CHUẨN QUẦY BÁN
// --------------------------------------------------------------------------
function isImportedWithin30Days(importedAtStr) {
  if (!importedAtStr || typeof importedAtStr !== 'string') return false;
  const importedTime = new Date(importedAtStr).getTime();
  if (Number.isNaN(importedTime)) return false;
  const diffDays = (Date.now() - importedTime) / (1000 * 60 * 60 * 24);
  return diffDays >= -1 && diffDays <= 30;
}

// Thứ tự ưu tiên nhãn góc trên ảnh: ĐÃ BÁN > NỔI BẬT > MỚI (tối đa 1 nhãn/thẻ)
function renderCornerBadgeHtml(p) {
  if (p.status === 'sold') {
    return `<span class="card-badge card-badge-sold">${t('badge_sold')}</span>`;
  }
  if (p.featured === true) {
    return `<span class="card-badge card-badge-featured">${t('badge_featured')}</span>`;
  }
  if (isImportedWithin30Days(p.imported_at)) {
    return `<span class="card-badge card-badge-new">${t('badge_new')}</span>`;
  }
  return '';
}

// Tên căn trên thẻ theo ngôn ngữ đang chọn: vi -> name_vi chính + name_jp phụ; ja -> name_jp chính + name_vi phụ
function getLocalizedPropertyTitles(p) {
  const nameJp = (p.name_jp || '').trim();
  const nameVi = (p.name_vi || '').trim();

  if (currentLang === 'ja') {
    return {
      primaryTitle: nameJp || nameVi,
      secondaryTitle: (nameVi && nameVi !== nameJp) ? nameVi : ''
    };
  }
  // Mặc định tiếng Việt (và tiếng Anh): ưu tiên name_vi, nếu trống mới lùi về name_jp
  if (nameVi) {
    return {
      primaryTitle: nameVi,
      secondaryTitle: (nameJp && nameJp !== nameVi) ? nameJp : ''
    };
  }
  return {
    primaryTitle: nameJp,
    secondaryTitle: ''
  };
}

function populateLayoutFilterOptions() {
  const layoutSelect = document.getElementById('filter-layout');
  if (!layoutSelect) return;

  const validProps = getValidPublicProperties(false);
  const layouts = [];
  validProps.forEach(p => {
    const l = (p.layout || '').trim();
    if (l && !layouts.includes(l)) {
      layouts.push(l);
    }
  });

  const prevVal = layoutSelect.value || 'all';
  const opts = [`<option value="all" data-i18n="filter_layout_all">${t('filter_layout_all')}</option>`];
  layouts.forEach(l => {
    opts.push(`<option value="${l}">${l}</option>`);
  });
  layoutSelect.innerHTML = opts.join('');
  if (layouts.includes(prevVal)) {
    layoutSelect.value = prevVal;
  } else {
    layoutSelect.value = 'all';
    currentLayoutFilter = 'all';
  }
}

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

  const priceSel = document.getElementById('filter-price');
  if (priceSel) {
    priceSel.addEventListener('change', () => {
      currentPriceFilter = priceSel.value;
      renderPortfolio();
    });
  }

  const sizeSel = document.getElementById('filter-min-size');
  if (sizeSel) {
    sizeSel.addEventListener('change', () => {
      currentMinSize = Number(sizeSel.value) || 0;
      renderPortfolio();
    });
  }

  const layoutSel = document.getElementById('filter-layout');
  if (layoutSel) {
    layoutSel.addEventListener('change', () => {
      currentLayoutFilter = layoutSel.value;
      renderPortfolio();
    });
  }

  const sortSel = document.getElementById('filter-sort');
  if (sortSel) {
    sortSel.addEventListener('change', () => {
      currentSort = sortSel.value;
      renderPortfolio();
    });
  }
}

function matchesPriceFilter(p, priceFilterVal) {
  if (!priceFilterVal || priceFilterVal === 'all') return true;
  const price = Number(p.price) || 0;
  switch (priceFilterVal) {
    case 'buy-under-10m':
      return p.type === 'buy' && price < 10000000;
    case 'buy-10m-30m':
      return p.type === 'buy' && price >= 10000000 && price <= 30000000;
    case 'buy-over-30m':
      return p.type === 'buy' && price > 30000000;
    case 'rent-under-40k':
      return p.type === 'rent' && price < 40000;
    case 'rent-40k-80k':
      return p.type === 'rent' && price >= 40000 && price <= 80000;
    case 'rent-over-80k':
      return p.type === 'rent' && price > 80000;
    default:
      return true;
  }
}

function sortPropertiesList(list, sortMode) {
  const indexed = list.map((item, originalIndex) => ({ item, originalIndex }));

  if (sortMode === 'price-asc') {
    indexed.sort((a, b) => (Number(a.item.price) || 0) - (Number(b.item.price) || 0));
  } else if (sortMode === 'price-desc') {
    indexed.sort((a, b) => (Number(b.item.price) || 0) - (Number(a.item.price) || 0));
  } else if (sortMode === 'newest') {
    // Sắp xếp theo imported_at giảm dần; căn không có imported_at giữ nguyên thứ tự gốc ở cuối
    indexed.sort((a, b) => {
      const hasA = Boolean(a.item.imported_at);
      const hasB = Boolean(b.item.imported_at);
      if (hasA && hasB) {
        const timeA = new Date(a.item.imported_at).getTime();
        const timeB = new Date(b.item.imported_at).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return a.originalIndex - b.originalIndex;
      }
      if (hasA && !hasB) return -1;
      if (!hasA && hasB) return 1;
      return a.originalIndex - b.originalIndex;
    });
  }

  return indexed.map(entry => entry.item);
}

function renderPortfolio() {
  const grid = document.getElementById('property-grid');
  if (!grid) return;

  const validProps = getValidPublicProperties(true);

  const filtered = validProps.filter(p => {
    // 1. Lọc theo tab loại / khu vực
    if (currentFilter === 'buy' && p.type !== 'buy') return false;
    if (currentFilter === 'rent-osaka' && !(p.type === 'rent' && p.area === 'Osaka')) return false;
    if (currentFilter === 'rent-kyoto' && !(p.type === 'rent' && p.area === 'Kyoto')) return false;

    // 2. Lọc theo khoảng giá
    if (!matchesPriceFilter(p, currentPriceFilter)) return false;

    // 3. Lọc theo diện tích sàn tối thiểu
    if (currentMinSize > 0 && (Number(p.size_m2) || 0) < currentMinSize) return false;

    // 4. Lọc theo layout
    if (currentLayoutFilter !== 'all' && p.layout !== currentLayoutFilter) return false;

    return true;
  });

  const sorted = sortPropertiesList(filtered, currentSort);

  // Cập nhật nút "Xem toàn bộ danh sách nhà" ở trang chủ (nếu có)
  const viewAllPropsBtn = document.getElementById('btn-view-all-properties');
  if (viewAllPropsBtn) {
    viewAllPropsBtn.textContent = `Xem toàn bộ danh sách nhà (${validProps.length} căn) →`;
  }

  if (sorted.length === 0) {
    grid.innerHTML = `<p class="empty-message">${t('empty_portfolio')}</p>`;
    return;
  }

  const limitVal = Number(grid.getAttribute('data-limit')) || 0;
  const displayList = limitVal > 0 ? sorted.slice(0, limitVal) : sorted;

  grid.innerHTML = displayList.map(p => {
    const isSold = p.status === 'sold';
    const typeLabel = p.type === 'buy' ? 'Bán · 売買' : 'Cho thuê · 賃貸';
    const mainImg = (p.images && p.images.length > 0)
      ? p.images[0]
      : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800';

    const { primaryTitle, secondaryTitle } = getLocalizedPropertyTitles(p);
    const cornerBadgeHtml = renderCornerBadgeHtml(p);

    // Dòng thông số phụ dưới giá (2-3 thông số ngăn bởi ·, có lợi suất nếu có)
    const extraSpecs = [];
    if (p.type === 'buy' && p.gross_yield > 0) {
      extraSpecs.push(`${t('gross_yield')}: ${p.gross_yield}%`);
    }
    if (p.renovation) extraSpecs.push(p.renovation);
    if (p.management_fee) extraSpecs.push(`Phí QL ¥${p.management_fee.toLocaleString()}${t('unit_per_month')}`);
    if (p.repair_fund) extraSpecs.push(`Quỹ SC ¥${p.repair_fund.toLocaleString()}${t('unit_per_month')}`);
    const extraSpecLine = extraSpecs.slice(0, 3).join(' · ');

    const layoutSize = [p.layout, p.size_m2 ? `${p.size_m2}㎡` : ''].filter(Boolean).join(' · ');

    return `
      <div class="property-card">
        <div class="card-image-wrap">
          ${cornerBadgeHtml}
          <img src="${mainImg}" alt="${p.name_jp}" loading="lazy">
        </div>
        <div class="card-body">
          <div class="card-meta-row">
            <span>${typeLabel}</span>
            <span>${p.area || ''} ${isSold ? '· (Đã giao dịch)' : ''}</span>
          </div>
          <h3 class="card-name serif">${primaryTitle}</h3>
          ${secondaryTitle ? `<div class="card-name-sub">${secondaryTitle}</div>` : ''}
          <div class="card-address">${p.station || p.address || ''}</div>
          <div class="card-price-row">
            <span class="card-price">${p.price_label || (p.price ? p.price.toLocaleString() + '円' : 'Liên hệ')}</span>
            ${layoutSize ? `<span style="font-size: 13px; color: var(--muted); margin-left: 6px;">· ${layoutSize}</span>` : ''}
          </div>
          <div class="card-spec-inline">${extraSpecLine || 'Vị trí thuận tiện'}</div>
          <div class="card-footer">
            <button class="card-btn-detail" onclick="openPropertyDialog('${p.id}')">${t('btn_view_detail')}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// 6. Render BÀI CHIA SẺ (#articles) + LỌC CHUYÊN MỤC + HỘP ĐỌC BÀI (Modal)
// --------------------------------------------------------------------------
let currentArticleCat = 'all';
let currentArticleQuery = '';

function initArticleFilters() {
  const catWrap = document.getElementById('article-category-pills');
  const searchInput = document.getElementById('article-search-input');
  const articles = APP_DATA.articles || [];

  if (catWrap) {
    const categories = [];
    articles.forEach(a => {
      const c = (a.category || '').trim();
      if (c && !categories.includes(c)) categories.push(c);
    });

    const btns = [`<button type="button" class="filter-btn active" data-art-cat="all">Tất cả (${articles.length})</button>`];
    categories.forEach(cat => {
      const count = articles.filter(a => (a.category || '').trim() === cat).length;
      btns.push(`<button type="button" class="filter-btn" data-art-cat="${cat}">${cat} (${count})</button>`);
    });
    catWrap.innerHTML = btns.join('');

    catWrap.querySelectorAll('button[data-art-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        catWrap.querySelectorAll('button[data-art-cat]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentArticleCat = btn.getAttribute('data-art-cat') || 'all';
        renderArticles();
      });
    });
  }

  if (searchInput && !searchInput._bound) {
    searchInput._bound = true;
    searchInput.addEventListener('input', () => {
      currentArticleQuery = searchInput.value.trim().toLowerCase();
      renderArticles();
    });
  }
}

function renderArticles() {
  const grid = document.getElementById('article-grid');
  if (!grid) return;

  const allArticles = APP_DATA.articles || [];

  // Cập nhật nút "Xem toàn bộ bài chia sẻ" ở trang chủ (nếu có)
  const viewAllArtBtn = document.getElementById('btn-view-all-articles');
  if (viewAllArtBtn) {
    viewAllArtBtn.textContent = `Xem toàn bộ bài chia sẻ & cẩm nang (${allArticles.length} bài) →`;
  }

  if (allArticles.length === 0) {
    grid.innerHTML = '<p class="empty-message">Chưa có bài viết mới.</p>';
    return;
  }

  const filtered = allArticles.filter(a => {
    if (currentArticleCat !== 'all' && (a.category || '').trim() !== currentArticleCat) {
      return false;
    }
    if (currentArticleQuery) {
      const hay = `${a.title || ''} ${a.summary || ''} ${a.body || ''} ${a.category || ''}`.toLowerCase();
      if (!hay.includes(currentArticleQuery)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="empty-message">Không tìm thấy bài chia sẻ nào khớp với từ khóa của bạn.</p>';
    return;
  }

  const limitVal = Number(grid.getAttribute('data-limit')) || 0;
  const displayArticles = limitVal > 0 ? filtered.slice(0, limitVal) : filtered;

  grid.innerHTML = displayArticles.map(a => `
    <article class="article-card">
      <div class="article-img-wrap">
        <img src="${a.image || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'}" alt="${a.title}" loading="lazy">
      </div>
      <div class="article-body">
        <span class="article-cat">${a.category || 'Chia sẻ'}${a.date ? ` · ${a.date}` : ''}</span>
        <h3 class="article-title serif">${a.title}</h3>
        <p class="article-summary">${a.summary}</p>
        <div class="article-content-full" id="article-body-${a.id}">
          ${a.body}
        </div>
        <button class="article-read-btn" id="article-btn-${a.id}" onclick="openArticleDialog('${a.id}')">Đọc bài →</button>
      </div>
    </article>
  `).join('');
}

window.openArticleDialog = function(id) {
  const a = (APP_DATA.articles || []).find(x => x.id === id);
  if (!a) return;

  const overlay = document.getElementById('article-dialog');
  const content = document.getElementById('article-dialog-content');
  if (!overlay || !content) {
    window.toggleArticle(id);
    return;
  }

  content.innerHTML = `
    ${a.image ? `<img src="${a.image}" alt="${a.title}" class="dialog-image" style="height: 220px;">` : ''}
    <div class="dialog-body">
      <div class="dialog-header-meta">
        <span class="status-pill">${a.category || 'Chia sẻ'}</span>
        ${a.date ? `<span style="font-size: 13px; color: var(--faint);">${a.date}</span>` : ''}
      </div>
      <h2 class="dialog-title serif" style="line-height: 1.35;">${a.title}</h2>
      <div class="article-reader-body">
        ${a.body}
      </div>
      <div class="dialog-actions">
        <button type="button" class="btn-primary" onclick="consultAboutArticle('${a.id}')">
          Nhắn hỏi BIG不動産 về chủ đề này
        </button>
        <button type="button" class="btn-secondary" onclick="closeArticleDialog()">${t('btn_close')}</button>
      </div>
    </div>
  `;

  overlay.classList.add('open');
  isDialogOpen = true;
  updateMobileStickyVisibility();
};

window.closeArticleDialog = function() {
  const overlay = document.getElementById('article-dialog');
  if (overlay) overlay.classList.remove('open');
  isDialogOpen = false;
  updateMobileStickyVisibility();
};

window.consultAboutArticle = function(articleId) {
  const a = (APP_DATA.articles || []).find(x => x.id === articleId);
  closeArticleDialog();
  trackEvent('click_contact', { channel: 'form', property_id: articleId });
  const inputProp = document.getElementById('form-property');
  if (a && inputProp) {
    inputProp.value = `Tư vấn chủ đề: ${a.title}`;
  }
  const contactSec = document.getElementById('contact');
  if (contactSec) {
    contactSec.scrollIntoView({ behavior: 'smooth' });
  }
  setTimeout(() => {
    const nameInput = document.getElementById('form-name');
    if (nameInput) nameInput.focus();
  }, 450);
};

window.toggleArticle = function(id) {
  const contentEl = document.getElementById(`article-body-${id}`);
  const btnEl = document.getElementById(`article-btn-${id}`);
  if (!contentEl || !btnEl) return;

  const isOpen = contentEl.classList.toggle('open');
  btnEl.textContent = isOpen ? 'Thu gọn' : 'Đọc bài →';
};

// --------------------------------------------------------------------------
// VIỆC 8: CÔNG CỤ TÍNH KHOẢN VAY TRONG HỘP CHI TIẾT (Chỉ hiện cho căn "buy")
// --------------------------------------------------------------------------
function computeMortgageMonthly(priceJpy, downPaymentPct, years, annualRatePct) {
  const price = Math.max(0, Number(priceJpy) || 0);
  const downPct = Math.min(90, Math.max(0, Number(downPaymentPct) || 0));
  const loanPrincipal = Math.round(price * (1 - downPct / 100));
  const totalMonths = Math.max(1, Math.round((Number(years) || 35) * 12));
  const rateYear = Math.max(0, Number(annualRatePct) || 0);

  if (loanPrincipal <= 0) {
    return { loanPrincipal: 0, monthlyPayment: 0 };
  }
  if (rateYear === 0) {
    return {
      loanPrincipal,
      monthlyPayment: Math.round(loanPrincipal / totalMonths)
    };
  }

  const r = rateYear / 100 / 12;
  const pow = Math.pow(1 + r, totalMonths);
  const monthlyPayment = Math.round(loanPrincipal * ((r * pow) / (pow - 1)));
  return { loanPrincipal, monthlyPayment };
}

function renderMortgageCalculatorHtml(p) {
  if (!p || p.type !== 'buy' || !(Number(p.price) > 0)) return '';

  const site = getSiteConfig();
  const defaultRate = (site.flat35Rate !== undefined && site.flat35Rate !== null && site.flat35Rate !== '')
    ? Number(site.flat35Rate)
    : 3.81;
  const defaultDownPct = 10;
  const defaultYears = 35;

  const initial = computeMortgageMonthly(p.price, defaultDownPct, defaultYears, defaultRate);

  return `
    <div class="loan-calc-box" id="loan-calc-box" data-price="${p.price}">
      <h3 class="loan-calc-title serif">${t('loan_calc_title')}</h3>
      <div class="loan-calc-grid">
        <div class="loan-calc-field">
          <label for="loan-down-pct">${t('loan_down_payment')}</label>
          <input type="number" id="loan-down-pct" class="form-control" min="0" max="90" step="5" value="${defaultDownPct}" oninput="updateDialogLoanCalc()">
        </div>
        <div class="loan-calc-field">
          <label for="loan-years">${t('loan_term_years')}</label>
          <input type="number" id="loan-years" class="form-control" min="1" max="50" step="1" value="${defaultYears}" oninput="updateDialogLoanCalc()">
        </div>
        <div class="loan-calc-field">
          <label for="loan-rate">${t('loan_interest_rate')}</label>
          <input type="number" id="loan-rate" class="form-control" min="0" max="20" step="0.01" value="${defaultRate}" oninput="updateDialogLoanCalc()">
        </div>
      </div>
      <div class="loan-calc-result">
        <div>
          <div style="font-size: 12px; color: var(--muted);">${t('loan_amount_label')}</div>
          <div style="font-size: 14.5px; font-weight: 500; color: var(--ink);" id="loan-principal-display">
            ¥${initial.loanPrincipal.toLocaleString('en-US')}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; color: var(--muted);">${t('loan_monthly_payment')}</div>
          <div class="loan-monthly-val" id="loan-monthly-display">
            ¥${initial.monthlyPayment.toLocaleString('en-US')}${t('unit_per_month')}
          </div>
        </div>
      </div>
      <div class="loan-disclaimer">${t('loan_disclaimer')}</div>
    </div>
  `;
}

window.updateDialogLoanCalc = function() {
  const box = document.getElementById('loan-calc-box');
  if (!box) return;
  const price = Number(box.getAttribute('data-price')) || 0;
  const downPct = Number(document.getElementById('loan-down-pct')?.value) || 0;
  const years = Number(document.getElementById('loan-years')?.value) || 35;
  const rate = Number(document.getElementById('loan-rate')?.value) || 0;

  const { loanPrincipal, monthlyPayment } = computeMortgageMonthly(price, downPct, years, rate);
  const principalEl = document.getElementById('loan-principal-display');
  const monthlyEl = document.getElementById('loan-monthly-display');

  if (principalEl) principalEl.textContent = `¥${loanPrincipal.toLocaleString('en-US')}`;
  if (monthlyEl) monthlyEl.textContent = `¥${monthlyPayment.toLocaleString('en-US')}${t('unit_per_month')}`;
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

  // Bắn sự kiện view_property (Việc 9)
  trackEvent('view_property', {
    property_id: p.id,
    property_name: p.name_jp,
    price: p.price,
    type: p.type
  });

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

  const { primaryTitle, secondaryTitle } = getLocalizedPropertyTitles(p);

  content.innerHTML = `
    ${mainImg ? `<img id="dialog-main-img" src="${mainImg}" alt="${p.name_jp}" class="dialog-image">` : ''}
    ${thumbsHtml}
    <div class="dialog-body">
      <div class="dialog-header-meta">
        <span class="status-pill">${typeLabel} ${isSold ? '· Đã giao dịch' : ''}</span>
        <span style="font-size: 13px; color: var(--faint);">Mã: ${p.id}</span>
      </div>
      <h2 class="dialog-title serif">${primaryTitle}</h2>
      ${secondaryTitle ? `<div class="card-name-sub" style="margin-bottom: 6px;">${secondaryTitle}</div>` : ''}
      <div class="dialog-address">${p.address || ''}</div>
      <div class="dialog-price">${p.price_label || (p.price ? p.price.toLocaleString() + '円' : 'Liên hệ')}</div>

      <table class="spec-table">
        <tbody>
          ${p.layout ? `
          <tr>
            <td>${t('layout')}</td>
            <td>${p.layout}</td>
          </tr>` : ''}
          ${p.size_m2 ? `
          <tr>
            <td>${t('size_m2')}</td>
            <td>${p.size_m2} ㎡ ${p.balcony_m2 ? `(${t('balcony_m2')} ${p.balcony_m2} ㎡)` : ''}</td>
          </tr>` : ''}
          ${p.land_m2 ? `
          <tr>
            <td>${t('land_m2')}</td>
            <td>${p.land_m2} ㎡</td>
          </tr>` : ''}
          ${p.station ? `
          <tr>
            <td>${t('station')}</td>
            <td>${p.station}</td>
          </tr>` : ''}
          ${(p.year_built || p.structure) ? `
          <tr>
            <td>${t('year_built')} · ${t('structure')}</td>
            <td>${p.year_built ? `Xây năm ${p.year_built}` : ''} ${p.structure ? `· ${p.structure}` : ''}</td>
          </tr>` : ''}
          ${p.management_fee ? `
          <tr>
            <td>${t('management_fee')}</td>
            <td>¥${p.management_fee.toLocaleString()}${t('unit_per_month')}</td>
          </tr>` : ''}
          ${p.repair_fund ? `
          <tr>
            <td>${t('repair_fund')}</td>
            <td>¥${p.repair_fund.toLocaleString()}${t('unit_per_month')}</td>
          </tr>` : ''}
          ${(p.type === 'buy' && p.annual_rent > 0) ? `
          <tr>
            <td>${t('annual_rent')}</td>
            <td>¥${p.annual_rent.toLocaleString()}${t('unit_per_year')}</td>
          </tr>` : ''}
          ${(p.type === 'buy' && p.gross_yield > 0) ? `
          <tr>
            <td>${t('gross_yield')}</td>
            <td><strong style="color: var(--amber-ink);">${p.gross_yield}%</strong></td>
          </tr>` : ''}
          ${p.renovation ? `
            <tr>
              <td>${t('renovation')}</td>
              <td>${p.renovation}</td>
            </tr>
          ` : ''}
        </tbody>
      </table>

      ${p.notes ? `<p class="featured-note" style="margin-top: 14px;">${p.notes}</p>` : ''}

      <!-- Công cụ tính khoản vay (chỉ hiện với căn bán type === "buy") -->
      ${renderMortgageCalculatorHtml(p)}

      <div class="dialog-actions">
        ${!isSold ? `
          <button type="button" class="btn-primary" onclick="handleRequestViewing('${p.id}')">
            ${t('btn_request_viewing')}
          </button>
        ` : ''}
        <button type="button" class="btn-secondary" onclick="closePropertyDialog()">${t('btn_close')}</button>
      </div>
      ${!isSold ? renderPropertyDirectActionButtons(p) : ''}
    </div>
  `;

  overlay.classList.add('open');
  isDialogOpen = true;
  updateMobileStickyVisibility();
};

window.switchDialogImage = function(src, element) {
  const mainImg = document.getElementById('dialog-main-img');
  if (mainImg) mainImg.src = src;

  const overlay = document.getElementById('property-dialog');
  if (!overlay) return;
  const thumbs = overlay.querySelectorAll('.gallery-thumb');
  thumbs.forEach(tEl => tEl.classList.remove('active'));
  if (element) element.classList.add('active');
};

window.closePropertyDialog = function() {
  const overlay = document.getElementById('property-dialog');
  if (overlay) overlay.classList.remove('open');
  isDialogOpen = false;
  updateMobileStickyVisibility();
};

function setupDialogClose() {
  const overlay = document.getElementById('property-dialog');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closePropertyDialog();
      }
    });
  }
  const artOverlay = document.getElementById('article-dialog');
  if (artOverlay) {
    artOverlay.addEventListener('click', (e) => {
      if (e.target === artOverlay) {
        closeArticleDialog();
      }
    });
  }
}

// --------------------------------------------------------------------------
// KHỐI LIÊN HỆ TRỰC TIẾP & FORM DỰ PHÒNG (#contact)
// --------------------------------------------------------------------------
function renderContactChannels() {
  const wrap = document.getElementById('dynamic-contact-channels');
  if (!wrap) return;

  const site = getSiteConfig();
  const cards = [];

  // 1. Điện thoại văn phòng (tel:)
  const phoneTel = (site.phoneTel || '').trim();
  const phoneDisplay = (site.phoneDisplay || phoneTel).trim();
  if (phoneTel !== '') {
    cards.push(`
      <a href="tel:${phoneTel}" class="channel-card channel-card-link" onclick="trackContactClick('tel', 'contact_section')">
        <div class="channel-info">
          <h4 class="serif">Điện thoại văn phòng · ${phoneDisplay}</h4>
          <p>Gọi trực tiếp đến văn phòng BIG不動産 tại Higashiosaka</p>
        </div>
        <span class="channel-badge">${t('btn_call_now')} →</span>
      </a>
    `);
  }

  // 2. Di động trực tiếp (tel:)
  const mobileTel = (site.mobileTel || '').trim();
  if (mobileTel !== '') {
    cards.push(`
      <a href="tel:${mobileTel}" class="channel-card channel-card-link" onclick="trackContactClick('tel', 'contact_mobile')">
        <div class="channel-info">
          <h4 class="serif">Hotline di động · ${mobileTel}</h4>
          <p>Tư vấn nhanh tiếng Việt &amp; tiếng Nhật</p>
        </div>
        <span class="channel-badge">${t('btn_call_now')} →</span>
      </a>
    `);
  }

  // 3. WhatsApp (Chỉ hiện khi whatsappNumber khác rỗng)
  const waRaw = (site.whatsappNumber || '').trim();
  if (waRaw !== '') {
    const cleanDigits = waRaw.replace(/[^\d]/g, '');
    if (cleanDigits) {
      const encoded = encodeURIComponent(buildPrefilledChatMessage(null));
      cards.push(`
        <a href="https://wa.me/${cleanDigits}?text=${encoded}" target="_blank" rel="noopener" class="channel-card channel-card-link" onclick="trackContactClick('whatsapp', 'contact_section')">
          <div class="channel-info">
            <h4 class="serif">WhatsApp</h4>
            <p>Nhắn tin trực tiếp kèm nội dung tư vấn soạn sẵn</p>
          </div>
          <span class="channel-badge">Mở WhatsApp →</span>
        </a>
      `);
    }
  }

  // 4. Zalo (Chỉ hiện khi zaloUrl khác rỗng)
  const zaloUrl = (site.zaloUrl || '').trim();
  if (zaloUrl !== '') {
    cards.push(`
      <a href="${zaloUrl}" target="_blank" rel="noopener" class="channel-card channel-card-link" onclick="trackContactClick('zalo', 'contact_section')">
        <div class="channel-info">
          <h4 class="serif">Zalo</h4>
          <p>Tư vấn tiếng Việt cho khách ở Nhật &amp; Việt Nam</p>
        </div>
        <span class="channel-badge">Mở Zalo →</span>
      </a>
    `);
  }

  // 5. LINE (Chỉ hiện khi lineUrl khác rỗng)
  const lineUrl = (site.lineUrl || '').trim();
  if (lineUrl !== '') {
    cards.push(`
      <a href="${lineUrl}" target="_blank" rel="noopener" class="channel-card channel-card-link" onclick="trackContactClick('line', 'contact_section')">
        <div class="channel-info">
          <h4 class="serif">LINE</h4>
          <p>Kênh liên lạc thuận tiện tại Nhật Bản</p>
        </div>
        <span class="channel-badge">Mở LINE →</span>
      </a>
    `);
  }

  // 6. Email chính thức (Chỉ hiện khi email khác rỗng)
  const email = (site.email || '').trim();
  if (email !== '') {
    cards.push(`
      <a href="mailto:${email}" class="channel-card channel-card-link" onclick="trackContactClick('form', 'contact_email')">
        <div class="channel-info">
          <h4 class="serif">Email · ${email}</h4>
          <p>Gửi yêu cầu hồ sơ pháp lý &amp; bảng tính khoản vay</p>
        </div>
        <span class="channel-badge">Gửi Email →</span>
      </a>
    `);
  }

  wrap.innerHTML = cards.join('');
}

window.selectPropertyForContact = function(id, name) {
  handleRequestViewing(id);
};

function setupContactForm() {
  const form = document.getElementById('contact-form');
  const readyBox = document.getElementById('ready-message-box');
  const readyText = document.getElementById('ready-message-text');
  const readyDirectLinks = document.getElementById('ready-direct-links');
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

    // Bắn sự kiện submit_lead (Việc 9)
    trackEvent('submit_lead', {
      channel: channel,
      property: property || 'general'
    });

    const pageUrl = window.location.href.split('#')[0];
    const template = [
      `Xin chào BIG不動産,`,
      `Tôi tên là: ${name}`,
      `Phương thức liên hệ lại (${channel}): ${contact}`,
      property ? `Căn nhà / Nhu cầu quan tâm: ${property}` : '',
      message ? `Nội dung cụ thể: ${message}` : 'Tôi muốn tìm hiểu thêm thông tin chi tiết và đặt lịch xem nhà.',
      `Trang xem: ${pageUrl}`
    ].filter(Boolean).join('\n');

    readyText.textContent = template;
    readyBox.classList.add('active');

    // Nếu có kênh chat hoặc email cấu hình trong window.SITE thì tạo nút mở thẳng kèm nội dung vừa soạn
    if (readyDirectLinks) {
      const site = getSiteConfig();
      const encoded = encodeURIComponent(template);
      const actionLinks = [];

      const waRaw = (site.whatsappNumber || '').trim();
      if (waRaw !== '') {
        const cleanDigits = waRaw.replace(/[^\d]/g, '');
        if (cleanDigits) {
          actionLinks.push(`<a href="https://wa.me/${cleanDigits}?text=${encoded}" target="_blank" rel="noopener" class="btn-secondary" onclick="trackContactClick('whatsapp', 'form_ready')">Gửi qua WhatsApp →</a>`);
        }
      }
      const zaloUrl = (site.zaloUrl || '').trim();
      if (zaloUrl !== '') {
        actionLinks.push(`<a href="${zaloUrl}" target="_blank" rel="noopener" class="btn-secondary" onclick="trackContactClick('zalo', 'form_ready')">Mở Zalo →</a>`);
      }
      const lineUrl = (site.lineUrl || '').trim();
      if (lineUrl !== '') {
        actionLinks.push(`<a href="${lineUrl}" target="_blank" rel="noopener" class="btn-secondary" onclick="trackContactClick('line', 'form_ready')">Mở LINE →</a>`);
      }
      const email = (site.email || '').trim();
      if (email !== '') {
        const subject = encodeURIComponent(`Yêu cầu tư vấn BĐS — ${property || name}`);
        actionLinks.push(`<a href="mailto:${email}?subject=${subject}&body=${encoded}" class="btn-outline-amber" onclick="trackContactClick('form', 'mailto_ready')">Gửi qua Email →</a>`);
      }
      readyDirectLinks.innerHTML = actionLinks.join('');
    }

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

// --------------------------------------------------------------------------
// VIỆC 10: KHỐI CÔNG TY & PHÁP LÝ Ở CHÂN TRANG (Đọc từ config.js, ẩn giấy phép nếu rỗng)
// --------------------------------------------------------------------------
function renderFooterCompanyInfo() {
  const site = getSiteConfig();
  const telRow = document.getElementById('footer-tel-row');
  const emailRow = document.getElementById('footer-email-row');
  const licenseRow = document.getElementById('footer-license-row');
  const privacyContact = document.getElementById('footer-privacy-contact');

  const phoneDisplay = (site.phoneDisplay || '').trim();
  const phoneTel = (site.phoneTel || '').trim();
  const mobileTel = (site.mobileTel || '').trim();
  const email = (site.email || '').trim();
  const licenseNo = (site.licenseNo || '').trim();

  if (telRow) {
    if (phoneTel !== '') {
      const mobilePart = mobileTel !== '' ? ` · Di động: <a href="tel:${mobileTel}" onclick="trackContactClick('tel', 'footer_mobile')">${mobileTel}</a>` : '';
      telRow.innerHTML = `Tel: <a href="tel:${phoneTel}" onclick="trackContactClick('tel', 'footer_tel')">${phoneDisplay || phoneTel}</a>${mobilePart}`;
      telRow.style.display = '';
    } else {
      telRow.style.display = 'none';
    }
  }

  if (emailRow) {
    if (email !== '') {
      emailRow.innerHTML = `Email: <a href="mailto:${email}">${email}</a>`;
      emailRow.style.display = '';
    } else {
      emailRow.style.display = 'none';
    }
  }

  // Dòng giấy phép 宅地建物取引業者免許: chỉ hiện khi licenseNo khác rỗng, tuyệt đối không bịa số
  if (licenseRow) {
    if (licenseNo !== '') {
      licenseRow.textContent = `宅地建物取引業者免許: ${licenseNo}`;
      licenseRow.style.display = '';
    } else {
      licenseRow.textContent = '';
      licenseRow.style.display = 'none';
    }
  }

  if (privacyContact && (phoneDisplay || email)) {
    privacyContact.innerHTML = `<strong>4. Liên hệ về dữ liệu cá nhân:</strong> BIG不動産株式会社 — 〒577-0057 大阪府東大阪市足代新町4-12 テレビル5F${phoneDisplay ? ` · Tel: ${phoneDisplay}` : ''}${email ? ` · Email: ${email}` : ''}.`;
  }
}
