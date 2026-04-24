const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const OUT = "c:/Users/user/Desktop/kokmani-insta/promo";
fs.mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1080;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');`;
const BASE = `${FONT}*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1080px;overflow:hidden;}body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;}`;

const slides = [

// ── 슬라이드 1: 메인 훅 ──────────────────────────────────────────────────
{ name: "01_hook", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#0F172A;display:flex;flex-direction:column;justify-content:center;
  align-items:center;padding:80px;}
.badge{background:rgba(56,189,248,0.12);border:1.5px solid rgba(56,189,248,0.3);
  color:#38BDF8;font-size:20px;font-weight:900;padding:10px 28px;border-radius:999px;
  letter-spacing:2px;margin-bottom:48px;}
.title{font-size:72px;font-weight:900;color:#fff;line-height:1.15;text-align:center;}
.title em{color:#38BDF8;font-style:normal;display:block;}
.sub{margin-top:32px;font-size:26px;color:#64748B;text-align:center;line-height:1.6;}
.sub strong{color:#94A3B8;}
.pills{display:flex;gap:16px;margin-top:56px;flex-wrap:wrap;justify-content:center;}
.pill{background:#1E293B;border:1.5px solid #334155;border-radius:999px;
  padding:14px 28px;font-size:20px;font-weight:700;color:#CBD5E1;}
.pill span{margin-right:8px;}
.brand{position:absolute;bottom:48px;font-size:19px;font-weight:900;
  color:#334155;letter-spacing:2px;}
</style></head><body>
  <div class="badge">배드민턴 동호회 관리</div>
  <div class="title">카톡·엑셀 말고<br><em>콕매니저</em>로</div>
  <div class="sub">회원 등록부터 대진표까지<br><strong>클릭 몇 번으로 끝</strong></div>
  <div class="pills">
    <div class="pill"><span>👥</span>회원 관리</div>
    <div class="pill"><span>🏸</span>자동 대진표</div>
    <div class="pill"><span>💰</span>회비 관리</div>
    <div class="pill"><span>📅</span>일정 관리</div>
  </div>
  <div class="brand">cockmanager.kr</div>
</body></html>` },

// ── 슬라이드 2: 회원 관리 ────────────────────────────────────────────────
{ name: "02_members", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#F0F9FF;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:68px 72px;}
.top{text-align:center;}
.num{font-size:18px;font-weight:900;color:#BAE6FD;letter-spacing:3px;margin-bottom:16px;}
.title{font-size:54px;font-weight:900;color:#0F172A;line-height:1.2;}
.title em{color:#0284C7;font-style:normal;}
.desc{margin-top:14px;font-size:22px;color:#64748B;line-height:1.6;}
.cards{display:flex;flex-direction:column;gap:16px;width:100%;}
.card{background:#fff;border-radius:24px;padding:28px 32px;display:flex;align-items:center;
  gap:24px;border:1.5px solid #BAE6FD;box-shadow:0 4px 20px rgba(2,132,199,0.07);}
.icon{width:64px;height:64px;border-radius:18px;display:flex;align-items:center;
  justify-content:center;font-size:30px;flex-shrink:0;}
.i1{background:#E0F2FE;}.i2{background:#DCFCE7;}.i3{background:#EDE9FE;}
.card-text{}
.card-title{font-size:22px;font-weight:900;color:#0F172A;margin-bottom:6px;}
.card-desc{font-size:17px;color:#64748B;line-height:1.5;}
.card-tag{display:inline-block;margin-top:8px;font-size:13px;font-weight:900;
  padding:4px 12px;border-radius:999px;background:#E0F2FE;color:#0284C7;}
.bottom{background:#0284C7;border-radius:20px;padding:20px 32px;width:100%;text-align:center;}
.bottom-txt{font-size:20px;color:#fff;font-weight:700;}
</style></head><body>
  <div class="top">
    <div class="num">FEATURE 01</div>
    <div class="title">회원 관리,<br>이제 <em>자동</em>으로</div>
    <div class="desc">엑셀 대신 링크 하나로 전부 해결</div>
  </div>
  <div class="cards">
    <div class="card">
      <div class="icon i1">🔗</div>
      <div class="card-text">
        <div class="card-title">가입 링크 자동 발급</div>
        <div class="card-desc">링크 하나만 공유하면 회원이<br>직접 이름·연락처·급수를 입력해요</div>
        <div class="card-tag">수동 입력 0회</div>
      </div>
    </div>
    <div class="card">
      <div class="icon i2">📊</div>
      <div class="card-text">
        <div class="card-title">급수·성별·회비 한눈에</div>
        <div class="card-desc">전체 회원 현황을 표로 관리하고<br>납부·미납 현황도 자동 집계</div>
        <div class="card-tag">엑셀 정리 필요 없음</div>
      </div>
    </div>
    <div class="card">
      <div class="icon i3">🔔</div>
      <div class="card-text">
        <div class="card-title">신규 가입 즉시 알림</div>
        <div class="card-desc">새 회원 가입하면 관리자에게<br>실시간 알림이 가요</div>
        <div class="card-tag">놓치는 신청 없음</div>
      </div>
    </div>
  </div>
  <div class="bottom">
    <div class="bottom-txt">회원 100명도 링크 하나로 관리 🏸</div>
  </div>
</body></html>` },

// ── 슬라이드 3: 자동 대진표 ─────────────────────────────────────────────
{ name: "03_bracket", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#0F172A;display:flex;flex-direction:column;justify-content:space-between;
  align-items:center;padding:68px 72px;}
.top{text-align:center;}
.num{font-size:18px;font-weight:900;color:#A78BFA;letter-spacing:3px;margin-bottom:16px;}
.title{font-size:54px;font-weight:900;color:#fff;line-height:1.2;}
.title em{color:#A78BFA;font-style:normal;}
.desc{margin-top:14px;font-size:22px;color:#64748B;line-height:1.6;}
.before-after{display:flex;gap:20px;width:100%;}
.col{flex:1;border-radius:24px;overflow:hidden;}
.col-head{padding:18px;text-align:center;font-size:17px;font-weight:900;letter-spacing:1px;}
.col.before .col-head{background:#1E293B;color:#64748B;}
.col.after .col-head{background:#4C1D95;color:#DDD6FE;}
.col-body{padding:20px 18px;display:flex;flex-direction:column;gap:10px;}
.col.before .col-body{background:#0F172A;border:1.5px solid #1E293B;border-top:none;border-radius:0 0 24px 24px;}
.col.after .col-body{background:#1E1040;border:1.5px solid #4C1D95;border-top:none;border-radius:0 0 24px 24px;}
.step{border-radius:12px;padding:14px 16px;font-size:16px;font-weight:700;}
.col.before .step{background:#1E293B;color:#475569;}
.col.after .step{background:#2D1B69;color:#C4B5FD;display:flex;align-items:center;gap:8px;}
.check{font-size:18px;}
.pain{background:#450A0A;border-radius:12px;padding:12px 16px;text-align:center;
  font-size:15px;font-weight:900;color:#FCA5A5;border:1.5px solid #991B1B;}
.win{background:#1E1040;border-radius:12px;padding:12px 16px;text-align:center;
  font-size:15px;font-weight:900;color:#A78BFA;border:1.5px solid #4C1D95;}
.bottom{background:linear-gradient(135deg,#7C3AED,#4C1D95);border-radius:20px;
  padding:24px 32px;width:100%;text-align:center;}
.bottom-txt{font-size:22px;color:#fff;font-weight:900;}
.bottom-sub{font-size:16px;color:#DDD6FE;margin-top:6px;}
</style></head><body>
  <div class="top">
    <div class="num">FEATURE 02</div>
    <div class="title">대진표,<br><em>자동</em>으로 뽑아드려요</div>
    <div class="desc">급수·성별 균형 자동 배분</div>
  </div>
  <div class="before-after">
    <div class="col before">
      <div class="col-head">❌ 기존 방식</div>
      <div class="col-body">
        <div class="step">참석 명단 카톡 취합</div>
        <div class="step">종이에 직접 적기</div>
        <div class="step">급수 맞춰 수동 배치</div>
        <div class="step">사진 찍어서 공유</div>
        <div class="pain">매번 30분 이상 소요 😮‍💨</div>
      </div>
    </div>
    <div class="col after">
      <div class="col-head">✅ 콕매니저</div>
      <div class="col-body">
        <div class="step"><span class="check">⚡</span>참석 인원 자동 집계</div>
        <div class="step"><span class="check">🎯</span>급수·성별 자동 균형</div>
        <div class="step"><span class="check">🔄</span>마음에 안 들면 재생성</div>
        <div class="step"><span class="check">📤</span>링크로 바로 공유</div>
        <div class="win">클릭 한 번으로 완성 ⚡</div>
      </div>
    </div>
  </div>
  <div class="bottom">
    <div class="bottom-txt">더 이상 대진표로 스트레스받지 마세요</div>
    <div class="bottom-sub">콕매니저가 다 해드려요 🏸</div>
  </div>
</body></html>` },

// ── 슬라이드 4: CTA ──────────────────────────────────────────────────────
{ name: "04_cta", html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${BASE}
body{background:#F8FAFC;display:flex;flex-direction:column;justify-content:center;
  align-items:center;padding:80px;gap:0;}
.logo{font-size:32px;font-weight:900;color:#0F172A;letter-spacing:1px;
  display:flex;align-items:center;gap:12px;margin-bottom:48px;}
.logo-icon{width:72px;height:72px;background:#0284C7;border-radius:20px;
  display:flex;align-items:center;justify-content:center;font-size:36px;}
.headline{font-size:58px;font-weight:900;color:#0F172A;text-align:center;line-height:1.2;margin-bottom:20px;}
.headline em{color:#0284C7;font-style:normal;}
.sub{font-size:22px;color:#64748B;text-align:center;line-height:1.6;margin-bottom:52px;}
.features{display:flex;gap:20px;margin-bottom:52px;}
.feat{background:#fff;border:1.5px solid #E2E8F0;border-radius:24px;
  padding:36px 24px;text-align:center;flex:1;box-shadow:0 4px 16px rgba(0,0,0,0.05);}
.feat-icon{font-size:44px;margin-bottom:14px;}
.feat-name{font-size:22px;font-weight:900;color:#0F172A;line-height:1.3;word-break:keep-all;}
.cta-box{background:#0284C7;border-radius:24px;padding:36px 60px;text-align:center;}
.cta-main{font-size:28px;font-weight:900;color:#fff;margin-bottom:8px;}
.cta-url{font-size:20px;color:#BAE6FD;font-weight:700;letter-spacing:1px;}
</style></head><body>
  <div class="logo">
    <div class="logo-icon">🏸</div>
    콕매니저
  </div>
  <div class="headline">지금 바로<br><em>무료로</em> 시작하세요</div>
  <div class="sub">회원 관리 · 자동 대진표 · 회비 관리 · 일정 관리<br>배드민턴 클럽/소모임 운영의 모든 것</div>
  <div class="features">
    <div class="feat"><div class="feat-icon">👥</div><div class="feat-name">회원<br>관리</div></div>
    <div class="feat"><div class="feat-icon">🏸</div><div class="feat-name">자동<br>대진표</div></div>
    <div class="feat"><div class="feat-icon">💰</div><div class="feat-name">회비<br>관리</div></div>
    <div class="feat"><div class="feat-icon">📅</div><div class="feat-name">일정<br>관리</div></div>
  </div>
  <div class="cta-box">
    <div class="cta-main">지금 바로 시작해보세요</div>
    <div class="cta-url">cockmanager.kr</div>
  </div>
</body></html>` },

];

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });

  for (const slide of slides) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    await page.setContent(slide.html, { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, 1200));
    const outPath = path.join(OUT, `${slide.name}.png`);
    await page.screenshot({ path: outPath, type: "png" });
    await page.close();
    console.log(`✅ ${slide.name}.png`);
  }

  await browser.close();
  console.log(`\n🎉 완료! 저장 위치: ${OUT}`);
})();
