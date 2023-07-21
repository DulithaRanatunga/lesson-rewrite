import { Button, Rows, Text, Select, MultilineInput, Box, Column, Columns } from "@canva/app-ui-kit";
import { addNativeElement } from "@canva/design";
import * as React from "react";
import styles from "styles/components.css";
import { auth } from "@canva/user";
import { SelectionEvent, selection } from "@canva/preview/design";
import PlusIcon from "assets/icons/plus.svg";
import RefreshIcon from "assets/icons/refresh.svg"
import { warn } from "console";

const BACKEND_URL = `${BACKEND_HOST}/transform`;
const MIN_INPUT_SIZE = 5;

type State = "idle" | "loading" | "success" | "error";

export const App = () => {
  const [lastExecuted, setLastExecuted] = React.useState<SelectionEvent<"text"> | undefined>();
  const [selectedChanged, setSelectedChanged] = React.useState<Boolean>();
  const [state, setState] = React.useState<State>("idle");
  const [grade, setGrade] = React.useState<String>("seventh");
  const [curriculum, setCurriculum] = React.useState<String>("NSW Education");
  const [warnMessage, setWarnMessage] = React.useState<String>();
  const [event, setEvent] = React.useState<SelectionEvent<"text"> | undefined>();

  React.useEffect(() => {
    selection.registerOnChange({
      scope: "text",
      onChange: (event) => {
        console.log("FIRED", event)
        setSelectedChanged(event != lastExecuted);
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
          curriculum: curriculum,
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

  async function executeOnEachSelectedElement(functionToExecute) {
    if (!event || !isElementSelected) {
      return;
    }
    setLastExecuted(event);
    setSelectedChanged(false);
    await selection.setContent(event, async (value) => {
      // Ignore selections which don't have text.
      return !!value.text ? functionToExecute(value) : value;
    });
  }

  function buttonContent() {
    if (state === "idle" || selectedChanged) {
      return "Change your content"
    } else if (!selectedChanged) {
      return <span className={styles.refreshIconSpan}><RefreshIcon/> Try again</span>
    } 
    return undefined;
  }

  function resetSelection() {}

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="2u">
        <Text>
          To personalise learning for students, select elements along with the grade and curriculum standards that you want to change.
        </Text>
        <Select
          options={[
            { value: "fourth", label: "Grade 4" },
            { value: "fifth", label: "Grade 5" },
            { value: "sixth", label: "Grade 6" },
            { value: "seventh", label: "Grade 7" },
            { value: "eigth", label: "Grade 8" },
            { value: "ninth", label: "Grade 9" }
          ]}
          value={grade}
          onChange={(event) => setGrade(event)}
          stretch
        />
        <Select
          options={[
            { value: "NSW Education", label: "NSW Education" },
            { value: "Montessori", label: "Montessori" },
            { value: "American Common Core", label: "American Common Core" },
          ]}
          value={curriculum}
          onChange={(event) => setCurriculum(event)}
          stretch
        />
        <Box
          border="low"
          borderRadius="standard"
          background="contrast"
          padding="1u"
          >
            <div className={styles.removeBorder}>
          <MultilineInput
            autoGrow
            onChange={() => {}}
            placeholder="(Optional) Add more details about the student(s)"
          />
          </div>         
          <div className={styles.plusButton}>
          <Button variant="secondary" stretch>
            Try an example
            <PlusIcon /> 
          </Button>
          </div>
        </Box>
        <Button variant="primary" onClick={handleReplace} disabled={!isElementSelected || state === "loading"} loading={state === "loading"} stretch>
          {buttonContent()}
        </Button>
        { state === "success" && !selectedChanged && <Button variant="secondary" onClick={resetSelection} stretch>
          Reset to original text
        </Button>}        
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
