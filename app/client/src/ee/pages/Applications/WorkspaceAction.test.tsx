import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { ThemeProvider } from "styled-components";
import { klona } from "klona";
import "@testing-library/jest-dom";

import store from "store";
import WorkspaceAction from "./WorkspaceAction";
import * as moduleFeatureSelectors from "@appsmith/selectors/moduleFeatureSelectors";
import * as applicationSelectors from "@appsmith/selectors/applicationSelectors";
import * as packageSelectors from "@appsmith/selectors/packageSelectors";
import * as packageActions from "@appsmith/actions/packageActions";
import { createSelector } from "reselect";
import { lightTheme } from "selectors/themeSelectors";
import { PERMISSION_TYPE } from "@appsmith/utils/permissionHelpers";

jest.mock("@appsmith/selectors/moduleFeatureSelectors");
jest.mock("@appsmith/selectors/packageSelectors");
jest.mock("@appsmith/selectors/applicationSelectors");
jest.mock("@appsmith/actions/packageActions");

const DEFAULT_WORKSPACE_ID = "test-workspace";

const DEFAULT_USER_WORKSPACES = [
  {
    workspace: {
      id: DEFAULT_WORKSPACE_ID,
      name: "Test Workspace",
      userPermissions: [
        PERMISSION_TYPE.CREATE_APPLICATION,
        PERMISSION_TYPE.CREATE_PACKAGE,
      ] as any,
    },
    applications: [
      {
        id: "loadingAppId1",
        userPermissions: [],
        name: "loadingAppName1",
        workspaceId: DEFAULT_WORKSPACE_ID,
        isPublic: false,
        appIsExample: false,
        defaultPageId: "5f7c3bc3b295692137139bd7",
        applicationVersion: 1,
        pages: [],
        slug: "app1",
      },
    ],
    users: [],
    packages: [
      {
        id: "pkg",
        userPermissions: [],
        name: "Package 1",
        workspaceId: DEFAULT_WORKSPACE_ID,
      },
    ],
  },
];

const setQueryModuleFeatureFlag = (value: boolean) => {
  const moduleFeatureSelectorsFactory = moduleFeatureSelectors as jest.Mocked<
    typeof moduleFeatureSelectors
  >;
  moduleFeatureSelectorsFactory.getShowQueryModule.mockImplementation(
    () => value,
  );
};

const setIsCreatingPackageSelector = (value: boolean) => {
  const packageSelectorsFactory = packageSelectors as jest.Mocked<
    typeof packageSelectors
  >;
  packageSelectorsFactory.getIsCreatingPackage.mockImplementation(() => value);
};

const setIsCreatingApplicationSelector = (value: boolean) => {
  const applicationSelectorsFactory = applicationSelectors as jest.Mocked<
    typeof applicationSelectors
  >;

  applicationSelectorsFactory.getIsCreatingApplicationByWorkspaceId.mockImplementation(
    // eslint-disable-next-line
    // @ts-ignore
    () => createSelector(() => value),
  );
};

const mockGetUserApplicationsList = (
  userWorkspaces = DEFAULT_USER_WORKSPACES,
) => {
  const applicationSelectorsFactory = applicationSelectors as jest.Mocked<
    typeof applicationSelectors
  >;

  applicationSelectorsFactory.getUserApplicationsWorkspacesList.mockImplementation(
    // eslint-disable-next-line
    // @ts-ignore
    () => userWorkspaces,
  );
};

