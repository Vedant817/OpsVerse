#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.UI_SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const chromePath =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const viewports = [
  { label: "desktop", width: 1440, height: 1000 },
  { label: "mobile", width: 390, height: 900 },
];
const pages = [
  {
    path: "/",
    expectedText: [
      "OpsVerse - Multimodal Incident Swarm for Enterprise Apps",
      "Run Demo Incident",
      "Upload Evidence",
    ],
  },
  {
    path: "/incident",
    expectedText: ["Incident Intake", "Video or frame upload", "Run Incident Swarm"],
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDevToolsPort(userDataDir) {
  const portFile = join(userDataDir, "DevToolsActivePort");

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const [port] = readFileSync(portFile, "utf8").trim().split("\n");
      if (port) return port;
    } catch {
      await sleep(100);
    }
  }

  throw new Error("Chrome did not expose a DevTools port.");
}

async function httpJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  return response.json();
}

function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  const events = [];

  socket.addEventListener("message", (message) => {
    const payload = JSON.parse(String(message.data));
    if (payload.id && pending.has(payload.id)) {
      const { resolve, reject } = pending.get(payload.id);
      pending.delete(payload.id);
      if (payload.error) {
        reject(new Error(payload.error.message));
      } else {
        resolve(payload.result);
      }
      return;
    }

    if (payload.method) {
      events.push(payload);
    }
  });

  function send(method, params = {}) {
    const id = nextId;
    nextId += 1;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
  }

  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve({ send, events, socket }), {
      once: true,
    });
    socket.addEventListener("error", () => reject(new Error("CDP WebSocket failed.")), {
      once: true,
    });
  });
}

async function waitForLoad(cdp) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (cdp.events.some((event) => event.method === "Page.loadEventFired")) {
      return;
    }
    await sleep(100);
  }

  throw new Error("Page load timed out.");
}

async function pageMetrics(cdp) {
  const evaluation = await cdp.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
      const clientWidth = doc.clientWidth;
      return {
        href: location.href,
        readyState: document.readyState,
        title: document.title,
        bodyText: body.innerText,
        scrollWidth,
        clientWidth,
        overflowX: scrollWidth > clientWidth + 1
      };
    })()`,
  });

  return evaluation.result.value;
}

async function waitForExpectedText(cdp, expectedText) {
  let lastValue = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    lastValue = await pageMetrics(cdp);
    if (
      lastValue.readyState === "complete" &&
      expectedText.every((text) => lastValue.bodyText.includes(text))
    ) {
      return lastValue;
    }
    await sleep(100);
  }

  return lastValue ?? (await pageMetrics(cdp));
}

async function verifyPage(cdp, { path, expectedText }, viewport) {
  cdp.events.length = 0;
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 700,
  });
  await cdp.send("Page.navigate", { url: `${baseUrl}${path}` });
  await waitForLoad(cdp);
  const value = await waitForExpectedText(cdp, expectedText);
  const errors = cdp.events.filter(
    (event) =>
      event.method === "Runtime.exceptionThrown" ||
      (event.method === "Runtime.consoleAPICalled" &&
        event.params?.type === "error"),
  );
  const missingText = expectedText.filter((text) => !value.bodyText.includes(text));

  if (missingText.length > 0 || value.overflowX || errors.length > 0) {
    throw new Error(
      [
        `${viewport.label} ${path} failed`,
        `href: ${value.href}`,
        `title: ${value.title}`,
        missingText.length ? `missing text: ${missingText.join(", ")}` : "",
        value.overflowX
          ? `horizontal overflow: scrollWidth ${value.scrollWidth}, clientWidth ${value.clientWidth}`
          : "",
        errors.length ? `console/runtime errors: ${errors.length}` : "",
        `body sample: ${value.bodyText.slice(0, 180).replace(/\s+/g, " ")}`,
      ]
        .filter(Boolean)
        .join("; "),
    );
  }

  console.log(
    `PASS ${viewport.label} ${path} width=${value.clientWidth} scroll=${value.scrollWidth}`,
  );
}

async function main() {
  const userDataDir = mkdtempSync(join(tmpdir(), "opsverse-chrome-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-component-extensions-with-background-pages",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ]);

  try {
    chrome.stderr.on("data", () => {});
    const port = await waitForDevToolsPort(userDataDir);
    const targets = await httpJson(`http://127.0.0.1:${port}/json/list`);
    const target = targets.find((candidate) => candidate.type === "page");
    if (!target) {
      throw new Error("Chrome did not expose a page target.");
    }
    const cdp = await connectCdp(target.webSocketDebuggerUrl);
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");

    for (const viewport of viewports) {
      for (const page of pages) {
        await verifyPage(cdp, page, viewport);
      }
    }

    cdp.socket.close();
  } finally {
    chrome.kill("SIGTERM");
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        break;
      } catch (error) {
        if (attempt === 9) {
          throw error;
        }
        await sleep(100);
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
