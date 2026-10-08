import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = `${process.env.TEMP}\\schedule-share-en-capture-${process.pid}`;
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=9229",
    `--user-data-dir=${profile}`,
    "http://localhost:8082/"
  ],
  { stdio: "ignore", windowsHide: true }
);
let socket;
try {
  let target;
  for (let i = 0; i < 50; i++) {
    try {
      const pages = await (await fetch("http://127.0.0.1:9229/json/list")).json();
      target = pages.find((item) => item.type === "page");
      if (target) break;
    } catch {}
    await delay(200);
  }
  if (!target) throw new Error("Headless Chrome did not start");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const item = pending.get(message.id);
    pending.delete(message.id);
    message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result);
  });
  const cdp = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const requestId = ++id;
      pending.set(requestId, { resolve, reject });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await cdp("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true
  });
  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await delay(2400);
  const output = "C:\\Users\\hitomi\\Desktop\\dev\\scheduleshare\\apps\\mobile\\screenshots";
  await mkdir(output, { recursive: true });
  const capture = async (name) => {
    await evaluate("document.activeElement?.blur()");
    const shot = await cdp("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: 390, height: 790, scale: 1 }
    });
    await writeFile(`${output}\\${name}`, Buffer.from(shot.data, "base64"));
  };
  await evaluate(
    `(() => [...document.querySelectorAll('[tabindex="0"]')].find(e => e.innerText?.includes('EN'))?.click())()`
  );
  console.log(
    "Initial screen:",
    (await evaluate("document.body.innerText")).slice(0, 250).replace(/\n/g, " | ")
  );
  await evaluate(
    `(() => { const input=document.querySelector('input'); if(!input) throw new Error('Share input is missing'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; if(!set) throw new Error('Input setter is missing'); set.call(input,'demo-mobile'); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); [...document.querySelectorAll('[tabindex="0"]')].find(e=>e.innerText?.trim()==='Open schedule')?.click(); })()`
  );
  await delay(700);
  console.log(
    "Join result:",
    (await evaluate("document.body.innerText")).slice(0, 180).replace(/\n/g, " | ")
  );
  if (await evaluate("document.body.innerText.includes('Mark your availability')")) {
    await evaluate(
      `(() => [...document.querySelectorAll('[tabindex="0"]')].find(e=>e.innerText?.includes('My schedules / Join another'))?.click())()`
    );
    await delay(200);
  }
  await capture("03-my-schedules-demo.png");
  await evaluate(
    `(() => [...document.querySelectorAll('*')].find(e=>e.textContent?.trim()==='Open ›')?.click())()`
  );
  await delay(450);
  await evaluate(
    `(() => { const name=document.querySelector('input[placeholder="Display name"]'); if(name){const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(name,'Toni'); name.dispatchEvent(new Event('input',{bubbles:true})); name.dispatchEvent(new Event('change',{bubbles:true}));} for(const time of ['09:30','10:00']) [...document.querySelectorAll('[tabindex="0"]')].find(e=>e.innerText?.includes(time))?.click(); })()`
  );
  console.log(
    "Grid labels:",
    (await evaluate("document.body.innerText")).slice(0, 420).replace(/\n/g, " | ")
  );
  await capture("01-availability-grid-demo.png");
  await evaluate(
    `(() => [...document.querySelectorAll('[tabindex="0"]')].find(e=>e.innerText?.trim()==='Submit availability')?.click())()`
  );
  await delay(700);
  console.log(
    "Results labels:",
    (await evaluate("document.body.innerText")).slice(-500).replace(/\n/g, " | ")
  );
  await evaluate(
    `(() => { const el=[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+80).sort((a,b)=>b.clientHeight-a.clientHeight)[0]; if(el) el.scrollTop=el.scrollHeight; })()`
  );
  await delay(150);
  await capture("02-common-free-results-demo.png");
} finally {
  try {
    socket?.close();
  } catch {}
  spawn("taskkill", ["/PID", String(chrome.pid), "/T", "/F"], {
    stdio: "ignore",
    windowsHide: true
  });
  await delay(400);
  await rm(profile, { recursive: true, force: true });
}
