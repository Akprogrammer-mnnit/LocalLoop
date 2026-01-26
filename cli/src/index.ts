#!/usr/bin/env node
import { Command } from "commander"
import { io, Socket } from "socket.io-client"
import axios from "axios"
import chalk from "chalk"


// const PRODUCTION_SERVER = 'https://localloop-server.onrender.com';
// const PRODUCTION_DASHBOARD_URL = 'https://local-loop-gamma.vercel.app'
const PRODUCTION_SERVER = 'http://localhost:3000';
const PRODUCTION_DASHBOARD_URL = 'http://localhost:5173'
let heartbeatInterval: NodeJS.Timeout;
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
}


const program = new Command()

program
    .version('1.0.1')
    .requiredOption('-p, --port <number>', 'Local port to forward', '3000')
    .option('-s, --subdomain <string>', 'Desired subdomain', 'random-dev')
    .option('-h, --host <string>', 'Proxy Server URL', process.env.PROXY_HOST || PRODUCTION_SERVER)
    .option('-k, --key <string>', 'Your Api Key')
    .option('-a, --auth <string>', 'Basic Auth (user:password)')
    .parse(process.argv);


const options = program.opts();
const LOCAL_TARGET = `http://localhost:${options.port}`
const PROXY_URL = options.host

console.log(chalk.cyan(`\n🚀 LocalLoop Starting...`));
console.log(chalk.gray(`Target: ${LOCAL_TARGET}`));
console.log(chalk.gray(`Proxy:  ${PROXY_URL}`));


const socket: Socket = io(PROXY_URL, {
    auth: {
        apiKey: options.key
    }
});

socket.on('connect', () => {
    console.log(chalk.green(`\n✅ Connected to Proxy!`));
    console.log(`Registering subdomain: ${chalk.bold(options.subdomain)}...`);
    socket.emit('register', {
        subdomain: options.subdomain,
        auth: options.auth
    });
})

socket.on('registered', (data: { url: string }) => {
    console.log(chalk.green(`\n🎉 Tunnel Live at: ${chalk.bold(data.url)}`));
    const fullId = data.url.split('/hook/')[1];
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
        socket.emit('heartbeat', { subdomain: fullId });
    }, 30000);
    const pathParts = data.url.split('/hook/')[1];
    console.log(chalk.green(`📊 Dashboard: ${PRODUCTION_DASHBOARD_URL}/dashboard/${pathParts}`));
    console.log(chalk.yellow(`Waiting for requests...\n`));
});

socket.on('error', (err: any) => {
    const message = err.message || err;
    console.error(chalk.red(`❌ Error: ${message}`));
    process.exit(1);
});

socket.on("incoming-request", async (payload: ForwardedRequest, callback) => {
    const { method, path, body, headers } = payload;
    console.log(chalk.blue(`📨 ${method} ${path}`));

    try {
        const cleanHeaders = { ...headers };

        Object.keys(cleanHeaders).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (lowerKey === 'host' ||
                lowerKey === 'content-length' ||
                lowerKey === 'accept-encoding' ||
                lowerKey === 'origin' ||
                lowerKey === 'referer') {
                delete cleanHeaders[key];
            }
        });

        cleanHeaders["host"] = `localhost:${options.port}`;

        const response = await axios({
            method: method as any,
            url: `${LOCAL_TARGET}/${path}`,
            headers: cleanHeaders,
            data: body,
            validateStatus: () => true
        });

        console.log(chalk.green(`   ↳ Forwarded Successfully (${response.status})`));

        const responseHeaders = { ...response.headers };
        delete responseHeaders["content-length"];
        delete responseHeaders["transfer-encoding"];
        delete responseHeaders["content-encoding"];
        delete responseHeaders["connection"];

        const responseToProxy: LocalResponse = {
            status: response.status,
            headers: responseHeaders,
            data: response.data
        };

        callback(responseToProxy);

    } catch (error) {
        if (error instanceof Error) {
            console.error(chalk.red(`   ↳ Failed to connect to local app: ${error.message}`));
        }
        else {
            console.error(chalk.red(`   ↳ Failed to connect to local app: ${error}`));
        }

        const errorResponse: LocalResponse = {
            status: 502,
            headers: {},
            data: {
                error: "LocalLoop Error",
                details: error instanceof Error ? error.message : String(error)
            }
        };
        callback(errorResponse);
    }
})

socket.on('disconnect', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    console.log(chalk.red('\n🔌 Disconnected from Proxy. Retrying...'));
});