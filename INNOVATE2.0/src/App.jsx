import { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Overview from './components/views/Overview';
import Modules from './components/views/Modules';
import Timeline from './components/views/Timeline';
import IntegrationGraph from './components/views/IntegrationGraph';
import Risks from './components/views/Risks';
import Traceability from './components/views/Traceability';
import AIAssistant from './components/views/AIAssistant';
import { useFirebase } from './context/FirebaseContext';

const viewComponents = {
  overview: Overview,
  modules: Modules,
  timeline: Timeline,
  graph: IntegrationGraph,
  risks: Risks,
  traceability: Traceability,
  assistant: AIAssistant,
  settings: () => (
    <div className="flex items-center justify-center h-64 text-slate-500 animate-fade-in">
      <div className="text-center">
        <div className="text-4xl mb-3">⚙️</div>
        <div className="text-sm">Settings coming soon</div>
      </div>
    </div>
  ),
};

export default function App() {
  const { projects, loading } = useFirebase();
  const [activeView, setActiveView] = useState('overview');
  const [currentProject, setCurrentProject] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  // Set initial project when projects load
  if (!loading && projects?.length > 0 && !currentProject) {
    setCurrentProject(projects[0]);
  }

  const ActiveView = viewComponents[activeView] || Overview;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark mesh-bg text-white' : 'mesh-bg'}`}>
        <div className="text-xl animate-pulse">Loading Live Intelligence Data...</div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="mesh-bg min-h-screen flex flex-col">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar activeView={activeView} setActiveView={setActiveView} />

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopNav
              currentProject={currentProject}
              setCurrentProject={setCurrentProject}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />

            {/* Page content */}
            <main className="flex-1 overflow-y-auto p-6">
              <div className={`mx-auto ${activeView === 'assistant' ? 'max-w-4xl h-full flex flex-col' : 'max-w-7xl'}`}>
                <ActiveView />
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