describe("WorkspaceAction", () => {
  it("should render the CE UI when the showQueryModule is disabled", () => {
    setQueryModuleFeatureFlag(false);
    setIsCreatingPackageSelector(false);
    setIsCreatingApplicationSelector(false);
    mockGetUserApplicationsList();

    render(
      <ThemeProvider theme={lightTheme}>
        <Provider store={store}>
          <WorkspaceAction
            isMobile={false}
            onCreateNewApplication={jest.fn()}
            workspaceId={DEFAULT_WORKSPACE_ID}
          />
        </Provider>
      </ThemeProvider>,
    );

    expect(screen.queryByText("New")).toBeInTheDocument();
    expect(screen.queryByText("Create new")).not.toBeInTheDocument();
  });

  it("should render the EE action button when the showQueryModule is enabled", () => {
    setQueryModuleFeatureFlag(true);
    setIsCreatingPackageSelector(false);
    setIsCreatingApplicationSelector(false);

    render(
      <ThemeProvider theme={lightTheme}>
        <Provider store={store}>
          <WorkspaceAction
            isMobile={false}
            onCreateNewApplication={jest.fn()}
            workspaceId={DEFAULT_WORKSPACE_ID}
          />
        </Provider>
      </ThemeProvider>,
    );

    expect(screen.queryByText("New")).not.toBeInTheDocument();
    expect(screen.queryByText("Create new")).toBeInTheDocument();
  });

  it("it should be in a loading state when package is creating", () => {
    setQueryModuleFeatureFlag(true);
    setIsCreatingPackageSelector(true);
    setIsCreatingApplicationSelector(false);

    render(
      <ThemeProvider theme={lightTheme}>
        <Provider store={store}>
          <WorkspaceAction
            isMobile={false}
            onCreateNewApplication={jest.fn()}
            workspaceId={DEFAULT_WORKSPACE_ID}
          />
        </Provider>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("t--workspace-action-btn")).toHaveAttribute(
      "data-loading",
      "true",
    );
  });

  it("it should be in a loading state when application is creating", async () => {
    setQueryModuleFeatureFlag(true);
    setIsCreatingPackageSelector(false);
    setIsCreatingApplicationSelector(true);

    render(
      <ThemeProvider theme={lightTheme}>
        <Provider store={store}>
          <WorkspaceAction
            isMobile={false}
            onCreateNewApplication={jest.fn()}
            workspaceId={DEFAULT_WORKSPACE_ID}
          />
        </Provider>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("t--workspace-action-btn")).toHaveAttribute(
      "data-loading",
      "true",
    );
  });

  it("show create App/Package options when Create new button is clicked", () => {
    setQueryModuleFeatureFlag(true);
    setIsCreatingPackageSelector(false);
    setIsCreatingApplicationSelector(false);

    render(
      <ThemeProvider theme={lightTheme}>
        <Provider store={store}>
          <WorkspaceAction
            isMobile={false}
            onCreateNewApplication={jest.fn()}
            workspaceId={DEFAULT_WORKSPACE_ID}
          />
        </Provider>
      </ThemeProvider>,
    );

    const button = screen.getByTestId("t--workspace-action-btn");

    // Check for options to be not preset
    expect(screen.queryByText("New App")).not.toBeInTheDocument();
    expect(screen.queryByText("New Package")).not.toBeInTheDocument();

    fireEvent.click(button);

    // Check for visibility of options
    expect(
      screen.getByTestId("t--workspace-action-create-app"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("t--workspace-action-create-package"),
    ).toBeInTheDocument();
  });

  it("executes onCreateNewApplication when the New App is clicked", async () => {
    setQueryModuleFeatureFlag(true);
    setIsCreatingPackageSelector(false);
    setIsCreatingApplicationSelector(false);

    const onCreateNewAppMock = jest.fn();

    render(
      <ThemeProvider theme={lightTheme}>
        <Provider store={store}>
          <WorkspaceAction
            isMobile={false}
            onCreateNewApplication={onCreateNewAppMock}
            workspaceId={DEFAULT_WORKSPACE_ID}
          />
        </Provider>
      </ThemeProvider>,
    );

    // Click on workspace action button (Create new)
    const button = screen.getByTestId("t--workspace-action-btn");
    fireEvent.click(button);

    // Click new App menu item
    const newAppMenuItem = screen.getByTestId("t--workspace-action-create-app");
    fireEvent.click(newAppMenuItem);

    await waitFor(() => expect(onCreateNewAppMock).toBeCalledTimes(1));
  });

  it("executes createPackageFromWorkspace action when the New Package is clicked", async () => {
    setQueryModuleFeatureFlag(true);
    setIsCreatingPackageSelector(false);
    setIsCreatingApplicationSelector(false);

    const packageActionsFactory = packageActions as jest.Mocked<
      typeof packageActions
    >;
    const createPackageFromWorkspaceMock =
      packageActionsFactory.createPackageFromWorkspace.mockImplementation();

    render(
      <ThemeProvider theme={lightTheme}>
        <Provider store={store}>
          <WorkspaceAction
            isMobile={false}
            onCreateNewApplication={jest.fn()}
            workspaceId={DEFAULT_WORKSPACE_ID}
          />
        </Provider>
      </ThemeProvider>,
    );

    // Click on workspace action button (Create new)
    const button = screen.getByTestId("t--workspace-action-btn");
    fireEvent.click(button);

    // Click new App menu item
    const newPkgMenuItem = screen.getByTestId(
      "t--workspace-action-create-package",
    );
    fireEvent.click(newPkgMenuItem);

    await waitFor(() =>
      expect(createPackageFromWorkspaceMock).toBeCalledTimes(1),
    );
  });

  it("disables create package option when permission is missing", () => {
    setQueryModuleFeatureFlag(true);
    setIsCreatingPackageSelector(false);
    setIsCreatingApplicationSelector(false);

    // Add only Create app permission
    const userWorkspaces = klona(DEFAULT_USER_WORKSPACES);
    userWorkspaces[0].workspace.userPermissions = [
      PERMISSION_TYPE.CREATE_APPLICATION,
    ];

    mockGetUserApplicationsList(userWorkspaces);

    render(
      <ThemeProvider theme={lightTheme}>
        <Provider store={store}>
          <WorkspaceAction
            isMobile={false}
            onCreateNewApplication={jest.fn()}
            workspaceId={DEFAULT_WORKSPACE_ID}
          />
        </Provider>
      </ThemeProvider>,
    );

    // Click on workspace action button (Create new)
    const button = screen.getByTestId("t--workspace-action-btn");
    fireEvent.click(button);

    expect(
      screen.getByTestId("t--workspace-action-create-package"),
    ).toHaveAttribute("data-disabled");
    expect(
      screen.getByTestId("t--workspace-action-create-app"),
    ).not.toHaveAttribute("data-disabled");
  });

  it("disables create app when permission is missing", () => {
    setQueryModuleFeatureFlag(true);
    setIsCreatingPackageSelector(false);
    setIsCreatingApplicationSelector(false);

    // Add only Create app permission
    const userWorkspaces = klona(DEFAULT_USER_WORKSPACES);
    userWorkspaces[0].workspace.userPermissions = [
      PERMISSION_TYPE.CREATE_PACKAGE,
    ];

    mockGetUserApplicationsList(userWorkspaces);

    render(
      <ThemeProvider theme={lightTheme}>
        <Provider store={store}>
          <WorkspaceAction
            isMobile={false}
            onCreateNewApplication={jest.fn()}
            workspaceId={DEFAULT_WORKSPACE_ID}
          />
        </Provider>
      </ThemeProvider>,
    );

    // Click on workspace action button (Create new)
    const button = screen.getByTestId("t--workspace-action-btn");
    fireEvent.click(button);

    expect(
      screen.getByTestId("t--workspace-action-create-app"),
    ).toHaveAttribute("data-disabled");
    expect(
      screen.getByTestId("t--workspace-action-create-package"),
    ).not.toHaveAttribute("data-disabled");
  });

  it("hides the primary action button when permission for both create app and package are missing", () => {
    setQueryModuleFeatureFlag(true);
    setIsCreatingPackageSelector(false);
    setIsCreatingApplicationSelector(false);

    // Add only Create app permission
    const userWorkspaces = klona(DEFAULT_USER_WORKSPACES);
    userWorkspaces[0].workspace.userPermissions = [];

    mockGetUserApplicationsList(userWorkspaces);

    render(
      <ThemeProvider theme={lightTheme}>
        <Provider store={store}>
          <WorkspaceAction
            isMobile={false}
            onCreateNewApplication={jest.fn()}
            workspaceId={DEFAULT_WORKSPACE_ID}
          />
        </Provider>
      </ThemeProvider>,
    );

    expect(screen.queryByText("New App")).not.toBeInTheDocument();
  });
});