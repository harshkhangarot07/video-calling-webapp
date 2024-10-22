import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = "https://video-call-backend-xyo5.onrender.com";

const App = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isCalling, setIsCalling] = useState(false); // New state for call status

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'], // or ['polling']
    });
    
    // Create RTCPeerConnection
    const pc = new RTCPeerConnection();

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        newSocket.emit("ice-candidate", event.candidate);
      }
    };

    newSocket.on("ice-candidate", (candidate) => {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((error) => {
        console.error('Error adding received ICE candidate:', error);
      });
    });

    newSocket.on("offer", async (offer) => {
      await pc.setRemoteDescription(new RTCSessionDescription(offer)).catch((error) => {
        console.error('Error setting remote description:', error);
      });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      newSocket.emit("answer", answer);
    });

    newSocket.on("answer", (answer) => {
      pc.setRemoteDescription(new RTCSessionDescription(answer)).catch((error) => {
        console.error('Error setting remote description from answer:', error);
      });
    });

    setPeerConnection(pc);

    return () => {
      newSocket.close();
      pc.getTracks().forEach(track => track.stop()); // Stop all tracks
      pc.close();
    };
  }, []);

  const startCall = async () => {
    if (!peerConnection) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("offer", offer);
      setIsCalling(true); // Update call status
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h1>Video Call App</h1>
      <video ref={localVideoRef} autoPlay muted style={{ width: "300px", margin: "10px" }} />
      <video ref={remoteVideoRef} autoPlay style={{ width: "300px", margin: "10px" }} />
      <button onClick={startCall} style={{ marginTop: "10px" }} disabled={isCalling}>Start Call</button>
    </div>
  );
};

export default App;
