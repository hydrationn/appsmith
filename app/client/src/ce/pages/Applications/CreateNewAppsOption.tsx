import {
  getTemplateFilters,
  importTemplateIntoApplicationViaOnboardingFlow,
} from "actions/templateActions";
import type { Template } from "api/TemplatesApi";
import type { AppState } from "@appsmith/reducers";
import { TemplatesContent } from "pages/Templates";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  allTemplatesFiltersSelector,
  getForkableWorkspaces,
  getTemplatesSelector,
  isImportingTemplateToAppSelector,
} from "selectors/templatesSelectors";
import styled from "styled-components";
import { getAllTemplates } from "actions/templateActions";
import { Flex, Link, Text } from "design-system";
import {
  CREATE_NEW_APPS_STEP_SUBTITLE,
  CREATE_NEW_APPS_STEP_TITLE,
  GO_BACK,
  START_FROM_SCRATCH_SUBTITLE,
  START_FROM_SCRATCH_TITLE,
  START_FROM_TEMPLATE_SUBTITLE,
  START_FROM_TEMPLATE_TITLE,
  START_WITH_DATA_TITLE,
  START_WITH_DATA_SUBTITLE,
  createMessage,
  START_WITH_DATA_CONNECT_HEADING,
  START_WITH_DATA_CONNECT_SUBHEADING,
  START_WITH_TEMPLATE_CONNECT_SUBHEADING,
  START_WITH_TEMPLATE_CONNECT_HEADING,
} from "@appsmith/constants/messages";
import Filters from "pages/Templates/Filters";
import { isEmpty } from "lodash";
import AnalyticsUtil from "utils/AnalyticsUtil";
import { TemplateView } from "pages/Templates/TemplateView";
import {
  firstTimeUserOnboardingInit,
  resetCurrentApplicationIdForCreateNewApp,
  resetCurrentPluginIdForCreateNewApp,
} from "actions/onboardingActions";
import {
  getApplicationByIdFromWorkspaces,
  getCurrentPluginIdForCreateNewApp,
} from "@appsmith/selectors/applicationSelectors";
import urlBuilder from "@appsmith/entities/URLRedirect/URLAssembly";
import { useFeatureFlag } from "utils/hooks/useFeatureFlag";
import { FEATURE_FLAG } from "@appsmith/entities/FeatureFlag";
import { ASSETS_CDN_URL } from "constants/ThirdPartyConstants";
import { getAssetUrl } from "@appsmith/utils/airgapHelpers";
import { fetchPlugins } from "actions/pluginActions";
import CreateNewDatasourceTab from "pages/Editor/IntegrationEditor/CreateNewDatasourceTab";

const SectionWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 var(--ads-v2-spaces-7) var(--ads-v2-spaces-7);
  ${(props) => `
    margin-top: ${props.theme.homePage.header}px;
  `}
  background: var(--ads-v2-color-gray-50);
  ${(props) => `
    min-height: calc(100vh - ${props.theme.homePage.header}px);
  `}
`;

const BackWrapper = styled.div<{ hidden?: boolean }>`
  position: sticky;
  ${(props) => `
    top: ${props.theme.homePage.header}px;
    `}
  background: inherit;
  padding: var(--ads-v2-spaces-3);
  z-index: 1;
  margin-left: -4px;
  ${(props) => `${props.hidden && "visibility: hidden; opacity: 0;"}`}
`;

const FiltersWrapper = styled.div`
  width: ${(props) => props.theme.homePage.sidebar}px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--ads-v2-color-border);
  flex-shrink: 0;
  .filter-wrapper {
    height: 100%;
  }
`;

const TemplateWrapper = styled.div`
  display: flex;
  flex-grow: 1;
  overflow: hidden;
`;

const TemplateContentWrapper = styled.div`
  flex-grow: 1;
  overflow: auto;
`;

const OptionWrapper = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  flex-grow: 1;
  padding: var(--ads-v2-spaces-7) 0;
`;

