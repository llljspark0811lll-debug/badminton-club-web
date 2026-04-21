const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta/weekly-club";
fs.mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1080;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');`;
const BASE = `${FONT}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;}body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;}`;

const slide = { name: "wed_before_after", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#F8FAFC;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:52px 72px 44px;}
.top{text-align:center;}
.kicker{font-size:26px;font-weight:900;color:#94A3B8;letter-spacing:2px;margin-bottom:10px;}
.title{font-size:54px;font-weight:900;color:#0F172A;line-height:1.45;}
.title em{color:#0F172A;font-style:normal;
  background:#FACC15;padding:0 14px;border-radius:10px;}
.compare{display:flex;gap:20px;width:100%;}
.col{flex:1;border-radius:24px;overflow:hidden;}
.col-label{font-size:20px;font-weight:900;padding:16px;letter-spacing:1px;text-align:center;}
.col.before .col-label{background:#EF4444;color:#fff;}
.col.after .col-label{background:#0F172A;color:#FACC15;}
.col-body{padding:18px 16px;display:flex;flex-direction:column;gap:10px;}
.col.before .col-body{background:#FFF5F5;border:2px solid #FECACA;border-top:none;border-radius:0 0 24px 24px;}
.col.after .col-body{background:#F0FDF4;border:2px solid #BBF7D0;border-top:none;border-radius:0 0 24px 24px;}
.tool{background:#fff;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;
  border:1.5px solid #E2E8F0;}
.tool-icon{font-size:20px;flex-shrink:0;}
.tool-text{font-size:16px;font-weight:700;color:#475569;}
.tool-sub{font-size:14px;color:#64748B;margin-top:2px;font-weight:600;}
.chaos{background:#FEE2E2;border-radius:12px;padding:10px 14px;text-align:center;
  font-size:15px;font-weight:900;color:#DC2626;border:1.5px solid #FECACA;}
.feature{background:#fff;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;
  border:1.5px solid #BBF7D0;}
.f-icon{font-size:20px;flex-shrink:0;}
.f-text{font-size:16px;font-weight:700;color:#0F172A;}
.f-sub{font-size:13px;color:#16A34A;margin-top:2px;font-weight:700;}
.all-in{background:#0F172A;border-radius:12px;padding:12px 14px;text-align:center;
  font-size:15px;font-weight:900;color:#FACC15;}
.bottom{text-align:center;width:100%;}
.bottom-txt{
  display:inline-block;
  font-size:26px;font-weight:900;color:#0F172A;
  background:#fff;
  border-radius:16px;
  padding:16px 36px;
  box-shadow:0 6px 24px rgba(15,23,42,0.13), 0 1px 4px rgba(15,23,42,0.08);
}
.bottom-txt .brand{color:#2563EB;}
</style></head><body>
  <div class="top">
    <div class="kicker">운영 방식 비교</div>
    <div class="title">클럽/소모임 운영,<br>이제 <em>콕매니저🏸</em>로</div>
  </div>
  <div class="compare">
    <div class="col before">
      <div class="col-label">❌ 기존 방식</div>
      <div class="col-body">
        <div class="tool">
          <span class="tool-icon">💬</span>
          <div><div class="tool-text">카카오톡</div><div class="tool-sub">공지·참석 취합·독촉</div></div>
        </div>
        <div class="tool">
          <span class="tool-icon">📊</span>
          <div><div class="tool-text">엑셀</div><div class="tool-sub">회원 명단·회비 정리</div></div>
        </div>
        <div class="tool">
          <span class="tool-icon">📝</span>
          <div><div class="tool-text">메모장·종이</div><div class="tool-sub">대진표 수기 작성</div></div>
        </div>
        <div class="tool">
          <span class="tool-icon">🧠</span>
          <div><div class="tool-text">총무 머릿속</div><div class="tool-sub">나머지 전부</div></div>
        </div>
        <div class="chaos">전부 따로따로 😮‍💨</div>
      </div>
    </div>
    <div class="col after">
      <div class="col-label">✅ 콕매니저</div>
      <div class="col-body">
        <div class="feature">
          <span class="f-icon">👥</span>
          <div><div class="f-text">회원 관리</div><div class="f-sub">가입 링크로 자동 등록</div></div>
        </div>
        <div class="feature">
          <span class="f-icon">📅</span>
          <div><div class="f-text">일정·참석 관리</div><div class="f-sub">실시간 자동 집계</div></div>
        </div>
        <div class="feature">
          <span class="f-icon">💰</span>
          <div><div class="f-text">회비 관리</div><div class="f-sub">납부·미납 자동 정리</div></div>
        </div>
        <div class="feature">
          <span class="f-icon">🏸</span>
          <div><div class="f-text">자동 대진표</div><div class="f-sub">급수·성별 균형 자동</div></div>
        </div>
        <div class="all-in">전부 한 앱에서 ⚡</div>
      </div>
    </div>
  </div>
  <div class="bottom">
    <div class="bottom-txt"><span class="brand">콕매니저🏸</span> 하나로 총무 업무 90% 자동화</div>
  </div>
</body></html>` };

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await page.setContent(slide.html, { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 1200));
  const outPath = path.join(OUT, `${slide.name}.png`);
  await page.screenshot({ path: outPath, type: "png" });
  await page.close();
  console.log(`✅ ${slide.name}.png → ${outPath}`);
  await browser.close();
})();
