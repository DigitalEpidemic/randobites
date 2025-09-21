import { render } from "@testing-library/react-native";
import React from "react";
import { ThemedView } from "../themed-view";

// Mock the useThemeColor hook
jest.mock("../../hooks/use-theme-color", () => ({
  useThemeColor: jest.fn().mockReturnValue("#ffffff"),
}));

describe("ThemedView", () => {
  it("renders without crashing", () => {
    expect(() => render(<ThemedView />)).not.toThrow();
  });

  it("applies background color from theme", () => {
    const { getByTestId } = render(<ThemedView testID="themed-view" />);
    const view = getByTestId("themed-view");
    expect(view.props.style).toEqual([{ backgroundColor: "#ffffff" }, undefined]);
  });

  it("merges custom styles with theme background", () => {
    const customStyle = { padding: 10 };
    const { getByTestId } = render(
      <ThemedView testID="themed-view" style={customStyle} />
    );
    const view = getByTestId("themed-view");
    expect(view.props.style).toEqual([{ backgroundColor: "#ffffff" }, customStyle]);
  });

  it("passes through other props", () => {
    const { getByTestId } = render(
      <ThemedView testID="themed-view" accessible accessibilityLabel="test-view" />
    );
    const view = getByTestId("themed-view");
    expect(view.props.accessible).toBe(true);
    expect(view.props.accessibilityLabel).toBe("test-view");
  });

  it("renders children correctly", () => {
    const { getByTestId } = render(
      <ThemedView>
        <ThemedView testID="child-view">Child content</ThemedView>
      </ThemedView>
    );
    expect(getByTestId("child-view")).toBeTruthy();
  });
});