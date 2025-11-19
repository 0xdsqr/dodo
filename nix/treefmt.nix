{ pkgs, ... }:
{
  projectRootFile = "flake.nix";

  programs.nixfmt.enable = true;
  programs.biome = {
    enable = true;
    settings = {
      formatter = {
        enabled = true;
        indentStyle = "space";
        indentWidth = 2;
      };
      javascript = {
        formatter = {
          quoteStyle = "double";
          semicolons = "asNeeded";
        };
      };
      linter = {
        rules = {
          suspicious = {
            noArrayIndexKey = "warn";
          };
          a11y = {
            useAnchorContent = "warn";
          };
        };
      };
    };
  };

  # Add prettier for CSS/Tailwind support
  programs.prettier = {
    enable = true;
    includes = [ "**/*.css" ];
  };

  # Configure biome for JS/TS/JSON only, exclude CSS due to Tailwind syntax
  settings.formatter.biome = {
    includes = [
      "**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"
      "**/*.{json,jsonc}"
    ];
    excludes = [
      "**/*.css" # Exclude all CSS files due to Tailwind syntax
      "*.min.js"
      "*.gen.ts"
      "routeTree.gen.ts"
      "node_modules/**"
      ".vite/**"
      "pkgs/*"
      "dist/**"
      "build/**"
      "apps/dotdev/src/components/ui/**"
    ];
  };
}