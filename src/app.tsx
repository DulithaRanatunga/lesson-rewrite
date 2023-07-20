import { Button, Rows, Text } from "@canva/app-ui-kit";
import { addNativeElement } from "@canva/design";
import * as React from "react";
import styles from "styles/components.css";
import { SelectionEvent, selection } from "@canva/preview/design";


export const App = () => {
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

  async function handleReplace() {
    if (!event || !isElementSelected) {
      return;
    }

    await selection.setContent(event, () => {
      return {
        text: "You updated the selected text!",
      };
    });
  }

  async function handleAdd() {
    if (!event || !isElementSelected) {
      return;
    }

    await selection.setContent(event, async (value) => {
      console.log(value);
      await addNativeElement({
        type: "TEXT",
        children: [value.text],
        color: "#ff0099",
        fontWeight: "bold"
      });
      return value;
    });
  }

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="2u">
        <Text>
          Select some content, then hit the button.
        </Text>
        <Button variant="primary" onClick={handleReplace} disabled={!isElementSelected} stretch>
          Replace
        </Button>
        <Button variant="primary" onClick={handleAdd} disabled={!isElementSelected} stretch>
          Add new
        </Button>
      </Rows>
    </div>
  );
};
