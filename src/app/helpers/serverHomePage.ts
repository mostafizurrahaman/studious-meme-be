// /* eslint-disable no-console */
// import fs from 'fs';
// import path from 'path';
// import os from 'os';
// import osUtils from 'os-utils';
// import dotenv from 'dotenv';
// import config from '../config';
// dotenv.config();

// // (4)
// const logsDir = path.join(process.cwd(), 'logs');
// const responseLogFilePath = path.join(logsDir, 'ResponseTime.log');
// const errorLogFilePath = path.join(logsDir, 'Error.log');

// interface ErrorLogEntry {
//   timestamp: string;
//   method: string;
//   statusCode: string;
//   message: string;
//   errorPath: string;
//   stack: string;
// }

// interface ResponseLogEntry {
//   timestamp: string;
//   route: string;
//   method: string;
//   responseTime: number;
//   label: 'Low' | 'Medium' | 'High';
// }

// function readLogFile(): {
//   errorLogs: ErrorLogEntry[];
//   responseTimeLogs: ResponseLogEntry[];
// } {
//   const errorLogs: ErrorLogEntry[] = [];
//   const responseTimeLogs: ResponseLogEntry[] = [];

//   try {
//     const responseLogData = fs.readFileSync(responseLogFilePath, 'utf8');

//     // Robustly handle multiple JSON objects on the same line or concatenated
//     const normalizedData = responseLogData.replace(/\}[\s]*\{/g, '}\n{');

//     normalizedData.split('\n').forEach((entry) => {
//       if (!entry.trim()) return;
//       try {
//         const log = JSON.parse(entry);
//         if (log.responseTime) {
//           const responseTime = parseFloat(log.responseTime);
//           const label =
//             responseTime > 2000
//               ? 'High'
//               : responseTime > 1000
//                 ? 'Medium'
//                 : 'Low';

//           responseTimeLogs.push({
//             timestamp: new Date(log.timestamp).toLocaleString(),
//             route: log.url || 'N/A',
//             method: log.method || 'N/A',
//             responseTime,
//             label,
//           });
//         }
//       } catch (err) {
//         console.error('Error parsing response time log entry:', err);
//       }
//     });
//   } catch (err) {
//     console.error('Error reading response time log file:', err);
//   }

//   try {
//     const errorLogData = fs.readFileSync(errorLogFilePath, 'utf8');

//     // Robustly handle multiple JSON objects on the same line or concatenated
//     const normalizedErrorData = errorLogData.replace(/\}[\s]*\{/g, '}\n{');

//     normalizedErrorData.split('\n').forEach((entry) => {
//       if (!entry.trim()) return;
//       try {
//         const log = JSON.parse(entry);
//         if (
//           log.level === 'error' &&
//           !(log.url && log.url.includes('/favicon.ico'))
//         ) {
//           errorLogs.push({
//             timestamp: new Date(log.timestamp).toLocaleString(),
//             method: log.method || 'N/A',
//             statusCode: log.status || 'N/A',
//             message: log.message,
//             errorPath: log.url || 'N/A',
//             stack: log.stack || 'No stack trace available',
//           });
//         }
//       } catch (err) {
//         console.error('Error parsing error log entry:', err);
//       }
//     });
//   } catch (err) {
//     console.error('Error reading error log file:', err);
//   }

//   return {
//     errorLogs: errorLogs.reverse(),
//     responseTimeLogs: responseTimeLogs.reverse(),
//   };
// }

// async function generateCpuUsageHtml(): Promise<string> {
//   return new Promise((resolve) => {
//     osUtils.cpuUsage((usage: number) => {
//       const totalCores = os.cpus().length;
//       const cpuUsagePercentage = usage * 100;
//       const usedCores = Math.ceil((cpuUsagePercentage / 100) * totalCores);
//       const idleCores = totalCores - usedCores;

//       resolve(`
//         <div id="cpu-usage">
//           <h2>CPU Usage</h2>
//           <div class="cpu-stats">
//             <p><strong>Total Cores:</strong> ${totalCores}</p>
//             <p><strong>CPU Usage:</strong> ${cpuUsagePercentage.toFixed(2)}%</p>
//             <p><strong>Used Cores:</strong> ${usedCores}</p>
//             <p><strong>Idle Cores:</strong> ${idleCores}</p>
//           </div>
//         </div>
//       `);
//     });
//   });
// }

// function generateErrorLogTable(errorLogs: ErrorLogEntry[]): string {
//   if (errorLogs.length === 0) {
//     return '<p style="text-align: center; margin-top: 20px;">No error logs available.</p>';
//   }

//   let tableHtml = `
//     <table class="log-table">
//       <thead>
//         <tr>
//           <th>Timestamp</th>
//           <th>Method</th>
//           <th>Status</th>
//           <th>Message</th>
//           <th>Path</th>
//           <th>Stack Trace</th>
//         </tr>
//       </thead>
//       <tbody>
//   `;

//   errorLogs.forEach((log) => {
//     tableHtml += `
//       <tr>
//         <td>${log.timestamp}</td>
//         <td>${log.method}</td>
//         <td>${log.statusCode}</td>
//         <td>${log.message}</td>
//         <td>${log.errorPath}</td>
//         <td><div class="stack-trace">${log.stack}</div></td>
//       </tr>
//     `;
//   });

//   tableHtml += '</tbody></table>';
//   return tableHtml;
// }

// function generateResponseTimeTable(
//   responseTimeLogs: ResponseLogEntry[],
// ): string {
//   if (responseTimeLogs.length === 0) {
//     return '<p style="text-align: center; margin-top: 20px;">No response time logs available.</p>';
//   }

