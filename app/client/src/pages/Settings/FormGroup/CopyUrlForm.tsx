import React, { useEffect } from "react";
import type { InjectedFormProps } from "redux-form";
import { Field, reduxForm } from "redux-form";
import styled from "styled-components";
import copy from "copy-to-clipboard";
import AnalyticsUtil from "utils/AnalyticsUtil";
import { TooltipComponent, UneditableField } from "design-system-old";
import { Colors } from "constants/Colors";
import { Icon, toast } from "design-system";

const Wrapper = styled.div`
  margin: 24px 0;
`;

export const BodyContainer = styled.div`
  width: 100%;
  padding: 0 0 16px;
`;

const HeaderWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  .help-icon {
    margin-left: 8px;
    cursor: pointer;
    svg {
      border-radius: 50%;
      border: 1px solid ${Colors.GREY_7};
      padding: 1px;
    }
  }
`;

export const HeaderSecondary = styled.h3`
  font-size: 20px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: -0.23999999463558197px;
  text-align: left;
`;

function CopyUrlForm(
  props: InjectedFormProps & {
    value: string;
    form: string;
    fieldName: string;
    title: string;
    helpText?: string;
    tooltip?: string;
  },
) {
  useEffect(() => {
    props.initialize({
      [props.fieldName]: `${window.location.origin}${props.value}`,
    });
  }, []);

  const handleCopy = (value: string) => {
    copy(value);
    toast.show(`${props.title} copied to clipboard`, {
      kind: "success",
    });
    AnalyticsUtil.logEvent("URL_COPIED", { snippet: value });
  };

  return (
    <Wrapper>
      <HeaderWrapper>
        <HeaderSecondary>{props.title}</HeaderSecondary>
        {props.tooltip && (
          <TooltipComponent
            autoFocus={false}
            content={props.tooltip}
            hoverOpenDelay={0}
            minWidth={"180px"}
            openOnTargetFocus={false}
            position="right"
          >
            <Icon className={"help-icon"} name="question-mark" size="sm" />
          </TooltipComponent>
        )}
      </HeaderWrapper>
      <BodyContainer>
        <Field
          component={UneditableField}
          disabled
          handleCopy={handleCopy}
          helperText={props.helpText}
          iscopy="true"
          name={props.fieldName}
          {...props}
          asyncControl
        />
      </BodyContainer>
    </Wrapper>
  );
}

export const CopyUrlReduxForm = reduxForm<any, any>({
  touchOnBlur: true,
})(CopyUrlForm);
