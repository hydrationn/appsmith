import equal from "fast-deep-equal/es6";
import React from "react";

import BaseWidget, { WidgetProps } from "./BaseWidget";
import {
  MAIN_CONTAINER_WIDGET_ID,
  RenderModes,
} from "constants/WidgetConstants";
import {
  getWidgetEvalValues,
  getIsWidgetLoading,
} from "selectors/dataTreeSelectors";
import {
  getMainCanvasProps,
  computeMainContainerWidget,
  getChildWidgets,
  getRenderMode,
} from "selectors/editorSelectors";
import { AppState } from "@appsmith/reducers";
import { useDispatch, useSelector } from "react-redux";
import { getWidget } from "sagas/selectors";
import {
  createCanvasWidget,
  createLoadingWidget,
} from "utils/widgetRenderUtils";
import { ReduxActionTypes } from "ce/constants/ReduxActionConstants";
import { checkContainersForAutoHeightAction } from "actions/autoHeightActions";

const WIDGETS_WITH_CHILD_WIDGETS = ["LIST_WIDGET", "FORM_WIDGET"];

function withWidgetProps(WrappedWidget: typeof BaseWidget) {
  function WrappedPropsComponent(
    props: WidgetProps & { skipWidgetPropsHydration?: boolean },
  ) {
    const { children, skipWidgetPropsHydration, type, widgetId } = props;

    const canvasWidget = useSelector((state: AppState) =>
      getWidget(state, widgetId),
    );
    const mainCanvasProps = useSelector((state: AppState) =>
      getMainCanvasProps(state),
    );
    const renderMode = useSelector(getRenderMode);
    const evaluatedWidget = useSelector((state: AppState) =>
      getWidgetEvalValues(state, canvasWidget?.widgetName),
    );
    const isLoading = useSelector((state: AppState) =>
      getIsWidgetLoading(state, canvasWidget?.widgetName),
    );

    const dispatch = useDispatch();

    const childWidgets = useSelector((state: AppState) => {
      if (!WIDGETS_WITH_CHILD_WIDGETS.includes(type)) return undefined;
      return getChildWidgets(state, widgetId);
    }, equal);

    let widgetProps: WidgetProps = {} as WidgetProps;

    if (!skipWidgetPropsHydration) {
      const canvasWidgetProps = (() => {
        if (widgetId === MAIN_CONTAINER_WIDGET_ID) {
          return computeMainContainerWidget(canvasWidget, mainCanvasProps);
        }

        return evaluatedWidget
          ? createCanvasWidget(canvasWidget, evaluatedWidget)
          : createLoadingWidget(canvasWidget);
      })();

      widgetProps = { ...canvasWidgetProps };

      /**
       * MODAL_WIDGET by default is to be hidden unless the isVisible property is found.
       * If the isVisible property is undefined and the widget is MODAL_WIDGET then isVisible
       * is set to false
       * If the isVisible property is undefined and the widget is not MODAL_WIDGET then isVisible
       * is set to true
       */
      widgetProps.isVisible =
        canvasWidgetProps.isVisible ??
        canvasWidgetProps.type !== "MODAL_WIDGET";

      if (
        props.type === "CANVAS_WIDGET" &&
        widgetId !== MAIN_CONTAINER_WIDGET_ID
      ) {
        widgetProps.rightColumn = props.rightColumn;
        if (widgetProps.bottomRow === undefined)
          widgetProps.bottomRow = props.bottomRow;
        if (widgetProps.bottomRow === undefined)
          widgetProps.minHeight = props.minHeight;
        widgetProps.shouldScrollContents = props.shouldScrollContents;
        widgetProps.canExtend = props.canExtend;
        widgetProps.parentId = props.parentId;
      } else if (widgetId !== MAIN_CONTAINER_WIDGET_ID) {
        widgetProps.parentColumnSpace = props.parentColumnSpace;
        widgetProps.parentRowSpace = props.parentRowSpace;
        widgetProps.parentId = props.parentId;

        // Form Widget Props
        widgetProps.onReset = props.onReset;
        if ("isFormValid" in props) widgetProps.isFormValid = props.isFormValid;
      }

      widgetProps.children = children;

      widgetProps.isLoading = isLoading;
      widgetProps.childWidgets = childWidgets;
    }

    //merging with original props
    widgetProps = { ...props, ...widgetProps, renderMode };

    // isVisible prop defines whether to render a detached widget
    if (widgetProps.detachFromLayout && !widgetProps.isVisible) {
      return null;
    }

    if (
      !widgetProps.isVisible &&
      (renderMode === RenderModes.PAGE || renderMode === RenderModes.PREVIEW)
    ) {
      dispatch({
        type: ReduxActionTypes.UPDATE_WIDGET_AUTO_HEIGHT,
        payload: {
          widgetId: props.widgetId,
          height: 0,
        },
      });
      return null;
    } else if (
      (!widgetProps.isVisible &&
        renderMode !== RenderModes.PAGE &&
        renderMode !== RenderModes.PREVIEW &&
        widgetProps.topRow === widgetProps.bottomRow) ||
      (widgetProps.topRow === widgetProps.bottomRow && children)
    ) {
      dispatch(checkContainersForAutoHeightAction());
    }
    // We don't render invisible widgets in view mode
    // True, but we need this information to re-arrange widgets in view mode.
    // We may create an HOC for dynamicheight updates, such that, this info
    // doesn't need to go all the way to the BaseWidget.

    return <WrappedWidget {...widgetProps} />;
  }

  return WrappedPropsComponent;
}

export default withWidgetProps;