//   let tableHtml = `
//     <table class="response-table">
//       <thead>
//         <tr>
//           <th>Timestamp</th>
//           <th>Route</th>
//           <th>Method</th>
//           <th>Response Time (ms)</th>
//           <th>Status</th>
//         </tr>
//       </thead>
//       <tbody>
//   `;

//   responseTimeLogs.forEach((log) => {
//     const labelClass = `${log.label.toLowerCase()}-label`;
//     tableHtml += `
//       <tr>
//         <td>${log.timestamp}</td>
//         <td>${log.route}</td>
//         <td>${log.method}</td>
//         <td>${log.responseTime.toFixed(2)} ms</td>
//         <td><span class="${labelClass}">${log.label}</span></td>
//       </tr>
//     `;
//   });

//   tableHtml += '</tbody></table>';
//   return tableHtml;
// }

// async function serverHomePage(): Promise<string> {
//   const { errorLogs, responseTimeLogs } = readLogFile();

//   const errorLogTableHtml = generateErrorLogTable(errorLogs);
//   const responseTimeTableHtml = generateResponseTimeTable(responseTimeLogs);
//   // const errorLogTableHtml = '...';
//   // const responseTimeTableHtml = '...';
//   const cpuUsageHtml = await generateCpuUsageHtml();

//   return `
//   <!DOCTYPE html>
//   <html lang="en">
//     <head>
//       <meta charset="UTF-8" />
//       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//       <title>${config.preffered_website_name} Server</title>
//       <style>
//         @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');

//         @keyframes fadeIn {
//           from { opacity: 0; }
//           to { opacity: 1; }
//         }

//         @keyframes slideIn {
//           from { transform: translateY(-20px); opacity: 0; }
//           to { transform: translateY(0); opacity: 1; }
//         }

//         @keyframes pulse {
//           0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
//           70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
//           100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
//         }

//         @keyframes float {
//           0% { transform: translateY(0px); }
//           50% { transform: translateY(-10px); }
//           100% { transform: translateY(0px); }
//         }

//         @keyframes rotate {
//           from { transform: rotate(0deg); }
//           to { transform: rotate(360deg); }
//         }

//         @keyframes blink {
//           0%, 100% { opacity: 1; }
//           50% { opacity: 0.5; }
//         }

//         @keyframes growBar {
//           from { width: 0; }
//           to { width: var(--target-width); }
//         }

//         body {
//           font-family: 'Roboto', sans-serif;
//           background-color: #0F172A;
//           color: #E2E8F0;
//           display: flex;
//           justify-content: center;
//           align-items: center;
//           min-height: 100vh;
//           margin: 0;
//           background-image: url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80');
//           background-size: cover;
//           background-position: center;
//           background-attachment: fixed;
//           overflow-x: hidden;
//         }

//         .container {
//           width: 95%; /* Increased width */
//           max-width: 1400px; /* Increased max-width */
//           background: rgba(30, 41, 59, 0.8);
//           padding: 20px;
//           border-radius: 15px;
//           box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
//           display: none;
//           animation: fadeIn 0.5s ease-out;
//           backdrop-filter: blur(10px);
//           position: relative;
//           overflow: hidden;
//         }

//         .container::before {
//           content: '';
//           position: absolute;
//           top: -50%;
//           left: -50%;
//           width: 200%;
//           height: 200%;
//           background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(30, 41, 59, 0) 70%);
//           animation: rotate 20s linear infinite;
//           z-index: -1;
//         }

//         h1, h2 {
//           font-size: 2.2em;
//           color: #60A5FA;
//           text-align: center;
//           margin-bottom: 20px;
//           text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
//         }

//         .log-table, .response-table {
//           width: 100%;
//           border-collapse: separate;
//           border-spacing: 0 8px;
//           margin-top: 20px;
//         }

//         th, td {
//           padding: 12px;
//           border: none;
//           color: #E2E8F0;
//           background-color: rgba(45, 55, 72, 0.7);
//           transition: all 0.3s ease;
//         }

//         th {
//           background-color: rgba(59, 130, 246, 0.7);
//           font-weight: bold;
//           text-transform: uppercase;
//           letter-spacing: 1px;
//         }

//         tr {
//           transition: all 0.3s ease;
//         }

//         tr:hover {
//           transform: translateY(-2px);
//           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
//         }

//         tr:hover td {
//           background-color: rgba(55, 65, 81, 0.9);
//         }

//         .tabs {
//           display: flex;
//           justify-content: space-around;
//           background: rgba(45, 55, 72, 0.7);
//           border-radius: 12px;
//           overflow: hidden;
//           margin-top: 15px;
//           padding: 5px;
//           position: relative;
//         }

//         .tabs::before {
//           content: '';
//           position: absolute;
//           top: 0;
//           left: 0;
//           right: 0;
//           height: 2px;
//           background: linear-gradient(to right, #3B82F6, #60A5FA, #3B82F6);
//           animation: slideIn 1s ease-out;
//         }

//         .tabs button {
//           flex-grow: 1;
//           padding: 12px;
//           background: rgba(75, 85, 99, 0.7);
//           color: #E2E8F0;
//           border: none;
//           cursor: pointer;
//           transition: all 0.3s ease;
//           border-radius: 8px;
//           margin: 0 5px;
//           font-weight: bold;
//           position: relative;
//           overflow: hidden;
//         }

//         .tabs button::before {
//           content: '';
//           position: absolute;
//           top: -100%;
//           left: 0;
//           width: 100%;
//           height: 100%;
//           background: rgba(59, 130, 246, 0.2);
//           transition: all 0.3s ease;
//         }

//         .tabs button:hover::before {
//           top: 0;
//         }

