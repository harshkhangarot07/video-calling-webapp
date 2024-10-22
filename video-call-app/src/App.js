import React , {useEffect , usrRef , useState, useRef } from 'react'
import io from 'socket.io-client'


const SOCKET_SERVER_URL  =  "https://video-call-backend-xyo5.onrender.com";

const App = ()=>{
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const [peerConnection , setPeerConnection ] = useState(null)
  const [socket , setSocket] = useState(null)

  useEffect(()=>{
    //first intialize the socket connection 

    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);


    //now create the webrtc connection
    const pc = new RTCPeerConnection();
    setPeerConnection(pc);

    //get the user media response
    navigator.mediaDevices.getUserMedia({video : true , audio : true})
    .then((stream)=>{
      localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => pc.addTrack(track , stream));
    });


    //handling the incoming remote tracks
    pc.ontrack = (event) =>{
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    //send ince candidates to peer 
    pc.onicecandidate = (event) =>{
      if(event.candidate){
        newSocket.emit("ice-candidate", event.candidate);
      }
    };

    //listen for ice candidate from peer 
    newSocket.on("ice-candidate", (candidate)=>{
      pc.addIceCandidate( new RTCIceCandidate(candidate));
    });

    //listen for offer from peer
    newSocket.on("offer", async(offer)=>{
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer)
      newSocket.emit("answer", answer)
    })

    //listen for answer from peer
    newSocket.on("answer", (answer)=>{
      pc.setRemoteDescription(new RTCSessionDescription(answer))

    })

    return ()=> newSocket.close();



  },[])


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
