import { Routes, Route } from 'react-router-dom';
import RoomList from './components/RoomList';
import RoomView from './components/RoomView';
import VotePanel from './components/VotePanel';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<RoomList />} />
      <Route path="/room/:roomCode" element={<RoomView />} />
      <Route path="/result/:roomCode" element={<VotePanel />} />
    </Routes>
  );
};

export default App;
