const explorer = require("../../../../locators/explorerlocators.json");
import {
  apiPage,
  agHelper,
  entityExplorer,
  entityItems,
  jsEditor,
} from "../../../../support/Objects/ObjectsCore";

const firstApiName = "First";
const secondApiName = "Second";

describe(
  "Api Naming conflict on a page test",
  { tags: [Tag.IDE] },
  function () {
    it("1. Expects actions on the same page cannot have identical names", function () {
      // create an API
      apiPage.CreateApi(firstApiName);
      // create another API
      apiPage.CreateApi(secondApiName);
      entityExplorer.ExpandCollapseEntity("Queries/JS");
      // try to rename one of the APIs with an existing API name
      cy.get(`.t--entity-item:contains(${secondApiName})`).within(() => {
        cy.get(".t--context-menu").click({ force: true });
      });
      cy.selectAction("Edit name");
      //cy.RenameEntity(tabname);
      cy.get(explorer.editEntity).last().type(firstApiName, { force: true });
      //cy.RenameEntity(firstApiName);
      cy.validateMessage(firstApiName);
      agHelper.PressEnter();
      entityExplorer.ActionContextMenuByEntityName({
        entityNameinLeftSidebar: secondApiName,
        action: "Delete",
        entityType: entityItems.Api,
      });
      entityExplorer.ActionContextMenuByEntityName({
        entityNameinLeftSidebar: firstApiName,
        action: "Delete",
        entityType: entityItems.Api,
      });
    });
  },
);

describe(
  "Api Naming conflict on different pages test",
  { tags: [Tag.IDE] },
  function () {
    it("2. It expects actions on different pages can have identical names", function () {
      // create a new API
      cy.CreateAPI(firstApiName);
      entityExplorer.ExpandCollapseEntity("Queries/JS", true);

      // create a new page and an API on that page
      entityExplorer.AddNewPage();
      cy.CreateAPI(firstApiName);
      entityExplorer.ExpandCollapseEntity("Queries/JS", true);
      cy.get(".t--entity-name").contains(firstApiName).should("exist");
      cy.get(`.t--entity-item:contains(${firstApiName})`).within(() => {
        cy.get(".t--context-menu").click({ force: true });
      });
      cy.deleteActionAndConfirm();
      cy.get(`.t--entity-item:contains(Page2)`).within(() => {
        cy.get(".t--context-menu").click({ force: true });
      });
      cy.deleteActionAndConfirm();
      cy.get(`.t--entity-item:contains(${firstApiName})`).within(() => {
        cy.get(".t--context-menu").click({ force: true });
      });
      cy.deleteActionAndConfirm();
      cy.wait(1000);
    });
  },
);

describe("Entity Naming conflict test", { tags: [Tag.IDE] }, function () {
  it("3. Expects JS objects and actions to not have identical names on the same page.", function () {
    entityExplorer.ExpandCollapseEntity("Queries/JS", true);
    // create JS object and name it
    jsEditor.CreateJSObject('return "Hello World";');
    cy.get(`.t--entity-item:contains('JSObject1')`).within(() => {
      cy.get(".t--context-menu").click({ force: true });
    });
    cy.selectAction("Edit name");
    cy.get(explorer.editEntity)
      .last()
      .type(firstApiName, { force: true })
      .type("{enter}");
    cy.wait(2000); //for the changed JS name to reflect

    cy.CreateAPI(secondApiName);

    cy.get(`.t--entity-item:contains(${secondApiName})`).within(() => {
      cy.get(".t--context-menu").click({ force: true });
    });
    cy.selectAction("Edit name");

    cy.get(explorer.editEntity).last().type(firstApiName, { force: true });
    entityExplorer.ValidateDuplicateMessageToolTip(firstApiName);
    cy.get("body").click(0, 0);
    cy.wait(2000);
    cy.get(`.t--entity-item:contains(${firstApiName})`).within(() => {
      cy.get(".t--context-menu").click({ force: true });
    });
    cy.deleteActionAndConfirm();
    cy.get(`.t--entity-item:contains(${secondApiName})`).within(() => {
      cy.get(".t--context-menu").click({ force: true });
    });
    cy.deleteActionAndConfirm();
  });
});
