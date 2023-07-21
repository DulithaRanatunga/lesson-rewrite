import { Button, Rows, Text, Select, MultilineInput, Box } from "@canva/app-ui-kit";
import * as React from "react";
import styles from "styles/components.css";
import { auth } from "@canva/user";
import { SelectionEvent, selection } from "@canva/preview/design";
import PlusIcon from "assets/icons/plus.svg";
import RefreshIcon from "assets/icons/refresh.svg"

const BACKEND_URL = `${BACKEND_HOST}/transform`;
const MIN_INPUT_SIZE = 5;

type State = "idle" | "loading" | "success" | "error";

export const App = () => {
  // New message -> Original Message
  const [conversionsMap, setConversionsMap] = React.useState<any>({});
  const [selectionIncludesChangedItems, setSelectionIncludesChangedItems] = React.useState<Boolean>();
  const [state, setState] = React.useState<State>("idle");
  const [extraPrompt, setExtraPrompt] = React.useState<string>();
  const [grade, setGrade] = React.useState<string>("seventh");
  const [curriculum, setCurriculum] = React.useState<string>("NSW Education");
  const [warnMessage, setWarnMessage] = React.useState<string>();
  const [event, setEvent] = React.useState<SelectionEvent<"text"> | undefined>();

  React.useEffect(() => {
    selection.registerOnChange({
      scope: "text",
      onChange: (event) => {
        setEvent(event)
      }
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
          extraPrompt: extraPrompt
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

  // From https://stackoverflow.com/a/52171480
  const cyrb53 = (str, seed = 0) => {
      let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
      for(let i = 0, ch; i < str.length; i++) {
          ch = str.charCodeAt(i);
          h1 = Math.imul(h1 ^ ch, 2654435761);
          h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
      h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
      h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    
      return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  };


  async function handleReplace() {
    reset();
    executeOnEachSelectedElement(async (value) => {
      console.log(value);
      const currentText = value.text;
      if (currentText.split(" ").length < MIN_INPUT_SIZE) {
        setWarnMessage("Some selected items were too short to be rewritten. These have been skipped.");
        return { text: currentText }
      }
      // If a previous message exists for this one, use the original text.
      console.log(conversionsMap)
      var originalText = conversionsMap[cyrb53(currentText)] || currentText;
      const response = await callTransformApi(originalText);

      // Store converted messages. 
      conversionsMap[cyrb53(response.text)]=originalText;
      return { text: response.text };
    });
    setSelectionIncludesChangedItems(true);
  }

  function reset() {
    setWarnMessage(undefined);
  }

  async function executeOnEachSelectedElement(functionToExecute) {
    if (!event || !isElementSelected) {
      return;
    }
    await selection.setContent(event, async (value) => {
      // Ignore selections which don't have text.
      return !!value.text ? functionToExecute(value) : value;
    });
  }

  function buttonContent() {
    if (state === "idle" || !selectionIncludesChangedItems) {
      return "Change your content"
    } else if (selectionIncludesChangedItems) {
      return <span className={styles.refreshIconSpan}><RefreshIcon/> Try again</span>
    } 
    return undefined;
  }

  function addPromptExample() {
    setExtraPrompt("Provide examples in Spanish and English")
  }

  function resetSelection() {
    executeOnEachSelectedElement(async (value) => {
      const currentText = value.text;
      var originalText = conversionsMap[cyrb53(currentText)]
      return { text: originalText || currentText}
    })
    setSelectionIncludesChangedItems(false)
  }

  function handleSelectionEvent() {
    setSelectionIncludesChangedItems(false);
    // If any of the currently selected values have been converted before
    // then show the tryAgain and reset prompt
    executeOnEachSelectedElement(async (value) => {
      // But check hashes.
      if (!!conversionsMap[cyrb53(value.text)]) {
        setSelectionIncludesChangedItems(true);
      }

      // Don't change anything
      return value;
    })
  }

  React.useEffect(() => {
    handleSelectionEvent()
  }, [event])

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
            value={extraPrompt}
            onChange={(value) => setExtraPrompt(value)}
            placeholder="(Optional) Add more details about the student(s)"
          />
          </div>         
          <div className={styles.plusButton}>
          <Button variant="secondary" stretch onClick={addPromptExample} disabled={extraPrompt?.length > 0}>
            Try an example
            <PlusIcon /> 
          </Button>
          </div>
        </Box>
        <Button variant="primary" onClick={handleReplace} disabled={!isElementSelected || state === "loading"} loading={state === "loading"} stretch>
          {buttonContent()}
        </Button>
        { state === "success" && selectionIncludesChangedItems && <Button variant="secondary" onClick={resetSelection} stretch>
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