//         .tabs button:hover, .tabs button.active {
//           background: rgba(59, 130, 246, 0.7);
//           transform: translateY(-2px);
//           box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
//         }

//         .tab-content {
//           display: none;
//           margin-top: 20px;
//           animation: slideIn 0.5s ease-out;
//         }

//         .tab-content.active {
//           display: block;
//         }

//         .high-label {
//           background-color: rgba(239, 68, 68, 0.2);
//           color: #EF4444;
//           padding: 4px 8px;
//           border-radius: 4px;
//           font-weight: bold;
//           animation: blink 2s infinite;
//         }

//         .medium-label {
//           background-color: rgba(245, 158, 11, 0.2);
//           color: #F59E0B;
//           padding: 4px 8px;
//           border-radius: 4px;
//           font-weight: bold;
//         }

//         .low-label {
//           background-color: rgba(16, 185, 129, 0.2);
//           color: #10B981;
//           padding: 4px 8px;
//           border-radius: 4px;
//           font-weight: bold;
//         }

//         .stack-trace, .log-trace {
//           max-height: 120px;
//           max-width: 500px !important;
//           overflow-y: auto;
//           white-space: pre-wrap;
//           word-wrap: break-word;
//           font-size: 0.9em;
//           background: rgba(55, 65, 81, 0.7);
//           padding: 10px;
//           border-radius: 8px;
//           color: #E2E8F0;
//           word-break: break-word;
//           margin-top: 10px;
//           box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
//           transition: all 0.3s ease;
//         }

//         .stack-trace:hover, .log-trace:hover {
//           max-height: 300px;
//         }

//         .login-container {
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           background-color: rgba(30, 41, 59, 0.8);
//           padding: 30px;
//           border-radius: 15px;
//           box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
//           text-align: center;
//           animation: fadeIn 0.5s ease-out, float 6s ease-in-out infinite;
//           backdrop-filter: blur(10px);
//           position: relative;
//           overflow: hidden;
//         }

//         .login-container::before {
//           content: '';
//           position: absolute;
//           top: -50%;
//           left: -50%;
//           width: 200%;
//           height: 200%;
//           background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(30, 41, 59, 0) 70%);
//           animation: rotate 20s linear infinite;
//           z-index: -1;
//         }

//         .login-container input {
//           padding: 12px;
//           margin: 10px 0;
//           border-radius: 8px;
//           border: 1px solid #4B5563;
//           width: 100%;
//           max-width: 300px;
//           background-color: rgba(45, 55, 72, 0.7);
//           color: #E2E8F0;
//           transition: all 0.3s ease;
//         }

//         .login-container input:focus {
//           outline: none;
//           border-color: #3B82F6;
//           box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
//           transform: scale(1.05);
//         }

//         .login-container button, .logout-button {
//           padding: 12px 24px;
//           background-color: rgba(59, 130, 246, 0.7);
//           color: #ffffff;
//           border: none;
//           border-radius: 8px;
//           cursor: pointer;
//           transition: all 0.3s ease;
//           font-weight: bold;
//           text-transform: uppercase;
//           letter-spacing: 1px;
//           position: relative;
//           overflow: hidden;
//         }

//         .login-container button::before, .logout-button::before {
//           content: '';
//           position: absolute;
//           top: -100%;
//           left: 0;
//           width: 100%;
//           height: 100%;
//           background: rgba(255, 255, 255, 0.2);
//           transition: all 0.3s ease;
//         }

//         .login-container button:hover::before, .logout-button:hover::before {
//           top: 0;
//         }

//         .login-container button:hover, .logout-button:hover {
//           background-color: rgba(37, 99, 235, 0.7);
//           transform: translateY(-2px);
//           box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
//         }

//         .logout-button {
//           animation: pulse 2s infinite;
//         }

//         .server-status {
//           font-size: 1.2em;
//           margin-bottom: 20px;
//           animation: pulse 2s infinite;
//           padding: 8px 16px;
//           background-color: rgba(16, 185, 129, 0.2);
//           border-radius: 20px;
//           transition: all 0.3s ease;
//         }

//         .cpu-stats {
//           display: grid;
//           grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
//           gap: 20px;
//           margin-top: 20px;
//         }

//         .cpu-stat-card {
//           background: rgba(45, 55, 72, 0.7);
//           border-radius: 10px;
//           padding: 15px;
//           box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//           transition: all 0.3s ease;
//         }

//         .cpu-stat-card:hover {
//           transform: translateY(-5px);
//           box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
//         }

//         .cpu-stat-card h3 {
//           margin: 0 0 10px 0;
//           color: #60A5FA;
//         }

//         .cpu-stat-value {
//           font-size: 1.5em;
//           font-weight: bold;
//           color: #E2E8F0;
//         }

//         .cpu-usage-bar {
//           height: 20px;
//           background: rgba(59, 130, 246, 0.3);
//           border-radius: 10px;
//           overflow: hidden;
//           position: relative;
//           margin-top: 10px;
//         }

//         .cpu-usage-fill {
//           height: 100%;
//           background: #3B82F6;
//           border-radius: 10px;
//           transition: width 1s ease-in-out;
//           animation: growBar 1s ease-out;
//         }

//         .print-button {
//           background-color: #4CAF50;
//           color: white;
//           border: none;
//           padding: 10px 20px;
//           text-align: center;
//           text-decoration: none;
//           display: inline-block;
//           font-size: 16px;
//           margin: 4px 2px;
//           cursor: pointer;
//           border-radius: 4px;
//           animation: pulse 2s infinite;
//         }

//         .print-button:hover {
//           background-color: #45a049;
//         }

