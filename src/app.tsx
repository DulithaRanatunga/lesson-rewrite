import { Button, Rows, Text, FormField, Select } from "@canva/app-ui-kit";
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
  const [grade, setGrade] = React.useState<String>("seventh");
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
          text: text,
          grade: grade,
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
        setWarnMessage("Some selected items were too short to be rewritten. These have been skipped.");
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
          This app will take content that you select and use AI technology to rewrite it at an age appropriate for your selected grade.
          To get started, select any items on your page and then press the replace button!
        </Text>
        <FormField
          label="Grade"
          description="The content you select will be re-written for this age."
          control={(props) => (
            <Select
              {...props} // <--- pass props down id, value and error to connect Select component to FormField
              options={[
                { value: "fourth", label: "Four" },
                { value: "fifth", label: "Five" },
                { value: "sixth", label: "Six" },
                { value: "seventh", label: "Seven" },
                { value: "eigth", label: "Eight" },
                { value: "ninth", label: "Nine" },
                { value: "tenth", label: "Ten" },
              ]}   
              value={grade}
              onChange={(event) => setGrade(event)}           
              stretch
            />
          )}
        />
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
          <Text tone="critical">Something went wrong</Text>
        )}
        {warnMessage && (        
          <Text tone="critical">{warnMessage}</Text>
        )}
      </Rows>
    </div>
  );
};
