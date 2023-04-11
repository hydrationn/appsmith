import React from "react";
import styled from "styled-components";
import { closeAppSettingsPaneAction } from "actions/appSettingsPaneActions";
import {
  APP_SETTINGS_CLOSE_TOOLTIP,
  APP_SETTINGS_PANE_HEADER,
} from "@appsmith/constants/messages";
import { Colors } from "constants/Colors";
import { Tooltip } from "design-system";
import { useDispatch } from "react-redux";
import { Button } from "design-system";

const StyledHeader = styled.div`
  height: 48px;
  padding: 10px 0px 10px;
  border-bottom: 1px solid ${Colors.GRAY_300};
  margin-bottom: 0;
`;

const StyledText = styled.div`
  font-size: 16px;
  margin-left: 10px;
  color: var(--ads-v2-color-fg-emphasis);
`;

function PaneHeader() {
  const dispatch = useDispatch();
  return (
    <StyledHeader className="flex justify-start items-center">
      <Tooltip content={APP_SETTINGS_CLOSE_TOOLTIP()} placement="bottom">
        <Button
          className="pr-2"
          id="t--close-app-settings-pane"
          isIconButton
          kind="tertiary"
          onClick={() => dispatch(closeAppSettingsPaneAction())}
          size="sm"
          startIcon="double-arrow-right"
        />
      </Tooltip>
      <StyledText>{APP_SETTINGS_PANE_HEADER()}</StyledText>
    </StyledHeader>
  );
}

export default PaneHeader;