//         @media print {
//           body {
//             background: none;
//             color: black;
//             background-image: none;
//             overflow-x: visible;
//           }

//           .container {
//             width: 100%;
//             max-width: 100%;
//             padding: 0;
//             background: transparent;
//             animation: none;
//             box-shadow: none;
//           }

//           .container::before {
//             display: none;
//           }

//           .tabs {
//             display: none;
//           }

//           .log-table, .response-table {
//             width: 100%;
//           }

//           .tabs button, .btn-primary {
//             display: none;
//           }

//           h1, h2 {
//             font-size: 1.5em;
//             text-align: left;
//           }

//           .stack-trace, .log-trace {
//             max-height: none;
//             max-width: none;
//             overflow: visible;
//           }

//           .tabs button.active {
//             background-color: rgba(59, 130, 246, 0.7);
//           }
//         }

//         .div-center {
//           display: flex;
//           justify-content: center;
//           align-items: center;
//           gap: 20px;
//         }

//       </style>
//     </head>
//     <body>
//       <!-- Login Form -->
//       <div class="login-container" id="login-container">
//         <h2>Server Monitoring Login</h2>
//         <div class="server-status">Server Status: <span id="server-status-text">Checking...</span></div>
//         <input type="text" id="username" placeholder="Username" />
//         <input type="password" id="password" placeholder="Password" />
//         <button onclick="authenticate()">Login</button>

//       </div>

//       <!-- Main Server Monitoring Content -->
//       <div class="container" id="server-container">
//         <h1>${config.preffered_website_name} Server</h1>

//         <div class="div-center">
//         <button class="logout-button" onclick="logout()">Logout</button>
//         <button class="print-button" onclick="printCurrentTab()">Print Tab</button>
//         </div>
//         <div class="tabs">
//           <button class="tablink active" onclick="openTab(event, 'cpu-usage')">CPU Usage</button>
//           <button class="tablink" onclick="openTab(event, 'log-table')">Error Logs</button>
//           <button class="tablink" onclick="openTab(event, 'response-table')">Response Times</button>
//         </div>
//         <div id="cpu-usage" class="tab-content active">
//           ${cpuUsageHtml}
//         </div>
//         <div id="log-table" class="tab-content">${errorLogTableHtml}</div>
//         <div id="response-table" class="tab-content">${responseTimeTableHtml}</div>
//       </div>

//       <script>
//         function printCurrentTab() {
//           window.print();
//         }
//         function authenticate() {
//           const username = document.getElementById('username').value.toLowerCase();
//           const password = document.getElementById('password').value;
//           const validUsername = "${config.monitor.username}";
//           const validPassword = "${config.monitor.password}";

//           if (username === validUsername && password === validPassword) {
//             localStorage.setItem('isLoggedIn', 'true');
//             showServerContainer();
//           } else {
//             alert("Invalid credentials. Please try again.");
//           }
//         }

//         function showServerContainer() {
//           document.getElementById('login-container').style.display = 'none';
//           document.getElementById('server-container').style.display = 'block';
//         }

//         function logout() {
//           localStorage.removeItem('isLoggedIn');
//           document.getElementById('login-container').style.display = 'flex';
//           document.getElementById('server-container').style.display = 'none';
//         }

//         function openTab(evt, tabName) {
//           var i, tabcontent, tablinks;
//           tabcontent = document.getElementsByClassName("tab-content");
//           for (i = 0; i < tabcontent.length; i++) {
//             tabcontent[i].classList.remove("active");
//           }
//           tablinks = document.getElementsByClassName("tablink");
//           for (i = 0; i < tablinks.length; i++) {
//             tablinks[i].classList.remove("active");
//           }
//           document.getElementById(tabName).classList.add("active");
//           evt.currentTarget.classList.add("active");
//         }

//         // Check login status on page load
//         window.onload = function() {
//           if (localStorage.getItem('isLoggedIn') === 'true') {
//             showServerContainer();
//           }
//           // Simulate server status check
//           setTimeout(() => {
//             document.getElementById('server-status-text').textContent = 'Online';
//             document.getElementById('server-status-text').style.color = '#10B981';
//           }, 2000);
//         };

//         // Add some animation to table rows
//         function animateTableRows() {
//           const tables = document.querySelectorAll('.log-table, .response-table');
//           tables.forEach(table => {
//             const rows = table.querySelectorAll('tr');
//             rows.forEach((row, index) => {
//               row.style.animation = 'fadeIn 0.5s ease-out ' + (index * 0.1) + 's';
//             });
//           });
//         }

//         // Call the animation function when switching tabs
//         const tabButtons = document.querySelectorAll('.tablink');
//         tabButtons.forEach(button => {
//           button.addEventListener('click', () => {
//             setTimeout(animateTableRows, 100);
//           });
//         });

//         // Initial animation call
//         animateTableRows();
//       </script>
//     </body>
//   </html>
// `;
// }

// export default serverHomePage;

/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import os from 'os';
import osUtils from 'os-utils';
import dotenv from 'dotenv';
import config from '../config';
dotenv.config();

// (4)
const logsDir = path.join(process.cwd(), 'logs');
const responseLogFilePath = path.join(logsDir, 'ResponseTime.log');
const errorLogFilePath = path.join(logsDir, 'Error.log');

interface ErrorLogEntry {
  timestamp: string;
  method: string;
  statusCode: string;
  message: string;
  errorPath: string;
  stack: string;
}

interface ResponseLogEntry {
  timestamp: string;
  route: string;
  method: string;
  responseTime: number;
  label: 'Low' | 'Medium' | 'High';
}

