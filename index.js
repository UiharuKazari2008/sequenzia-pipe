const config = require('./config.json')
const express = require("express");
const app = module.exports = express();
const request = require("request");
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require("express-rate-limit");
const https = require("https");

app.use(function (req, res, next) {
    res.setHeader('X-Powered-By', 'Sequenzia CDN Proxy Pipe');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next()
})
app.use(cors());
app.use(morgan(function(tokens, req, res) {
    if (res.statusCode !== 304 && res.method === 'GET') {
        console.log(`${req.method} ${res.statusCode} ${req.originalUrl} - Completed in ${tokens['response-time'](req, res)}ms - Send ${tokens.res(req, res, 'content-length')}`)
    } else {
        console.log(`${req.method} ${res.statusCode} ${req.originalUrl} - Completed in ${tokens['response-time'](req, res)}ms - Send Nothing`)
    }

}));
app.set('trust proxy', 1);
app.use('/pipe', rateLimit({
    windowMs: 60 * 1000, // 1 minutes
    max: 1000,
    message:
        "Sequenzia Proxy: Too many requests"
}));
app.use('/pipe', async function (req, res) {
    try {
        const params = req.path.substr(1, req.path.length - 1).split('/')
        if (params.length === 3) {
            const request = https.get('https://cdn.discordapp.com/attachments/' + params.join('/'), {
                headers: {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'accept-language': 'en-US,en;q=0.9',
                    'cache-control': 'max-age=0',
                    'sec-ch-ua': '"Chromium";v="92", " Not A;Brand";v="99", "Microsoft Edge";v="92"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 Edg/92.0.902.73'
                }
            }, async function (response) {
                const contentType = response.headers['content-type'];
                if (contentType) {
                    res.setHeader('Content-Type', contentType);
                    response.pipe(res);
                } else {
                    res.status(500).end();
                    console.error(`Failed to stream file request - No Data`);
                    console.error(response.rawHeaders);
                }
            });
            request.on('error', function (e) {
                res.status(500).send('Error during proxying request');
                console.error(`Failed to stream file request - ${e.message}`);
            });
        } else {
            res.status(400).send('Missing Parameters');
            console.error(`Invalid Request to proxy, missing a message ID`)
        }
    } catch (err) {
        res.status(500).json({
            state: 'HALTED',
            message: err.message,
        });
    }
});

const server = app.listen((process.env.NODE_APP_INSTANCE) ? parseInt(process.env.NODE_APP_INSTANCE.toString()) + config.port : config.port, () => {
    console.log(`Proxy server is running on port ${server.address().port}`);
    if (process.hasOwnProperty("send"))
        process.send('ready');
});

if (config.watchdog_host && config.watchdog_id) {
    setInterval(() => {
        request.get(`http://${config.watchdog_host}/watchdog/ping?id=${config.watchdog_id}&entity=SeqProxy-${config.system_name}${(process.env.NODE_APP_INSTANCE) ? '-' + process.env.NODE_APP_INSTANCE : ''}`, async (err, res) => {
            if (err || res && res.statusCode !== undefined && res.statusCode !== 200) {
                console.error(`Failed to ping watchdog server ${config.watchdog_host} as SeqProxy:${config.watchdog_id}${(process.env.NODE_APP_INSTANCE) ? ':' + process.env.NODE_APP_INSTANCE : ''}`);
            }
        })
    }, 60000);
    request.get(`http://${config.watchdog_host}/watchdog/init?id=${config.watchdog_id}&entity=SeqProxy-${config.system_name}${(process.env.NODE_APP_INSTANCE) ? '-' + process.env.NODE_APP_INSTANCE : ''}`, async (err, res) => {
        if (err || res && res.statusCode !== undefined && res.statusCode !== 200) {
            console.error(`Failed to init watchdog server ${config.watchdog_host} as SeqProxy:${config.watchdog_id}${(process.env.NODE_APP_INSTANCE) ? ':' + process.env.NODE_APP_INSTANCE : ''}`);
        }
    })
}
