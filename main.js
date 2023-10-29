let localStream;
let peerConnection;
let remoteStream;
let APP_ID = "0ac5b4566af848feb8b4f4c5f8adafca";
let token = null;
let uid = String(Math.floor(Math.random() * 10000));
console.info("This is uid", uid);
let client;
let channel;

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com.19302", "stun:stun2.l.google.com.19302"],
    },
  ],
};

let init = async () => {
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid, token });

  // index.html?rome=12345
  channel = client.createChannel("main");
  await channel.join();

  channel.on("MemberJoined", handleUserJoined);
  channel.on("MemberLeft", handleUserLeft);
  client.on("MessageFromPeer", handleMessageFromPeer);

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
  document.getElementById("user-1").srcObject = localStream;
};

// New user Join handling function
let handleUserJoined = async (memberId) => {
  console.log("A new User joined the channel: ", memberId);
  createOffer(memberId);
};

//  sending msg from one to another fn
let handleMessageFromPeer = (message, memberId) => {
  message = JSON.parse(message.text);
  if (message?.type === "offer") {
    createAnswer(memberId, message?.offer);
  }

  if (message?.type === "answer") {
    addAnswer(message?.answer);
  }

  if (message?.type === "candidate") {
    if (peerConnection) {
      peerConnection.addIceCandidate(message?.candidate);
    }
  }
  // console.log("Message", message);
};

const handleUserLeft = async (memberId) => {
  document.getElementById("user-2").style.display = "none";
};

// Create peer connection
let createPeerConnection = async (memberId) => {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;
  document.getElementById("user-2").style.display = "block";

  // extra checker for access camera and audio
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });
    document.getElementById("user-1").srcObject = localStream;
  }

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      client.sendMessageToPeer(
        {
          text: JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
          }),
        },
        memberId
      );
    }
  };
};

let createOffer = async (memberId) => {
  await createPeerConnection(memberId);

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // console.log("offer: ", offer);
  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "offer", offer: offer }) },
    memberId
  );
};

let createAnswer = async (memberId, offer) => {
  await createPeerConnection(memberId);

  await peerConnection.setRemoteDescription(offer);
  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "answer", answer: answer }) },
    memberId
  );
};

const addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer);
  }
};

const leaveChannel = async () => {
  console.log("this is thw client who leave", client);
  console.log("this is thw channel who leave", channel);
  await channel.leave();
  await client.logout();
};

window.addEventListener("beforeunload", leaveChannel);
// console.log(document.getElementById("user-1"));
init();
