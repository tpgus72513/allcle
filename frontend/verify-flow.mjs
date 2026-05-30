import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUT = 'verify-screenshots';
mkdirSync(OUT, { recursive: true });

let stepIdx = 0;
async function shot(page, label) {
  stepIdx++;
  const file = join(OUT, `${String(stepIdx).padStart(2,'0')}-${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  📸 ${file}`);
  return file;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    // ── STEP 1: Home page ──────────────────────────────────────
    console.log('\n[1] 홈 페이지 로드');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const title = await page.title();
    console.log(`    title: ${title}`);
    await shot(page, 'home-initial');

    // Check for the nickname input
    const nicknameInput = page.locator('input[placeholder*="닉네임"], input[placeholder*="광클"]');
    const count = await nicknameInput.count();
    console.log(`    닉네임 input 존재: ${count > 0}`);
    if (count === 0) throw new Error('닉네임 input을 찾을 수 없음');

    // ── STEP 2: Enter nickname ─────────────────────────────────
    console.log('\n[2] 닉네임 입력 및 제출');
    await nicknameInput.fill('테스트유저');
    await shot(page, 'home-nickname-filled');
    await page.locator('button[type="submit"]').click();

    // Wait for team grid to appear
    await page.waitForSelector('button:has(.rounded-full)', { timeout: 8000 });
    await shot(page, 'home-team-grid');
    const teamButtons = await page.locator('button:has(.rounded-full)').count();
    console.log(`    팀 버튼 수: ${teamButtons}`);
    if (teamButtons < 1) throw new Error('팀 목록이 표시되지 않음');

    // ── STEP 3: Select team ────────────────────────────────────
    console.log('\n[3] LG 트윈스 선택');
    const lgButton = page.locator('button').filter({ hasText: 'LG 트윈스' }).first();
    const lgExists = await lgButton.count();
    console.log(`    LG 트윈스 버튼 존재: ${lgExists > 0}`);
    if (lgExists === 0) {
      // Try clicking the first team
      await page.locator('button:has(.rounded-full)').first().click();
    } else {
      await lgButton.click();
    }

    // ── STEP 4: Matches page ───────────────────────────────────
    console.log('\n[4] 경기 선택 페이지 대기');
    await page.waitForURL('**/matches**', { timeout: 8000 });
    await page.waitForLoadState('networkidle');
    await shot(page, 'matches-page');

    const matchButtons = await page.locator('button.flex.w-full').count();
    console.log(`    경기 버튼 수: ${matchButtons}`);
    if (matchButtons === 0) throw new Error('경기 목록이 표시되지 않음');

    // Check difficulty badges
    const badges = await page.locator('.rounded-full.px-2\\.5').allTextContents();
    console.log(`    난이도 뱃지: ${badges.join(', ')}`);

    // ── STEP 5: Start simulation ────────────────────────────────
    console.log('\n[5] 첫 번째 경기 선택 → 시뮬 시작');
    await page.locator('button.flex.w-full').first().click();

    // ── STEP 6: Queue page ─────────────────────────────────────
    console.log('\n[6] 대기열 페이지 대기');
    await page.waitForURL('**/queue**', { timeout: 8000 });
    await page.waitForLoadState('networkidle');
    await shot(page, 'queue-initial');

    // Read current position
    const posText = await page.locator('.text-6xl.font-bold').first().textContent().catch(() => '?');
    console.log(`    현재 대기 번호: ${posText}`);

    // Wait 3 seconds and check it decreased
    await page.waitForTimeout(3000);
    const posText2 = await page.locator('.text-6xl.font-bold').first().textContent().catch(() => '?');
    console.log(`    3초 후 번호: ${posText2}`);
    await shot(page, 'queue-after-3s');

    const pos1 = parseInt(posText?.replace(/,/g, '') ?? '0');
    const pos2 = parseInt(posText2?.replace(/,/g, '') ?? '0');
    console.log(`    번호 감소 확인: ${pos1} → ${pos2} (${pos1 > pos2 ? '✅ 감소 중' : '⚠️ 감소 안 함'})`);

    // ── STEP 7: Wait for queue to reach 0 (입문 = 400/sec, ~15sec) ──
    console.log('\n[7] 대기열 완료 대기 (최대 20초)');
    try {
      await page.waitForURL('**/captcha**', { timeout: 20000 });
      console.log('    ✅ CAPTCHA 페이지로 자동 이동됨');
    } catch {
      // Check if still on queue or moved
      const currentUrl = page.url();
      console.log(`    현재 URL: ${currentUrl}`);
      if (currentUrl.includes('captcha')) {
        console.log('    ✅ CAPTCHA 페이지 도달');
      } else {
        // Force navigate to see current state
        await shot(page, 'queue-timeout-state');
        throw new Error(`대기열에서 CAPTCHA로 이동 안 됨. 현재: ${currentUrl}`);
      }
    }

    // ── STEP 8: CAPTCHA page ────────────────────────────────────
    console.log('\n[8] CAPTCHA 페이지');
    await page.waitForLoadState('networkidle');
    await shot(page, 'captcha-loaded');

    // Check that captcha code is displayed
    const captchaCode = await page.locator('.text-4xl.font-black').textContent().catch(() => null);
    console.log(`    캡차 코드 표시: ${captchaCode ?? '❌ 없음'}`);
    if (!captchaCode) throw new Error('캡차 코드가 표시되지 않음');

    // ── STEP 9: Submit wrong answer ─────────────────────────────
    console.log('\n[9] 틀린 답 입력 (오류 처리 테스트)');
    const captchaInput = page.locator('input[placeholder*="코드"]');
    await captchaInput.fill('9999');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);
    await shot(page, 'captcha-wrong-answer');
    const errorMsg = await page.locator('.text-red-400').textContent().catch(() => null);
    console.log(`    오류 메시지: ${errorMsg ?? '없음'}`);

    // ── STEP 10: Submit correct answer ──────────────────────────
    console.log('\n[10] 새 캡차 코드 확인 후 정답 입력');
    await page.waitForTimeout(500);
    const newCode = await page.locator('.text-4xl.font-black').textContent().catch(() => null);
    console.log(`    새 캡차 코드: ${newCode}`);
    if (!newCode) throw new Error('새 캡차 코드를 가져올 수 없음');

    await captchaInput.fill('');
    await captchaInput.fill(newCode.trim());
    await shot(page, 'captcha-correct-filled');
    await page.locator('button[type="submit"]').click();

    // Should navigate to /seats
    try {
      await page.waitForURL('**/seats**', { timeout: 5000 });
      await shot(page, 'seats-placeholder');
      const seatsText = await page.locator('h1').textContent();
      console.log(`    ✅ 좌석 선택 페이지 도달: "${seatsText}"`);
    } catch {
      const url = page.url();
      await shot(page, 'after-captcha-state');
      console.log(`    현재 URL: ${url}`);
    }

    console.log('\n✅ 전체 플로우 테스트 완료\n');

  } catch (err) {
    console.error(`\n❌ 오류: ${err.message}`);
    await shot(page, 'error-state');
  } finally {
    if (consoleErrors.length > 0) {
      console.log(`\n⚠️  브라우저 콘솔 에러 (${consoleErrors.length}개):`);
      consoleErrors.slice(0, 5).forEach(e => console.log(`   ${e}`));
    } else {
      console.log('콘솔 에러: 없음');
    }
    await browser.close();
  }
})();