function readLogFile(): {
  errorLogs: ErrorLogEntry[];
  responseTimeLogs: ResponseLogEntry[];
} {
  const errorLogs: ErrorLogEntry[] = [];
  const responseTimeLogs: ResponseLogEntry[] = [];

  try {
    if (fs.existsSync(responseLogFilePath)) {
      const responseLogData = fs.readFileSync(responseLogFilePath, 'utf8');

      // Robustly handle multiple JSON objects on the same line or concatenated
      const normalizedData = responseLogData.replace(/\}[\s]*\{/g, '}\n{');

      normalizedData.split('\n').forEach(entry => {
        if (!entry.trim()) return;

        try {
          const log = JSON.parse(entry);
          if (log.responseTime) {
            const responseTime = parseFloat(log.responseTime);
            const label =
              responseTime > 2000
                ? 'High'
                : responseTime > 1000
                  ? 'Medium'
                  : 'Low';

            responseTimeLogs.push({
              timestamp: new Date(log.timestamp).toLocaleString(),
              route: log.url || 'N/A',
              method: log.method || 'N/A',
              responseTime,
              label,
            });
          }
        } catch (err) {
          console.error('Error parsing response time log entry:', err);
        }
      });
    }
  } catch (err) {
    console.error('Error reading response time log file:', err);
  }

  try {
    if (fs.existsSync(errorLogFilePath)) {
      const errorLogData = fs.readFileSync(errorLogFilePath, 'utf8');

      // Robustly handle multiple JSON objects on the same line or concatenated
      const normalizedErrorData = errorLogData.replace(/\}[\s]*\{/g, '}\n{');

      normalizedErrorData.split('\n').forEach(entry => {
        if (!entry.trim()) return;
        try {
          const log = JSON.parse(entry);
          if (
            log.level === 'error' &&
            !(log.url && log.url.includes('/favicon.ico'))
          ) {
            errorLogs.push({
              timestamp: new Date(log.timestamp).toLocaleString(),
              method: log.method || 'N/A',
              statusCode: log.status || 'N/A',
              message: log.message,
              errorPath: log.url || 'N/A',
              stack: log.stack || 'No stack trace available',
            });
          }
        } catch (err) {
          console.error('Error parsing error log entry:', err);
        }
      });
    }
  } catch (err) {
    console.error('Error reading error log file:', err);
  }

  return {
    errorLogs: errorLogs.reverse(),
    responseTimeLogs: responseTimeLogs.reverse(),
  };
}

async function generateCpuUsageHtml(): Promise<string> {
  return new Promise(resolve => {
    osUtils.cpuUsage((usage: number) => {
      const totalCores = os.cpus().length;
      const cpuUsagePercentage = usage * 100;
      const usedCores = Math.ceil((cpuUsagePercentage / 100) * totalCores);
      const idleCores = totalCores - usedCores;

      resolve(`
        <div id="cpu-usage">
          <div class="cpu-stats">
            <div class="mem-item">Total Cores: <span>${totalCores}</span></div>
            <div class="mem-item">CPU Usage: <span>${cpuUsagePercentage.toFixed(2)}%</span></div>
            <div class="cpu-usage-bar"><div class="cpu-usage-fill" style="width: ${cpuUsagePercentage.toFixed(2)}%"></div></div>
            <div class="mem-grid">
               <div class="mem-item">Used: <span>${usedCores}</span></div>
               <div class="mem-item">Idle: <span>${idleCores}</span></div>
            </div>
          </div>
        </div>
      `);
    });
  });
}

function generateErrorLogTable(errorLogs: ErrorLogEntry[]): string {
  if (errorLogs.length === 0) {
    return '<p style="text-align: center; padding: 2rem;">No error logs available.</p>';
  }

  let tableHtml = `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Method</th>
          <th>Status</th>
          <th>Message</th>
          <th>Path</th>
        </tr>
      </thead>
      <tbody>
  `;

  errorLogs.forEach(log => {
    tableHtml += `
      <tr>
        <td>${log.timestamp}</td>
        <td>${log.method}</td>
        <td>${log.statusCode}</td>
        <td>${log.message}</td>
        <td>${log.errorPath}</td>
      </tr>
    `;
  });

  tableHtml += '</tbody></table>';
  return tableHtml;
}

