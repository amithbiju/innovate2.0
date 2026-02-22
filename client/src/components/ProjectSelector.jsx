import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'cam-projects';

function generateId() {
  return 'proj-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function ProjectSelector() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [error, setError] = useState('');

  // Load projects from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProjects(JSON.parse(stored));
      }
    } catch {
      console.warn('Failed to load projects from localStorage');
    }
  }, []);

  // Save projects to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const handleCreateProject = () => {
    const name = newProjectName.trim();
    if (!name) {
      setError('Please enter a project name');
      return;
    }
    if (projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setError('A project with this name already exists');
      return;
    }

    const newProject = { id: generateId(), name };
    const updated = [...projects, newProject];
    setProjects(updated);
    setSelectedProjectId(newProject.id);
    setNewProjectName('');
    setError('');
  };

  const handleJoinMeeting = () => {
    if (!selectedProjectId) {
      setError('Please select or create a project first');
      return;
    }
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) {
      setError('Selected project not found');
      return;
    }

    // Store active project for meeting room to use
    sessionStorage.setItem('cam-active-project', JSON.stringify(project));

    // Use project name (sanitized) as channel name
    const channelName = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 64);

    navigate(`/meeting/${channelName}`);
  };

  const handleDeleteProject = (id) => {
    setProjects(projects.filter((p) => p.id !== id));
    if (selectedProjectId === id) setSelectedProjectId('');
  };

  return (
    <div className="landing-page">
      {/* Background effects */}
      <div className="landing-bg-orb landing-bg-orb--1" />
      <div className="landing-bg-orb landing-bg-orb--2" />
      <div className="landing-bg-orb landing-bg-orb--3" />

      <div className="landing-container">
        {/* Header */}
        <header className="landing-header">
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.6 11.6L22 7v10l-6.4-4.6" />
                <rect x="2" y="5" width="14" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <span>Context-Aware Meet</span>
          </div>
          <p className="landing-subtitle">Real-time video meetings with chat & live transcription</p>
        </header>

        {/* Main card */}
        <div className="landing-card">
          <h2 className="landing-card-title">Get Started</h2>

          {/* Create project section */}
          <div className="landing-section">
            <label className="landing-label">Create a New Project</label>
            <div className="landing-input-group">
              <input
                type="text"
                className="landing-input"
                placeholder="Enter project name…"
                value={newProjectName}
                onChange={(e) => {
                  setNewProjectName(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
              <button className="landing-btn landing-btn--secondary" onClick={handleCreateProject}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create
              </button>
            </div>
          </div>

          {/* Select project section */}
          <div className="landing-section">
            <label className="landing-label">Select Existing Project</label>
            {projects.length === 0 ? (
              <div className="landing-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" opacity="0.4">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" />
                </svg>
                <span>No projects yet. Create one above!</span>
              </div>
            ) : (
              <div className="landing-project-list">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`landing-project-item ${selectedProjectId === project.id ? 'landing-project-item--selected' : ''}`}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setError('');
                    }}
                  >
                    <div className="landing-project-radio">
                      <div className="landing-project-radio-inner" />
                    </div>
                    <span className="landing-project-name">{project.name}</span>
                    <button
                      className="landing-project-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      title="Delete project"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error message */}
          {error && <div className="landing-error">{error}</div>}

          {/* Join button */}
          <button className="landing-btn landing-btn--primary landing-btn--full" onClick={handleJoinMeeting}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M15.6 11.6L22 7v10l-6.4-4.6" />
              <rect x="2" y="5" width="14" height="14" rx="2" ry="2" />
            </svg>
            Join Meeting
          </button>
        </div>

        {/* Footer */}
        <footer className="landing-footer">
          <p>Powered by Agora · Built for context-driven teams</p>
        </footer>
      </div>
    </div>
  );
}

export default ProjectSelector;
