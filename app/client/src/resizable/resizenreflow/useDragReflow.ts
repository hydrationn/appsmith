import { reflowMove, startReflow, stopReflow } from "actions/reflowActions";
import { GridDefaults } from "constants/WidgetConstants";
import { OccupiedSpace } from "constants/editorConstants";
import { cloneDeep } from "lodash";
import { RefObject, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Reflow,
  reflowWidgets,
  StaticReflowWidget,
  widgetReflowState,
} from "reducers/uiReducers/reflowReducer";
import { DimensionProps, ResizeDirection } from "resizable/resizenreflow";
import { getOccupiedSpaces } from "selectors/editorSelectors";
import { Rect } from "utils/WidgetPropsUtils";
import { WidgetDraggingBlock } from "utils/hooks/useBlocksToBeDraggedOnCanvas";

type WidgetCollisionGraph = OccupiedSpace & {
  children?: {
    [key: string]: WidgetCollisionGraph;
  };
};

const HORIZONTAL_RESIZE_LIMIT = 2;
const VERTICAL_RESIZE_LIMIT = 4;

export type WidgetParentSpaces = {
  parentColumnSpace: number;
  parentRowSpace: number;
  paddingOffset: number;
};

enum widgetDimensions {
  top = "top",
  bottom = "bottom",
  left = "left",
  right = "right",
}

enum MathComparators {
  min = "min",
  max = "max",
}

