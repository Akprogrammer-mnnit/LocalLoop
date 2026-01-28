#!/usr/bin/env node
import { Command } from "commander"
import { io, Socket } from "socket.io-client"
import axios from "axios"
import chalk from "chalk"
import boxen from "boxen"
import ora from "ora"
import clipboardy from "clipboardy"

// const PRODUCTION_SERVER = 'https://localloop-server.onrender.com';
// const PRODUCTION_DASHBOARD_URL = 'https://local-loop-gamma.vercel.app'
const PRODUCTION_SERVER = 'http://localhost:3000';
const PRODUCTION_DASHBOARD_URL = 'http://localhost:5173'


interface ForwardedRequest {
    id: string;
    method: string;
    path: string;
    headers: any;
    body: any;
    query: any;
    timestamp: number;
}

interface LocalResponse {
    status: number;
    headers: any;
    data: any;
    isBinary?: boolean;
}


const program = new Command()

program
    .version('1.0.1')
    .requiredOption('-p, --port <number>', 'Local port to forward', '3000')
    .option('-s, --subdomain <string>', 'Desired subdomain')
    .option('-h, --host <string>', 'Proxy Server URL', process.env.PROXY_HOST || PRODUCTION_SERVER)
    .option('-k, --key <string>', 'Your Api Key')
    .option('-a, --auth <string>', 'Basic Auth (user:password)')
    .parse(process.argv);

const options = program.opts();
const LOCAL_TARGET = `http://localhost:${options.port}`
const PROXY_URL = options.host

const spinner = ora({
    text: 'Connecting to LocalLoop Cloud...',
    color: 'cyan'
}).start();

const socket: Socket = io(PROXY_URL, {
    auth: {
        apiKey: options.key
    }
});

let heartbeatInterval: NodeJS.Timeout;

socket.on('connect', () => {
    spinner.text = 'Authenticating...';
    socket.emit('register', {
        subdomain: options.subdomain,
        auth: options.auth
    });
})

socket.on('registered', (data: { url: string }) => {
    spinner.succeed('Tunnel Established!');

    const fullId = data.url.split('/hook/')[1].replace(/\/$/, "");
    const dashboardUrl = `${PRODUCTION_DASHBOARD_URL}/dashboard/${fullId}`;

    try {
        clipboardy.writeSync(data.url);
    } catch (e) { }

    const infoBox = `
 ${chalk.bold.cyan('LocalLoop v1.0')} 🚀
 
 ${chalk.green('✔')} ${chalk.bold('Tunnel Active')}
 ${chalk.gray('---------------------------------------------------')}
 
 🌍 ${chalk.bold('Public URL:')}   ${chalk.white(data.url)}
 💻 ${chalk.bold('Local URL:')}    ${chalk.white(LOCAL_TARGET)}
 📊 ${chalk.bold('Dashboard:')}    ${chalk.blue(dashboardUrl)}
 
 ${options.auth ? `🔒 ${chalk.bold('Auth:')}         ${chalk.yellow('Enabled')}` : `🔓 ${chalk.bold('Auth:')}         ${chalk.gray('None')}`}
 
 ${chalk.gray('---------------------------------------------------')}
 ${chalk.italic.gray('URL copied to clipboard!')}
    `;

    console.log(boxen(infoBox, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        backgroundColor: '#111'
    }));

    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
        socket.emit('heartbeat', { subdomain: fullId });
    }, 30000);

    console.log(chalk.gray(`\nWaiting for incoming requests...`));
});

socket.on('error', (err: any) => {
    spinner.fail(chalk.red('Connection Failed'));
    const message = err.message || err;
    console.error(chalk.red(`❌ Error: ${message}`));
    process.exit(1);
});

socket.on("incoming-request", async (payload: ForwardedRequest, callback) => {
    const { method, path, body, headers } = payload;

    const methodColor = method === 'GET' ? chalk.blue : method === 'POST' ? chalk.green : chalk.yellow;
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

        const response = await axios({
            method: method as any,
            url: `${LOCAL_TARGET}/${path}`,
            headers: cleanHeaders,
            data: body,
            validateStatus: () => true,
            responseType: 'arraybuffer'
        });

        const statusColor = response.status < 300 ? chalk.green : response.status < 400 ? chalk.yellow : chalk.red;
        console.log(`→ ${statusColor(response.status)}`);

        const responseHeaders = { ...response.headers };
        delete responseHeaders["content-length"];
        delete responseHeaders["transfer-encoding"];
        delete responseHeaders["content-encoding"];
        delete responseHeaders["connection"];

        const contentType = (responseHeaders['content-type'] || '').toLowerCase();
        const isBinary =
            contentType.includes('image') ||
            contentType.includes('pdf') ||
            contentType.includes('zip') ||
            contentType.includes('octet-stream') ||
            contentType.includes('font') ||
            contentType.includes('video') ||
            contentType.includes('audio');

        const responseData = isBinary
            ? Buffer.from(response.data).toString('base64')
            : Buffer.from(response.data).toString('utf8');

        const responseToProxy: LocalResponse = {
            status: response.status,
            headers: responseHeaders,
            data: responseData,
            isBinary
        };

        callback(responseToProxy);

    } catch (error) {
        console.log(chalk.red(`→ FAILED`));
        if (error instanceof Error) {
            console.error(chalk.dim(`   ${error.message}`));
        } else {
            console.error(chalk.dim(`   ${String(error)}`));
        }

        callback({
            status: 502,
            headers: {},
            data: JSON.stringify({ error: "LocalLoop Error", details: String(error) })
        });
    }
})

socket.on('disconnect', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    console.log(chalk.yellow('\n⚠️  Disconnected from Proxy. Retrying...'));
});