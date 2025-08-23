#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const open = require('open');
const express = require('express');
const portfinder = require('portfinder');

const installPath = path.join(os.homedir(), '.cascii-viewer');
const projectsPath = path.join(installPath, 'projects');
const configPath = path.join(installPath, 'config.json');
const wwwProjectsJsonPath = path.join(installPath, 'www', 'projects.json');

function updateProjectsJson() {
    if (!fs.existsSync(projectsPath)) {
        return;
    }
    try {
        const projects = fs.readdirSync(projectsPath).filter(file => {
            const filePath = path.join(projectsPath, file);
            return fs.statSync(filePath).isDirectory();
        });
        fs.writeJsonSync(wwwProjectsJsonPath, { projects });
    } catch (error) {
        // Fail silently if it can't write the file.
        // The app will handle the missing file.
    }
}

function getConfig() {
    if (fs.existsSync(configPath)) {
        const config = fs.readJsonSync(configPath);
        return config;
    }
    return {};
}

program
    .name('cascii-view')
    .description('A tool to view ASCII art animations.');

program
    .command('go')
    .description('Go to the install directory.')
    .action(() => {
        console.log(`Going to ${installPath}`);
        // This is tricky to do from a node script.
        // The install script will create a shell function or alias for this.
    });

program
    .command('where')
    .description('Get the path to the install directory.')
    .action(() => {
        console.log(installPath);
    });

program
    .command('list')
    .description('List all projects.')
    .action(() => {
        if (!fs.existsSync(installPath)) {
            console.log(chalk.red('cascii-viewer is not installed. Please run the install script.'));
            return;
        }
        try {
            const projects = fs.readdirSync(projectsPath);
            if (projects.length === 0) {
                console.log(chalk.yellow('No projects found.'));
                return;
            }
            console.log(chalk.green('Available projects:'));
            projects.forEach(project => {
                console.log(`- ${project}`);
            });
        } catch (error) {
            console.error(chalk.red('Error reading projects directory:'), error);
        }
    });

program
    .option('--get <projectName>', 'Display a specific project.');
    
program
    .command('delete <projectName>')
    .description('Delete a project.')
    .action((projectName) => {
        if (!fs.existsSync(installPath)) {
            console.log(chalk.red('cascii-viewer is not installed. Please run the install script.'));
            return;
        }
        const projectPath = path.join(projectsPath, projectName);
        if (!fs.existsSync(projectPath)) {
            console.log(chalk.red(`Project '${projectName}' not found.`));
            return;
        }
        try {
            fs.removeSync(projectPath);
            console.log(chalk.green(`Successfully deleted project '${projectName}'.`));
            updateProjectsJson();
        } catch (error) {
            console.error(chalk.red(`Error deleting project '${projectName}':`), error);
        }
    });
    

program
    .argument('[sourcePath]', 'Path to the project folder to add.')
    .action((sourcePath) => {
        // Validate the source path
        try {
            if (!fs.statSync(sourcePath).isDirectory()) {
                // This will not be hit if the path does not exist, fs.statSync throws.
                console.log(chalk.red(`Error: '${sourcePath}' is not a directory.`));
                return;
            }
            const frameFiles = fs.readdirSync(sourcePath).filter(f => f.startsWith('frame_') && f.endsWith('.txt'));
            if (frameFiles.length === 0) {
                console.log(chalk.red(`Error: No frame files (frame_*.txt) found in '${sourcePath}'.`));
                return;
            }
        } catch (error) {
            console.log(chalk.red(`Error: Source path '${sourcePath}' not found or is not accessible.`));
            return;
        }
        
        // Add the project
        if (!fs.existsSync(installPath)) {
            console.log(chalk.red('cascii-view is not installed. Please run the install script.'));
            return;
        }
        const projectName = path.basename(sourcePath);
        const destinationPath = path.join(projectsPath, projectName);

        if (fs.existsSync(destinationPath)) {
            console.log(chalk.yellow(`Project '${projectName}' already exists.`));
            // In a future version, we could ask to overwrite. For now, we'll just open it.
        } else {
            const config = getConfig();
            const action = config.defaultAction || 'copy';

            try {
                if (action === 'move') {
                    fs.moveSync(sourcePath, destinationPath);
                    console.log(chalk.green(`Successfully moved project '${projectName}'.`));
                } else {
                    fs.copySync(sourcePath, destinationPath);
                    console.log(chalk.green(`Successfully copied project '${projectName}'.`));
                }
            } catch (error) {
                console.error(chalk.red(`Error ${action}ing project:`), error);
                return; // Don't try to open if adding failed
            }
        }

        // Ensure projects.json is up to date even if project already existed
        updateProjectsJson();

        // Open the app by starting a server
        startServerAndOpen(projectName);
    });

function startServerAndOpen(projectName) {
    portfinder.getPortPromise()
        .then((port) => {
            const app = express();
            const wwwPath = path.join(installPath, 'www');

            // Serve the React app
            app.use(express.static(wwwPath));
            // Serve the projects folder so the app can fetch frames
            app.use('/projects', express.static(projectsPath));

            // Dynamic projects list endpoint
            app.get('/projects.json', (req, res) => {
                try {
                    if (!fs.existsSync(projectsPath)) {
                        return res.json({ projects: [] });
                    }
                    const projects = fs.readdirSync(projectsPath).filter((name) => {
                        const full = path.join(projectsPath, name);
                        return fs.existsSync(full) && fs.statSync(full).isDirectory();
                    });
                    return res.json({ projects });
                } catch (e) {
                    return res.json({ projects: [] });
                }
            });
            
            // Fallback to index.html for client-side routing
            app.get('*', (req, res) => {
                res.sendFile(path.join(wwwPath, 'index.html'));
            });

            app.listen(port, () => {
                console.log(chalk.green(`CASCII Viewer server is running at http://localhost:${port}`));
                const url = `http://localhost:${port}?project=${projectName}`;
                console.log(chalk.green(`Opening project '${projectName}' in your browser.`));
                open(url);
            });
        })
        .catch((err) => {
            console.error(chalk.red('Could not find an open port.'), err);
        });
}

program.parse(process.argv);

const options = program.opts();

if (options.get) {
    const projectName = options.get;
    if (!fs.existsSync(installPath)) {
        console.log(chalk.red('cascii-view is not installed. Please run the install script.'));
        return;
    }
    const projectPath = path.join(projectsPath, projectName);
    if (!fs.existsSync(projectPath)) {
        console.log(chalk.red(`Project '${projectName}' not found.`));
        return;
    }

    // Keep the projects list current
    updateProjectsJson();

    startServerAndOpen(projectName);

} else if (program.args.length === 0) { // No sourcePath was provided
    const knownCommands = program.commands.map(cmd => cmd.name());
    const inputCommand = process.argv[2];
    
    if (!inputCommand) {
        program.help();
    }
}
