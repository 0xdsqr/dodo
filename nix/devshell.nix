{ nixpkgs, system }:
let
  pkgs = import nixpkgs { inherit system; };
in
{
  # import the dev pkgs from compilation
  packages.${system}.default = [
    pkgs.bun
  ];

  # Create a development shell
  devShells.${system}.default = pkgs.mkShell {
    buildInputs = with pkgs; [
      # Core packages
      curl
      wget

      # Development tools
      just

      # Nix development tools
      nixfmt-rfc-style
      nixfmt-tree
      statix
      deadnix
      nil

      # Language runtimes
      bun
      jdk21
      starship
    ];

    shellHook = ''
      # Initialize starship for the current shell
      if [[ -n "$ZSH_VERSION" ]]; then
        eval "$(starship init zsh)"
      else
        eval "$(starship init bash)"
      fi

      echo "Bun version: $(bun --version)"
      echo "Java version: $(java -version 2>&1 | head -n 1)"
      echo "🚀 Development shell activated, you can now compile things"
    '';

    # Prefer zsh as the shell
    preferLocalBuild = true;
    shell = "${pkgs.zsh}/bin/zsh";
  };
}
