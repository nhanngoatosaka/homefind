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
  initKeisanCalculator();
  initVipProcessSection();
  initJapandiZenMotion();
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

  // Nút Liên hệ ngay (ưu tiên contactUrl từ config.js, nếu trống sẽ cuộn mượt xuống #contact)
  const contactHref = (site.contactUrl || '').trim() || '#contact';
  const isExternal = contactHref.startsWith('http') || contactHref.startsWith('tel:');
  const targetAttr = isExternal && !contactHref.startsWith('tel:') ? ' target="_blank" rel="noopener"' : '';
  const clickHandler = !isExternal
    ? `onclick="trackContactClick('contact_btn', '${propId}'); closePropertyDialog(); document.getElementById('contact')?.scrollIntoView({behavior:'smooth'});"`
    : `onclick="trackContactClick('contact_btn', '${propId}')"`;

  btns.push(`
    <a href="${contactHref}"${targetAttr} class="btn-outline-amber" ${clickHandler}>
      ${t('btn_contact_now') || 'Liên hệ ngay'}
    </a>
  `);

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

  // Nút liên hệ chính ở cuối chân màn hình di động: hiển thị "Liên hệ ngay"
  // Ưu tiên contactUrl từ config.js (sau này người dùng có thể gắn link Zalo, Form, Messenger...), nếu để trống sẽ cuộn mượt xuống #contact
  const contactHref = (site.contactUrl || '').trim() || '#contact';
  const isExternal = contactHref.startsWith('http') || contactHref.startsWith('tel:');
  const targetAttr = isExternal && !contactHref.startsWith('tel:') ? ' target="_blank" rel="noopener"' : '';
  const clickHandler = !isExternal
    ? `onclick="trackContactClick('contact_btn', 'mobile_sticky'); document.getElementById('contact')?.scrollIntoView({behavior:'smooth'}); return false;"`
    : `onclick="trackContactClick('contact_btn', 'mobile_sticky')"`;

  buttons.push(`
    <a href="${contactHref}"${targetAttr} class="btn-primary mobile-sticky-btn" ${clickHandler}>
      ${t('sticky_call') || 'Liên hệ ngay'}
    </a>
  `);

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

    // Dòng thông số phụ dưới giá (ưu tiên 1-2 thông số cốt lõi để thẻ gọn gàng, không bị dài lê thê)
    const extraSpecs = [];
    if (p.type === 'buy' && p.gross_yield > 0) {
      extraSpecs.push(`${t('gross_yield')}: ${p.gross_yield}%`);
    }
    if (p.renovation) extraSpecs.push(p.renovation);
    if (p.management_fee) {
      extraSpecs.push(`Phí QL ¥${p.management_fee.toLocaleString()}${t('unit_per_month')}`);
    } else if (p.repair_fund) {
      extraSpecs.push(`Quỹ SC ¥${p.repair_fund.toLocaleString()}${t('unit_per_month')}`);
    }
    const extraSpecLine = extraSpecs.slice(0, 2).join(' · ');

    const layoutSize = [p.layout, p.size_m2 ? `${p.size_m2}㎡` : ''].filter(Boolean).join(' · ');
    const addressDisplay = p.station || p.address || '';

    return `
      <div class="property-card zen-fade-up" data-property-id="${p.id}">
        <div class="card-image-wrap zen-shutter" onclick="openPropertyDialog('${p.id}')" style="cursor: pointer;">
          ${cornerBadgeHtml}
          <img src="${mainImg}" alt="${p.name_jp}" loading="lazy">
        </div>
        <div class="card-body">
          <div class="card-meta-row">
            <span>${typeLabel}</span>
            <span>${p.area || ''} ${isSold ? '· (Đã giao dịch)' : ''}</span>
          </div>
          <h3 class="card-name serif" title="${primaryTitle}"><a href="javascript:void(0)" onclick="openPropertyDialog('${p.id}')" class="card-title-link">${primaryTitle}</a></h3>
          ${secondaryTitle ? `<div class="card-name-sub" title="${secondaryTitle}">${secondaryTitle}</div>` : ''}
          <div class="card-address" title="${addressDisplay}">📍 ${addressDisplay}</div>
          <div class="card-price-row">
            <span class="card-price">${p.price_label || (p.price ? p.price.toLocaleString() + '円' : 'Liên hệ')}</span>
            ${layoutSize ? `<span class="card-layout-tag">· ${layoutSize}</span>` : ''}
          </div>
          <div class="card-spec-inline" title="${extraSpecLine || 'Vị trí thuận tiện'}">${extraSpecLine || 'Vị trí thuận tiện'}</div>
          <div class="card-footer">
            <button class="card-btn-detail" type="button" onclick="openPropertyDialog('${p.id}')">${t('btn_view_detail') || 'Chi tiết →'}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  refreshJapandiZenObserver();
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
    <article class="article-card zen-fade-up">
      <div class="article-img-wrap zen-shutter zen-shutter-vertical">
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

  refreshJapandiZenObserver();
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

// --------------------------------------------------------------------------
// 11. MÁY TÍNH TIỀN TRẢ GÓP & SO SÁNH TIỀN THUÊ NHÀ (Chuẩn công thức Keisan.site 1256186048)
// --------------------------------------------------------------------------
let currentKeisanMethod = 'ganri'; // 'ganri' (元利均等) | 'gankin' (元金均等)
let lastKeisanResult = null;
let isKeisanScheduleOpen = false;

const KEISAN_PRESETS = {
  house3480: {
    totalMan: 3480,
    bonusMan: 0,
    method: 'ganri',
    years: 35,
    months: 0,
    bonusMonths: '7-1',
    rate1: 0.6,
    rate1Years: 5,
    rate2: 0.6,
    currentRent: 95000,
    roundMode: 'floor',
    startYm: '2026-01'
  },
  condo990: {
    totalMan: 990,
    bonusMan: 0,
    method: 'ganri',
    years: 25,
    months: 0,
    bonusMonths: '7-1',
    rate1: 0.7,
    rate1Years: 5,
    rate2: 0.9,
    currentRent: 68000,
    roundMode: 'floor',
    startYm: '2026-01'
  },
  standard3000: {
    totalMan: 3000,
    bonusMan: 300,
    method: 'ganri',
    years: 35,
    months: 0,
    bonusMonths: '7-1',
    rate1: 0.5,
    rate1Years: 5,
    rate2: 1.2,
    currentRent: 85000,
    roundMode: 'floor',
    startYm: '2026-01'
  },
  keisanDefault: {
    totalMan: 1000,
    bonusMan: 400,
    method: 'ganri',
    years: 10,
    months: 0,
    bonusMonths: '7-1',
    rate1: 2.0,
    rate1Years: 5,
    rate2: 3.0,
    currentRent: 85000,
    roundMode: 'floor',
    startYm: '2026-01'
  }
};

function keisanRoundVal(x, mode) {
  if (mode === 'floor') return Math.floor(x + 1e-9);
  if (mode === 'round') return Math.round(x);
  if (mode === 'ceil') return Math.ceil(x - 1e-9);
  return Math.floor(x + 1e-9);
}

function keisanCalcPmt(principal, periodRate, n, mode) {
  if (n <= 0 || principal <= 0) return 0;
  if (periodRate === 0) return keisanRoundVal(principal / n, mode);
  const factor = Math.pow(1 + periodRate, n);
  return keisanRoundVal((principal * periodRate * factor) / (factor - 1), mode);
}

/**
 * Thuật toán tính lịch trả nợ chuẩn Keisan.site (1256186048):
 * - Tách khoản vay thành 2 phần độc lập: Phần trả hàng tháng (Pm) và Phần trả kỳ thưởng Bonus (Pb)
 * - Hỗ trợ 2 phương thức: 元利均等 (ganri - Gốc+Lãi đều) và 元金均等 (gankin - Gốc đều)
 * - Hỗ trợ đổi lãi suất 2 giai đoạn: 당초금리 (rate1 trong rate1Years năm đầu) và 以降金利 (rate2 từ tháng 12*rate1Years + 1)
 * - Tháng trả kỳ thứ 1 bắt đầu sau tháng giải ngân (借入年月) 1 tháng.
 */
function computeKeisanSchedule(params) {
  const {
    totalMan,
    bonusMan,
    method,
    years,
    months,
    bonusMonthsPair,
    rate1Pct,
    rate1Years,
    rate2Pct,
    roundMode,
    startYear,
    startMonth
  } = params;

  const totalMonths = Math.max(1, (Number(years) || 0) * 12 + (Number(months) || 0));
  const safeTotalMan = Math.max(0, Number(totalMan) || 0);
  const safeBonusMan = Math.min(safeTotalMan, Math.max(0, Number(bonusMan) || 0));

  let balM = Math.round((safeTotalMan - safeBonusMan) * 10000);
  let balB = Math.round(safeBonusMan * 10000);

  const [bm1, bm2] = (bonusMonthsPair || '7-1').split('-').map(Number);
  const isBonusMonth = m => m === bm1 || m === bm2;

  // Xác định danh sách các kỳ có trả Bonus
  const scheduleDates = [];
  let y = Number(startYear) || 2026;
  let m = Number(startMonth) || 1;
  for (let i = 1; i <= totalMonths; i++) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    scheduleDates.push({ idx: i, year: y, month: m, isBonus: isBonusMonth(m) });
  }

  const totalBonusCount = scheduleDates.filter(d => d.isBonus).length;
  let remM = totalMonths;
  let remB = totalBonusCount;

  const switchAfterMonth = Math.max(0, (Number(rate1Years) || 0) * 12);

  let curRatePct = Number(rate1Pct) || 0;
  let rM = curRatePct / 100 / 12;
  let rB = curRatePct / 100 / 2;

  let pmtM = method === 'ganri'
    ? keisanCalcPmt(balM, rM, remM, roundMode)
    : keisanRoundVal(balM / remM, roundMode);

  let pmtB = remB > 0
    ? (method === 'ganri' ? keisanCalcPmt(balB, rB, remB, roundMode) : keisanRoundVal(balB / remB, roundMode))
    : 0;

  let firstMonthPay = 0;
  let secondStageMonthPay = null;
  let firstBonusExtraPay = 0;
  let secondStageBonusExtraPay = null;

  let sumPayM = 0;
  let sumPrinM = 0;
  let sumIntM = 0;
  let sumPayB = 0;
  let sumPrinB = 0;
  let sumIntB = 0;

  const rows = [];

  for (let i = 0; i < totalMonths; i++) {
    const step = scheduleDates[i];
    const k = step.idx;

    // Chuyển sang lãi suất giai đoạn 2 tại kỳ (switchAfterMonth + 1)
    if (k === switchAfterMonth + 1 && k > 1) {
      curRatePct = Number(rate2Pct) || 0;
      rM = curRatePct / 100 / 12;
      rB = curRatePct / 100 / 2;
      if (method === 'ganri') {
        pmtM = keisanCalcPmt(balM, rM, remM, roundMode);
        pmtB = remB > 0 ? keisanCalcPmt(balB, rB, remB, roundMode) : 0;
      } else {
        pmtM = remM > 0 ? keisanRoundVal(balM / remM, roundMode) : 0;
        pmtB = remB > 0 ? keisanRoundVal(balB / remB, roundMode) : 0;
      }
    }

    // 1. Tính phần trả hàng tháng (月払)
    let intM = keisanRoundVal(balM * rM, roundMode);
    let prinM = 0;
    let payM = 0;

    if (balM > 0) {
      if (remM === 1) {
        prinM = balM;
        payM = prinM + intM;
      } else if (method === 'ganri') {
        payM = pmtM;
        prinM = payM - intM;
        if (prinM > balM) {
          prinM = balM;
          payM = prinM + intM;
        }
      } else {
        prinM = pmtM;
        if (prinM > balM) prinM = balM;
        payM = prinM + intM;
      }
      balM -= prinM;
    }
    remM -= 1;

    // 2. Tính phần trả kỳ thưởng Bonus (ボーナス払) nếu tháng này là tháng Bonus
    let intB = 0;
    let prinB = 0;
    let payB = 0;

    if (step.isBonus && balB > 0 && remB > 0) {
      intB = keisanRoundVal(balB * rB, roundMode);
      if (remB === 1) {
        prinB = balB;
        payB = prinB + intB;
      } else if (method === 'ganri') {
        payB = pmtB;
        prinB = payB - intB;
        if (prinB > balB) {
          prinB = balB;
          payB = prinB + intB;
        }
      } else {
        prinB = pmtB;
        if (prinB > balB) prinB = balB;
        payB = prinB + intB;
      }
      balB -= prinB;
      remB -= 1;

      if (firstBonusExtraPay === 0 && k <= switchAfterMonth) {
        firstBonusExtraPay = payB;
      }
      if (k > switchAfterMonth && secondStageBonusExtraPay === null) {
        secondStageBonusExtraPay = payB;
      }
    }

    if (k === 1) {
      firstMonthPay = payM;
    }
    if (k === switchAfterMonth + 1 && k > 1) {
      secondStageMonthPay = payM;
    }

    sumPayM += payM;
    sumPrinM += prinM;
    sumIntM += intM;
    sumPayB += payB;
    sumPrinB += prinB;
    sumIntB += intB;

    rows.push({
      index: k,
      ym: `${step.year}/${String(step.month).padStart(2, '0')}`,
      isBonus: step.isBonus && (payB > 0 || safeBonusMan > 0),
      payM,
      prinM,
      intM,
      payB,
      prinB,
      intB,
      balance: balM + balB
    });
  }

  if (secondStageMonthPay === null) {
    secondStageMonthPay = firstMonthPay;
  }
  if (secondStageBonusExtraPay === null) {
    secondStageBonusExtraPay = firstBonusExtraPay;
  }

  return {
    totalMonths,
    endYm: rows.length > 0 ? rows[rows.length - 1].ym : '',
    firstMonthPay,
    secondStageMonthPay,
    firstBonusExtraPay,
    secondStageBonusExtraPay,
    sumPayM,
    sumPrinM,
    sumIntM,
    sumPayB,
    sumPrinB,
    sumIntB,
    grandTotalPay: sumPayM + sumPayB,
    grandTotalPrin: sumPrinM + sumPrinB,
    grandTotalInt: sumIntM + sumIntB,
    rows
  };
}

function initKeisanCalculator() {
  const totalInput = document.getElementById('ks-total-man');
  if (!totalInput) return; // Chỉ chạy trên trang có khung #featured máy tính

  const totalSlider = document.getElementById('ks-total-slider');
  const bonusInput = document.getElementById('ks-bonus-man');
  const bonusSlider = document.getElementById('ks-bonus-slider');

  const clearPresetHighlight = () => {
    document.querySelectorAll('#keisan-presets .keisan-preset-btn').forEach(b => b.classList.remove('active'));
  };

  // Đồng bộ thanh trượt & ô nhập Tổng tiền vay
  if (totalSlider && totalInput) {
    totalSlider.addEventListener('input', () => {
      totalInput.value = totalSlider.value;
      if (Number(bonusInput.value) > Number(totalInput.value)) {
        bonusInput.value = totalInput.value;
        if (bonusSlider) bonusSlider.value = totalInput.value;
      }
      clearPresetHighlight();
      recalcAndRenderKeisan();
    });
    totalInput.addEventListener('input', () => {
      totalSlider.value = Math.min(8000, Math.max(100, Number(totalInput.value) || 0));
      clearPresetHighlight();
      recalcAndRenderKeisan();
    });
  }

  // Đồng bộ thanh trượt & ô nhập Tiền trả Bonus
  if (bonusSlider && bonusInput) {
    bonusSlider.addEventListener('input', () => {
      const maxAllowed = Number(totalInput.value) || 0;
      const val = Math.min(maxAllowed, Number(bonusSlider.value) || 0);
      bonusInput.value = val;
      bonusSlider.value = val;
      clearPresetHighlight();
      recalcAndRenderKeisan();
    });
    bonusInput.addEventListener('input', () => {
      const maxAllowed = Number(totalInput.value) || 0;
      if (Number(bonusInput.value) > maxAllowed) {
        bonusInput.value = maxAllowed;
      }
      bonusSlider.value = Math.min(2000, Math.max(0, Number(bonusInput.value) || 0));
      clearPresetHighlight();
      recalcAndRenderKeisan();
    });
  }

  // Gắn sự kiện tính tự động cho mọi ô nhập khác
  const controlIds = [
    'ks-term-years',
    'ks-term-months',
    'ks-bonus-months',
    'ks-rate1',
    'ks-rate1-years',
    'ks-rate2',
    'ks-current-rent',
    'ks-round-mode',
    'ks-start-ym'
  ];

  controlIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        clearPresetHighlight();
        recalcAndRenderKeisan();
      });
      el.addEventListener('change', () => {
        clearPresetHighlight();
        recalcAndRenderKeisan();
      });
    }
  });

  recalcAndRenderKeisan();
}

function readKeisanInputs() {
  const totalMan = Number(document.getElementById('ks-total-man')?.value) || 0;
  const bonusMan = Math.min(totalMan, Math.max(0, Number(document.getElementById('ks-bonus-man')?.value) || 0));
  const years = Math.max(1, Math.min(50, Number(document.getElementById('ks-term-years')?.value) || 35));
  const months = Math.max(0, Math.min(12, Number(document.getElementById('ks-term-months')?.value) || 0));
  const bonusMonthsPair = document.getElementById('ks-bonus-months')?.value || '7-1';
  const rate1Pct = Math.max(0, Number(document.getElementById('ks-rate1')?.value) || 0);
  const rate1Years = Math.max(1, Number(document.getElementById('ks-rate1-years')?.value) || 5);
  const rate2Pct = Math.max(0, Number(document.getElementById('ks-rate2')?.value) || 0);
  const currentRent = Math.max(0, Number(document.getElementById('ks-current-rent')?.value) || 0);
  const roundMode = document.getElementById('ks-round-mode')?.value || 'floor';
  const startYmStr = document.getElementById('ks-start-ym')?.value || '2026-01';
  const [sy, sm] = startYmStr.split('-').map(Number);

  return {
    totalMan,
    bonusMan,
    method: currentKeisanMethod,
    years,
    months,
    bonusMonthsPair,
    rate1Pct,
    rate1Years,
    rate2Pct,
    currentRent,
    roundMode,
    startYear: sy || 2026,
    startMonth: sm || 1
  };
}

function recalcAndRenderKeisan() {
  const totalInput = document.getElementById('ks-total-man');
  if (!totalInput) return;

  const params = readKeisanInputs();
  const res = computeKeisanSchedule(params);
  lastKeisanResult = { params, res };

  const fmtYen = n => `¥${Math.round(n).toLocaleString('en-US')}`;

  // 1. Hiển thị tiền trả hàng tháng kỳ đầu & giai đoạn 2
  const pay1El = document.getElementById('ks-res-pay1');
  const pay2LabelEl = document.getElementById('ks-res-pay2-label');
  const pay2El = document.getElementById('ks-res-pay2');
  const bonusPayEl = document.getElementById('ks-res-bonus-pay');
  const endBadgeEl = document.getElementById('ks-res-end-badge');

  if (pay1El) {
    pay1El.innerHTML = `${fmtYen(res.firstMonthPay)}<span style="font-size: 15px; font-weight: 400; color: var(--muted);">/tháng</span>`;
  }
  if (endBadgeEl) {
    endBadgeEl.textContent = `${res.totalMonths} kỳ · Tất toán ${res.endYm}`;
  }
  if (pay2LabelEl) {
    if (params.rate1Years < params.years) {
      pay2LabelEl.textContent = `Từ năm thứ ${params.rate1Years + 1} (Lãi ${params.rate2Pct}%) · 以降月額`;
    } else {
      pay2LabelEl.textContent = `Suốt kỳ hạn vay · 毎月返済額`;
    }
  }
  if (pay2El) {
    pay2El.textContent = `${fmtYen(res.secondStageMonthPay)}/tháng`;
  }
  if (bonusPayEl) {
    if (params.bonusMan > 0 && res.firstBonusExtraPay > 0) {
      if (res.secondStageBonusExtraPay !== res.firstBonusExtraPay && params.rate1Years < params.years) {
        bonusPayEl.textContent = `+${fmtYen(res.firstBonusExtraPay)} → +${fmtYen(res.secondStageBonusExtraPay)}/kỳ`;
      } else {
        bonusPayEl.textContent = `+${fmtYen(res.firstBonusExtraPay)} / kỳ`;
      }
    } else {
      bonusPayEl.textContent = `¥0 (Không trả Bonus)`;
    }
  }

  // 2. Tổng gốc, lãi và thanh tỷ lệ
  const grandTotalEl = document.getElementById('ks-res-grand-total');
  const totalPrinEl = document.getElementById('ks-res-total-prin');
  const totalIntEl = document.getElementById('ks-res-total-int');
  const barPrinEl = document.getElementById('ks-bar-prin');
  const barIntEl = document.getElementById('ks-bar-int');

  if (grandTotalEl) grandTotalEl.textContent = fmtYen(res.grandTotalPay);
  if (totalPrinEl) totalPrinEl.textContent = fmtYen(res.grandTotalPrin);
  if (totalIntEl) totalIntEl.textContent = fmtYen(res.grandTotalInt);

  if (barPrinEl && barIntEl && res.grandTotalPay > 0) {
    const prinPct = Math.round((res.grandTotalPrin / res.grandTotalPay) * 100);
    const intPct = 100 - prinPct;
    barPrinEl.style.width = `${prinPct}%`;
    barIntEl.style.width = `${intPct}%`;
  }

  // 3. Bảng tóm tắt 月払 vs ボーナス払 chuẩn Keisan
  const monthlyBreakdownEl = document.getElementById('ks-res-monthly-breakdown');
  const bonusBreakdownEl = document.getElementById('ks-res-bonus-breakdown');
  if (monthlyBreakdownEl) {
    monthlyBreakdownEl.textContent = `${fmtYen(res.sumPayM)} (Gốc ${fmtYen(res.sumPrinM)} + Lãi ${fmtYen(res.sumIntM)})`;
  }
  if (bonusBreakdownEl) {
    if (params.bonusMan > 0) {
      bonusBreakdownEl.textContent = `${fmtYen(res.sumPayB)} (Gốc ${fmtYen(res.sumPrinB)} + Lãi ${fmtYen(res.sumIntB)})`;
    } else {
      bonusBreakdownEl.textContent = `¥0 (Không tách trả kỳ Bonus)`;
    }
  }

  // 4. Hộp so sánh trực tiếp với Tiền thuê nhà hiện tại (現在の家賃)
  const rentCompareBox = document.getElementById('ks-rent-compare-box');
  if (rentCompareBox) {
    // Trung bình thực trả mỗi tháng (đã quy đổi cả phần Bonus nếu có trong giai đoạn 1)
    const effectiveMonthly = res.firstMonthPay + Math.round((res.firstBonusExtraPay * 2) / 12);
    const totalRentOverTerm = params.currentRent * res.totalMonths;
    const diffMonthly = effectiveMonthly - params.currentRent;

    let diffVerdictHtml = '';
    if (params.currentRent > 0) {
      if (diffMonthly <= 0) {
        diffVerdictHtml = `<strong style="color: var(--ok);">Nhẹ hơn tiền thuê hiện tại ${fmtYen(Math.abs(diffMonthly))}/tháng</strong> — lại sở hữu tài sản riêng sau ${params.years} năm.`;
      } else {
        diffVerdictHtml = `Chênh thêm <strong style="color: var(--amber-ink);">+${fmtYen(diffMonthly)}/tháng</strong> so với tiền thuê hiện tại để đổi lấy nhà đứng tên mình.`;
      }
    }

    rentCompareBox.innerHTML = `
      <div class="keisan-rent-compare-title">
        <span>Đối chiếu Thuê nhà (${fmtYen(params.currentRent)}/tháng) vs Mua trả góp</span>
        <span style="font-size: 12px; color: var(--amber-ink);">Trong ${params.years} năm (${res.totalMonths} tháng)</span>
      </div>
      <div class="keisan-rent-compare-row">
        <span>Nếu tiếp tục thuê nhà (${fmtYen(params.currentRent)} × ${res.totalMonths} tháng):</span>
        <strong style="color: var(--danger);">${fmtYen(totalRentOverTerm)} (Mất trắng tiền thuê)</strong>
      </div>
      <div class="keisan-rent-compare-row">
        <span>Trung bình trả góp mua nhà mỗi tháng (gồm Bonus):</span>
        <strong style="color: var(--ink);">${fmtYen(effectiveMonthly)}/tháng</strong>
      </div>
      ${diffVerdictHtml ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--line); font-size: 12.5px; color: var(--ink);">${diffVerdictHtml}</div>` : ''}
    `;
  }

  // 5. Nếu bảng chi tiết đang mở thì cập nhật luôn bảng 9 cột
  if (isKeisanScheduleOpen) {
    renderKeisanScheduleTable(res);
  }
}

function renderKeisanScheduleTable(res) {
  const tbody = document.getElementById('keisan-schedule-tbody');
  const tfoot = document.getElementById('keisan-schedule-tfoot');
  if (!tbody || !tfoot || !res) return;

  const fmt = n => Math.round(n).toLocaleString('en-US');

  tbody.innerHTML = res.rows.map(r => `
    <tr class="${r.isBonus ? 'bonus-row' : ''}">
      <td>${r.index}</td>
      <td>${r.ym}</td>
      <td>¥${fmt(r.payM)}</td>
      <td>¥${fmt(r.prinM)}</td>
      <td>¥${fmt(r.intM)}</td>
      <td>${r.payB > 0 ? `¥${fmt(r.payB)}` : '—'}</td>
      <td>${r.prinB > 0 ? `¥${fmt(r.prinB)}` : '—'}</td>
      <td>${r.intB > 0 ? `¥${fmt(r.intB)}` : '—'}</td>
      <td><strong>¥${fmt(r.balance)}</strong></td>
    </tr>
  `).join('');

  tfoot.innerHTML = `
    <tr>
      <td colspan="2">Tổng cộng (合計)</td>
      <td>¥${fmt(res.sumPayM)}</td>
      <td>¥${fmt(res.sumPrinM)}</td>
      <td>¥${fmt(res.sumIntM)}</td>
      <td>¥${fmt(res.sumPayB)}</td>
      <td>¥${fmt(res.sumPrinB)}</td>
      <td>¥${fmt(res.sumIntB)}</td>
      <td>¥0</td>
    </tr>
  `;
}

window.setKeisanMethod = function(method) {
  currentKeisanMethod = method === 'gankin' ? 'gankin' : 'ganri';
  const btnGanri = document.getElementById('ks-method-ganri');
  const btnGankin = document.getElementById('ks-method-gankin');
  if (btnGanri) btnGanri.classList.toggle('active', currentKeisanMethod === 'ganri');
  if (btnGankin) btnGankin.classList.toggle('active', currentKeisanMethod === 'gankin');
  recalcAndRenderKeisan();
};

window.applyKeisanPreset = function(presetKey, btnEl) {
  const preset = KEISAN_PRESETS[presetKey];
  if (!preset) return;

  document.querySelectorAll('#keisan-presets .keisan-preset-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('ks-total-man', preset.totalMan);
  setVal('ks-total-slider', Math.min(8000, preset.totalMan));
  setVal('ks-bonus-man', preset.bonusMan);
  setVal('ks-bonus-slider', Math.min(2000, preset.bonusMan));
  setVal('ks-term-years', preset.years);
  setVal('ks-term-months', preset.months);
  setVal('ks-bonus-months', preset.bonusMonths);
  setVal('ks-rate1', preset.rate1);
  setVal('ks-rate1-years', preset.rate1Years);
  setVal('ks-rate2', preset.rate2);
  setVal('ks-current-rent', preset.currentRent);
  setVal('ks-round-mode', preset.roundMode);
  setVal('ks-start-ym', preset.startYm);

  window.setKeisanMethod(preset.method);
};

window.toggleKeisanSchedule = function() {
  const wrap = document.getElementById('keisan-schedule-wrap');
  const btn = document.getElementById('btn-toggle-keisan-table');
  if (!wrap) return;

  isKeisanScheduleOpen = !isKeisanScheduleOpen;
  wrap.classList.toggle('open', isKeisanScheduleOpen);

  if (btn) {
    btn.textContent = isKeisanScheduleOpen
      ? 'Thu gọn bảng lịch trả nợ ↑'
      : 'Xem bảng lịch trả nợ chi tiết ↓';
  }

  if (isKeisanScheduleOpen && lastKeisanResult) {
    renderKeisanScheduleTable(lastKeisanResult.res);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

window.downloadKeisanCsv = function() {
  if (!lastKeisanResult || !lastKeisanResult.res) return;
  const { params, res } = lastKeisanResult;

  const headers = [
    'Ky (回目)',
    'Nam/Thang (年月)',
    'Tra hang thang (月払返済額)',
    'Goc thang (月払元金)',
    'Lai thang (月払利息)',
    'Tra Bonus (ボーナス返済額)',
    'Goc Bonus (ボーナス元金)',
    'Lai Bonus (ボーナス利息)',
    'Du no con lai (借入残高)'
  ];

  const lines = [headers.join(',')];
  res.rows.forEach(r => {
    lines.push([
      r.index,
      r.ym,
      r.payM,
      r.prinM,
      r.intM,
      r.payB,
      r.prinB,
      r.intB,
      r.balance
    ].join(','));
  });

  lines.push([
    'Tong cong (合計)',
    '',
    res.sumPayM,
    res.sumPrinM,
    res.sumIntM,
    res.sumPayB,
    res.sumPrinB,
    res.sumIntB,
    0
  ].join(','));

  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lich-tra-gop-${params.totalMan}man-${params.years}nam.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.consultWithKeisanResult = function() {
  if (!lastKeisanResult) return;
  const { params, res } = lastKeisanResult;
  const methodLabel = params.method === 'ganri' ? '元利均等 (Gốc+Lãi đều)' : '元金均等 (Gốc đều)';
  const propInput = document.getElementById('form-property');
  const msgInput = document.getElementById('form-message');

  if (propInput) {
    propInput.value = `Tư vấn vay ${params.totalMan.toLocaleString()}万円 (${params.years} năm · ${methodLabel})`;
  }
  if (msgInput) {
    msgInput.value = `Tôi vừa tính thử trên web: Vay ${params.totalMan.toLocaleString()}万円 (Bonus ${params.bonusMan}万円), thời hạn ${params.years} năm, lãi suất đầu ${params.rate1Pct}% (${params.rate1Years} năm) → sau đó ${params.rate2Pct}%. Tiền trả ước tính mỗi tháng khoảng ¥${res.firstMonthPay.toLocaleString()}. Nhờ BIG不動産 tư vấn hồ sơ vay và giới thiệu căn phù hợp.`;
  }

  const contactSection = document.getElementById('contact');
  if (contactSection) {
    contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  setTimeout(() => {
    const nameInput = document.getElementById('form-name');
    if (nameInput) nameInput.focus();
  }, 450);
};

// --------------------------------------------------------------------------
// 12. QUY TRÌNH CHI TIẾT 7 GIAI ĐOẠN & CHECKLIST ĐỘC QUYỀN (MỞ KHÓA BẰNG MÃ 2720)
// --------------------------------------------------------------------------
const VIP_ACCESS_CODE = '2720';
const VIP_CHECKLIST_STORAGE_KEY = 'big_vip_checklist_v1';
let currentVipBranch = 'loan'; // 'loan' (3B Vay ngân hàng) | 'cash' (3A Trả thẳng)
let isVipUnlockedSession = false;

const VIP_PROCESS_STAGES = [
  {
    id: 'stage-0',
    branch: 'common',
    stepTag: 'Giai đoạn 0 · 準備・物件探し',
    title: 'Chuẩn bị ngân sách, Thẩm định sơ bộ & Tìm nhà',
    timeframe: 'Từ vài ngày tới vài tuần',
    todo: 'Chốt ngân sách tổng và cách trả tiền ngay từ đầu — trả thẳng hay vay ngân hàng — vì hai cách này quyết định tốc độ, giấy tờ và chiến lược thương lượng về sau. Nếu vay, làm thẩm định sơ bộ 事前審査 càng sớm càng tốt để biết hạn mức vay thực tế. Sau đó mới tìm nhà, đi xem nhà và so sánh các lựa chọn theo tiêu chí rõ ràng: vị trí, khoảng cách tới ga, môi trường sống và diện tích.',
    prepText: 'Chưa cần nộp tiền ở giai đoạn này. Nếu vay, chuẩn bị trước giấy tờ thu nhập và giấy tờ cá nhân cơ bản để nộp 事前審査. Ghi lại ngân sách tối đa gồm cả giá nhà lẫn các khoản phí đi kèm, không chỉ nhìn giá bán.',
    checklist: [
      { id: 's0-1', label: 'Thẻ lưu trú 在留カード / Giấy tờ cá nhân (nếu nộp 事前審査)' },
      { id: 's0-2', label: 'Giấy thu nhập 源泉徴収票 / 課税証明書 (nhánh vay ngân hàng)' },
      { id: 's0-3', label: 'Chốt ngân sách tổng (Giá nhà + khoảng 7–10% phụ phí dự kiến)' }
    ],
    notes: 'Kết quả 事前審査 không chỉ để biết vay được bao nhiêu — trong thực tế làm việc của BIG, khi thương lượng giá, BIG gửi kèm kết quả ngân hàng cho bên bán để lời đề nghị có sức nặng hơn, vì bên bán thấy người mua đã được ngân hàng xem qua. Nếu nhắm tới giảm trừ thuế 住宅ローン減税, phải so diện tích theo sổ đăng ký (登記簿面積 ≥ 50㎡) ngay từ bước xem nhà, không dùng diện tích trên quảng cáo.',
    articles: [
      { id: 'kinh-nghiem-vay-nha-7', label: 'Đọc Bài 7: 住宅ローン減税 là gì & 3 con số quyết định' },
      { id: 'kinh-nghiem-vay-nha-8', label: 'Đọc Bài 8: 5 chỗ người mua nhà hay vấp với 減税' }
    ]
  },
  {
    id: 'stage-1',
    branch: 'common',
    stepTag: 'Giai đoạn 1 · 買付・条件交渉',
    title: 'Đặt mua (買付書) & Thương lượng điều kiện',
    timeframe: 'Thường vài ngày cho mỗi vòng thương lượng',
    todo: 'Khi đã chọn được nhà, BIG nhập dữ kiện vào bộ hồ sơ bán hàng, gửi đơn đặt mua 買付書 kèm thư gửi 買付送付状 cho bên bán. Hai bên thương lượng giá và các điều kiện mua bán. Bên bán chấp thuận bằng văn bản trả lời 回答書 thì thương lượng mới được coi là chốt.',
    prepText: 'Đơn đặt mua 買付書 ghi rõ giá đề nghị, ngày bàn giao mong muốn và điều kiện thanh toán. Nếu đã có kết quả 事前審査, chuẩn bị sẵn bản kết quả để BIG gửi kèm khi thương lượng.',
    checklist: [
      { id: 's1-1', label: 'Đơn đặt mua 買付証明書 (chốt giá đề nghị & điều kiện)' },
      { id: 's1-2', label: 'Bản kết quả duyệt sơ bộ 事前審査 (để BIG đính kèm tăng sức nặng đàm phán)' },
      { id: 's1-3', label: 'Chốt ngày bàn giao mong muốn (khớp với lịch trả nhà thuê hiện tại)' }
    ],
    notes: 'Điểm phải chốt ngay từ vòng này là NGÀY BÀN GIAO (引渡日). Khách đang ở nhà thuê cần ngày bàn giao chắc chắn để tính ngày báo trả nhà thuê, tránh trả tiền hai nơi cùng lúc hoặc phải dọn ra trước khi nhà mới sẵn sàng. Đừng chỉ thương lượng giá mà quên khóa ngày.',
    articles: []
  },
  {
    id: 'stage-2',
    branch: 'common',
    stepTag: 'Giai đoạn 2 · 重要事項説明・売買契約',
    title: 'Giải thích trọng yếu (重説) & Ký hợp đồng mua bán',
    timeframe: 'Khoảng 1–2 giờ trong cùng một buổi ký',
    todo: 'Nghe giải thích trọng yếu 重要事項説明 từ người có chứng chỉ 宅建士 về căn nhà, quyền sở hữu, các hạn chế pháp lý và điều kiện giao dịch. Sau đó ký hợp đồng mua bán 売買契約書 — hợp đồng do bên bán hoặc BIG soạn và đều qua kiểm tra của 宅建士. Đồng thời thống nhất bên chỉ định luật sư tư pháp 司法書士 phụ trách đăng ký sang tên.',
    prepText: 'Tiền cọc 手付金 — tham khảo 50万円, nộp bằng chuyển khoản hoặc tiền mặt ngay khi ký. Mang đầy đủ bộ giấy tờ và con dấu bên dưới tới buổi ký hợp đồng:',
    checklist: [
      { id: 's2-1', label: 'Tiền cọc 手付金 (Tham khảo 50万円 — chuyển khoản hoặc tiền mặt)' },
      { id: 's2-2', label: 'Tem thuế hợp đồng 収入印紙 1万円 (Mua sẵn ở bưu điện mang theo)' },
      { id: 's2-3', label: 'Thẻ người nước ngoài / Giấy tờ tùy thân 身分証明書 (在留カード)' },
      { id: 's2-4', label: 'Con dấu thật 実印 & Giấy chứng nhận con dấu 印鑑証明書' },
      { id: 's2-5', label: 'Giấy cư trú 住民票 (Bản có ghi đầy đủ phiên âm Katakana)' },
      { id: 's2-6', label: 'Hợp đồng thuê nhà hiện tại (để đối chiếu điều khoản báo trả nhà)' }
    ],
    notes: 'Trước khi đặt bút ký, phải soi kỹ 3 điều khoản: (1) Hủy bằng tiền cọc 手付解除 (được hủy tới ngày nào, người mua đổi ý mất cọc, bên bán đổi ý đền gấp đôi), (2) Mức phạt vi phạm 違約金 (thường tới 20% giá nhà) khi quá hạn không thực hiện hợp đồng, và (3) Với người vay — Điều khoản vay vốn ローン特約 kèm đúng 2 mốc ngày (ngày hẹn lấy duyệt vay và ngày hẹn hủy hợp đồng nhận lại cọc).',
    articles: [
      { id: 'kinh-nghiem-vay-nha-5', label: 'Đọc Bài 5: Tiền cọc 手付金 — Đổi ý mất cọc, bên bán đổi ý đền gấp đôi' },
      { id: 'kinh-nghiem-vay-nha-6', label: 'Đọc Bài 6: Điều khoản ローン特約, mốc 20% phạt & 2 ngày phải ghi vào lịch' }
    ]
  },
  {
    id: 'stage-3-loan',
    branch: 'loan',
    isBranchStage: true,
    stepTag: 'Giai đoạn 3B (Nhánh Vay) · 本審査・金消契約',
    title: 'Thẩm định chính thức (本審査), Bảo hiểm 団信 & Ký hợp đồng vay',
    timeframe: 'Tổng thời gian từ ký HĐ mua bán → bàn giao: 1–1,5 tháng',
    todo: 'Nộp thẩm định chính thức 本審査 — khách lên ngân hàng (như SMBC / Resona) trực tiếp, đồng thời mở tài khoản ngân hàng nếu chưa có. Đăng ký bảo hiểm nhân thọ tín dụng 団信 và khai báo sức khỏe. Hồ sơ đồng thời qua công ty bảo lãnh (保証会社) của ngân hàng. Khi có kết quả duyệt, khách lên ngân hàng lần nữa để ký hợp đồng vay 金銭消費貸借契約 (金消契約).',
    prepText: 'Giấy tờ cá nhân, giấy tờ thu nhập và hồ sơ nhà theo yêu cầu của từng ngân hàng. Buổi ký hợp đồng vay 金銭消費貸借契約 nhớ mang theo:',
    checklist: [
      { id: 's3b-1', label: 'Hồ sơ nộp 本審査 & Tờ khai sức khỏe bảo hiểm 団信 (khai trung thực 100%)' },
      { id: 's3b-2', label: 'Mở tài khoản ngân hàng giải ngân & lấy thông tin đăng nhập trang cá nhân' },
      { id: 's3b-3', label: 'Thẻ ngân hàng (キャッシュカード), 実印, 印鑑証明書, 住民票 khi đi ký 金消契約' }
    ],
    notes: 'Ba điểm sống còn phải nhớ: (1) Khai báo sức khỏe cho 団信 phải trung thực tuyệt đối — giấu bệnh có thể làm mất quyền được bảo hiểm trả nợ thay khi có biến cố. (2) Ngân hàng dân sinh luôn đi qua Công ty bảo lãnh (保証会社) và chính công ty này mới là nơi xét duyệt quyết định. (3) Lãi suất áp dụng chốt tại NGÀY GIẢI NGÂN, không phải ngày nộp hồ sơ, và tuyệt đối tránh 3 chiêu gian lận hồ sơ. Nếu chẳng may trượt duyệt, dùng điều khoản ローン特約 để hủy và nhận lại đủ tiền cọc (với điều kiện nộp hồ sơ trung thực, đúng hạn).',
    articles: [
      { id: 'kinh-nghiem-vay-nha-10', label: 'Đọc Bài 10: Lãi biến động, Quy tắc 5 năm & Nước cờ 4–5 năm bán' },
      { id: 'kinh-nghiem-vay-nha-1', label: 'Đọc Bài 1: 3 chiêu gian lận phải né & quy tắc lãi suất' },
      { id: 'kinh-nghiem-vay-nha-3', label: 'Đọc Bài 3: Bảo hiểm 団信 & khi nào ngân hàng đòi người bảo lãnh' },
      { id: 'kinh-nghiem-vay-nha-9', label: 'Đọc Bài 9: Công ty bảo lãnh 保証会社 — người gác cổng thực sự' },
      { id: 'kinh-nghiem-vay-nha-6', label: 'Đọc Bài 6: Cách dùng ローン特約 bảo vệ tiền cọc' }
    ]
  },
  {
    id: 'stage-3-cash',
    branch: 'cash',
    isBranchStage: true,
    stepTag: 'Giai đoạn 3A (Nhánh Trả thẳng) · 残代金準備・決済日確定',
    title: 'Chuẩn bị dòng tiền thanh toán & Chốt ngày quyết toán',
    timeframe: 'Từ ký hợp đồng → bàn giao: khoảng 2–4 tuần (ngắn hơn hẳn nhánh vay)',
    todo: 'Chuẩn bị toàn bộ phần tiền còn lại của giá nhà cộng các khoản phí đi kèm (phí môi giới, thuế phí, phí đăng ký sang tên). Chốt lại ngày quyết toán với bên bán và BIG. Không có bước xét duyệt ngân hàng nên lịch trình chủ yếu phụ thuộc vào việc tiền có sẵn sàng đúng ngày hay không.',
    prepText: 'Toàn bộ số tiền còn lại phải nằm sẵn trong tài khoản tại Nhật trước ngày quyết toán. Nếu tiền chuyển từ Việt Nam sang, chuẩn bị trước giấy tờ chứng minh nguồn tiền và tính dư biên độ ngày chuyển tiền quốc tế:',
    checklist: [
      { id: 's3a-1', label: 'Tập hợp đủ số dư phần tiền nhà còn lại + phụ phí trong tài khoản tại Nhật' },
      { id: 's3a-2', label: 'Hồ sơ chứng minh nguồn tiền / quan hệ thân nhân (nếu chuyển tiền từ Việt Nam)' },
      { id: 's3a-3', label: 'Kiểm tra hạn mức chuyển khoản trong ngày của tài khoản ngân hàng' }
    ],
    notes: 'Rủi ro chính của nhánh trả thẳng không nằm ở thủ tục mà ở DÒNG TIỀN: dồn một khoản lớn trong thời gian ngắn và rủi ro chậm trễ khi chuyển tiền từ nước ngoài. Hãy tính ngày chuyển tiền ngược từ ngày quyết toán, cộng thêm biên an toàn vài ngày làm việc. Lưu ý: Nhánh trả thẳng không có ローン特約 bảo vệ, nên nếu không gom kịp tiền đúng hạn sẽ rơi vào vi phạm hợp đồng mất cọc / phạt 違約金.',
    articles: [
      { id: 'kinh-nghiem-vay-nha-5', label: 'Đọc Bài 5: Quy tắc tiền cọc 手付金' },
      { id: 'kinh-nghiem-vay-nha-6', label: 'Đọc Bài 6: Mức phạt vi phạm hợp đồng 20% cần lưu ý' }
    ]
  },
  {
    id: 'stage-4',
    branch: 'common',
    stepTag: 'Giai đoạn 4 · 決済前準備・精算書確認',
    title: 'Trước ngày quyết toán: Đối chiếu bảng kê 精算書 & Bảo hiểm cháy nổ',
    timeframe: 'Chuẩn bị trong khoảng 1 tuần trước ngày quyết toán',
    todo: 'Nhận bảng kê quyết toán 精算書 và đối chiếu từng khoản: phần tiền nhà còn lại, phí môi giới, tiền chia lại thuế tài sản cố định (固定資産税・都市計画税の精算金 theo ngày sở hữu), phí đăng ký luật sư. Nạp sẵn tiền phụ phí vào tài khoản trước ngày quyết toán. Chọn gói bảo hiểm cháy nổ 火災保険 và đăng ký trừ tiền tự động. Xác nhận lại lần cuối ngày, giờ và địa điểm quyết toán với bên bán.',
    prepText: 'Tiền phụ phí theo bảng kê 精算書 nạp sẵn trong tài khoản. Hồ sơ phối hợp cùng luật sư tư pháp 司法書士 để chuẩn bị đăng ký sang tên 所有権移転登記 (và 抵当権設定登記 nếu vay):',
    checklist: [
      { id: 's4-1', label: 'Kiểm tra kỹ bảng kê quyết toán 精算書 (tiền nhà còn lại + thuế + phí môi giới + phí luật sư)' },
      { id: 's4-2', label: 'Nạp sẵn toàn bộ tiền phụ phí vào tài khoản trước ngày quyết toán' },
      { id: 's4-3', label: 'Hoàn tất đăng ký gói Bảo hiểm cháy nổ 火災保険 (bắt buộc có hiệu lực từ ngày nhận nhà)' },
      { id: 's4-4', label: 'Hồ sơ gửi luật sư tư pháp: Hợp đồng mua bán đóng dấu, 評価証明書, giấy tờ đăng ký' }
    ],
    notes: 'Đừng để tới sáng ngày quyết toán mới phát hiện thiếu một khoản phụ phí hoặc thiếu một giấy tờ của luật sư tư pháp. Người vay ngân hàng cần kiểm tra thêm cách ngân hàng thu phí bảo lãnh (保証料) và phí thủ tục vay (事務手数料) trong bảng kê.',
    articles: [
      { id: 'kinh-nghiem-vay-nha-2', label: 'Đọc Bài 2: So sánh 2 cách trả phí thủ tục vay (trả 1 cục vs cộng +0,2% lãi)' },
      { id: 'kinh-nghiem-vay-nha-9', label: 'Đọc Bài 9: Phí bảo lãnh 保証料 và những điều cần biết' }
    ]
  },
  {
    id: 'stage-5',
    branch: 'common',
    stepTag: 'Giai đoạn 5 · 決済・引渡し',
    title: 'Ngày quyết toán & Bàn giao chìa khóa (決済・引渡し)',
    timeframe: 'Diễn ra và hoàn tất trong 1 buổi (thường tại ngân hàng)',
    todo: 'Thanh toán toàn bộ phần tiền còn lại cho bên bán. Với người vay, ngân hàng giải ngân khoản vay trong chính ngày này để hoàn tất chuyển khoản. Luật sư tư pháp 司法書士 kiểm tra xác nhận tiền đã đủ và nộp hồ sơ đăng ký sang tên ngay trong ngày. Sau đó bên bán bàn giao chìa khóa và hoàn tất nhận nhà.',
    prepText: 'Mang đầy đủ giấy tờ cá nhân, con dấu, sổ/thẻ ngân hàng theo dặn dò của buổi quyết toán. Khi nhận bàn giao nhà, kiểm tra kỹ trang thiết bị theo bảng 付帯設備表:',
    checklist: [
      { id: 's5-1', label: 'Giấy tờ tùy thân, con dấu, thẻ/sổ ngân hàng và phiếu chuyển khoản tại buổi 決済' },
      { id: 's5-2', label: 'Kiểm tra thiết bị thực tế đối chiếu với Bảng thiết bị đi kèm 付帯設備表' },
      { id: 's5-3', label: 'Nhận toàn bộ bộ chìa khóa nhà & biên nhận quyết toán' },
      { id: 's5-4', label: 'Lưu giữ cẩn thận 精算書, biên nhận, hợp đồng để dùng khai thuế năm sau' }
    ],
    notes: 'Từ thời điểm bàn giao, căn nhà chính thức thuộc quyền sở hữu của bạn — mọi rủi ro và trách nhiệm với căn nhà cũng chuyển sang bạn, nên bảo hiểm cháy nổ phải có hiệu lực từ đúng ngày này. Giữ lại toàn bộ hồ sơ ngày quyết toán vì sẽ cần cho thủ tục hoàn thuế 住宅ローン減税.',
    articles: [
      { id: 'kinh-nghiem-vay-nha-7', label: 'Đọc Bài 7: Hồ sơ cần giữ để làm 住宅ローン減税' },
      { id: 'kinh-nghiem-vay-nha-8', label: 'Đọc Bài 8: Lưu ý chuyển vào ở trong vòng 6 tháng sau bàn giao' }
    ]
  },
  {
    id: 'stage-6',
    branch: 'common',
    stepTag: 'Giai đoạn 6 · 入居後・確定申告',
    title: 'Sau khi nhận nhà: Chuyển vào ở, Khai thuế năm đầu & Kỷ luật trả nợ',
    timeframe: 'Vào ở trong vòng 6 tháng; khai thuế 確定申告 vào đầu năm tiếp theo',
    todo: 'Dọn vào ở, chuyển địa chỉ trên 住民票 và bắt đầu cuộc sống trong nhà mới. Người vay bắt đầu trả nợ hằng tháng theo lịch ngân hàng. Thực hiện các thủ tục định kỳ của chủ nhà: đóng thuế tài sản cố định 固定資産税 khi có giấy báo, trả phí quản lý & quỹ sửa chữa hằng tháng (nếu là chung cư Mansion), và duy trì bảo hiểm cháy nổ.',
    prepText: 'Chuẩn bị bộ hồ sơ khai thuế năm đầu tiên (確定申告) để nhận hoàn thuế 住宅ローン減税 và duy trì số dư tài khoản trả nợ:',
    checklist: [
      { id: 's6-1', label: 'Chuyển vào ở thực tế trong vòng 6 tháng kể từ ngày nhận bàn giao' },
      { id: 's6-2', label: 'Đặt lịch nhắc nạp tiền vào tài khoản ngân hàng trước ngày trừ nợ ít nhất 1 ngày' },
      { id: 's6-3', label: 'Giấy chứng nhận số dư nợ cuối năm (残高証明書) do ngân hàng gửi + Bản sao HĐ mua bán + Sổ đăng ký để nộp 確定申告 năm đầu' }
    ],
    notes: 'Ba kỷ luật vàng sau khi mua nhà: (1) Luôn nạp tiền trước ngày trừ nợ ít nhất 1 ngày — trả chậm có thể bị phạt lãi suất 14%/năm và mất luôn mức giảm lãi ưu đãi. (2) Năm đầu tiên BẮT BUỘC phải tự nộp tờ khai thuế 確定申告, từ năm thứ 2 mới làm qua công ty (年末調整) — quên năm đầu là mất khoản hoàn thuế lớn nhất. (3) Khi có tiền nhàn rỗi muốn trả nợ trước hạn (繰上返済), phải kiểm tra mốc 120 lần trả (10 năm) để không vô tình làm mất quyền hưởng 住宅ローン減税.',
    articles: [
      { id: 'kinh-nghiem-vay-nha-2', label: 'Đọc Bài 2: Hậu quả mất lãi ưu đãi nếu để trễ kỳ trừ nợ' },
      { id: 'kinh-nghiem-vay-nha-4', label: 'Đọc Bài 4: Trả nợ trước hạn & cái bẫy dưới 120 lần trả làm mất 減税' },
      { id: 'kinh-nghiem-vay-nha-8', label: 'Đọc Bài 8: Khai thuế 確定申告 năm đầu tiên' }
    ]
  }
];

function getSavedChecklistState() {
  try {
    const raw = localStorage.getItem(VIP_CHECKLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

window.toggleVipChecklistItem = function(itemId, checked) {
  try {
    const state = getSavedChecklistState();
    state[itemId] = Boolean(checked);
    localStorage.setItem(VIP_CHECKLIST_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Ignore storage error
  }
};

function renderVipProcessTimeline() {
  const container = document.getElementById('vip-timeline-container');
  if (!container) return;

  const checkState = getSavedChecklistState();
  const visibleStages = VIP_PROCESS_STAGES.filter(
    st => st.branch === 'common' || st.branch === currentVipBranch
  );

  container.innerHTML = visibleStages.map(st => {
    const checklistHtml = (st.checklist && st.checklist.length > 0) ? `
      <ul class="vip-checklist">
        ${st.checklist.map(item => `
          <li>
            <label>
              <input
                type="checkbox"
                ${checkState[item.id] ? 'checked' : ''}
                onchange="toggleVipChecklistItem('${item.id}', this.checked)"
              >
              <span>${item.label}</span>
            </label>
          </li>
        `).join('')}
      </ul>
    ` : '';

    const articlesHtml = (st.articles && st.articles.length > 0) ? `
      <div class="vip-article-links">
        ${st.articles.map(art => `
          <button type="button" class="vip-article-chip" onclick="openArticleDialog('${art.id}')">
            📖 ${art.label}
          </button>
        `).join('')}
      </div>
    ` : '';

    return `
      <div class="vip-stage-card ${st.isBranchStage ? 'branch-highlight' : ''}">
        <div class="vip-stage-dot"></div>
        <div class="vip-stage-head">
          <span class="vip-stage-step-tag">${st.stepTag}</span>
          <span class="vip-stage-time-badge">⏱ Thời gian tham khảo: ${st.timeframe}</span>
          <h4 class="vip-stage-title serif">${st.title}</h4>
        </div>

        <div class="vip-stage-rows">
          <div class="vip-stage-row">
            <div class="vip-row-label">
              1. Việc cần làm
              <span>やるべきこと</span>
            </div>
            <div class="vip-row-body">${st.todo}</div>
          </div>

          <div class="vip-stage-row">
            <div class="vip-row-label">
              2. Giấy tờ &amp; Tiền chuẩn bị
              <span>必要書類・資金チェック</span>
            </div>
            <div class="vip-row-body">
              <div>${st.prepText}</div>
              ${checklistHtml}
            </div>
          </div>

          <div class="vip-stage-row">
            <div class="vip-row-label">
              3. Thời gian tham khảo
              <span>目安期間</span>
            </div>
            <div class="vip-row-body">${st.timeframe}</div>
          </div>

          <div class="vip-stage-row">
            <div class="vip-row-label">
              4. Lưu ý &amp; Bài liên quan
              <span>注意点・関連記事</span>
            </div>
            <div class="vip-row-body">
              <div>${st.notes}</div>
              ${articlesHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function initVipProcessSection() {
  const codeInput = document.getElementById('vip-code-input');
  if (codeInput) {
    codeInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.verifyVipProcessCode();
      }
    });
  }
  renderVipProcessTimeline();
}

