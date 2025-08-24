#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const open = require('open');
const http = require('http');
const mime = require('mime-types');
const url = require('url');
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
        // Print only the path so users can do: cd "$(cascii-view go)"
        console.log(installPath);
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
    .command('add <sourcePath>')
    .description('Add a new project from the specified folder.')
    .action(async (sourcePath) => {
        // Validate the source path
        try {
            if (!fs.statSync(sourcePath).isDirectory()) {
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

        // Determine action upfront
        const config = getConfig();
        const action = config.defaultAction || 'copy';

        const resolvedSource = path.resolve(sourcePath);
        const resolvedDest = path.resolve(destinationPath);

        if (resolvedSource === resolvedDest) {
            console.log(chalk.yellow(`Source path is already the installed project. Skipping transfer.`));
        } else {
            if (fs.existsSync(destinationPath)) {
                try {
                    console.log(chalk.yellow(`Overwriting existing project '${projectName}'...`));
                    fs.removeSync(destinationPath);
                } catch (err) {
                    console.error(chalk.red(`Failed to remove existing project '${projectName}':`), err);
                    return;
                }
            }

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

// Make the <sourcePath> argument the default behavior if no other command is specified.
program
    .argument('[sourcePath]', 'Path to the project folder to add.')
    .action(async (sourcePath) => {

        // If a known command is being run, don't treat it as a source path.
        const knownCommands = program.commands.map(cmd => cmd.name());
        if (sourcePath && knownCommands.includes(sourcePath)) {
            // Let commander handle the command.
            return;
        }

        // Also check if an option was passed without a source path.
        const options = program.opts();
        if (!sourcePath) {
             if (options.get) {
                // Handled after parse
                return;
             }
             // If we are here, no source path, no known command, no handled option.
             // Commander will show help by default if no args are given.
             return;
        }

        // Validate the source path
        try {
            if (!fs.statSync(sourcePath).isDirectory()) {
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

        // Determine action upfront
        const config = getConfig();
        const action = config.defaultAction || 'copy';

        const resolvedSource = path.resolve(sourcePath);
        const resolvedDest = path.resolve(destinationPath);

        if (resolvedSource === resolvedDest) {
            console.log(chalk.yellow(`Source path is already the installed project. Skipping transfer.`));
        } else {
            if (fs.existsSync(destinationPath)) {
                try {
                    console.log(chalk.yellow(`Overwriting existing project '${projectName}'...`));
                    fs.removeSync(destinationPath);
                } catch (err) {
                    console.error(chalk.red(`Failed to remove existing project '${projectName}':`), err);
                    return;
                }
            }

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
}


function startServerAndOpen(projectName) {
    portfinder.getPortPromise()
        .then((port) => {
            const app = http.createServer(async (req, res) => {
                const parsedUrl = url.parse(req.url);
                let pathname = parsedUrl.pathname;

                if (pathname === '/favicon.ico') {
                    res.writeHead(204); // No Content
                    res.end();
                    return;
                }

                const wwwPath = path.join(installPath, 'www');
                let filePath = path.join(wwwPath, pathname);

                // Handle server API routes first
                if (pathname === '/projects.json') {
                    try {
                        if (!fs.existsSync(projectsPath)) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ projects: [] }));
                            return;
                        }
                        const projects = fs.readdirSync(projectsPath).filter((name) => {
                            const full = path.join(projectsPath, name);
                            return fs.existsSync(full) && fs.statSync(full).isDirectory();
                        });
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ projects }));
                    } catch (e) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ projects: [] }));
                    }
                    return;
                } else if (pathname.startsWith('/api/projects/') && pathname.endsWith('/frames-count')) {
                    const projectName = pathname.split('/')[3];
                    try {
                        const projectDir = path.join(projectsPath, projectName);
                        if (!fs.existsSync(projectDir)) {
                            res.writeHead(404, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ frameCount: 0 }));
                            return;
                        }
                        const files = fs.readdirSync(projectDir).filter((f) => /^frame_\d{4}\.txt$/.test(f));
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ frameCount: files.length }));
                    } catch (e) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ frameCount: 0 }));
                    }
                    return;
                }
                
                // Handle static file serving for /projects and /
                if (pathname.startsWith('/projects/')) {
                    filePath = path.join(projectsPath, pathname.substring('/projects/'.length));
                }

                // Fallback for client-side routing
                if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                    filePath = path.join(wwwPath, 'index.html');
                }
                
                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        // If index.html itself is not found, it's a 500
                        if (filePath.endsWith('index.html')) {
                             res.writeHead(500); res.end('Server error: Could not find application entrypoint.');
                        } else {
                            // Any other missing file is a 404
                            res.writeHead(404); res.end('Not found');
                        }
                        return;
                    }

                    const contentType = mime.lookup(filePath) || 'application/octet-stream';
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(data);
                });
            });

            app.listen(port, () => {
                console.log(chalk.green(`CASCII Viewer server is running at http://localhost:${port}`));
                const appUrl = `http://localhost:${port}?project=${projectName}`;
                console.log(chalk.green(`Opening project '${projectName}' in your browser.`));
                open(appUrl);
            });
        })
        .catch((err) => {
            console.error(chalk.red('Could not find an open port.'), err);
        });
}
