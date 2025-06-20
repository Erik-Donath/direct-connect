import { useState } from 'react';
import './App.css'
import { Peer } from "peerjs";

const peer = new Peer()

function App() {
  const [hostID, setHostID] = useState("Loading...")
  const [clientID, setClientID] = useState('');

  peer.on('open', id => {
    setHostID(id);
    console.log('Server peer ID:', id);
  });

  peer.on('connection', conn => {
    console.log('Connected to:', conn.peer);
	  conn.on('data', function(data) {
	    console.log('Received', data);
      conn.send(data);
	  });
  });

  const handelSetClientID = (event) => {
    setClientID(event.target.value);
  }

  const connectToHost = () => {
    console.log("Host ID:", clientID);
    const conn = peer.connect(clientID);
    conn.on("open", () => {
      conn.send("hi!");
    });
    conn.on("data", function(data) {
	    console.log('Received', data);
      conn.send(data);
	  })
  }

  return <>
    <h1>Connect to: {hostID}</h1>

    <input
      type="text"
      value={clientID}
      onChange={handelSetClientID}
      placeholder='Type ID'
      ></input>
    <button onClick={connectToHost}>Connect to Host</button>
  </>
}

export default App
