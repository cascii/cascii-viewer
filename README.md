# CASCII Viewer - ASCII Animation Playback Tool

`cascii-viewer` is a React-based application designed to play ASCII art animations. It works in conjunction with the `cascii` generator tool, which converts videos and image sequences into ASCII art frames.

**[CASCII Generator App](https://github.com/cascii/cascii)**

## Features

*   **Command-Line Interface (CLI)**: Manage your ASCII art projects directly from the terminal.
*   **Dynamic Project Loading**: Add new ASCII animations from local folders and play them instantly.
*   **Responsive Playback**: Animations automatically adjust to fit your window size.
*   **GitHub Pages Showcase**: A static version of the viewer can be deployed to GitHub Pages to showcase sample animations.

## Installation

To install `cascii-viewer` and make the `cascii-view` and `casci-view` commands globally available on your system:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
    cd cascii-viewer
    ```
    *(Remember to replace `YOUR_USERNAME` and `YOUR_REPOSITORY_NAME` with your actual GitHub details.)*

2.  **Run the installer script**:
    ```bash
    bash install.sh
    ```

    You will be prompted for your password as the script uses `sudo` to copy the executable to `/usr/local/bin`.

3.  **Configure `go` command (if prompted)**:
    The installer will attempt to automatically configure the `cascii-view go` and `casci-view go` shell functions. If it cannot, you will see instructions to manually add the following to your shell's config file (`~/.zshrc` or `~/.bashrc`):

    ```bash
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
    ```

    After adding, run `source ~/.zshrc` (or your respective config file) or open a new terminal for changes to take effect.

## Usage

The `cascii-view` command (or its alias `casci-view`) is your primary interface.

*   **`cascii-view` (no arguments)**:
    Starts the local web application and opens it in your default browser, displaying a list of all projects you've added.

    ```bash
    cascii-view
    ```

*   **`cascii-view <sourcePath>`**:
    Adds a new ASCII animation project from the specified `sourcePath` (a folder containing `frame_xxxx.txt` files) to your `~/.cascii-viewer/projects` directory. If a project with the same name already exists, it will be overwritten. After adding, the app will launch and display the newly added project.

    ```bash
    cascii-view /path/to/your/animation_folder
    ```

*   **`cascii-view --get <projectName>`**:
    Launches the local web application and directly displays the specified `projectName` from your `~/.cascii-viewer/projects` directory.

    ```bash
    cascii-view --get my_awesome_animation
    ```

*   **`cascii-view list`**:
    Lists all currently installed ASCII animation projects in your `~/.cascii-viewer/projects` directory.

    ```bash
    cascii-view list
    ```

*   **`cascii-view delete <projectName>`**:
    Removes the specified `projectName` from your `~/.cascii-viewer/projects` directory.

    ```bash
    cascii-view delete old_animation
    ```

*   **`cascii-view go`**:
    Changes your current terminal directory to the `cascii-viewer` installation directory (`~/.cascii-viewer`). *(Requires the shell function setup during installation)*

    ```bash
    cascii-view go
    ```

*   **`cascii-view where`**:
    Prints the path to the `cascii-viewer` installation directory (`~/.cascii-viewer`).

    ```bash
    cascii-view where
    ```

## Local Development (Showcase Mode)

To run the showcase version of the app (which displays `small`, `default`, and `large` animations from the `public/` folder) for development purposes:

```bash
npm run start
```

This is useful for making changes to the React app's UI/UX. The `cascii-view` CLI commands will not be active in this mode.

## GitHub Pages Deployment

To deploy the showcase version of `cascii-viewer` to GitHub Pages:

1.  **Update `package.json`**: Ensure the `publicUrl` field in `package.json` is set to your GitHub Pages URL:
    ```json
    {
      // ...
      "publicUrl": "https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME",
      // ...
    }
    ```
    Replace `YOUR_USERNAME` and `YOUR_REPOSITORY_NAME` with your actual GitHub username and repository name.

2.  **Commit and Push**: Commit all your changes and push them to your GitHub repository.

3.  **Deploy**: Run the deployment script. This will build the static app and push it to the `gh-pages` branch.
    ```bash
    npm run deploy
    ```

4.  **Configure GitHub Pages**: In your GitHub repository settings, go to "Pages" and select the `gh-pages` branch as your source for deployment.

    Your app will be live at the `publicUrl` after a few moments.
