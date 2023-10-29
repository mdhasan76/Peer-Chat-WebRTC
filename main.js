let localStream;
let peerConnection;
let remoteStream;
let APP_ID = "0ac5b4566af848feb8b4f4c5f8adafca";
let token = null;
let uid = String(Math.floor(Math.random() * 10000));

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

  client.on("MessageFromPeer", handleMessageFromPeer);

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
  document.getElementById("user-1").srcObject = localStream;
};

let handleUserJoined = async (memberId) => {
  console.log("A new User joined the channel: ", memberId);
  createOffer(memberId);
};

let handleMessageFromPeer = (message, memberId) => {
  message = JSON.parse(message.text);
  console.log("Message", message);
};

let createOffer = async (memberId) => {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack();
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

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // console.log("offer: ", offer);
  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "offer", offer: offer }) },
    memberId
  );
};

// console.log(document.getElementById("user-1"));
init();
