{
  description = "dodo";

  inputs = {
    # Core Nixpkgs + compatibility
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-compat.url = "github:edolstra/flake-compat";
    flake-compat.flake = false;

    # Developer tools / utilities
    treefmt-nix.url = "github:numtide/treefmt-nix";
    treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      treefmt-nix,
      ...
    }@inputs:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forEachSystem = nixpkgs.lib.genAttrs systems;
    in
    {
      # ------------------------------------------------------------
      # Development shell (nix develop .)
      # ------------------------------------------------------------
      devShells = forEachSystem (
        system:
        let
          devConfig = import ./nix/devshell.nix { inherit nixpkgs system; };
        in
        devConfig.devShells.${system}
      );

      # ------------------------------------------------------------
      # Formatter (nix fmt)
      # ------------------------------------------------------------
      formatter = forEachSystem (
        system:
        (treefmt-nix.lib.evalModule nixpkgs.legacyPackages.${system} ./nix/treefmt.nix).config.build.wrapper
      );

      # ------------------------------------------------------------
      # Checks (nix flake check)
      # Runs formatting checks only
      # ------------------------------------------------------------
      checks = forEachSystem (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          formatting = (treefmt-nix.lib.evalModule pkgs ./nix/treefmt.nix).config.build.check self;
        }
      );
    };
}
