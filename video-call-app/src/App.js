import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = "https://video-call-backend-xyo5.onrender.com";


const App = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    // Handle incoming remote tracks
    const pc = new RTCPeerConnection();

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    // Send ICE candidates to peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        newSocket.emit("ice-candidate", event.candidate);
      }
    };

    // Listen for ICE candidates from peer
    newSocket.on("ice-candidate", (candidate) => {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // Listen for offer from peer
    newSocket.on("offer", async (offer) => {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      newSocket.emit("answer", answer);
    });

    // Listen for answer from peer
    newSocket.on("answer", (answer) => {
      pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    setPeerConnection(pc); // Set peer connection after creating it

    return () => {
      newSocket.close();
      pc.close(); // Close peer connection on unmount
    };
  }, []);

  const startCall = async () => {
    if (!peerConnection) return; // Ensure peerConnection is set

    // Get user media (camera + microphone)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("offer", offer);
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h1>Video Call App</h1>
      <video ref={localVideoRef} autoPlay muted style={{ width: "300px", margin: "10px" }} />
      <video ref={remoteVideoRef} autoPlay style={{ width: "300px", margin: "10px" }} />
      <button onClick={startCall} style={{ marginTop: "10px" }}>Start Call</button>
    </div>
  );
};

export default App;
