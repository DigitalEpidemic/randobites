import { render } from "@testing-library/react-native";
import React from "react";
import { ThemedText } from "../themed-text";

// Mock the useThemeColor hook
jest.mock("../../hooks/use-theme-color", () => ({
  useThemeColor: jest.fn().mockReturnValue("#000000"),
}));

describe("ThemedText", () => {
  it("renders without crashing", () => {
    expect(() => render(<ThemedText>Test text</ThemedText>)).not.toThrow();
  });

  it("renders text content", () => {
    const { getByText } = render(<ThemedText>Hello World</ThemedText>);
    expect(getByText("Hello World")).toBeTruthy();
  });

  it("applies default type styles", () => {
    const { getByText } = render(<ThemedText>Default text</ThemedText>);
    const text = getByText("Default text");
    expect(text.props.style).toEqual([
      { color: "#000000" },
      { fontSize: 16, lineHeight: 24 },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("applies title type styles", () => {
    const { getByText } = render(<ThemedText type="title">Title text</ThemedText>);
    const text = getByText("Title text");
    expect(text.props.style).toEqual([
      { color: "#000000" },
      undefined,
      { fontSize: 32, fontWeight: "bold", lineHeight: 32 },
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("applies subtitle type styles", () => {
    const { getByText } = render(<ThemedText type="subtitle">Subtitle text</ThemedText>);
    const text = getByText("Subtitle text");
    expect(text.props.style).toEqual([
      { color: "#000000" },
      undefined,
      undefined,
      undefined,
      { fontSize: 20, fontWeight: "bold" },
      undefined,
      undefined,
    ]);
  });

  it("applies defaultSemiBold type styles", () => {
    const { getByText } = render(<ThemedText type="defaultSemiBold">Semi-bold text</ThemedText>);
    const text = getByText("Semi-bold text");
    expect(text.props.style).toEqual([
      { color: "#000000" },
      undefined,
      undefined,
      { fontSize: 16, lineHeight: 24, fontWeight: "600" },
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("applies link type styles", () => {
    const { getByText } = render(<ThemedText type="link">Link text</ThemedText>);
    const text = getByText("Link text");
    expect(text.props.style).toEqual([
      { color: "#000000" },
      undefined,
      undefined,
      undefined,
      undefined,
      { lineHeight: 30, fontSize: 16, color: "#0a7ea4" },
      undefined,
    ]);
  });

  it("merges custom styles", () => {
    const customStyle = { fontSize: 20 };
    const { getByText } = render(
      <ThemedText style={customStyle}>Custom styled text</ThemedText>
    );
    const text = getByText("Custom styled text");
    expect(text.props.style).toEqual([
      { color: "#000000" },
      { fontSize: 16, lineHeight: 24 },
      undefined,
      undefined,
      undefined,
      undefined,
      customStyle,
    ]);
  });

  it("passes through other props", () => {
    const { getByText } = render(
      <ThemedText accessibilityLabel="test-text" numberOfLines={2}>
        Accessible text
      </ThemedText>
    );
    const text = getByText("Accessible text");
    expect(text.props.accessibilityLabel).toBe("test-text");
    expect(text.props.numberOfLines).toBe(2);
  });
});