window.toggleVipProcessSection = function() {
  const gateBox = document.getElementById('vip-gate-box');
  const panel = document.getElementById('vip-process-panel');
  const btn = document.getElementById('btn-open-vip-process');
  const codeInput = document.getElementById('vip-code-input');

  if (!gateBox || !panel) return;

  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
    if (btn) btn.textContent = '🔒 Xem thêm quy trình chi tiết (Nhập mã) →';
    return;
  }

  if (isVipUnlockedSession) {
    gateBox.classList.remove('open');
    panel.classList.add('open');
    if (btn) btn.textContent = 'Thu gọn quy trình chi tiết ↑';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const isGateOpen = gateBox.classList.toggle('open');
  if (isGateOpen && codeInput) {
    setTimeout(() => codeInput.focus(), 100);
  }
};

window.verifyVipProcessCode = function() {
  const codeInput = document.getElementById('vip-code-input');
  const errorBox = document.getElementById('vip-gate-error');
  const gateBox = document.getElementById('vip-gate-box');
  const panel = document.getElementById('vip-process-panel');
  const btn = document.getElementById('btn-open-vip-process');

  if (!codeInput) return;
  const entered = codeInput.value.trim();

  if (entered === VIP_ACCESS_CODE) {
    isVipUnlockedSession = true;
    if (errorBox) errorBox.classList.remove('active');
    if (gateBox) gateBox.classList.remove('open');
    if (panel) {
      renderVipProcessTimeline();
      panel.classList.add('open');
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (btn) {
      btn.textContent = 'Thu gọn quy trình chi tiết ↑';
    }
    trackEvent('unlock_vip_process', { status: 'success' });
  } else {
    if (errorBox) errorBox.classList.add('active');
    codeInput.select();
  }
};

window.lockVipProcessSection = function() {
  const gateBox = document.getElementById('vip-gate-box');
  const panel = document.getElementById('vip-process-panel');
  const btn = document.getElementById('btn-open-vip-process');
  const codeInput = document.getElementById('vip-code-input');

  isVipUnlockedSession = false;
  if (codeInput) codeInput.value = '';
  if (gateBox) gateBox.classList.remove('open');
  if (panel) panel.classList.remove('open');
  if (btn) btn.textContent = '🔒 Xem thêm quy trình chi tiết (Nhập mã) →';

  const processSec = document.getElementById('process');
  if (processSec) {
    processSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

window.switchVipProcessBranch = function(branch) {
  currentVipBranch = branch === 'cash' ? 'cash' : 'loan';
  const loanBtn = document.getElementById('vip-tab-loan');
  const cashBtn = document.getElementById('vip-tab-cash');
  if (loanBtn) loanBtn.classList.toggle('active', currentVipBranch === 'loan');
  if (cashBtn) cashBtn.classList.toggle('active', currentVipBranch === 'cash');
  renderVipProcessTimeline();
};

window.requestVipCodeFromContact = function() {
  const propInput = document.getElementById('form-property');
  const msgInput = document.getElementById('form-message');
  if (propInput) {
    propInput.value = 'Đăng ký tư vấn & Nhận mã xem Quy trình mua nhà chi tiết';
  }
  if (msgInput) {
    msgInput.value = 'Xin chào BIG不動産, tôi muốn đặt lịch tư vấn mua nhà và nhận mã mở khóa Cẩm nang Quy trình 7 giai đoạn & Checklist hồ sơ.';
  }
};

window.consultFromVipProcess = function() {
  const branchLabel = currentVipBranch === 'loan' ? 'Nhánh Vay ngân hàng (住宅ローン)' : 'Nhánh Trả thẳng (Tiền mặt)';
  const propInput = document.getElementById('form-property');
  const msgInput = document.getElementById('form-message');
  if (propInput) {
    propInput.value = `Hỗ trợ hồ sơ theo Quy trình 7 giai đoạn — ${branchLabel}`;
  }
  if (msgInput) {
    msgInput.value = `Tôi đã xem Quy trình 7 giai đoạn (${branchLabel}) bằng mã khách hàng 2720 trên web. Nhờ BIG不動産 hỗ trợ kiểm tra giấy tờ và lịch trình bước tiếp theo giúp tôi.`;
  }
  const contactSection = document.getElementById('contact');
  if (contactSection) {
    contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  setTimeout(() => {
    const nameInput = document.getElementById('form-name');
    if (nameInput) nameInput.focus();
  }, 450);
};

// --------------------------------------------------------------------------
// 11. JAPANDI ZEN MOTION DESIGN (Shutter Reveal + Architectural Grid Lines)
// --------------------------------------------------------------------------
let zenIntersectionObserver = null;

function initJapandiZenMotion() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;

  // Gắn class zen-shutter cho banner thương hiệu và ảnh chính
  document.querySelectorAll('.banner-frame, .gallery-main').forEach(el => {
    el.classList.add('zen-shutter');
  });

  // Gắn class arch-grid-line cho đường phân cách hướng dẫn
  document.querySelectorAll('.guide-divider-line').forEach(el => {
    el.classList.add('arch-grid-line');
  });

  // Gắn zen-fade-up cho các bước quy trình và khối máy tính
  document.querySelectorAll('.process-step, .keisan-card, .mid-cta-band').forEach((el, idx) => {
    el.classList.add('zen-fade-up');
    if (el.style) {
      el.style.transitionDelay = `${(idx % 4) * 70}ms`;
    }
  });

  refreshJapandiZenObserver();
}

function refreshJapandiZenObserver() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;

  const targets = document.querySelectorAll(
    '.zen-shutter, .zen-fade-up, .section-head, .property-card, .arch-grid-line'
  );

  if (typeof IntersectionObserver === 'undefined') {
    targets.forEach(el => el.classList.add('is-inview'));
    return;
  }

  if (!zenIntersectionObserver) {
    zenIntersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-inview');
            zenIntersectionObserver.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.12
      }
    );
  }

  // Tạo độ trễ nhịp nhàng (stagger) cho các thẻ BĐS cùng hàng
  document.querySelectorAll('.property-card.zen-fade-up, .article-card.zen-fade-up').forEach((card, idx) => {
    if (card.style && !card.dataset.zenStaggered) {
      card.dataset.zenStaggered = '1';
      card.style.transitionDelay = `${(idx % 3) * 85}ms`;
    }
  });

  targets.forEach(el => {
    if (!el.classList.contains('is-inview')) {
      zenIntersectionObserver.observe(el);
    }
  });
}



