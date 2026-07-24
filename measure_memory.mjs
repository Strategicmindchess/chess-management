import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import http from 'node:http';

const execAsync = promisify(exec);

async function getProcessMemory(pid) {
  try {
    const { stdout } = await execAsync(`powershell -Command "(Get-Process -Id ${pid}).WorkingSet"`);
    const memoryBytes = parseInt(stdout.trim(), 10);
    return memoryBytes / 1024 / 1024; // Convert to MB
  } catch (err) {
    return null;
  }
}

async function makeRequest(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      res.on('data', () => {}); // Consume data
      res.on('end', () => resolve(res.statusCode));
    }).on('error', (err) => resolve(err.message));
  });
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTest() {
  console.log("🚀 Starting Next.js Production Server with --max-old-space-size=256...");
  
  const server = spawn('node', [
    '--max-old-space-size=256', 
    './node_modules/next/dist/bin/next', 
    'start', 
    '-p', '3000'
  ], { 
    env: { ...process.env, PORT: '3000' },
    stdio: 'pipe',
    shell: true
  });

  const pid = server.pid;
  console.log(`Server started with PID: ${pid}`);

  server.stdout.on('data', (data) => {
    // console.log(data.toString()); // Uncomment for debugging
  });

  server.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  // Wait for server to boot up
  console.log("⏳ Waiting 5 seconds for server to initialize...");
  await delay(5000);

  const initialMem = await getProcessMemory(pid);
  console.log(`📊 Initial idle memory: ${initialMem?.toFixed(2)} MB`);

  console.log("🔥 Firing 100 concurrent requests to simulate 100 users...");
  const targetUrl = 'http://localhost:3000/login'; // Public route
  
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(makeRequest(targetUrl));
  }

  const start = Date.now();
  const results = await Promise.all(promises);
  const duration = Date.now() - start;

  const successCount = results.filter(r => r === 200).length;
  console.log(`✅ Completed in ${duration}ms. Success: ${successCount}/100`);

  const loadMem = await getProcessMemory(pid);
  console.log(`📊 Memory under 100-user load: ${loadMem?.toFixed(2)} MB`);

  // Check memory after GC/idle
  console.log("⏳ Waiting 10 seconds for garbage collection...");
  await delay(10000);
  
  const finalMem = await getProcessMemory(pid);
  console.log(`📊 Final idle memory after load: ${finalMem?.toFixed(2)} MB`);

  // Kill server
  console.log("🛑 Stopping server...");
  server.kill();
  process.exit(0);
}

runTest();
