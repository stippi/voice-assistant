import express, {NextFunction, Request, RequestHandler, Response} from 'express';
import admin from 'firebase-admin';
import path from "path";
import {ChatService} from "./services/chat.service";
import {Chat, ChatInfo} from "./model/chat";
import {AssistantService} from "./services/assistant/assistant.service";
import {UserInfo} from "./model/userInfo";
import {SettingsService} from "./services/settings.service";
import {Message} from "./model/message";

import multer from 'multer';


import { pipeline } from "node:stream/promises";
import {createProxyMiddleware } from 'http-proxy-middleware';
import {completionsApiUrl} from "./config";
import OpenAI from "openai";
import {toFile} from "openai";

admin.initializeApp()

const chatService = new ChatService();
const assistantService = new AssistantService();
const settingsService = new SettingsService();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/app', express.static(path.join(__dirname, '../public')));

interface UserBoundRequest extends Request {
  uid?: string;
}

const verifyIdToken = async (req: UserBoundRequest, res: Response, next: NextFunction) => {
  const idToken = req.headers.authorization?.split(' ').pop();

  if (!idToken) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.uid = decodedToken.uid;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized', error });
  }
};

const asyncMiddleware = (func: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  return Promise
    .resolve(func(req, res, next))
    .catch(next);
};

app.use('/api', verifyIdToken);

app.get('/api/chats', asyncMiddleware(async (req, res) => {
  const chats: ChatInfo[] = await chatService.listChats();
    res.json(chats);
}));

app.get('/api/chats/:id', asyncMiddleware(async (req, res) => {
  const chat: Chat = await chatService.getChatById(req.params.id);
  res.json(chat);
}));

app.put('/api/chats/:id', asyncMiddleware(async (req, res) => {
    const chat: Chat = req.body;
    await chatService.updateChat(chat);
    res.json(chat);
}));

app.patch('/api/chats/:id', asyncMiddleware(async (req, res) => {
    const chatPatch: Partial<Chat> = req.body;
    const chat = await chatService.getChatById(req.params.id);

    if(chatPatch.id) {
        delete chatPatch.id;
    }

    if (chatPatch.messages) {
        chatPatch.messages = [...chat.messages, ...chatPatch.messages];
    }

    const updatedChat = {...chat, ...chatPatch};
    await chatService.updateChat(updatedChat);
    res.json(chat);
}));

app.delete('/api/chats/:id', asyncMiddleware(async (req, res) => {
    await chatService.deleteChat(req.params.id);
    res.json({id: req.params.id});
}));

app.post('/api/chats/:id/generate-response', asyncMiddleware(async (req: UserBoundRequest, res) => {
    const chatId = req.params.id;
    const newMessages:Message[] = req.body.newMessages;
    const stream: boolean = req.body.stream;
    const audio: boolean = req.body.audio || false;
    const userInfo: UserInfo = req.body.userInfo;

    if(!req.uid){
        res.status(401).json({message: 'Unauthorized'});
        console.error("Unauthorized - no uid")
        return;
    }

    const settings = await settingsService.getSettings(req.uid);
    const chat = await chatService.getChatById(chatId);

    const messages = [...chat.messages, ...newMessages];
    if (stream) {
        res.status(400).json({message: 'Stream is not supported yet'});
        return;
    }
    else {
        const response = await assistantService.generateResponse(messages, userInfo, settings , audio);
        chat.messages.push(...newMessages, ...response);
        await chatService.updateChat(chat);
        res.json(response);
    }
}));

app.get('/api/settings', asyncMiddleware(async (req: UserBoundRequest, res) => {
    if(!req.uid){
        res.status(401).json({message: 'Unauthorized'});
        console.error("Unauthorized - no uid")
        return;
    }

    const settings = await settingsService.getSettings(req.uid);
    res.json(settings);
}));

app.put('/api/settings', asyncMiddleware(async (req: UserBoundRequest, res) => {
    if(!req.uid){
        res.status(401).json({message: 'Unauthorized'});
        console.error("Unauthorized - no uid")
        return;
    }

    const settings = req.body;
    await settingsService.updateSettings(req.uid, settings);
    res.json(settings);
}));

const completionsApiKey = process.env.OPENAI_API_KEY;

if (!completionsApiKey) {
    throw new Error("OPENAI_API_KEY is not set");
}

app.post('/api/ai/chat/completions', asyncMiddleware(async (req, res) => {
    const openAi = new OpenAI({
        apiKey: completionsApiKey,
        baseURL: completionsApiUrl
    });

    const messages = req.body.messages;
    const modelName = req.body.model;
    const stream = req.body.stream;

    if (stream) {
        const stream = openAi.beta.chat.completions.stream({
            messages: messages,
            model: modelName,
            stream: true,
        });

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Transfer-Encoding": "chunked"
        });

        for await (const chunk of stream) {
            console.log("Sending chunk");
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        console.log("Stream ended");
        res.write("data: [DONE]\n\n");
        res.end();
        return;
    }

    const completionResponse = await openAi.chat.completions.create({
        messages: messages,
        model: modelName
    });
    res.json(completionResponse);
}));

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

app.post('/api/ai/audio/transcriptions', upload.any(), asyncMiddleware(async (req, res) => {
    const openAi = new OpenAI({
        apiKey: completionsApiKey,
        baseURL: completionsApiUrl
    });

    const files = req.files as Express.Multer.File[];
    if (files === undefined || files.length != 1) {
        res.status(400).json({ message: 'You can uploaded only one file' });
        return;
    }

    const file = files[0];
    const modelName = req.body.model;
    const language = req.body.language;

    if (!file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }

    const completionResponse = await openAi.audio.transcriptions.create({
        file: await toFile(file.buffer, file.originalname, {type: file.mimetype }),
        language: language,
        model: modelName
    });

    res.json(completionResponse);
}));

app.post('/api/ai/audio/speech', asyncMiddleware(async (req, res) => {
    const openAi = new OpenAI({
        apiKey: completionsApiKey,
        baseURL: completionsApiUrl
    });

    const input = req.body.input;
    const model = req.body.model;
    const speed = req.body.speed;
    const voice = req.body.voice;

    const completionResponse = await openAi.audio.speech.create({
        input: input,
        model: model,
        speed: speed,
        voice: voice
    });

    const buffer = await completionResponse.arrayBuffer()
    res.header('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(buffer));
}));


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
