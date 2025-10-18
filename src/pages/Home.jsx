import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const navigate = useNavigate();

  const createMeeting = () => {
    const id = uuidv4();
    navigate(`/meeting/${id}`);
  };

  const joinMeeting = (e) => {
    e.preventDefault();
    const id = e.target.elements.meetingId.value;
    if (id) navigate(`/meeting/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <h1 className="text-3xl font-bold mb-6">🎥 Video Calling App</h1>
      <button 
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4" 
        onClick={createMeeting}
      >
        Create New Meeting
      </button>
      <form onSubmit={joinMeeting} className="flex gap-2">
        <input 
          type="text" 
          name="meetingId" 
          placeholder="Enter Meeting ID" 
          className="px-3 py-2 border rounded" 
        />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
          Join
        </button>
      </form>
    </div>
  );
}