type CollisionAccessors = {
  direction: widgetDimensions;
  oppositeDirection: widgetDimensions;
  perpendicularMax: widgetDimensions;
  perpendicularMin: widgetDimensions;
  parallelMax: widgetDimensions;
  parallelMin: widgetDimensions;
  mathComparator: MathComparators;
  directionIndicator: number;
  isHorizontal: boolean;
};
export const useDragReflow = (
  widgetId: string,
  parentId: string,
  resizableRef: RefObject<HTMLDivElement>,
  ignoreCollision: boolean,
  widgetParentSpaces: WidgetParentSpaces,
) => {
  const occupiedSpaces = useSelector(getOccupiedSpaces);
  // const widgetReflowSelector = getReflowWidgetSelector(widgetId);
  // const reflowState = useSelector(widgetReflowSelector);
  const reflowState = useRef<widgetReflowState>();
  const positions = useRef({ X: 0, Y: 0 });
  const occupiedSpacesBySiblingWidgets = useMemo(() => {
    return occupiedSpaces && parentId && occupiedSpaces[parentId]
      ? occupiedSpaces[parentId]
      : undefined;
  }, [occupiedSpaces, parentId]);

  const dispatch = useDispatch();

  const reflow = (
    dimensions: DimensionProps,
    widgetPosition: OccupiedSpace,
    newDimensions: WidgetDraggingBlock,
  ): { verticalMove: boolean; horizontalMove: boolean } => {
    const { direction, X = 0, Y = 0 } = dimensions;
    const resizedPositions = {
      left: newDimensions.left,
      top: newDimensions.top,
      right: newDimensions.left + newDimensions.width,
      bottom: newDimensions.top + newDimensions.height,
      id: newDimensions.widgetId,
    };
    // const isRetracing = positonmetrics;
    const { collidingWidgets } = getCollidingWidgets(
      resizedPositions,
      widgetId,
      occupiedSpacesBySiblingWidgets,
    );
    const isWidgetsColliding = !newDimensions.isNotColliding;

    const newWidgetPosition = {
      ...widgetPosition,
      ...resizedPositions,
    };

    if (!isWidgetsColliding && reflowState.current?.isReflowing) {
      reflowState.current = {
        isReflowing: false,
        reflow: {
          resizeDirections: ResizeDirection.UNSET,
        },
      };
      dispatch(stopReflow());
      positions.current = { X, Y };
      return {
        horizontalMove: true,
        verticalMove: true,
      };
    }

    if (
      direction === ResizeDirection.UNSET ||
      !isWidgetsColliding ||
      !occupiedSpacesBySiblingWidgets
    ) {
      positions.current = { X, Y };
      return {
        horizontalMove: true,
        verticalMove: true,
      };
    }

    let newStaticWidget = reflowState.current?.reflow?.staticWidget;
    if (!reflowState.current?.isReflowing) {
      let widgetReflow: Reflow = {
        staticWidgetId: newWidgetPosition.id,
        resizeDirections: direction,
      };
      if (direction.indexOf("|") > -1) {
        const isHorizontalMove = getIsHorizontalMove(positions.current, {
          X,
          Y,
        });

        if (isHorizontalMove === undefined)
          return {
            horizontalMove: true,
            verticalMove: true,
          };

        const directions = direction.split("|");
        const currentDirection = isHorizontalMove
          ? directions[1]
          : directions[0];
        if (currentDirection === "RIGHT") {
          currentDirection;
        }
        //eslint-disable-next-line
        console.log(currentDirection, positions.current, { X, Y });
        const widgetMovementMap: reflowWidgets = {};
        newStaticWidget = getMovementMapInDirection(
          widgetMovementMap,
          occupiedSpacesBySiblingWidgets,
          collidingWidgets,
          newWidgetPosition,
          currentDirection as ResizeDirection,
          widgetParentSpaces,
          { X, Y },
        );
        widgetReflow = {
          ...widgetReflow,
          reflowingWidgets: widgetMovementMap,
          staticWidget: newStaticWidget,
        };
      } else {
        const widgetMovementMap: reflowWidgets = {};
        newStaticWidget = getMovementMapInDirection(
          widgetMovementMap,
          occupiedSpacesBySiblingWidgets,
          collidingWidgets,
          newWidgetPosition,
          direction,
          widgetParentSpaces,
          { X, Y },
        );
        widgetReflow = {
          ...widgetReflow,
          reflowingWidgets: widgetMovementMap,
          staticWidget: newStaticWidget,
        };
      }
      reflowState.current = {
        isReflowing: true,
        reflow: widgetReflow,
      };
      dispatch(startReflow(widgetReflow));
    } else if (
      reflowState.current.reflow &&
      reflowState.current.reflow.reflowingWidgets
    ) {
      const reflowing = { ...reflowState.current.reflow };
      let horizontalMove = true,
        verticalMove = true;
      if (direction.indexOf("|") > -1) {
        const isHorizontalMove = getIsHorizontalMove(positions.current, {
          X,
          Y,
        });

        if (isHorizontalMove === undefined)
          return {
            horizontalMove: true,
            verticalMove: true,
          };

        const { reflowingWidgets, staticWidget } = reflowState.current.reflow;
        newStaticWidget = getCompositeMovementMap(
          occupiedSpacesBySiblingWidgets,
          collidingWidgets,
          { ...newWidgetPosition, ...resizedPositions },
          direction,
          widgetParentSpaces,
          { X, Y },
          reflowingWidgets,
          staticWidget,
          isHorizontalMove,
        );

        ({ horizontalMove, verticalMove } = getShouldResize(newStaticWidget, {
          X,
          Y,
        }));
        const affectedwidgetIds = Object.keys(reflowingWidgets);
        for (const affectedwidgetId of affectedwidgetIds) {
          if (reflowingWidgets && reflowingWidgets[affectedwidgetId]) {
            if (horizontalMove) reflowingWidgets[affectedwidgetId].x = X;
            if (verticalMove) reflowingWidgets[affectedwidgetId].y = Y;
          }
        }
        reflowing.reflowingWidgets = { ...reflowingWidgets };
        reflowing.staticWidget = newStaticWidget;
      } else {
        //eslint-disable-next-line
        const reflowingWidgets = reflowing.reflowingWidgets || {};
        const affectedwidgetIds = Object.keys(reflowingWidgets);
        ({ horizontalMove, verticalMove } = getShouldResize(newStaticWidget, {
          X,
          Y,
        }));
        const widgetMovementMap: reflowWidgets = reflowingWidgets;
        newStaticWidget = getMovementMapInDirection(
          widgetMovementMap,
          occupiedSpacesBySiblingWidgets,
          collidingWidgets,
          newWidgetPosition,
          direction,
          widgetParentSpaces,
          { X, Y },
        );

        const allReflowKeys = Object.keys(widgetMovementMap);
        const keysToDelete = affectedwidgetIds.filter(
          (key) => allReflowKeys.indexOf(key) < 0,
        );

        for (const keyToDelete of keysToDelete) {
          delete reflowingWidgets[keyToDelete];
        }

        if (allReflowKeys.length > 0) {
          for (const key of allReflowKeys) {
            if (!reflowingWidgets[key]) {
              reflowingWidgets[key] = widgetMovementMap[key];
            }
          }
        }
        for (const affectedwidgetId of affectedwidgetIds) {
          if (reflowingWidgets && reflowingWidgets[affectedwidgetId]) {
            if (horizontalMove) reflowingWidgets[affectedwidgetId].x = X;
            if (verticalMove) reflowingWidgets[affectedwidgetId].y = Y;
          }
        }
        reflowing.reflowingWidgets = { ...reflowingWidgets };
      }
      reflowState.current = {
        isReflowing: true,
        reflow: reflowing,
      };
      dispatch(reflowMove(reflowing));
      positions.current = { X, Y };
      return {
        horizontalMove,
        verticalMove,
      };
    }
    positions.current = { X, Y };

    return {
      horizontalMove: true,
      verticalMove: true,
    };
  };

  return reflow;
};

