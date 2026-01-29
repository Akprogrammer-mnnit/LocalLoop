#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const socket_io_client_1 = require("socket.io-client");
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const boxen_1 = __importDefault(require("boxen"));
const ora_1 = __importDefault(require("ora"));
const clipboardy_1 = __importDefault(require("clipboardy"));
const PRODUCTION_SERVER = 'https://localloop-server.onrender.com';
const PRODUCTION_DASHBOARD_URL = 'https://local-loop-gamma.vercel.app';
const program = new commander_1.Command();
program
    .version('1.0.1')
    .requiredOption('-p, --port <number>', 'Local port to forward', '3000')
    .option('-s, --subdomain <string>', 'Desired subdomain')
    .option('-h, --host <string>', 'Proxy Server URL', process.env.PROXY_HOST || PRODUCTION_SERVER)
    .option('-k, --key <string>', 'Your Api Key')
    .option('-a, --auth <string>', 'Basic Auth (user:password)')
    .parse(process.argv);
const options = program.opts();
const LOCAL_TARGET = `http://localhost:${options.port}`;
const PROXY_URL = options.host;
const spinner = (0, ora_1.default)({
    text: 'Connecting to LocalLoop Cloud...',
    color: 'cyan'
}).start();
const socket = (0, socket_io_client_1.io)(PROXY_URL, {
    auth: {
        apiKey: options.key
    }
});
let heartbeatInterval;
socket.on('connect', () => {
    spinner.text = 'Authenticating...';
    socket.emit('register', {
        subdomain: options.subdomain,
        auth: options.auth
    });
});
socket.on('registered', (data) => {
    spinner.succeed('Tunnel Established!');
    const fullId = data.url.split('/hook/')[1].replace(/\/$/, "");
    const dashboardUrl = `${PRODUCTION_DASHBOARD_URL}/dashboard/${fullId}`;
    try {
        clipboardy_1.default.writeSync(data.url);
    }
    catch (e) { }
    const infoBox = `
 ${chalk_1.default.bold.cyan('LocalLoop v1.0')} 🚀
 
 ${chalk_1.default.green('✔')} ${chalk_1.default.bold('Tunnel Active')}
 ${chalk_1.default.gray('---------------------------------------------------')}
 
 🌍 ${chalk_1.default.bold('Public URL:')}   ${chalk_1.default.white(data.url)}
 💻 ${chalk_1.default.bold('Local URL:')}    ${chalk_1.default.white(LOCAL_TARGET)}
 📊 ${chalk_1.default.bold('Dashboard:')}    ${chalk_1.default.blue(dashboardUrl)}
 
 ${options.auth ? `🔒 ${chalk_1.default.bold('Auth:')}         ${chalk_1.default.yellow('Enabled')}` : `🔓 ${chalk_1.default.bold('Auth:')}         ${chalk_1.default.gray('None')}`}
 
 ${chalk_1.default.gray('---------------------------------------------------')}
 ${chalk_1.default.italic.gray('URL copied to clipboard!')}
    `;
    console.log((0, boxen_1.default)(infoBox, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        backgroundColor: '#111'
    }));
    if (heartbeatInterval)
        clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
        socket.emit('heartbeat', { subdomain: fullId });
    }, 30000);
    console.log(chalk_1.default.gray(`\nWaiting for incoming requests...`));
});
socket.on('error', (err) => {
    spinner.fail(chalk_1.default.red('Connection Failed'));
    const message = err.message || err;
    console.error(chalk_1.default.red(`❌ Error: ${message}`));
    process.exit(1);
});
socket.on("incoming-request", async (payload, callback) => {
    const { method, path, body, headers } = payload;
    const methodColor = method === 'GET' ? chalk_1.default.blue : method === 'POST' ? chalk_1.default.green : chalk_1.default.yellow;
    process.stdout.write(`${methodColor(method)} ${path} `);
    try {
        const cleanHeaders = { ...headers };
        Object.keys(cleanHeaders).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (['host', 'content-length', 'accept-encoding', 'origin', 'referer'].includes(lowerKey)) {
                delete cleanHeaders[key];
            }
        });
        cleanHeaders["host"] = `localhost:${options.port}`;
        const response = await (0, axios_1.default)({
            method: method,
            url: `${LOCAL_TARGET}/${path}`,
            headers: cleanHeaders,
            data: body,
            validateStatus: () => true,
            responseType: 'arraybuffer'
        });
        const statusColor = response.status < 300 ? chalk_1.default.green : response.status < 400 ? chalk_1.default.yellow : chalk_1.default.red;
        console.log(`→ ${statusColor(response.status)}`);
        const responseHeaders = { ...response.headers };
        delete responseHeaders["content-length"];
        delete responseHeaders["transfer-encoding"];
        delete responseHeaders["content-encoding"];
        delete responseHeaders["connection"];
        const contentType = (responseHeaders['content-type'] || '').toLowerCase();
        const isBinary = contentType.includes('image') ||
            contentType.includes('pdf') ||
            contentType.includes('zip') ||
            contentType.includes('octet-stream') ||
            contentType.includes('font') ||
            contentType.includes('video') ||
            contentType.includes('audio');
        const responseData = isBinary
            ? Buffer.from(response.data).toString('base64')
            : Buffer.from(response.data).toString('utf8');
        const responseToProxy = {
            status: response.status,
            headers: responseHeaders,
            data: responseData,
            isBinary
        };
        callback(responseToProxy);
    }
    catch (error) {
        console.log(chalk_1.default.red(`→ FAILED`));
        if (error instanceof Error) {
            console.error(chalk_1.default.dim(`   ${error.message}`));
        }
        else {
            console.error(chalk_1.default.dim(`   ${String(error)}`));
        }
        callback({
            status: 502,
            headers: {},
            data: JSON.stringify({ error: "LocalLoop Error", details: String(error) })
        });
    }
});
socket.on('disconnect', () => {
    if (heartbeatInterval)
        clearInterval(heartbeatInterval);
    console.log(chalk_1.default.yellow('\n⚠️  Disconnected from Proxy. Retrying...'));
});
