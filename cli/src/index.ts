#!/usr/bin/env node
import {Command} from "commander"
import {io,Socket} from "socket.io-client"
import axios from "axios"
import chalk from "chalk"


const PRODUCTION_SERVER = 'https://localloop-server.onrender.com';
const PRODUCTION_DASHBOARD_URL = 'https://local-loop-gamma.vercel.app'
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
  .option('-k, --key <string>','Your Api Key')
  .parse(process.argv);


const options = program.opts();
const LOCAL_TARGET = `http://localhost:${options.port}`
const PROXY_URL = options.host 

console.log(chalk.cyan(`\n🚀 LocalLoop Starting...`));
console.log(chalk.gray(`Target: ${LOCAL_TARGET}`));
console.log(chalk.gray(`Proxy:  ${PROXY_URL}`));


const socket: Socket = io(PROXY_URL,{
    auth: {
        apiKey: options.key
    }
});

socket.on('connect',()=>{
    console.log(chalk.green(`\n✅ Connected to Proxy!`));
    console.log(`Registering subdomain: ${chalk.bold(options.subdomain)}...`);
    socket.emit('register', options.subdomain);
})

socket.on('registered', (data: { url: string }) => {
    console.log(chalk.green(`\n🎉 Tunnel Live at: ${chalk.bold(data.url)}`));
    const pathParts = data.url.split('/hook/')[1]
    const DASHBOARD_URL = PRODUCTION_DASHBOARD_URL;
    console.log(chalk.cyan(`📊 Dashboard: ${DASHBOARD_URL}/dashboard/${pathParts}`));
    console.log(chalk.yellow(`Waiting for requests...\n`));
});

socket.on('error', (msg: string) => {
    console.error(chalk.red(`❌ Error: ${msg}`));
    process.exit(1);
});


socket.on("incoming-request", async (payload: ForwardedRequest , callback) => {
    const { method, path, body, headers } = payload;
    console.log(chalk.blue(`📨 ${method} ${path}`));

    try {
        delete headers["host"]

        const response = await axios({
            method: method as any,
            url: `${LOCAL_TARGET}/${path}`,
            headers: headers,
            data: body,
            validateStatus: () => true
        })

        console.log(chalk.green(`   ↳ Forwarded Successfully (${response.status})`));

        const responseToProxy: LocalResponse = {
            status: response.status,
            headers: response.headers,
            data: response.data
        };
        
        callback(responseToProxy);
    } catch (error) {
        if (error instanceof Error){
            console.error(chalk.red(`   ↳ Failed to connect to local app: ${error.message}`));
        }
        else{
            console.error(chalk.red(`   ↳ Failed to connect to local app: ${error}`));
        }
        
        const errorResponse: LocalResponse = {
            status: 502,
            headers: {},
            data: { error: "LocalLoop CLI could not reach your localhost server." }
        };
        callback(errorResponse);
    }
})

socket.on('disconnect', () => {
    console.log(chalk.red('\n🔌 Disconnected from Proxy. Retrying...'));
});