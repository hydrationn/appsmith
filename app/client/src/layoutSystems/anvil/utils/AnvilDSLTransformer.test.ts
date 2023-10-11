import { anvilDSLTransformer } from "./AnvilDSLTransformer";
import { mainContainerProps } from "mocks/widgetProps/input";
describe("Test the DSL transformer for Anvil", () => {
  it("should add a layout if it does not exist in the DSL", () => {
    // Arrange
    const dsl = mainContainerProps;

    const expected = {
      ...mainContainerProps,
      layout: [
        {
          layoutId: "",
          layoutType: "ALIGNED_COLUMN",
          layout: [],
          isDropTarget: true,
          isPermanent: true,
          childTemplate: {
            layoutId: "",
            layoutType: "ALIGNED_ROW",
            layout: [],
            insertChild: true,
          },
        },
      ],
    };

    // Act
    const result = anvilDSLTransformer(dsl);

    // Assert
    expect(result).toEqual(expected);
  });

  it("should not add a layout if it already exists in the DSL", () => {
    // Arrange
    const dsl = {
      ...mainContainerProps,
      layout: [
        {
          layoutId: "existingLayout",
          layoutType: "CUSTOM",
          layout: [],
        },
      ],
    };

    // Act
    const result = anvilDSLTransformer(dsl);

    // Assert
    expect(result).toEqual(dsl); // The result should be the same as the input since the layout exists
  });
});