function getShouldResize(
  staticWidget: StaticReflowWidget | undefined,
  dimensions = { X: 0, Y: 0 },
): { verticalMove: boolean; horizontalMove: boolean } {
  if (!staticWidget)
    return {
      horizontalMove: false,
      verticalMove: false,
    };

  let horizontalMove = true,
    verticalMove = true;
  const { mathXComparator, mathYComparator, maxX, maxY } = staticWidget;
  if (mathXComparator) {
    horizontalMove =
      Math[mathXComparator as MathComparators](
        dimensions.X,
        //eslint-disable-next-line
        maxX!,
      ) !==
      //eslint-disable-next-line
      maxX!;
  }
  if (mathYComparator) {
    verticalMove =
      Math[mathYComparator as MathComparators](
        dimensions.Y,
        //eslint-disable-next-line
        maxY!,
      ) !==
      //eslint-disable-next-line
      maxY!;
  }

  return {
    horizontalMove,
    verticalMove,
  };
}

function getWidgetCollisionGraphInDirection(
  occupiedSpacesBySiblingWidgets: OccupiedSpace[],
  widgetPosition: WidgetCollisionGraph,
  collidingWidgets: OccupiedSpace[],
  accessors: CollisionAccessors,
  widgetMovementMap: reflowWidgets,
  widgetParentSpaces: WidgetParentSpaces,
) {
  const widgetCollisionGraph: WidgetCollisionGraph = {
    ...widgetPosition,
    children: {},
  };
  const collidingWidgetsInDirection = collidingWidgets.filter(
    (widgetDetails) => {
      if (
        widgetDetails[accessors.perpendicularMax] <=
        widgetCollisionGraph[accessors.perpendicularMin]
      )
        return false;
      if (
        widgetDetails[accessors.perpendicularMin] >=
        widgetCollisionGraph[accessors.perpendicularMax]
      )
        return false;

      return true;
    },
  );
  if (collidingWidgetsInDirection.length <= 0) return;
  for (const collidingWidget of collidingWidgetsInDirection) {
    const collidingWidgetGraph = { ...collidingWidget, children: {} };
    const reflowingWidget = widgetMovementMap[collidingWidget.id];
    const reflowIndicator = accessors.isHorizontal ? "X" : "Y";
    const reflowResizeIndicator = accessors.isHorizontal ? "x" : "y";
    const movement = reflowingWidget
      ? reflowingWidget[reflowIndicator] || 0
      : 0;
    const sizeUpdate = reflowingWidget
      ? reflowingWidget[reflowResizeIndicator] || 0
      : 0;
    const isRetracing =
      reflowingWidget &&
      ((accessors.directionIndicator === 1 ? movement < 0 : movement > 0) ||
        sizeUpdate < 0);
    // if (Object.keys(widgetMovementMap).length && reflowingWidget && movement) {
    //   debugger;
    // }

    const filteredOccSpaces = isRetracing
      ? occupiedSpacesBySiblingWidgets.filter((each) => {
          return accessors.directionIndicator === 1
            ? each[accessors.oppositeDirection] <
                widgetPosition[accessors.oppositeDirection]
            : each[accessors.oppositeDirection] >
                widgetPosition[accessors.oppositeDirection];
        })
      : occupiedSpacesBySiblingWidgets;
    getWidgetCollisionGraph(
      filteredOccSpaces,
      collidingWidgetGraph,
      {},
      accessors,
    );
    if (widgetCollisionGraph.children)
      widgetCollisionGraph.children[
        collidingWidgetGraph.id
      ] = collidingWidgetGraph;
    else
      widgetCollisionGraph.children = {
        [collidingWidgetGraph.id]: collidingWidgetGraph,
      };
  }

  return widgetCollisionGraph;
}
function getWidgetCollisionGraph(
  occupiedSpacesBySiblingWidgets: OccupiedSpace[],
  widgetCollisionGraph: WidgetCollisionGraph,
  processedNodes: { [key: string]: WidgetCollisionGraph } = {},
  accessors: CollisionAccessors,
) {
  if (!widgetCollisionGraph) return;

  const possiblyAffectedWidgets = occupiedSpacesBySiblingWidgets.filter(
    (widgetDetails) => {
      const directionalComparator =
        accessors.directionIndicator < 0
          ? widgetDetails[accessors.oppositeDirection] <
            widgetCollisionGraph[accessors.oppositeDirection]
          : widgetDetails[accessors.oppositeDirection] >
            widgetCollisionGraph[accessors.oppositeDirection];
      return (
        widgetDetails.id !== widgetCollisionGraph.id && directionalComparator
      );
    },
  );

  const affectedWidgets = possiblyAffectedWidgets.filter((widgetDetails) => {
    if (
      widgetDetails[accessors.perpendicularMax] <=
      widgetCollisionGraph[accessors.perpendicularMin]
    )
      return false;
    if (
      widgetDetails[accessors.perpendicularMin] >=
      widgetCollisionGraph[accessors.perpendicularMax]
    )
      return false;

    return true;
  });

  affectedWidgets.sort((widgetA, widgetB) => {
    return (
      accessors.directionIndicator * -1 * widgetB[accessors.oppositeDirection] +
      accessors.directionIndicator * widgetA[accessors.oppositeDirection]
    );
  });
  const initialCollidingWidget = { ...affectedWidgets[0] };

  while (affectedWidgets.length > 0) {
    const currentWidgetCollisionGraph = {
      ...affectedWidgets.shift(),
    } as WidgetCollisionGraph;

    if (!currentWidgetCollisionGraph) break;

    if (!processedNodes[currentWidgetCollisionGraph.id]) {
      getWidgetCollisionGraph(
        possiblyAffectedWidgets,
        currentWidgetCollisionGraph,
        processedNodes,
        accessors,
      );
      processedNodes[currentWidgetCollisionGraph.id] = {
        ...currentWidgetCollisionGraph,
      };
    }

    if (widgetCollisionGraph.children)
      widgetCollisionGraph.children[currentWidgetCollisionGraph.id] = {
        ...currentWidgetCollisionGraph,
      };
    else
      widgetCollisionGraph.children = {
        [currentWidgetCollisionGraph.id]: { ...currentWidgetCollisionGraph },
      };
  }

  return initialCollidingWidget;
}

