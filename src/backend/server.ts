require("dotenv").config();
import * as express from "express";
import * as cors from "cors";
import { createBaseServer } from "../../utils/backend/base_backend/create";
import { createJwtMiddleware } from "../../utils/backend/jwt_middleware";
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// RADR Model:
const ROLE = "Imagine you are a high school teacher preparing to give a lesson on a particular subject";
const ASK = ". I will provide you with some text content and I would like you to rewrite the content you are provided with in language that is appropriate for a {} grade student "
const CURRICULUM = ". The new content should be adapted to {} standards "
const CONTENT_LENGTH = ". If possible, try to make your response shorter than the input prompt."
const SUCCESS_PREFIX = "_yessir:";
const FAIL_PREFIX = "_sorry, I cannae do that capn!"
const SUCCESS_PROMPT = ". If you can do this, please start your response with " + SUCCESS_PREFIX;
const FAILIURE_PROMPT = ". If you are unable to do so, please start your response with " + FAIL_PREFIX;

function getAsk(grade, curriculum, extraPrompt){
  var ask = ROLE + ASK.replace("{}", grade || "seventh") + CURRICULUM.replace("{}", curriculum || "NSW Education") + CONTENT_LENGTH + extraPrompt + SUCCESS_PROMPT + FAILIURE_PROMPT;
  console.log(ask);
  return ask;
}

function getMaxWords(text) {
  return 1024;
  // return Math.round(text.split(" ").length * 2); // We don't want the output to be hugely disproportinate to the input, but doing something like 1.05% seemed to get cut off.
}

async function getChatGPTResponse(inputText, grade, curriculum, extraPrompt) {  
  try {
    const openAiResponse = await openai.createChatCompletion({
      model: "gpt-dv-canva",
      messages: [
        {
          "role": "system",
          "content": getAsk(grade, curriculum, extraPrompt)
        },
        {
          "role": "user",
          "content": inputText
        }
      ],
      temperature: 0.6,
      max_tokens: getMaxWords(inputText),
    });
    const data = await openAiResponse.data;
    const text = data.choices[0].message.content;
    if (text.indexOf(SUCCESS_PREFIX) !== -1) {
      return text.substring(SUCCESS_PREFIX.length).trim();
    } else if (text.indexOf(FAIL_PREFIX) !== -1) {
      console.log("OpenAI couldn't answer this validly");
    } else {
      console.log("Unexpected response");
    }
  } catch (error) {
    console.log("GPT Request Failed");
  }
}

async function main() {
  const APP_ID = process.env.CANVA_APP_ID;

  if (!APP_ID) {
    throw new Error(
      `The CANVA_APP_ID environment variable is undefined. Set the variable in the project's .env file.`
    );
  }

  const router = express.Router();

  /**
   * TODO: Configure your CORS Policy
   *
   * Cross-Origin Resource Sharing
   * ([CORS](https://developer.mozilla.org/en-US/docs/Glossary/CORS)) is an
   * [HTTP](https://developer.mozilla.org/en-US/docs/Glossary/HTTP)-header based
   * mechanism that allows a server to indicate any
   * [origins](https://developer.mozilla.org/en-US/docs/Glossary/Origin)
   * (domain, scheme, or port) other than its own from which a browser should
   * permit loading resources.
   *
   * A basic CORS configuration would include the origin of your app in the
   * following example:
   * const corsOptions = {
   *   origin: 'https://app-abcdefg.canva-apps.com',
   *   optionsSuccessStatus: 200
   * }
   *
   * The origin of your app is https://app-${APP_ID}.canva-apps.com, and note
   * that the APP_ID should to be converted to lowercase.
   *
   * https://www.npmjs.com/package/cors#configuring-cors
   *
   * You may need to include multiple permissible origins, or dynamic origins
   * based on the environment in which the server is running. Further
   * information can be found
   * [here](https://www.npmjs.com/package/cors#configuring-cors-w-dynamic-origin).
   */
  router.use(cors());

  const jwtMiddleware = createJwtMiddleware(APP_ID);
  router.use(jwtMiddleware);

  router.post("/transform", async (req, res) => {
    console.log("request", req.body);
    const newContent = await getChatGPTResponse(req.body.text.trim(), req.body.grade, req.body.curriculum, req.body.extraPrompt);
    if (newContent) {
      const response = {
        text: newContent
      };
      console.log("response", response)
      res.status(200).send(response);
    } else {
      console.log("GPT Request failed");
      res.status(500).send({
        error: "GPT Request Failed"
      });
    }
  });

  const server = createBaseServer(router);
  server.start(process.env.CANVA_BACKEND_PORT);
}

main();