function generateResponseTimeTable(
  responseTimeLogs: ResponseLogEntry[],
): string {
  if (responseTimeLogs.length === 0) {
    return '<p style="text-align: center; padding: 2rem;">No response time logs available.</p>';
  }

  let tableHtml = `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Route</th>
          <th>Method</th>
          <th>Latency</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  responseTimeLogs.forEach(log => {
    const labelClass = `bg-${log.label.toLowerCase()}`;
    tableHtml += `
      <tr>
        <td>${log.timestamp}</td>
        <td>${log.route}</td>
        <td>${log.method}</td>
        <td>${log.responseTime.toFixed(2)}ms</td>
        <td><span class="badge ${labelClass}">${log.label}</span></td>
      </tr>
    `;
  });

  tableHtml += '</tbody></table>';
  return tableHtml;
}

async function serverHomePage(): Promise<string> {
  const {
    totalRequests,
    totalErrors,
    avgResponseTime,
    errorRate,
    memory,
    errorLogs,
    responseTimeLogs,
  } = getMonitorStats();

  const errorLogTableHtml = generateErrorLogTable(errorLogs);
  const responseTimeTableHtml = generateResponseTimeTable(responseTimeLogs);
  // const errorLogTableHtml = '...';
  // const responseTimeTableHtml = '...';
  const cpuUsageHtml = await generateCpuUsageHtml();

  const monitorClientConfig = Buffer.from(
    JSON.stringify({
      monitorUserName: config.monitor.username || '',
      monitorPassword: config.monitor.password || '',
      superUserName: config.superAdmin.email || '',
      superPassWord: config.superAdmin.password || '',
      chartLabels: responseTimeLogs
        .slice(0, 20)
        .reverse()
        .map(l => l.timestamp.split(', ')[1]),
      chartData: responseTimeLogs
        .slice(0, 20)
        .reverse()
        .map(l => l.responseTime),
    }),
  ).toString('base64');

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${config.preffered_website_name || 'Server'} Monitor v2.5.2</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        :root {
          --bg-dark: #0f172a;
          --card-bg: rgba(30, 41, 59, 0.7);
          --accent-blue: #3b82f6;
          --accent-green: #10b981;
          --accent-red: #ef4444;
          --accent-yellow: #f59e0b;
          --accent-purple: #8b5cf6;
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
          --border-color: rgba(255, 255, 255, 0.1);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--bg-dark);
          color: var(--text-primary);
          background-image:
            radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.1) 0px, transparent 50%);
          background-attachment: fixed;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .container { max-width: 1400px; margin: 0 auto; padding: 1.5rem; display: none; }

        /* Stats Bar */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: var(--card-bg);
          padding: 1.25rem;
          border-radius: 1rem;
          border: 1px solid var(--border-color);
          backdrop-filter: blur(10px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stat-card:hover { transform: translateY(-5px); border-color: var(--accent-blue); }

        .stat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .stat-icon { font-size: 1.25rem; opacity: 0.8; }
        .stat-label { color: var(--text-secondary); font-size: 0.8rem; font-weight: 500; text-transform: uppercase; }
        .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); }

        /* Main Dashboard Area */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .card {
          background: var(--card-bg);
          border-radius: 1.25rem;
          border: 1px solid var(--border-color);
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .card-title { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; color: var(--text-secondary); font-size: 0.9rem; font-weight: 600; text-transform: uppercase; }

        /* Custom UI Components */
        .tabs-nav {
          display: flex;
          gap: 0.5rem;
          background: rgba(15, 23, 42, 0.4);
          padding: 0.4rem;
          border-radius: 0.75rem;
          margin-bottom: 1rem;
        }

        .tab-btn {
          padding: 0.6rem 1.2rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .tab-btn.active { background: var(--accent-blue); color: white; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.5); }

        .table-container { max-height: 500px; overflow-y: auto; scrollbar-width: thin; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 0.75rem 1rem; color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; border-bottom: 1px solid var(--border-color); }
        td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-primary); }
        tr:hover td { background: rgba(255, 255, 255, 0.02); }

        .badge { padding: 0.2rem 0.6rem; border-radius: 0.375rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
        .bg-low { background: rgba(16, 185, 129, 0.1); color: var(--accent-green); }
        .bg-medium { background: rgba(245, 158, 11, 0.1); color: var(--accent-yellow); }
        .bg-high { background: rgba(239, 68, 68, 0.1); color: var(--accent-red); }

        /* Login */
        .login-wrap { height: 100vh; display: flex; align-items: center; justify-content: center; }
        .login-box {
          background: var(--card-bg);
          padding: 2.5rem;
          border-radius: 1.5rem;
          border: 1px solid var(--border-color);
          width: 100%;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .login-box h2 { margin-bottom: 1.5rem; font-size: 1.5rem; color: var(--accent-blue); }
        .input-wrap { position: relative; margin-bottom: 1rem; }
        .input-wrap i.fa-envelope, .input-wrap i.fa-key { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
        .input-wrap .toggle-pass { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary); cursor: pointer; transition: color 0.2s; }
        .input-wrap .toggle-pass:hover { color: var(--accent-blue); }
        .input-wrap input {
          width: 100%;
          padding: 0.8rem 2.8rem 0.8rem 2.8rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          color: white;
          outline: none;
        }

        .btn-action {
          width: 100%;
          padding: 0.8rem;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-action:hover { background: #2563eb; transform: scale(1.02); }

        /* Header */
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .logo { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.025em; color: var(--text-primary); }
        .logo span { color: var(--accent-blue); }
        .header-actions { display: flex; gap: 0.75rem; align-items: center; }

        .pulse { width: 8px; height: 8px; background: var(--accent-green); border-radius: 50%; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); animation: pulse-anim 2s infinite; }
        @keyframes pulse-anim { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

        .btn-circle { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--card-bg); color: white; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .btn-circle:hover { background: var(--accent-blue); border-color: var(--accent-blue); }

        .search-box { position: relative; width: 300px; }
        .search-box input { width: 100%; padding: 0.5rem 1rem 0.5rem 2.5rem; border-radius: 0.5rem; border: 1px solid var(--border-color); background: rgba(0,0,0,0.2); color: white; outline: none; }
        .search-box i { position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }

        #cpu-usage h2 { display: none; }
        .cpu-stats { display: flex; flex-direction: column; gap: 1rem; }
        .cpu-usage-bar { height: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; overflow: hidden; position: relative; }
        .cpu-usage-fill { height: 100%; background: linear-gradient(to right, var(--accent-blue), var(--accent-purple)); border-radius: 6px; transition: width 0.5s ease; }

        .mem-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem; }
        .mem-item { display: flex; justify-content: space-between; }
        .mem-item span { font-weight: 600; color: var(--text-primary); }

        @media (max-width: 1024px) { .dashboard-grid { grid-template-columns: 1fr; } }
      </style>
    </head>
    <body>
      <div id="login-screen" class="login-wrap">
        <form class="login-box" onsubmit="event.preventDefault(); authenticate()" autocomplete="on">
          <i class="fas fa-terminal" style="font-size: 2.5rem; color: var(--accent-blue); margin-bottom: 1rem;"></i>
          <h2>${config.preffered_website_name || 'Server'} Monitor</h2>
          <div class="input-wrap">
            <i class="fas fa-envelope"></i>
            <input type="text" id="username" name="username" placeholder="Email or Username" autocomplete="username" required>
          </div>
          <div class="input-wrap">
            <i class="fas fa-key"></i>
            <input type="password" id="password" name="password" placeholder="Password" autocomplete="current-password" required>
            <i class="fas fa-eye toggle-pass" id="eye-icon" onclick="togglePassword()"></i>
          </div>
          <button type="submit" class="btn-action">Sign In</button>
        </form>
      </div>

      <!-- Hidden config data -->
      <script id="MONITOR_CONFIG" type="text/plain">${monitorClientConfig}</script>

      <div id="main-view" class="container">
        <header>
          <div class="logo">${(config.preffered_website_name || 'Server').toUpperCase()}<span> MONITOR</span></div>
          <div class="header-actions">
            <div style="display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.5rem 1rem; border-radius: 2rem;">
              <div class="pulse"></div>
              <span id="update-timer" style="font-size: 0.7rem; font-weight: 600; color: var(--accent-green);">SYSTEM ACTIVE</span>
            </div>
            <button class="btn-circle" title="Refresh" onclick="updateAllData()"><i class="fas fa-sync-alt"></i></button>
            <button class="btn-circle" title="Print" onclick="window.print()"><i class="fas fa-print"></i></button>
            <button class="btn-circle" title="Logout" onclick="logout()" style="color: var(--accent-red);"><i class="fas fa-power-off"></i></button>
          </div>
        </header>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-header"><span class="stat-label">Total Requests</span><i class="fas fa-exchange-alt stat-icon" style="color: var(--accent-blue);"></i></div>
            <div class="stat-value" id="stat-requests">${totalRequests}</div>
          </div>
          <div class="stat-card">
            <div class="stat-header"><span class="stat-label">Avg Latency</span><i class="fas fa-bolt stat-icon" style="color: var(--accent-yellow);"></i></div>
            <div class="stat-value" id="stat-latency">${avgResponseTime}ms</div>
          </div>
          <div class="stat-card">
            <div class="stat-header"><span class="stat-label">Total Errors</span><i class="fas fa-bug stat-icon" style="color: var(--accent-red);"></i></div>
            <div class="stat-value" id="stat-errors">${totalErrors}</div>
          </div>
          <div class="stat-card">
            <div class="stat-header"><span class="stat-label">Error Rate</span><i class="fas fa-percent stat-icon" style="color: var(--accent-purple);"></i></div>
            <div class="stat-value" id="stat-error-rate">${errorRate}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-header"><span class="stat-label">Memory Usage</span><i class="fas fa-memory stat-icon" style="color: var(--accent-green);"></i></div>
            <div class="stat-value" id="stat-memory">${memory.usagePercentage}%</div>
            <div class="mem-grid">
              <div class="mem-item">Used: <span id="mem-used">${memory.used}GB</span></div>
              <div class="mem-item">Total: <span id="mem-total">${memory.total}GB</span></div>
            </div>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="card">
            <div class="card-title"><i class="fas fa-chart-area"></i> Latency Trend (Last 20 requests)</div>
            <canvas id="latencyChart" height="120"></canvas>
          </div>
          <div class="card">
            <div class="card-title"><i class="fas fa-microchip"></i> System Resources</div>
            <div id="cpu-info">${cpuUsageHtml}</div>
            <div class="cpu-stats" style="margin-top: 1.5rem;">
               <div class="stat-label" style="font-size: 0.7rem;">Heap Usage (RAM)</div>
               <div class="cpu-usage-bar"><div id="mem-bar" class="cpu-usage-fill" style="width: ${memory.usagePercentage}%"></div></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <div class="tabs-nav" style="margin-bottom: 0;">
              <button class="tab-btn active" onclick="switchTab(event, 'tab-activity')"><i class="fas fa-stream"></i> Activity Log</button>
              <button class="tab-btn" onclick="switchTab(event, 'tab-errors')"><i class="fas fa-skull-crossbones"></i> Error Incidents</button>
            </div>
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input type="text" id="log-search" placeholder="Search routes, methods or errors..." onkeyup="filterLogs()">
            </div>
            <button class="btn-circle" onclick="exportToCSV()" title="Export CSV"><i class="fas fa-file-csv"></i></button>
          </div>

          <div id="tab-activity" class="tab-content table-container">
            ${responseTimeTableHtml}
          </div>
          <div id="tab-errors" class="tab-content table-container" style="display: none;">
            ${errorLogTableHtml}
          </div>
        </div>
      </div>

      <script>
        let CLIENT_CONFIG = {};

        try {
          const rawData = document.getElementById('MONITOR_CONFIG').textContent;
          CLIENT_CONFIG = JSON.parse(atob(rawData));
        } catch (e) {
          console.error("Critical: Failed to load monitor configuration.", e);
        }

        let latencyChart;
        const POLL_INTERVAL = 5000;

        function authenticate() {
          const username = document.getElementById('username').value.toLowerCase();
          const password = document.getElementById('password').value;

          if ((username === CLIENT_CONFIG.monitorUserName && password === CLIENT_CONFIG.monitorPassword) ||
              (username === CLIENT_CONFIG.superUserName && password === CLIENT_CONFIG.superPassWord)) {
            localStorage.setItem('monitor_token', 'true');
            startDashboard();
          } else {
            alert('Invalid credentials. Please check your .env file or use Super Admin email/password.');
          }
        }

        function togglePassword() {
          const p = document.getElementById('password');
          const i = document.getElementById('eye-icon');
          if (p.type === 'password') {
            p.type = 'text';
            i.classList.remove('fa-eye');
            i.classList.add('fa-eye-slash');
          } else {
            p.type = 'password';
            i.classList.remove('fa-eye-slash');
            i.classList.add('fa-eye');
          }
        }

        function startDashboard() {
          document.getElementById('login-screen').style.display = 'none';
          document.getElementById('main-view').style.display = 'block';
          initChart();
          setInterval(updateAllData, POLL_INTERVAL);
        }

        function logout() {
          localStorage.removeItem('monitor_token');
          location.reload();
        }

        function switchTab(e, id) {
          document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          document.getElementById(id).style.display = 'block';
          e.currentTarget.classList.add('active');
        }

        function initChart() {
          const ctx = document.getElementById('latencyChart').getContext('2d');
          latencyChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: CLIENT_CONFIG.chartLabels,
              datasets: [{
                label: 'Latency (ms)',
                data: CLIENT_CONFIG.chartData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff'
              }]
            },
            options: {
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
              }
            }
          });
        }

        async function updateAllData() {
          try {
            const res = await fetch('/monitor/data');
            const data = await res.json();

            // Update Stats
            document.getElementById('stat-requests').innerText = data.totalRequests;
            document.getElementById('stat-latency').innerText = data.avgResponseTime + 'ms';
            document.getElementById('stat-errors').innerText = data.totalErrors;
            document.getElementById('stat-error-rate').innerText = data.errorRate + '%';
            document.getElementById('stat-memory').innerText = data.memory.usagePercentage + '%';
            document.getElementById('mem-used').innerText = data.memory.used + 'GB';
            document.getElementById('mem-bar').style.width = data.memory.usagePercentage + '%';

            // Update Chart
            latencyChart.data.labels = data.chartLabels;
            latencyChart.data.datasets[0].data = data.chartData;
            latencyChart.update('none');

            // Refresh Activity Log
            const activityHtml = generateResponseTable(data.responseTimeLogs);
            document.getElementById('tab-activity').innerHTML = activityHtml;

            // Refresh Error Log
            const errorHtml = generateErrorTable(data.errorLogs);
            document.getElementById('tab-errors').innerHTML = errorHtml;

          } catch (e) { console.error('Update failed', e); }
        }

        function generateResponseTable(logs) {
          if (!logs.length) return '<p style="padding:2rem;text-align:center">No activity</p>';
          return '<table><thead><tr><th>Time</th><th>Route</th><th>Method</th><th>Latency</th><th>Status</th></tr></thead><tbody>' +
            logs.map(l => '<tr><td>' + l.timestamp + '</td><td>' + l.route + '</td><td>' + l.method + '</td><td>' + l.responseTime.toFixed(2) + 'ms</td><td><span class="badge bg-' + l.label.toLowerCase() + '">' + l.label + '</span></td></tr>').join('') + '</tbody></table>';
        }

        function generateErrorTable(logs) {
          if (!logs.length) return '<p style="padding:2rem;text-align:center">No errors</p>';
          return '<table><thead><tr><th>Time</th><th>Method</th><th>Status</th><th>Message</th><th>Path</th></tr></thead><tbody>' +
            logs.map(l => '<tr><td>' + l.timestamp + '</td><td>' + l.method + '</td><td>' + l.statusCode + '</td><td>' + l.message + '</td><td>' + l.errorPath + '</td></tr>').join('') + '</tbody></table>';
        }

        function filterLogs() {
          const q = document.getElementById('log-search').value.toLowerCase();
          document.querySelectorAll('tbody tr').forEach(tr => {
            tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
          });
        }

        function exportToCSV() {
          const rows = [['Timestamp', 'Route', 'Method', 'Latency', 'Label']];
          document.querySelectorAll('#tab-activity tr').forEach(tr => {
            const cols = Array.from(tr.querySelectorAll('td')).map(td => td.innerText);
            if (cols.length) rows.push(cols);
          });
          const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\\n");
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", "server_logs.csv");
          document.body.appendChild(link);
          link.click();
        }

        window.onload = () => {
          if (localStorage.getItem('monitor_token') === 'true') startDashboard();
        };
      </script>
    </body>
  </html>
`;
}

