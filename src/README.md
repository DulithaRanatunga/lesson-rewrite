This app has two parts:

`app.tsx` is a frontend react app that gets loaded by Canva. I think in practice this would get built and deployed directly as JS.
`server.ts` is a backend express app that app.tsx communicates with. In practice this would need to be deployed somewhere else.

For now, both of these run on localhost.

`server.ts` uses the _PERSONAL_ API key saved in `.env` to communicate with OPEN AI API.
To get an API key, follow the handbook guide: https://docs.canva.tech/machine-learning/openai/openai-backend/#prerequisites

`npm start` should run both!


## Todo:
- Make the number of tokens similar to input size
- Make the temperature UI tweakable (just for testing)
- Add to a new page
- Make the new content not break the page.
- Replace images