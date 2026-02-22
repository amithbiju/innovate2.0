import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProjectSelector from './components/ProjectSelector';
import MeetingRoom from './components/MeetingRoom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectSelector />} />
        <Route path="/meeting/:channelName" element={<MeetingRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
