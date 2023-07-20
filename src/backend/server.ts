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
const ROLE = "Imagine you are a high school teacher preparing to give a lesson on a particular subject.";
const ASK = "I will provide you with some text content and I would like you to rewrite the content you are provided with in language that is appropriate for a seventh grade student.";
const SUCCESS_PREFIX =  "_yessir:";
const FAIL_PREFIX = "_sorry, I cannae do that capn!"
const SUCCESS_PROMPT = "If you can do this, please start your response with " + SUCCESS_PREFIX;
const FAILIURE_PROMPT = "If you are unable to do so, please start your response with " + FAIL_PREFIX;

async function getChatGPTResponse(inputText) {
  return await openai.createChatCompletion({
    model: "gpt-dv-canva",
    messages: [
      {
        "role": "system",
        "content": ROLE + ASK + SUCCESS_PROMPT + FAILIURE_PROMPT
      },
      {
        "role": "user",
        "content": inputText
      }
    ],
    temperature: 0,
    max_tokens: 1024,
  });
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

  /*
   * TODO: Define your backend routes after initializing the jwt middleware.
   */
  router.post("/transform", async (req, res) => {
    console.log("request", req.body);
    try {
      const gptd = await getChatGPTResponse(req.body.text);
      const response =  {
        text: gptd.data.choices[0].message.content
      };
      console.log("response", response)
      res.status(200).send(response);
    } catch (error) {
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
