import { useState, useEffect } from 'react';
import './styles/App.css';
import ASCIIAnimation from './components/ASCIIAnimation';

function App() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
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
      return (
        <div>
          <h2>{currentProject}</h2>
          <div className="animation-container">
            <ASCIIAnimation frameFolder={currentProject} />
          </div>
        </div>
      );
    }

    if (projects.length > 0) {
      return (
        <div>
          <h2>Available Projects</h2>
          <ul>
            {projects.map(project => (
              <li key={project}>
                <a href={`/?project=${project}`}>{project}</a>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return <p>No projects found. Use the 'cascii-view' command to add a new project.</p>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>CASCII Viewer</h1>
        {currentProject && (
          <a href="/" className="back-link">&larr; Back to project list</a>
        )}
      </header>
      <main>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
