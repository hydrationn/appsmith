import { generateReactKey } from "utils/generators";
import type { BaseWidgetProps } from "widgets/BaseWidgetHOC/withBaseWidgetHOC";

export const mockInputProps = (): BaseWidgetProps => ({
  type: "INPUT_WIDGET_V2",
  widgetId: generateReactKey(),
  widgetName: "Input1",
  renderMode: "CANVAS",
  version: 1,
  isLoading: false,
  parentColumnSpace: 10,
  parentRowSpace: 10,
  leftColumn: 0,
  rightColumn: 10,
  topRow: 0,
  bottomRow: 7,
});
