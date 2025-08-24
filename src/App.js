import { useState, useEffect } from 'react';
import './styles/App.css';
import ASCIIAnimation from './components/ASCIIAnimation';

const IS_STATIC_SHOWCASE = process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEPLOY_TARGET === 'gh-pages';

const GH_PAGES_PROJECTS = [
  { name: 'small', frameCount: 120, fps: 24 },
  { name: 'default', frameCount: 120, fps: 24 },
  { name: 'large', frameCount: 301, fps: 60 },
];

function App() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      if (IS_STATIC_SHOWCASE) {
        setProjects(GH_PAGES_PROJECTS.map(p => p.name));
        
        const params = new URLSearchParams(window.location.search);
        const projectFromUrl = params.get('project');

        if (projectFromUrl && GH_PAGES_PROJECTS.some(p => p.name === projectFromUrl)) {
          setCurrentProject(projectFromUrl);
        }

        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/projects.json');
        if (!response.ok) {
          setProjects([]);
          return;
        }
        const data = await response.json();
        setProjects(data.projects || []);

        const params = new URLSearchParams(window.location.search);
        const projectFromUrl = params.get('project');

        if (projectFromUrl && data.projects && data.projects.includes(projectFromUrl)) {
          setCurrentProject(projectFromUrl);
        }

      } catch (error) {
        console.error("Could not fetch projects:", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const renderContent = () => {
    if (loading) {
      return <p>Loading...</p>;
    }

    if (currentProject) {
      const projectData = IS_STATIC_SHOWCASE ? GH_PAGES_PROJECTS.find(p => p.name === currentProject) : null;
      return (
        <div>
          <h2>{currentProject}</h2>
          <div className="animation-container">
            <ASCIIAnimation frameFolder={currentProject} frameCount={projectData?.frameCount} // Will be undefined for local version, which is fine
              fps={projectData?.fps} // Will be undefined for local version, using component default
            />
          </div>
        </div>
      );
    }

    // If in showcase mode and no specific project is selected, show all showcase projects.
    if (IS_STATIC_SHOWCASE) {
      return (
        <div>
          {GH_PAGES_PROJECTS.map(project => (
            <div key={project.name}>
              <h2>{project.name}</h2>
              <div className="animation-container">
                <ASCIIAnimation className={`animation-${project.name}`}frameFolder={project.name}frameCount={project.frameCount}fps={project.fps} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (projects.length > 0) {
      return (
        <div>
          <h2>Available Projects</h2>
          <ul>{projects.map(project => (<li key={project}><a href={`?project=${project}`}>{project}</a></li>))}</ul>
        </div>
      );
    }

    return <p>No projects found. Use the 'cascii-view' command to add a new project.</p>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>CASCII Viewer</h1>
        {currentProject && (<a href="./" className="back-link">&larr; Back to project list</a>)}
      </header>
      <main>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
