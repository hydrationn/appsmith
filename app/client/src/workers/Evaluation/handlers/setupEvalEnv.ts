import { unsafeFunctionForEval } from "utils/DynamicBindingUtils";
import setupDOM from "../SetupDOM";
import { EvalWorkerSyncRequest } from "../types";
import { addPlatformFunctionsToEvalContext } from "@appsmith/workers/Evaluation/Actions";
import { overrideWebAPIs } from "../fns/overrides";
import { initWindowProxy } from "../fns/overrides/windowProxy";

export default function(request: EvalWorkerSyncRequest) {
  self.$isDataField = false;
  ///// Remove all unsafe functions
  unsafeFunctionForEval.forEach((func) => {
    // @ts-expect-error: Types are not available
    self[func] = undefined;
  });
  setupDOM();
  initWindowProxy();
  Object.defineProperty(self, "$cloudHosting", {
    value: request.data.cloudHosting,
    enumerable: false,
  });
  addPlatformFunctionsToEvalContext(self);
  overrideWebAPIs(self);
  return true;
}

export function setEvaluationVersion(request: EvalWorkerSyncRequest) {
  const { data } = request;
  const { version } = data;
  self.evaluationVersion = version || 1;
  return true;
}
