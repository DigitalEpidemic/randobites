import { useThemeColor } from "../use-theme-color";
import { renderHook } from "@testing-library/react-native";

// Mock the useColorScheme hook
jest.mock("../use-color-scheme", () => ({
  useColorScheme: jest.fn(),
}));

// Mock the Colors constant
jest.mock("../../constants/theme", () => ({
  Colors: {
    light: {
      text: "#11181C",
      background: "#fff",
      tint: "#0a7ea4",
    },
    dark: {
      text: "#ECEDEE",
      background: "#151718",
      tint: "#fff",
    },
  },
}));

import { useColorScheme } from "../use-color-scheme";

const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

describe("useThemeColor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns light color when light theme is active and light prop is provided", () => {
    mockUseColorScheme.mockReturnValue("light");

    const { result } = renderHook(() =>
      useThemeColor({ light: "#custom-light", dark: "#custom-dark" }, "text")
    );

    expect(result.current).toBe("#custom-light");
  });

  it("returns dark color when dark theme is active and dark prop is provided", () => {
    mockUseColorScheme.mockReturnValue("dark");

    const { result } = renderHook(() =>
      useThemeColor({ light: "#custom-light", dark: "#custom-dark" }, "text")
    );

    expect(result.current).toBe("#custom-dark");
  });

  it("returns theme default when no custom color is provided for light theme", () => {
    mockUseColorScheme.mockReturnValue("light");

    const { result } = renderHook(() =>
      useThemeColor({}, "text")
    );

    expect(result.current).toBe("#11181C");
  });

  it("returns theme default when no custom color is provided for dark theme", () => {
    mockUseColorScheme.mockReturnValue("dark");

    const { result } = renderHook(() =>
      useThemeColor({}, "text")
    );

    expect(result.current).toBe("#ECEDEE");
  });

  it("defaults to light theme when useColorScheme returns null", () => {
    mockUseColorScheme.mockReturnValue(null);

    const { result } = renderHook(() =>
      useThemeColor({}, "background")
    );

    expect(result.current).toBe("#fff");
  });

  it("works with different color names", () => {
    mockUseColorScheme.mockReturnValue("light");

    const { result } = renderHook(() =>
      useThemeColor({}, "tint")
    );

    expect(result.current).toBe("#0a7ea4");
  });
});