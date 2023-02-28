import {ChatGPTAPIBrowser} from "../lib/chatgpt";
import http from "http";
import {oraPromise} from "ora";

let nodeMap = new Map()

export async function listenServer2(port: number) {
    const server = http.createServer((req, rsp) => {
        const array = []
        req.on('data', (chunk) => {
            array.push(chunk)
        })
        req.on('end', async () => {
            log("params parse: ", req.method)
            if (req.method === "POST") {
                let params = Buffer.concat(array).toString()
                try {
                    log("params:", params)
                    if (typeof params === "string") {
                        req.params = JSON.parse(params)
                    }
                } catch (e) {
                    log('parse post params error: ' + e)
                }
            }
            await router(req, rsp)
        })
    })
    server.listen(port, () => {
        log('chatgpt server is start on ', port)
    })
}

async function router(req, rsp) {
    const path = req.url
    switch (path) {
        case "/ask":
            await ask(req, rsp);
            break
        case "/add_nodes":
            await addNodes(req, rsp);
            break
        case "/restart_nodes":
            await restartNodes(req, rsp);
            break
        default:
            response(rsp, 0, req.url, 'page not find')
    }
}

function response(rsp, code = 0, message = "", data = {}) {
    let res
    try {
        res = JSON.stringify({
            "code": code,
            "message": message,
            "data": data
        })
    } catch (e) {
        res = "request err: response data type error"
    }
    rsp.end(res)
}

async function addNodes(req, rsp) {
    let nodes = req.params.nodes
    let messages = new Map()
    for (let i in nodes) {
        let item = nodes[i]
        if (nodeMap.has(item.email)) {
            messages[item.email] = "registered"
            continue
        }
        const api = new ChatGPTAPIBrowser({
            email: item.email,
            password: item.password,
        })
        try {
            await api.initSession()
            nodeMap.set(item.email, api)
            messages[item.email] = "ok"
        }catch (e){
            log("add node ", item.email, "error: ", e)
            messages[item.email] = "error"
            await api.closeSession()
        }
    }
    response(rsp, 0, "", messages)
}

async function restartNodes(req, rsp) {
    let nodes = req.params.nodes
    let messages = new Map()
    for (let i in nodes) {
        let item = nodes[i]
        if (!nodeMap.has(item.email)) {
            messages[item.email] = "not register"
            continue
        }
        const api = nodeMap.get(item.email)
        try {
            await api.closeSession()
            await api.initSession()
            nodeMap.set(item.email, api)
            messages[item.email] = "ok"
        }catch (e){
            log("restart node ", item.email, "error: ", e)
            messages[item.email] = "error"
            await api.closeSession()
        }
    }
    response(rsp, 0, "", messages)
}

async function ask(req, rsp) {
    let message = ""
    let code = 0
    let node = req.params.node

    if (!nodeMap.has(node)) {
        response(rsp, 0, node + " not register yet")
        return
    }
    let api = nodeMap.get(node)
    log('request node: ', req.node)
    let reply = {}
    try {
        log('request: ', req.params)
        let context = {}
        if (req.params.conversationId.length === 0) {
            context = {
                conversationId: req.params.conversationId,
                parentMessageId: req.params.messageId
            }
        }
        reply = await oraPromise(
            api.sendMessage(req.params.message, context),
            {
                text: req.params.message
            }
        )

        log('reply: ', reply)
        log('******************************')
        log('******************************\n')
    } catch (e) {
        log('request ask err: ' + e)
        message = e.statusText
        code = e.statusCode
    }

    response(rsp, code, message, reply)
}


function log(str, ...optionalParams: any[]) {
    console.log(new Date().toLocaleString() + ": " + str, ...optionalParams)
}