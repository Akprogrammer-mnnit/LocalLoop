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
const PRODUCTION_SERVER = 'https://localloop-server.onrender.com';
const PRODUCTION_DASHBOARD_URL = 'https://local-loop-gamma.vercel.app';
const program = new commander_1.Command();
program
    .version('1.0.1')
    .requiredOption('-p, --port <number>', 'Local port to forward', '3000')
    .option('-s, --subdomain <string>', 'Desired subdomain', 'random-dev')
    .option('-h, --host <string>', 'Proxy Server URL', process.env.PROXY_HOST || PRODUCTION_SERVER)
    .option('-k, --key <string>', 'Your Api Key')
    .parse(process.argv);
const options = program.opts();
const LOCAL_TARGET = `http://localhost:${options.port}`;
const PROXY_URL = options.host;
console.log(chalk_1.default.cyan(`\n🚀 LocalLoop Starting...`));
console.log(chalk_1.default.gray(`Target: ${LOCAL_TARGET}`));
console.log(chalk_1.default.gray(`Proxy:  ${PROXY_URL}`));
const socket = (0, socket_io_client_1.io)(PROXY_URL, {
    auth: {
        apiKey: options.key
    }
});
socket.on('connect', () => {
    console.log(chalk_1.default.green(`\n✅ Connected to Proxy!`));
    console.log(`Registering subdomain: ${chalk_1.default.bold(options.subdomain)}...`);
    socket.emit('register', options.subdomain);
});
socket.on('registered', (data) => {
    console.log(chalk_1.default.green(`\n🎉 Tunnel Live at: ${chalk_1.default.bold(data.url)}`));
    const pathParts = data.url.split('/hook/')[1];
    console.log(chalk_1.default.green(`📊 Dashboard: ${PRODUCTION_DASHBOARD_URL}/dashboard/${pathParts}`));
    console.log(chalk_1.default.yellow(`Waiting for requests...\n`));
});
socket.on('error', (err) => {
    const message = err.message || err;
    console.error(chalk_1.default.red(`❌ Error: ${message}`));
    process.exit(1);
});
socket.on("incoming-request", async (payload, callback) => {
    const { method, path, body, headers } = payload;
    console.log(chalk_1.default.blue(`📨 ${method} ${path}`));
    try {
        delete headers["host"];
        headers["host"] = `localhost:${options.port}`;
        const response = await (0, axios_1.default)({
            method: method,
            url: `${LOCAL_TARGET}/${path}`,
            headers: headers,
            data: body,
            validateStatus: () => true
        });
        console.log(chalk_1.default.green(`   ↳ Forwarded Successfully (${response.status})`));
        const responseToProxy = {
            status: response.status,
            headers: response.headers,
            data: response.data
        };
        callback(responseToProxy);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(chalk_1.default.red(`   ↳ Failed to connect to local app: ${error.message}`));
        }
        else {
            console.error(chalk_1.default.red(`   ↳ Failed to connect to local app: ${error}`));
        }
        const errorResponse = {
            status: 502,
            headers: {},
            data: {
                error: "LocalLoop Error",
                details: error instanceof Error ? error.message : String(error)
            }
        };
        callback(errorResponse);
    }
});
socket.on('disconnect', () => {
    console.log(chalk_1.default.red('\n🔌 Disconnected from Proxy. Retrying...'));
});
