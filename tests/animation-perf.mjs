/**
 * Animation performance test using CDP frame capture.
 * Measures FPS and dropped frames during scroll through the blog post.
 *
 * Usage: node tests/animation-perf.mjs [url]
 * Default URL: http://localhost:4321/posts/01-protondb-compatibility-ml-x-claude
 */

import { chromium } from "playwright";

const URL =
  process.argv[2] ||
  "http://localhost:4321/posts/01-protondb-compatibility-ml-x-claude";

const TARGET_FPS = 60;
const DROPPED_FRAME_THRESHOLD = 0.1; // 10%
const SCROLL_DURATION_MS = 6000;
const SCROLL_STEP_PX = 3;
const SCROLL_INTERVAL_MS = 16; // ~60fps scroll rate

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Enable performance tracing via CDP
  await client.send("Performance.enable");

  // Collect frame timestamps using requestAnimationFrame
  await page.evaluate(() => {
    window.__frames = [];
    window.__loafs = [];

    // Frame counter
    function recordFrame() {
      window.__frames.push(performance.now());
      if (window.__recording) requestAnimationFrame(recordFrame);
    }
    window.__recording = true;
    requestAnimationFrame(recordFrame);

    // Long Animation Frame observer
    if ("PerformanceObserver" in window) {
      try {
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__loafs.push({
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
        obs.observe({ type: "long-animation-frame", buffered: true });
      } catch (e) {
        // LoAF not supported in this browser
      }
    }
  });

  // Get total scroll height
  const scrollHeight = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );

  console.log(`\n📏 Page scroll height: ${scrollHeight}px`);
  console.log(`🎯 Target: >${TARGET_FPS * (1 - DROPPED_FRAME_THRESHOLD)} FPS avg, <${DROPPED_FRAME_THRESHOLD * 100}% dropped frames`);
  console.log(`📜 Scrolling ${scrollHeight}px over ~${SCROLL_DURATION_MS}ms...\n`);

  // Smooth scroll through the entire page
  const steps = Math.ceil(SCROLL_DURATION_MS / SCROLL_INTERVAL_MS);
  const pxPerStep = scrollHeight / steps;

  const scrollStart = Date.now();

  for (let i = 0; i < steps; i++) {
    await page.evaluate((px) => window.scrollBy(0, px), pxPerStep);
    await page.waitForTimeout(SCROLL_INTERVAL_MS);
  }

  const scrollEnd = Date.now();
  const actualScrollDuration = scrollEnd - scrollStart;

  // Stop recording
  await page.evaluate(() => {
    window.__recording = false;
  });

  // Collect results
  const frames = await page.evaluate(() => window.__frames);
  const loafs = await page.evaluate(() => window.__loafs);
  const perfMetrics = await client.send("Performance.getMetrics");

  await browser.close();

  // Analyze frames
  if (frames.length < 2) {
    console.error("❌ Not enough frames captured");
    process.exit(1);
  }

  const frameDurations = [];
  for (let i = 1; i < frames.length; i++) {
    frameDurations.push(frames[i] - frames[i - 1]);
  }

  const avgFrameTime =
    frameDurations.reduce((a, b) => a + b, 0) / frameDurations.length;
  const avgFPS = 1000 / avgFrameTime;
  const minFrameTime = Math.min(...frameDurations);
  const maxFrameTime = Math.max(...frameDurations);
  const minFPS = 1000 / maxFrameTime;
  const maxFPS = 1000 / minFrameTime;

  // Dropped frames: any frame taking > 1.5x expected frame time (25ms at 60fps)
  const expectedFrameTime = 1000 / TARGET_FPS;
  const droppedThreshold = expectedFrameTime * 1.5;
  const droppedFrames = frameDurations.filter((d) => d > droppedThreshold);
  const droppedPct = droppedFrames.length / frameDurations.length;

  // Jank: frames > 50ms
  const jankFrames = frameDurations.filter((d) => d > 50);

  // P95 frame time
  const sorted = [...frameDurations].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  // Long Animation Frames
  const loafDuring = loafs.filter(
    (l) => l.duration > 50
  );

  // Results
  console.log("═══════════════════════════════════════");
  console.log("  ANIMATION PERFORMANCE REPORT");
  console.log("═══════════════════════════════════════\n");

  console.log(`  Scroll duration:    ${actualScrollDuration}ms`);
  console.log(`  Total frames:       ${frames.length}`);
  console.log(`  Frame durations:    ${frameDurations.length}\n`);

  console.log("  FPS");
  console.log(`    Average:          ${avgFPS.toFixed(1)}`);
  console.log(`    Min:              ${minFPS.toFixed(1)}`);
  console.log(`    Max:              ${maxFPS.toFixed(1)}\n`);

  console.log("  Frame time (ms)");
  console.log(`    Average:          ${avgFrameTime.toFixed(2)}`);
  console.log(`    P50:              ${p50.toFixed(2)}`);
  console.log(`    P95:              ${p95.toFixed(2)}`);
  console.log(`    P99:              ${p99.toFixed(2)}`);
  console.log(`    Max:              ${maxFrameTime.toFixed(2)}\n`);

  console.log("  Dropped frames");
  console.log(
    `    Count:            ${droppedFrames.length} / ${frameDurations.length}`
  );
  console.log(`    Percentage:       ${(droppedPct * 100).toFixed(1)}%`);
  console.log(`    Threshold:        >${droppedThreshold.toFixed(1)}ms\n`);

  console.log("  Jank (>50ms frames)");
  console.log(`    Count:            ${jankFrames.length}`);
  if (jankFrames.length > 0) {
    console.log(
      `    Worst:            ${Math.max(...jankFrames).toFixed(1)}ms`
    );
  }

  console.log(`\n  Long Animation Frames (LoAF > 50ms)`);
  console.log(`    Count:            ${loafDuring.length}`);
  if (loafDuring.length > 0) {
    console.log(
      `    Worst:            ${Math.max(...loafDuring.map((l) => l.duration)).toFixed(1)}ms`
    );
  }

  // CDP metrics
  const jsHeap = perfMetrics.metrics.find(
    (m) => m.name === "JSHeapUsedSize"
  );
  if (jsHeap) {
    console.log(
      `\n  JS Heap:            ${(jsHeap.value / 1024 / 1024).toFixed(1)} MB`
    );
  }

  console.log("\n═══════════════════════════════════════");

  // Pass/Fail
  const passed = droppedPct <= DROPPED_FRAME_THRESHOLD;
  if (passed) {
    console.log(
      `  ✅ PASS — ${(droppedPct * 100).toFixed(1)}% dropped (threshold: ${DROPPED_FRAME_THRESHOLD * 100}%)`
    );
  } else {
    console.log(
      `  ❌ FAIL — ${(droppedPct * 100).toFixed(1)}% dropped (threshold: ${DROPPED_FRAME_THRESHOLD * 100}%)`
    );
  }
  console.log("═══════════════════════════════════════\n");

  process.exit(passed ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