function getWidgetMovementMap(
  widgetPosition: WidgetCollisionGraph,
  widgetMovementMap: reflowWidgets,
  dimensions = { X: 0, Y: 0 },
  widgetParentSpaces: WidgetParentSpaces,
  accessors: CollisionAccessors,
  direction: ResizeDirection,
  whiteSpace = 0,
  prevWidgetdistance: number,
  first = false,
) {
  if (widgetMovementMap[widgetPosition.id]) {
    return {
      occupiedSpace:
        (widgetMovementMap[widgetPosition.id].maxOccupiedSpace || 0) +
        widgetPosition[accessors.parallelMax] -
        widgetPosition[accessors.parallelMin],
      depth: (widgetMovementMap[widgetPosition.id].depth || 0) + 1,
      currentWhiteSpace: widgetMovementMap[widgetPosition.id].whiteSpaces || 0,
    };
  }

  let maxOccupiedSpace = 0,
    depth = 0;
  const childrenCount = Object.keys(widgetPosition.children || {}).length;
  let currentWhiteSpace = whiteSpace;
  if (widgetPosition.children && childrenCount > 0) {
    const childNodes = Object.values(widgetPosition.children);
    for (const childNode of childNodes) {
      let nextWhiteSpaces = 0;
      if (!first) {
        nextWhiteSpaces =
          whiteSpace +
          Math.abs(prevWidgetdistance - childNode[accessors.oppositeDirection]);
      }
      const {
        currentWhiteSpace: childWhiteSpace,
        depth: widgetDepth,
        occupiedSpace,
      } = getWidgetMovementMap(
        childNode,
        widgetMovementMap,
        dimensions,
        widgetParentSpaces,
        accessors,
        direction,
        nextWhiteSpaces,
        childNode[accessors.direction],
      );
      if (maxOccupiedSpace < occupiedSpace) currentWhiteSpace = childWhiteSpace;
      maxOccupiedSpace = Math.max(maxOccupiedSpace, occupiedSpace || 0);
      depth = Math.max(depth, widgetDepth);
    }
  } else {
    if (direction === ResizeDirection.RIGHT)
      currentWhiteSpace +=
        GridDefaults.DEFAULT_GRID_COLUMNS - widgetPosition.right;
    else if (direction === ResizeDirection.BOTTOM) currentWhiteSpace = Infinity;
    else currentWhiteSpace += widgetPosition[accessors.direction];
  }

  if (accessors.isHorizontal) {
    const maxX =
      direction === ResizeDirection.RIGHT
        ? (GridDefaults.DEFAULT_GRID_COLUMNS -
            widgetPosition[accessors.direction] -
            maxOccupiedSpace) *
          widgetParentSpaces.parentColumnSpace
        : (widgetPosition[accessors.direction] - maxOccupiedSpace) *
          widgetParentSpaces.parentColumnSpace;
    widgetMovementMap[widgetPosition.id] = {
      x: dimensions.X,
      maxX: accessors.directionIndicator * maxX,
      maxOccupiedSpace,
      depth,
      dimensionXBeforeCollision:
        dimensions.X -
        accessors.directionIndicator * widgetParentSpaces.parentColumnSpace,
      whiteSpaces: currentWhiteSpace,
      get X() {
        const originalWidth =
          widgetPosition[accessors.parallelMax] -
          widgetPosition[accessors.parallelMin];
        const value =
          this.x !== undefined
            ? this.x - (this.dimensionXBeforeCollision || 0)
            : 0;
        const maxValue = Math[accessors.mathComparator](value, this.maxX || 0);
        const resizeThreshold =
          accessors.directionIndicator *
          (this.whiteSpaces || 0) *
          widgetParentSpaces.parentColumnSpace;
        let resizeTill =
          resizeThreshold +
          accessors.directionIndicator *
            (maxOccupiedSpace - depth * HORIZONTAL_RESIZE_LIMIT) *
            widgetParentSpaces.parentColumnSpace;
        if (direction === ResizeDirection.RIGHT) {
          resizeTill +=
            (originalWidth - HORIZONTAL_RESIZE_LIMIT) *
            widgetParentSpaces.parentColumnSpace;
        }
        const resizeLimit =
          direction === ResizeDirection.RIGHT
            ? (GridDefaults.DEFAULT_GRID_COLUMNS -
                widgetPosition[accessors.direction] +
                originalWidth -
                (depth + 1) * HORIZONTAL_RESIZE_LIMIT) *
              widgetParentSpaces.parentColumnSpace
            : (widgetPosition[accessors.direction] -
                depth * HORIZONTAL_RESIZE_LIMIT) *
              widgetParentSpaces.parentColumnSpace *
              -1;
        if (accessors.directionIndicator < 0) {
          const x =
            value > maxValue
              ? value
              : value <= resizeThreshold && value >= resizeTill
              ? value - resizeThreshold + maxValue
              : value < resizeTill
              ? resizeLimit
              : maxValue;
          return x;
        } else {
          const x =
            value < maxValue
              ? value
              : value >= resizeThreshold && value <= resizeTill
              ? value - resizeThreshold + maxValue
              : value > resizeTill
              ? resizeLimit
              : maxValue;
          return x;
        }
      },
      get width() {
        const originalWidth =
          widgetPosition[accessors.parallelMax] -
          widgetPosition[accessors.parallelMin];
        const max =
          (this.dimensionXBeforeCollision || 0) +
          ((this.whiteSpaces || 0) +
            maxOccupiedSpace -
            depth * HORIZONTAL_RESIZE_LIMIT) *
            widgetParentSpaces.parentColumnSpace *
            accessors.directionIndicator;
        const resizeLimit =
          max +
          (originalWidth - HORIZONTAL_RESIZE_LIMIT) *
            widgetParentSpaces.parentColumnSpace *
            accessors.directionIndicator;
        let X = 0;
        const shouldResize =
          accessors.directionIndicator > 0
            ? (this.x || 0) > max
            : (this.x || 0) < max;
        if (shouldResize) {
          X = Math[accessors.mathComparator](this.x || 0, resizeLimit);
          X = X - max;
        }

        return (
          originalWidth * widgetParentSpaces.parentColumnSpace - Math.abs(X)
        );
      },
    };
  } else {
    const maxY =
      direction === ResizeDirection.BOTTOM
        ? Infinity
        : (widgetPosition[accessors.direction] - maxOccupiedSpace) *
          widgetParentSpaces.parentRowSpace *
          -1;
    widgetMovementMap[widgetPosition.id] = {
      y: dimensions.Y,
      maxY,
      maxOccupiedSpace,
      depth,
      dimensionYBeforeCollision:
        dimensions.Y -
        accessors.directionIndicator * widgetParentSpaces.parentRowSpace,
      whiteSpaces: currentWhiteSpace,
      get Y() {
        const value =
          this.y !== undefined
            ? this.y - (this.dimensionYBeforeCollision || 0)
            : 0;
        const maxValue = Math[accessors.mathComparator](value, this.maxY || 0);
        const resizeThreshold =
          accessors.directionIndicator *
          (this.whiteSpaces || 0) *
          widgetParentSpaces.parentRowSpace;
        const resizeTill =
          resizeThreshold +
          accessors.directionIndicator *
            (maxOccupiedSpace - depth * VERTICAL_RESIZE_LIMIT) *
            widgetParentSpaces.parentRowSpace;
        const resizeLimit =
          direction === ResizeDirection.BOTTOM
            ? Infinity
            : (widgetPosition[accessors.direction] -
                depth * VERTICAL_RESIZE_LIMIT) *
              widgetParentSpaces.parentRowSpace *
              -1;
        if (accessors.directionIndicator < 0) {
          const y =
            value > maxValue
              ? value
              : value <= resizeThreshold && value >= resizeTill
              ? value - resizeThreshold + maxValue
              : value < resizeTill
              ? resizeLimit
              : maxValue;
          return y;
        } else {
          return value;
        }
      },
      get height() {
        const originalHeight =
          widgetPosition[accessors.parallelMax] -
          widgetPosition[accessors.parallelMin];
        const max =
          (this.dimensionYBeforeCollision || 0) +
          ((this.whiteSpaces || 0) +
            maxOccupiedSpace -
            depth * VERTICAL_RESIZE_LIMIT) *
            widgetParentSpaces.parentRowSpace *
            accessors.directionIndicator;
        const resizeLimit =
          max +
          (originalHeight - VERTICAL_RESIZE_LIMIT) *
            widgetParentSpaces.parentRowSpace *
            accessors.directionIndicator;
        let Y = 0;
        const shouldResize =
          accessors.directionIndicator > 0 ? false : (this.y || 0) < max;
        if (shouldResize) {
          Y = Math[accessors.mathComparator](this.y || 0, resizeLimit);
          Y = Y - max;
        }

        return originalHeight * widgetParentSpaces.parentRowSpace - Math.abs(Y);
      },
    };
  }

  return {
    occupiedSpace:
      maxOccupiedSpace +
      widgetPosition[accessors.parallelMax] -
      widgetPosition[accessors.parallelMin],
    depth: depth + 1,
    currentWhiteSpace,
  };
}

