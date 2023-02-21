import {
  DataTreeWidget,
  WidgetEntityConfig,
} from "entities/DataTree/dataTreeFactory";
import { klona } from "klona";
import { WidgetMetaState } from ".";
import { PropertyOverrideDependency } from "entities/DataTree/types";

export function getMetaWidgetResetObj(
  evaluatedWidget: DataTreeWidget | undefined,
  evaluatedWidgetConfig: WidgetEntityConfig,
) {
  // reset widget: sets the meta values to current default values of widget
  const resetMetaObj: WidgetMetaState = {};

  // evaluatedWidget is widget data inside dataTree, this will have latest default values of widget
  if (evaluatedWidget) {
    const { propertyOverrideDependency } = evaluatedWidgetConfig;
    // propertyOverrideDependency has defaultProperty name for each meta property of widget
    Object.entries(
      propertyOverrideDependency as PropertyOverrideDependency,
    ).map(([propertyName, dependency]) => {
      const defaultPropertyValue =
        dependency.DEFAULT && evaluatedWidget[dependency.DEFAULT];
      if (defaultPropertyValue !== undefined) {
        // cloning data to avoid mutation
        resetMetaObj[propertyName] = klona(defaultPropertyValue);
      }
    });
  }
  return resetMetaObj;
}
