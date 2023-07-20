import { Button, Rows, Text } from "@canva/app-ui-kit";
import { addNativeElement } from "@canva/design";
import * as React from "react";
import styles from "styles/components.css";
import { auth } from "@canva/user";
import { SelectionEvent, selection } from "@canva/preview/design";
import { warn } from "console";

const BACKEND_URL = `${BACKEND_HOST}/transform`;
const MIN_INPUT_SIZE = 5;

type State = "idle" | "loading" | "success" | "error";

export const App = () => {
  const [state, setState] = React.useState<State>("idle");
  const [warnMessage, setWarnMessage] = React.useState<String>();
  const [event, setEvent] = React.useState<SelectionEvent<"text"> | undefined>();

  React.useEffect(() => {
    selection.registerOnChange({
      scope: "text",
      onChange: (event) => {
        setEvent(event);
      },
    });
  }, []);

  const isElementSelected = event && event.count > 0;

  async function callTransformApi(text) {
    try {
      setState("loading");
      const token = await auth.getCanvaUserToken();
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text
        })
      });
      
      if (!res.ok) {
        throw new Error("BE Request Failed");
      }

      const body = await res.json();
      setState("success");
      return body;
    } catch (error) {
      setState("error");
      console.error(error);
    }
  };


  async function handleReplace() {
    reset();
    executeOnEachSelectedElement(async (value) => {
      const textContent = value.text;
      if (textContent.split(" ").length < MIN_INPUT_SIZE) {
        setWarnMessage("Some selected items were too short to be rewritten.");
        return { text: textContent }
      }
      const response = await callTransformApi(value.text);      
      return { text: response.text };
    });
  }

  function reset() {
    setWarnMessage(undefined);
  }

  async function handleAdd() {
    reset();
    executeOnEachSelectedElement(async (value) => {
      const response = await callTransformApi(value.text);
      await addNativeElement({
        type: "TEXT",
        children: [response.text],
        color: "#ff0099",
        fontWeight: "bold"
      });
      return value;
    })
  }

  async function executeOnEachSelectedElement(functionToExecute) {
    if (!event || !isElementSelected) {
      return;
    }

    await selection.setContent(event, async (value) => {
      // Ignore selections which don't have text.
      return !!value.text ? functionToExecute(value): value;
    });
  }

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="2u">
        <Text>
          Select some content, then hit the button.
        </Text>
        <Button variant="primary" onClick={handleReplace} disabled={!isElementSelected || state === "loading"} loading={state === "loading"} stretch>
          Replace
        </Button>
        <Button variant="primary" onClick={handleAdd} disabled={!isElementSelected || state === "loading"} loading={state === "loading"} stretch>
          Add new
        </Button>
        {state === "success" && (
          <Text>Success!</Text>
        )}
        {state === "error" && (        
          <Text>Something went wrong</Text>
        )}
        {warnMessage && (        
          <Text>{warnMessage}</Text>
        )}
      </Rows>
    </div>
  );
};