export default serverHomePage;

export function getMonitorStats() {
  const { errorLogs, responseTimeLogs } = readLogFile();

  const totalRequests = responseTimeLogs.length;
  const totalErrors = errorLogs.length;
  const avgResponseTime =
    totalRequests > 0
      ? (
          responseTimeLogs.reduce((acc, log) => acc + log.responseTime, 0) /
          totalRequests
        ).toFixed(2)
      : '0';
  const errorRate =
    totalRequests > 0
      ? ((totalErrors / (totalRequests + totalErrors)) * 100).toFixed(2)
      : '0';

  const memory = {
    total: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
    free: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
    used: ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2),
    usagePercentage: (
      ((os.totalmem() - os.freemem()) / os.totalmem()) *
      100
    ).toFixed(2),
  };

  return {
    totalRequests,
    totalErrors,
    avgResponseTime,
    errorRate,
    memory,
    chartLabels: responseTimeLogs
      .slice(0, 20)
      .reverse()
      .map(l => l.timestamp.split(', ')[1]),
    chartData: responseTimeLogs
      .slice(0, 20)
      .reverse()
      .map(l => l.responseTime),
    errorLogs: errorLogs.slice(0, 50000), // Limit for real-time
    responseTimeLogs: responseTimeLogs.slice(0, 50000), // Limit for real-time
  };
}
