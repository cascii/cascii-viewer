#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting CASCII Viewer installation..."

# Define installation paths
INSTALL_DIR="$HOME/.cascii-viewer"
PROJECTS_DIR="$INSTALL_DIR/projects"
WWW_DIR="$INSTALL_DIR/www"
BIN_DIR="/usr/local/bin"
EXECUTABLE_NAME="cascii-view"
EXECUTABLE_ALIAS="casci-view"
CLI_SCRIPT_NAME="cli.js"

# Create directories
echo "Creating installation directories..."
mkdir -p "$PROJECTS_DIR"
mkdir -p "$WWW_DIR"

# Build React app
echo "Building the React app..."
npm run build

# Copy build files
echo "Copying React app files..."
cp -R build/* "$WWW_DIR/"

# Copy CLI script and package files
echo "Copying CLI script and package files..."
cp "$CLI_SCRIPT_NAME" "$INSTALL_DIR/"
cp package.json "$INSTALL_DIR/"
cp package-lock.json "$INSTALL_DIR/"

# Install production dependencies in the installation directory
echo "Installing production dependencies..."
cd "$INSTALL_DIR"
npm install --production

# Prompt for default action
echo "Configure default action for adding new projects."
read -p "Should the default action be to 'copy' or 'move' project folders? (copy/move): " defaultAction
if [[ "$defaultAction" != "move" ]]; then
    defaultAction="copy"
fi

# Create config file
echo "Creating config file..."
echo "{\"defaultAction\": \"$defaultAction\"}" > config.json


# Create the executables in /usr/local/bin
echo "Creating executables in $BIN_DIR..."
cat << EOF > "$EXECUTABLE_NAME"
#!/bin/bash
node "$INSTALL_DIR/$CLI_SCRIPT_NAME" "\$@"
EOF

cat << EOF > "$EXECUTABLE_ALIAS"
#!/bin/bash
node "$INSTALL_DIR/$CLI_SCRIPT_NAME" "\$@"
EOF

chmod +x "$EXECUTABLE_NAME" "$EXECUTABLE_ALIAS"
# Use sudo to move the executables. This might prompt the user for a password.
sudo mv "$EXECUTABLE_NAME" "$BIN_DIR/"
sudo mv "$EXECUTABLE_ALIAS" "$BIN_DIR/"

echo ""
echo "Installation complete!"
echo "You can now use the 'cascii-view' or 'casci-view' commands."
echo ""

# Attempt to configure 'cascii-view go' command automatically
SHELL_CONFIG_FILE=""
CURRENT_SHELL=
if [ -n "$SHELL" ]; then
  CURRENT_SHELL=$(basename "$SHELL")
fi

if [ "$CURRENT_SHELL" = "zsh" ]; then
    SHELL_CONFIG_FILE="$HOME/.zshrc"
elif [ "$CURRENT_SHELL" = "bash" ]; then
    SHELL_CONFIG_FILE="$HOME/.bashrc"
fi

MANUAL_INSTRUCTIONS="To enable the '... go' helper, add the following functions to your shell's config file (.zshrc, .bashrc, etc.):"

FN_DEFINITION=$(cat << 'EOF'

# CASCII Viewer 'go' helper for both command names
cascii-view() {
    if [[ $1 == "go" ]]; then
        cd ~/.cascii-viewer
    else
        command cascii-view "$@"
    fi
}

casci-view() {
    if [[ $1 == "go" ]]; then
        cd ~/.cascii-viewer
    else
        command casci-view "$@"
    fi
}
EOF
)

if [ -n "$SHELL_CONFIG_FILE" ] && [ -f "$SHELL_CONFIG_FILE" ]; then
    ADDED_ANY=false
    if ! grep -q "cascii-view()" "$SHELL_CONFIG_FILE"; then
        echo "Adding 'cascii-view' function to your $SHELL_CONFIG_FILE for the 'go' command."
        echo "$FN_DEFINITION" >> "$SHELL_CONFIG_FILE"
        ADDED_ANY=true
    fi
    if [ "$ADDED_ANY" = true ]; then
        echo "Successfully added! Please run 'source $SHELL_CONFIG_FILE' or open a new terminal to use the '... go' helper."
    else
        echo "Helper functions already present in $SHELL_CONFIG_FILE. Skipping."
    fi
else
    echo "$MANUAL_INSTRUCTIONS"
    echo "$FN_DEFINITION"
    echo ""
    echo "After adding it, restart your terminal or run 'source ~/.your_shell_config_file'."
fi
