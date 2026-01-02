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
const program = new commander_1.Command();
program
    .version('1.0.1')
    .requiredOption('-p, --port <number>', 'Local port to forward', '3000')
    .option('-s, --subdomain <string>', 'Desired subdomain', 'random-dev')
    .option('-h, --host <string>', 'Proxy Server URL', process.env.PROXY_HOST || PRODUCTION_SERVER)
    .parse(process.argv);
const options = program.opts();
const LOCAL_TARGET = `http://localhost:${options.port}`;
const PROXY_URL = options.host;
console.log(chalk_1.default.cyan(`\n🚀 LocalLoop Starting...`));
console.log(chalk_1.default.gray(`Target: ${LOCAL_TARGET}`));
console.log(chalk_1.default.gray(`Proxy:  ${PROXY_URL}`));
const socket = (0, socket_io_client_1.io)(PROXY_URL);
socket.on('connect', () => {
    console.log(chalk_1.default.green(`\n✅ Connected to Proxy!`));
    console.log(`Registering subdomain: ${chalk_1.default.bold(options.subdomain)}...`);
    socket.emit('register', options.subdomain);
});
socket.on('registered', (data) => {
    console.log(chalk_1.default.green(`\n🎉 Tunnel Live at: ${chalk_1.default.bold(data.url)}`));
    console.log(chalk_1.default.yellow(`Waiting for requests...\n`));
});
socket.on('error', (msg) => {
    console.error(chalk_1.default.red(`❌ Error: ${msg}`));
    process.exit(1);
});
socket.on("incoming-request", async (payload, callback) => {
    const { method, path, body, headers } = payload;
    console.log(chalk_1.default.blue(`📨 ${method} ${path}`));
    try {
        delete headers["host"];
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
            data: { error: "LocalLoop CLI could not reach your localhost server." }
        };
        callback(errorResponse);
    }
});
socket.on('disconnect', () => {
    console.log(chalk_1.default.red('\n🔌 Disconnected from Proxy. Retrying...'));
});