function getCompositeMovementMap(
  occupiedSpacesBySiblingWidgets: OccupiedSpace[],
  collidingWidgets: OccupiedSpace[] = [],
  widgetPosition: WidgetCollisionGraph,
  direction: ResizeDirection,
  widgetParentSpaces: WidgetParentSpaces,
  dimensions = { X: 0, Y: 0 },
  reflowWidgets: reflowWidgets,
  staticWidget: StaticReflowWidget | undefined,
  isHorizontalMove: boolean,
) {
  const directions = direction.split("|");
  const { horizontalKeys, verticalKeys } = getDirectionalKeysFromWidgets(
    reflowWidgets,
  );
  const horizontalOccupiedSpaces = occupiedSpacesBySiblingWidgets.filter(
    (widgetDetail) => verticalKeys.indexOf(widgetDetail.id) < 0,
  );
  const verticalOccupiedSpaces = occupiedSpacesBySiblingWidgets.filter(
    (widgetDetail) => horizontalKeys.indexOf(widgetDetail.id) < 0,
  );

  const horizontalCollidingWidgets = collidingWidgets.filter(
    (widgetDetail) => verticalKeys.indexOf(widgetDetail.id) < 0,
  );
  const verticalCollidingWidgets = collidingWidgets.filter(
    (widgetDetail) => horizontalKeys.indexOf(widgetDetail.id) < 0,
  );

  let primaryDirection, secondaryDirection;
  let primaryOccupiedSpaces, secondaryOccupiedSpaces;
  let primaryCollidingWidgets, secondaryCollidingWidgets;
  if (isHorizontalMove) {
    primaryDirection = directions[1];
    secondaryDirection = directions[0];
    primaryOccupiedSpaces = horizontalOccupiedSpaces;
    secondaryOccupiedSpaces = verticalOccupiedSpaces;
    primaryCollidingWidgets = horizontalCollidingWidgets;
    secondaryCollidingWidgets = verticalCollidingWidgets;
  } else {
    primaryDirection = directions[0];
    secondaryDirection = directions[1];
    primaryOccupiedSpaces = verticalOccupiedSpaces;
    secondaryOccupiedSpaces = horizontalOccupiedSpaces;
    primaryCollidingWidgets = verticalCollidingWidgets;
    secondaryCollidingWidgets = horizontalCollidingWidgets;
  }
  const primaryWidgetMovementMap: reflowWidgets = {};
  const primaryStaticWidget = getMovementMapInDirection(
    primaryWidgetMovementMap,
    primaryOccupiedSpaces,
    primaryCollidingWidgets,
    widgetPosition,
    primaryDirection as ResizeDirection,
    widgetParentSpaces,
    dimensions,
  );

  const primaryCollidingKeys = Object.keys(primaryWidgetMovementMap || {});
  const reflowWidgetKeys = Object.keys(reflowWidgets);

  secondaryOccupiedSpaces = secondaryOccupiedSpaces.filter(
    (widgetDetail) => primaryCollidingKeys.indexOf(widgetDetail.id) < 0,
  );
  secondaryCollidingWidgets = secondaryCollidingWidgets.filter(
    (widgetDetail) => primaryCollidingKeys.indexOf(widgetDetail.id) < 0,
  );
  delete widgetPosition.children;

  const secondaryWidgetMovementMap: reflowWidgets = {};
  getMovementMapInDirection(
    secondaryWidgetMovementMap,
    secondaryOccupiedSpaces,
    secondaryCollidingWidgets,
    widgetPosition,
    secondaryDirection as ResizeDirection,
    widgetParentSpaces,
    dimensions,
  );

  const secondaryCollidingKeys = Object.keys(secondaryWidgetMovementMap || {});

  const allReflowKeys: string[] = primaryCollidingKeys.concat(
    secondaryCollidingKeys,
  );

  const keysToDelete = reflowWidgetKeys.filter(
    (key) => allReflowKeys.indexOf(key) < 0,
  );

  for (const keyToDelete of keysToDelete) {
    delete reflowWidgets[keyToDelete];
  }

  if (primaryCollidingKeys.length > 0 || secondaryCollidingKeys.length > 0) {
    for (const key of allReflowKeys) {
      if (!reflowWidgets[key]) {
        const reflowWidget =
          primaryWidgetMovementMap[key] || secondaryWidgetMovementMap[key];
        reflowWidgets[key] = reflowWidget;
      }
    }
  }
  //eslint-disable-next-line
  console.log(cloneDeep({ widgets: reflowWidgets, direction }));
  if (primaryCollidingKeys.length > 0 && secondaryCollidingKeys.length <= 0) {
    return primaryStaticWidget;
  } else if (primaryCollidingKeys.length > 0) {
    return {
      ...staticWidget,
      ...primaryStaticWidget,
    };
  }

  return {
    ...staticWidget,
  };
}
function getMovementMapInDirection(
  widgetMovementMap: reflowWidgets,
  occupiedSpacesBySiblingWidgets: OccupiedSpace[],
  collidingWidgets: OccupiedSpace[] = [],
  widgetPosition: WidgetCollisionGraph,
  direction: ResizeDirection,
  widgetParentSpaces: WidgetParentSpaces,
  dimensions = { X: 0, Y: 0 },
) {
  let accessors;
  switch (direction) {
    case ResizeDirection.LEFT:
      accessors = {
        direction: widgetDimensions.left,
        oppositeDirection: widgetDimensions.right,
        perpendicularMax: widgetDimensions.bottom,
        perpendicularMin: widgetDimensions.top,
        parallelMax: widgetDimensions.right,
        parallelMin: widgetDimensions.left,
        mathComparator: MathComparators.max,
        directionIndicator: -1,
        isHorizontal: true,
      };
      break;
    case ResizeDirection.RIGHT:
      accessors = {
        direction: widgetDimensions.right,
        oppositeDirection: widgetDimensions.left,
        perpendicularMax: widgetDimensions.bottom,
        perpendicularMin: widgetDimensions.top,
        parallelMax: widgetDimensions.right,
        parallelMin: widgetDimensions.left,
        mathComparator: MathComparators.min,
        directionIndicator: 1,
        isHorizontal: true,
      };
      break;
    case ResizeDirection.TOP:
      accessors = {
        direction: widgetDimensions.top,
        oppositeDirection: widgetDimensions.bottom,
        perpendicularMax: widgetDimensions.right,
        perpendicularMin: widgetDimensions.left,
        parallelMax: widgetDimensions.bottom,
        parallelMin: widgetDimensions.top,
        mathComparator: MathComparators.max,
        directionIndicator: -1,
        isHorizontal: false,
      };
      break;
    case ResizeDirection.BOTTOM:
      accessors = {
        direction: widgetDimensions.bottom,
        oppositeDirection: widgetDimensions.top,
        perpendicularMax: widgetDimensions.right,
        perpendicularMin: widgetDimensions.left,
        parallelMax: widgetDimensions.bottom,
        parallelMin: widgetDimensions.top,
        mathComparator: MathComparators.min,
        directionIndicator: 1,
        isHorizontal: false,
      };
      break;
    default:
      return;
  }
  const widgetCollisionGraph = getWidgetCollisionGraphInDirection(
    occupiedSpacesBySiblingWidgets,
    widgetPosition,
    collidingWidgets,
    accessors,
    widgetMovementMap,
    widgetParentSpaces,
  );

  // if (initialCollidingWidget) {
  //   const isColliding =
  //     accessors.directionIndicator > 0
  //       ? widgetCollisionGraph[accessors.direction] >
  //         initialCollidingWidget[accessors.oppositeDirection]
  //       : widgetCollisionGraph[accessors.direction] <
  //         initialCollidingWidget[accessors.oppositeDirection];

  //   if (!isColliding) return;
  // }
  if (!widgetCollisionGraph) return;
  getWidgetMovementMap(
    widgetCollisionGraph,
    widgetMovementMap,
    dimensions,
    widgetParentSpaces,
    accessors,
    direction,
    0,
    widgetPosition[accessors.direction],
    true,
  );
  if (!widgetMovementMap && !widgetMovementMap[widgetCollisionGraph.id])
    return {};

  const staticWidget = widgetMovementMap[widgetCollisionGraph.id];

  delete widgetMovementMap[widgetCollisionGraph.id];

  //eslint-disable-next-line
  console.log(
    cloneDeep({
      graph: widgetCollisionGraph,
      map: widgetMovementMap,
      direction,
      accessors,
      dimensions,
    }),
  );

  if (accessors.isHorizontal) {
    const maxX =
      direction === ResizeDirection.RIGHT
        ? (GridDefaults.DEFAULT_GRID_COLUMNS -
            widgetPosition[accessors.direction] -
            (staticWidget.depth || 0) * HORIZONTAL_RESIZE_LIMIT) *
          widgetParentSpaces.parentColumnSpace
        : (widgetPosition[accessors.direction] -
            (staticWidget.depth || 0) * HORIZONTAL_RESIZE_LIMIT) *
          widgetParentSpaces.parentColumnSpace;
    return {
      id: widgetCollisionGraph.id,
      maxX:
        dimensions.X +
        accessors.directionIndicator *
          (maxX + widgetParentSpaces.parentColumnSpace),
      mathXComparator: accessors.mathComparator,
      directionXIndicator: accessors.directionIndicator,
    };
  } else {
    const maxY =
      (widgetPosition[accessors.direction] -
        (staticWidget.depth || 0) * VERTICAL_RESIZE_LIMIT) *
      widgetParentSpaces.parentRowSpace;
    return {
      id: widgetCollisionGraph.id,
      maxY:
        direction === ResizeDirection.BOTTOM
          ? Infinity
          : dimensions.Y - maxY - widgetParentSpaces.parentRowSpace,
      mathYComparator: accessors.mathComparator,
      directionYIndicator: accessors.directionIndicator,
    };
  }
}

