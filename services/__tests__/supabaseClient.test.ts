// Mock the createClient function
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn().mockReturnValue("mocked-supabase-client"),
}));

// Set default environment to avoid warnings during initial import
process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

describe("supabaseClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    // Start with clean environment
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("creates supabase client when both URL and key are provided", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    // Re-import to get the new environment
    jest.isolateModules(() => {
      const { supabase } = require("../supabaseClient");
      expect(supabase).toBe("mocked-supabase-client");
    });
  });

  it("returns null when URL is missing", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    jest.isolateModules(() => {
      const { supabase } = require("../supabaseClient");
      expect(supabase).toBeNull();
    });
  });

  it("returns null when key is missing", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    jest.isolateModules(() => {
      const { supabase } = require("../supabaseClient");
      expect(supabase).toBeNull();
    });
  });

  it("returns null when both URL and key are missing", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    jest.isolateModules(() => {
      const { supabase } = require("../supabaseClient");
      expect(supabase).toBeNull();
    });

    consoleSpy.mockRestore();
  });

  it("logs warning when credentials are not configured", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    jest.isolateModules(() => {
      require("../supabaseClient");
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Supabase credentials not configured. Shared cache will be disabled."
    );

    consoleSpy.mockRestore();
  });
});