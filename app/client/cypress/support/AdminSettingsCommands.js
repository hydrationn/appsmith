/* eslint-disable cypress/no-unnecessary-waiting */
/* eslint-disable cypress/no-assigning-return-values */

require("cy-verify-downloads").addCustomCommand();
require("cypress-file-upload");

const googleForm = require("../locators/GoogleForm.json");
const googleData = require("../fixtures/googleSource.json");
const githubForm = require("../locators/GithubForm.json");
const oidcform = require("../locators/OIDCForm.json");
const oidcData = require("../fixtures/oidcSource.json");
const adminSettings = require("../locators/AdminsSettings");

Cypress.Commands.add("fillGoogleFormPartly", () => {
  cy.get(googleForm.googleClientId)
    .clear()
    .type(Cypress.env("APPSMITH_OAUTH2_GOOGLE_CLIENT_ID"));
  cy.get(googleForm.googleAllowedDomains)
    .clear()
    .type(googleData.googleAllowedDomains);
  cy.get(googleForm.saveBtn).click({ force: true });
});

Cypress.Commands.add("fillGoogleForm", () => {
  cy.get(googleForm.googleClientId)
    .clear()
    .type(Cypress.env("APPSMITH_OAUTH2_GOOGLE_CLIENT_ID"));
  cy.get(googleForm.googleClientSecret)
    .clear()
    .type(Cypress.env("APPSMITH_OAUTH2_GOOGLE_CLIENT_SECRET"));
  cy.get(googleForm.googleAllowedDomains)
    .clear()
    .type(googleData.googleAllowedDomains);
  cy.get(googleForm.saveBtn).click({ force: true });
});

Cypress.Commands.add("fillGithubFormPartly", () => {
  cy.get(githubForm.githubClientId)
    .clear()
    .type(Cypress.env("APPSMITH_OAUTH2_GITHUB_CLIENT_ID"));
  cy.get(githubForm.saveBtn).click({ force: true });
});

Cypress.Commands.add("fillGithubForm", () => {
  cy.get(githubForm.githubClientId)
    .clear()
    .type(Cypress.env("APPSMITH_OAUTH2_GITHUB_CLIENT_ID"));
  cy.get(githubForm.githubClientSecret)
    .clear()
    .type(Cypress.env("APPSMITH_OAUTH2_GITHUB_CLIENT_SECRET"));
  cy.get(githubForm.saveBtn).click({ force: true });
});

// open authentication page
Cypress.Commands.add("openAuthentication", () => {
  cy.get(".admin-settings-menu-option").should("be.visible");
  cy.get(".admin-settings-menu-option").click();
  cy.url().should("contain", "/settings/general");
  // click authentication tab
  cy.get(adminSettings.authenticationTab).click();
  cy.url().should("contain", "/settings/authentication");
});

Cypress.Commands.add("waitForServerRestart", () => {
  cy.get(adminSettings.restartNotice).should("be.visible");
  // Wait for restart notice to not be visible with a timeout
  // Cannot use cy.get as mentioned in https://github.com/NoriSte/cypress-wait-until/issues/75#issuecomment-572685623
  cy.waitUntil(() => !Cypress.$(adminSettings.restartNotice).length, {
    timeout: 120000,
  });
  cy.get(adminSettings.saveButton).should("be.visible");
});