export const areIntersecting = (r1: Rect, r2: Rect) => {
  return !(
    r2.left >= r1.right ||
    r2.right <= r1.left ||
    r2.top >= r1.bottom ||
    r2.bottom <= r1.top
  );
};

function getIsHorizontalMove(
  prevPositions: { X: number; Y: number },
  positions: { X: number; Y: number },
) {
  if (prevPositions.X !== positions.X) {
    return true;
  } else if (prevPositions.Y !== positions.Y) {
    return false;
  }

  return undefined;
}

function getDirectionalKeysFromWidgets(
  reflowWidgets: reflowWidgets,
): { horizontalKeys: string[]; verticalKeys: string[] } {
  const horizontalKeys: string[] = [],
    verticalKeys: string[] = [];
  if (!reflowWidgets) return { horizontalKeys, verticalKeys };

  const reflowWidgetIds = Object.keys(reflowWidgets);

  for (const reflowWidgetId of reflowWidgetIds) {
    if (reflowWidgets[reflowWidgetId]?.maxX !== undefined) {
      horizontalKeys.push(reflowWidgetId);
    } else if (reflowWidgets[reflowWidgetId]?.maxY !== undefined) {
      verticalKeys.push(reflowWidgetId);
    }
  }
  return { horizontalKeys, verticalKeys };
}

function getCollidingWidgets(
  offset: Rect,
  widgetId: string,
  occupied?: OccupiedSpace[],
) {
  let isColliding = false;
  const collidingWidgets = [];
  if (occupied) {
    occupied = occupied.filter((widgetDetails) => {
      return (
        widgetDetails.id !== widgetId && widgetDetails.parentId !== widgetId
      );
    });
    for (let i = 0; i < occupied.length; i++) {
      if (areIntersecting(occupied[i], offset)) {
        isColliding = true;
        collidingWidgets.push({ ...occupied[i] });
      }
    }
  }
  return {
    isColliding,
    collidingWidgets,
  };
}