const CardsWrapper = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 48px;
  flex-wrap: wrap;
  justify-content: center;
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 48px;
  border: 1px solid var(--ads-v2-color-border);
  width: 324px;
  align-items: center;
  text-align: center;
  cursor: pointer;
  border-radius: 4px;
  background: var(--ads-v2-color-bg);
  img {
    height: 160px;
    margin-bottom: 48px;
  }
  position: relative;
`;

const WithDataWrapper = styled.div`
  background: var(--ads-v2-color-bg);
  padding: var(--ads-v2-spaces-13);
`;

const Header = ({ subtitle, title }: { subtitle: string; title: string }) => {
  return (
    <Flex flexDirection="column" mb="spaces-14" mt="spaces-7">
      <Text kind="heading-xl">{title}</Text>
      <Text>{subtitle}</Text>
    </Flex>
  );
};

interface CardProps {
  onClick?: () => void;
  src: string;
  subTitle: string;
  testid: string;
  title: string;
}

const Card = ({ onClick, src, subTitle, testid, title }: CardProps) => {
  return (
    <CardContainer data-testid={testid} onClick={onClick}>
      <img alt={title} src={src} />
      <Text kind="heading-s">{title}</Text>
      <Text>{subTitle}</Text>
    </CardContainer>
  );
};

const START_WITH_TYPE = {
  TEMPLATE: "TEMPLATE",
  DATA: "DATA",
};
type TYPE_START_WITH_TYPE = keyof typeof START_WITH_TYPE;
type TYPE_START_WITH_TYPE_VALUE =
  (typeof START_WITH_TYPE)[TYPE_START_WITH_TYPE];

const CreateNewAppsOption = ({
  currentApplicationIdForCreateNewApp,
  onClickBack,
}: {
  currentApplicationIdForCreateNewApp: string;
  onClickBack: () => void;
}) => {
  const [useType, setUseType] = useState<
    TYPE_START_WITH_TYPE_VALUE | undefined
  >();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const templatesCount = useSelector(
    (state: AppState) => state.ui.templates.templates.length,
  );
  const filters = useSelector(allTemplatesFiltersSelector);
  const workspaceList = useSelector(getForkableWorkspaces);
  const isImportingTemplate = useSelector(isImportingTemplateToAppSelector);
  const allTemplates = useSelector(getTemplatesSelector);
  const createNewAppPluginId = useSelector(getCurrentPluginIdForCreateNewApp);
  const application = useSelector((state) =>
    getApplicationByIdFromWorkspaces(
      state,
      currentApplicationIdForCreateNewApp,
    ),
  );
  const isEnabledForStartWithData = useFeatureFlag(
    FEATURE_FLAG.ab_onboarding_flow_start_with_data_dev_only_enabled,
  );

  const dispatch = useDispatch();
  const onClickStartFromTemplate = () => {
    AnalyticsUtil.logEvent("CREATE_APP_FROM_TEMPLATE");

    if (isEmpty(filters.functions)) {
      dispatch(getTemplateFilters());
    }

    if (!templatesCount) {
      dispatch(getAllTemplates());
    }
    setUseType(START_WITH_TYPE.TEMPLATE);
  };

  const onClickStartFromScratch = () => {
    if (application) {
      AnalyticsUtil.logEvent("CREATE_APP_FROM_SCRATCH");
      dispatch(
        firstTimeUserOnboardingInit(
          application.id,
          application.defaultPageId as string,
        ),
      );
    }
  };

  const onClickStartWithData = () => {
    // fetch plugins information to show list of all plugins
    if (isEnabledForStartWithData) {
      dispatch(fetchPlugins());
      setUseType(START_WITH_TYPE.DATA);
    }
  };

  const goBackToInitialScreen = () => {
    setUseType(undefined);
  };

  const getTemplateById = (id: string) => {
    const template = allTemplates.find((template) => template.id === id);
    return template;
  };

  const onTemplateClick = (id: string) => {
    const template = getTemplateById(id);
    if (template) {
      AnalyticsUtil.logEvent("CLICK_ON_TEMPLATE_CARD_WHEN_ONBOARDING", {
        id,
        title: template.title,
      });
      // When template is clicked to view the template details
      if (!isImportingTemplate) setSelectedTemplate(id);
    }
  };

  const resetCreateNewAppFlow = () => {
    dispatch(resetCurrentApplicationIdForCreateNewApp());
  };

  const onClickUseTemplate = (id: string) => {
    const template = getTemplateById(id);
    if (template) {
      AnalyticsUtil.logEvent("USE_TEMPLATE_FROM_DETAILS_PAGE_WHEN_ONBOARDING", {
        title: template.title,
      });
      // When Use template is clicked on template view detail screen
      if (!isImportingTemplate && application) {
        dispatch(
          importTemplateIntoApplicationViaOnboardingFlow(
            id,
            template.title as string,
            template.pages.map((p) => p.name),
            application.id,
            application.workspaceId,
          ),
        );
      }
    }
  };

  const onForkTemplateClick = (template: Template) => {
    const title = template.title;
    AnalyticsUtil.logEvent("FORK_TEMPLATE_WHEN_ONBOARDING", { title });
    // When fork template is clicked to add a new app using the template
    if (!isImportingTemplate && application) {
      dispatch(
        importTemplateIntoApplicationViaOnboardingFlow(
          template.id,
          template.title,
          template.pages.map((p) => p.name),
          application.id,
          application.workspaceId,
        ),
      );
    }
  };

  const onClickBackButton = () => {
    if (isImportingTemplate) return;
    if (useType === START_WITH_TYPE.TEMPLATE) {
      if (selectedTemplate) {
        // Going back from template details view screen
        const template = getTemplateById(selectedTemplate);
        if (template) {
          AnalyticsUtil.logEvent(
            "ONBOARDING_FLOW_CLICK_BACK_BUTTON_TEMPLATE_DETAILS_PAGE",
            { title: template.title },
          );
        }
        setSelectedTemplate("");
      } else {
        // Going back from start from template screen
        AnalyticsUtil.logEvent(
          "ONBOARDING_FLOW_CLICK_BACK_BUTTON_START_FROM_TEMPLATE_PAGE",
        );
        goBackToInitialScreen();
      }
    } else if (useType === START_WITH_TYPE.DATA) {
      if (createNewAppPluginId) {
        AnalyticsUtil.logEvent(
          "ONBOARDING_FLOW_CLICK_BACK_BUTTON_DATASOURCE_FORM_PAGE",
          { pluginId: createNewAppPluginId },
        );
        dispatch(resetCurrentPluginIdForCreateNewApp());
      } else {
        // Going back from start from data screen
        AnalyticsUtil.logEvent(
          "ONBOARDING_FLOW_CLICK_BACK_BUTTON_START_FROM_DATA_PAGE",
        );
        goBackToInitialScreen();
      }
    } else {
      // Going back from create new app flow
      AnalyticsUtil.logEvent(
        "ONBOARDING_FLOW_CLICK_BACK_BUTTON_CREATE_NEW_APP_PAGE",
      );
      onClickBack();
    }
  };

  const selectionOptions: CardProps[] = [
    {
      onClick: onClickStartFromScratch,
      src: getAssetUrl(`${ASSETS_CDN_URL}/Start-from-scratch.png`),
      subTitle: createMessage(START_FROM_SCRATCH_SUBTITLE),
      testid: "t--start-from-scratch",
      title: createMessage(START_FROM_SCRATCH_TITLE),
    },
    {
      onClick: onClickStartFromTemplate,
      src: getAssetUrl(`${ASSETS_CDN_URL}/Start-from-usecase.png`),
      subTitle: createMessage(START_FROM_TEMPLATE_SUBTITLE),
      testid: "t--start-from-template",
      title: createMessage(START_FROM_TEMPLATE_TITLE),
    },
  ];

  if (isEnabledForStartWithData) {
    selectionOptions.unshift({
      onClick: onClickStartWithData,
      src: getAssetUrl(`${ASSETS_CDN_URL}/Start-from-data.png`),
      subTitle: createMessage(START_WITH_DATA_SUBTITLE),
      testid: "t--start-from-data",
      title: createMessage(START_WITH_DATA_TITLE),
    });
  }

  useEffect(() => {
    AnalyticsUtil.logEvent("ONBOARDING_CREATE_APP_FLOW", {
      totalOptions: selectionOptions.length,
    });
    if (application)
      urlBuilder.updateURLParams(
        {
          applicationSlug: application.slug,
          applicationVersion: application.applicationVersion,
          applicationId: application.id,
        },
        application.pages.map((page) => ({
          pageSlug: page.slug,
          customSlug: page.customSlug,
          pageId: page.id,
        })),
      );

    return () => {
      resetCreateNewAppFlow();
    };
  }, []);

  return (
    <SectionWrapper>
      <BackWrapper hidden={!useType}>
        <Link
          className="t--create-new-app-option-goback"
          data-testid="t--create-new-app-option-goback"
          onClick={onClickBackButton}
          startIcon="arrow-left-line"
        >
          {createMessage(GO_BACK)}
        </Link>
      </BackWrapper>
      {useType === START_WITH_TYPE.TEMPLATE ? (
        selectedTemplate ? (
          <TemplateView
            onClickUseTemplate={onClickUseTemplate}
            showBack={false}
            showSimilarTemplate={false}
            templateId={selectedTemplate}
          />
        ) : (
          <Flex flexDirection="column" pl="spaces-3" pr="spaces-3">
            <Header
              subtitle={createMessage(START_WITH_TEMPLATE_CONNECT_SUBHEADING)}
              title={createMessage(START_WITH_TEMPLATE_CONNECT_HEADING)}
            />
            <TemplateWrapper>
              <FiltersWrapper>
                <Filters />
              </FiltersWrapper>
              <TemplateContentWrapper>
                <TemplatesContent
                  isForkingEnabled={!!workspaceList.length}
                  onForkTemplateClick={onForkTemplateClick}
                  onTemplateClick={onTemplateClick}
                />
              </TemplateContentWrapper>
            </TemplateWrapper>
          </Flex>
        )
      ) : useType === START_WITH_TYPE.DATA ? (
        createNewAppPluginId ? (
          <div>{createNewAppPluginId}</div>
        ) : (
          <Flex flexDirection="column" pl="spaces-3" pr="spaces-3">
            <Header
              subtitle={createMessage(START_WITH_DATA_CONNECT_SUBHEADING)}
              title={createMessage(START_WITH_DATA_CONNECT_HEADING)}
            />
            <WithDataWrapper>
              <CreateNewDatasourceTab />
            </WithDataWrapper>
          </Flex>
        )
      ) : useType === START_WITH_TYPE.DATA ? (
        createNewAppPluginId ? (
          <div>{createNewAppPluginId}</div>
        ) : (
          <WithDataWrapper>
            <CreateNewDatasourceTab />
          </WithDataWrapper>
        )
      ) : (
        <OptionWrapper>
          <Text kind="heading-xl">
            {createMessage(CREATE_NEW_APPS_STEP_TITLE)}
          </Text>
          <Text>{createMessage(CREATE_NEW_APPS_STEP_SUBTITLE)}</Text>
          <CardsWrapper>
            {selectionOptions.map((option: CardProps) => (
              <Card key={option.testid} {...option} />
            ))}
          </CardsWrapper>
        </OptionWrapper>
      )}
    </SectionWrapper>
  );
};

export default CreateNewAppsOption;
