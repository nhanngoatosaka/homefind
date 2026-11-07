const $ = id => document.getElementById(id);
const MODEL = "gemini-2.5-flash";
let DB = [], files = [];
$("key").value = localStorage.gkey || "";
fetch("data/properties.json").then(r => r.json()).then(d => { DB = d; $("cnt").textContent = DB.length; });

$("drop").onclick = () => $("file").click();
$("file").onchange = e => files = [...e.target.files], $("drop").firstChild.textContent = files.map(f => f.name).join(", ");
$("drop").ondragover = e => { e.preventDefault(); $("drop").classList.add("over"); };
$("drop").ondragleave = () => $("drop").classList.remove("over");
$("drop").ondrop = e => { e.preventDefault(); files = [...e.dataTransfer.files]; $("drop").classList.remove("over"); $("drop").firstChild.textContent = files.map(f => f.name).join(", "); };

const b64 = f => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(",")[1]); fr.readAsDataURL(f); });

const PROMPT = `Bạn là chuyên gia BĐS Nhật Bản. Đọc tờ Maisoku (マイソク) đính kèm và trích xuất thông tin thành 1 JSON object duy nhất theo schema:
{"id":"", "purpose":"invest|live", "type":"mansion|house|building|land", "city":"", "ward":"", "price":number JPY, "area":number m2,
"layout":"", "yearBuilt":number (năm dương lịch, đổi từ 令和/平成/昭和), "structure":"RC|SRC|Steel|Wood", "floor":"", "tenure":"freehold|leasehold",
"walkMin":number phút đi bộ ra ga gần nhất, "station":"tên ga (romaji)", "mgmtFee":number JPY/tháng, "repairFund":number JPY/tháng,
"annualRent":number JPY/năm (0 nếu không có), "grossYield":number % (利回り, tự tính = annualRent/price*100 nếu thiếu), "netYield":number (0 nếu không rõ),
"seismic":"shin (xây sau 1981-06)|old|grade1|grade2|grade3", "image":"",
"title":{"ja":"","en":"","vi":""}, "desc":{"ja":"","en":"","vi":""}}
Quy tắc: title/desc dịch tự nhiên sang 3 ngôn ngữ, desc 1-2 câu nêu điểm mạnh. Số liệu không có trên tài liệu thì để 0 hoặc "". Không bịa. Chỉ trả JSON.`;

$("go").onclick = async () => {
  const key = $("key").value.trim();
  if (!key) return alert("Nhập Gemini API key");
  if (!files.length) return alert("Chọn file Maisoku");
  localStorage.gkey = key;
  $("status").textContent = "AI đang đọc…";
  try {
    const parts = [{ text: PROMPT }];
    for (const f of files) parts.push({ inline_data: { mime_type: f.type, data: await b64(f) } });
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json" } })
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error?.message || res.status);
    const obj = JSON.parse(j.candidates[0].content.parts[0].text);
    const o = Array.isArray(obj) ? obj[0] : obj;
    o.id = o.id || "NEW-" + Date.now().toString().slice(-5);
    if ($("img").value) o.image = $("img").value;
    $("out").value = JSON.stringify(o, null, 2);
    $("status").textContent = "Xong! Hãy kiểm tra lại số liệu trước khi đăng.";
  } catch (e) { $("status").textContent = "Lỗi: " + e.message; }
};

$("add").onclick = () => {
  try { DB.unshift(JSON.parse($("out").value)); $("cnt").textContent = DB.length; $("out").value = ""; $("status").textContent = "Đã thêm. Bấm Tải properties.json."; }
  catch { alert("JSON không hợp lệ"); }
};
$("dl").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(DB, null, 2)], { type: "application/json" }));
  a.download = "properties.json"; a.click();
};
