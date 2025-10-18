import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

export default function Meeting() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});

  const [connected, setConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        localVideoRef.current.srcObject = stream;

        socket.emit('join-room', roomId);
        setConnected(true);

        socket.on('room-participants', (count) => setParticipantCount(count));
      } catch (err) {
        console.error('Camera/mic error:', err);
        alert('Please allow camera and microphone access.');
      }
    };

    start();

    socket.on('user-joined', async (remoteSocketId) => {
      await createOffer(remoteSocketId);
    });

    socket.on('signal', async ({ from, signal }) => {
      if (!peerConnectionsRef.current[from]) {
        await createPeerConnection(from);
      }

      const peerConnection = peerConnectionsRef.current[from];

      if (signal.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { roomId, to: from, signal: answer });
      } else if (signal.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(signal));
      }
    });

    socket.on('user-disconnected', (socketId) => {
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
      setRemoteConnected(false);
    });

    socket.on('chat-message', ({ senderId, message }) => {
      setChatMessages(prev => [...prev, { senderId, message }]);
    });

    return () => {
      socket.disconnect();
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    };
  }, []);

  const createPeerConnection = async (remoteSocketId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const stream = isScreenSharing ? screenStreamRef.current : localStreamRef.current;

    stream?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
      setRemoteConnected(true);
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', {
          roomId,
          to: remoteSocketId,
          signal: event.candidate,
        });
      }
    };

    peerConnectionsRef.current[remoteSocketId] = peerConnection;
    return peerConnection;
  };

  const createOffer = async (remoteSocketId) => {
    const peerConnection = await createPeerConnection(remoteSocketId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('signal', {
      roomId,
      to: remoteSocketId,
      signal: offer,
    });
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  const leaveMeeting = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    socket.disconnect();
    navigate('/');
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      screenVideoRef.current.srcObject = screenStream;
      setIsScreenSharing(true);

      Object.values(peerConnectionsRef.current).forEach(pc => {
        const senders = pc.getSenders();
        const videoSender = senders.find(sender => sender.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
        }
      });

      screenStream.getVideoTracks()[0].onended = () => stopScreenShare();
    } catch (err) {
      console.error('Screen share failed:', err);
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    setIsScreenSharing(false);
    screenStreamRef.current = null;

    Object.values(peerConnectionsRef.current).forEach(pc => {
      const senders = pc.getSenders();
      const videoSender = senders.find(sender => sender.track?.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
      }
    });
  };

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      socket.emit('chat-message', { roomId, message: chatInput.trim() });
      setChatMessages(prev => [...prev, { senderId: 'You', message: chatInput.trim() }]);
      setChatInput('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start dark:bg-black bg-white dark:text-white text-black px-4 pt-6">
      <h2 className="text-xl mb-1 font-semibold">Meeting ID: {roomId}</h2>
      <p className="text-sm mb-4 text-gray-400">Participants: {participantCount}</p>

      <div className="flex gap-4 flex-wrap justify-center mb-6">
        <div>
          <p className="text-sm mb-1 text-center">You</p>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-72 border-2 border-white rounded" />
        </div>

        <div className="relative w-72 h-48 border-2 border-green-400 rounded overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`absolute top-0 left-0 w-full h-full object-cover ${!remoteConnected ? 'opacity-0' : ''}`}
          />
          {!remoteConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white text-sm">
              Waiting for peer to join...
            </div>
          )}
          <p className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">Peer</p>
        </div>

        {isScreenSharing && (
          <div>
            <p className="text-sm mb-1 text-center">Your Screen</p>
            <video ref={screenVideoRef} autoPlay playsInline muted className="w-72 border-2 border-yellow-500 rounded" />
          </div>
        )}
      </div>

      <div className="flex gap-4 flex-wrap justify-center mb-4">
        <button onClick={toggleMute} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded border border-white">
          {isMuted ? 'Unmute Mic 🎤' : 'Mute Mic 🔇'}
        </button>
        <button onClick={toggleVideo} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded border border-white">
          {isVideoOff ? 'Turn On Camera 📷' : 'Turn Off Camera 🚫'}
        </button>
        {!isScreenSharing ? (
          <button onClick={startScreenShare} className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded border border-white">
            Share Screen 🖥️
          </button>
        ) : (
          <button onClick={stopScreenShare} className="bg-yellow-800 hover:bg-yellow-700 px-4 py-2 rounded border border-white">
            Stop Sharing 🚫
          </button>
        )}
        <button onClick={leaveMeeting} className="bg-red-700 hover:bg-red-600 px-4 py-2 rounded border border-white">
          Leave Meeting ❌
        </button>
      </div>

      <div className="w-full max-w-xl bg-gray-900 p-4 rounded shadow mt-4">
        <div className="h-48 overflow-y-auto border border-gray-700 p-2 mb-2 rounded bg-black text-sm">
          {chatMessages.map((msg, index) => (
            <div key={index} className="mb-1">
              <strong className="text-green-400">{msg.senderId}:</strong> {msg.message}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-1 rounded bg-gray-800 border border-gray-700 text-white"
          />
          <button onClick={sendChatMessage} className="bg-blue-600 hover:bg-blue-500 px-4 py-1 rounded text-white">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
