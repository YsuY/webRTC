

const socket = io()

const nameInput = document.getElementById("nameInput")
const roomInput = document.getElementById("roomInput")
const joinBtn = document.getElementById("joinBtn")
const myVideo = document.getElementById("myVideo")
const otherVideo = document.getElementById("otherVideo")
const localStatus = document.getElementById("localStatus")
const remoteStatus = document.getElementById("remoteStatus")
const localVideo = document.getElementById("localVideo")
const remoteVideo = document.getElementById("remoteVideo")
const leaveBtn = document.getElementById("leaveBtn")

let nickname = ""
let roomId = ""

// webRTC
// main.js = 실제 기능, 브라우저 안에서 실제로 화상통화 기능을 수행함
// getUserMedia(), RTCpeerConnection, createOffer(), createAnswer(), setLocalDescription(), setRemoteDescription(), ontrack, 손들기 감지

// 마이크, 카메라 정보 담을 변수
let localStream
// 상대와 연결할 웹알티씨 객체 저장하는 변수
let peerConnection

// RTCpeerConnection의 설정값 -> 어떤 서버(STUN, TURN)를 사용할 것인지
const rtcConfig = {
    //상대와 연결할 수 있는 길을 찾는 기술: ice
    // ice가 길을 찾을 때 사용할 서버 목록 : iceServers
    iceServers: [{
        urls: "stun:stun.l.google.com:19302" //stun 서버 주소
    }]
}

// 카메라, 마이크 켜기 / LocalStream에 담기
// getUserMedia : 웹 브라우저가 사용자의 마이크나 카메라에 접근할 수 있게 해주는 JavaScript API
async function startMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })

        localVideo.srcObject = localStream
        console.log("카메라, 마이크 연결 완료")
    } catch (error) {
        console.log("마이크, 카메라 오류: ", error)
        alert("카메라와 마이크 권한을 허용해주세요")
        return false
    }
}


// RTCPeerConnection(핵심 API, 브라우저 간에 오디오 비디오를 직접 주고 받을 수 있도록
// 피투피 연결을 관리하는 브라우저 내장 객체) 생성
//피투피(P2P) : 중앙 서버 없이 컴퓨터끼리 1대1로 직접 데이터를 주고받는 방식
function createPeerConnection() {
    // rtcConfig : 위에서 만든 알티씨피어커넥션의 연결 객체
    peerConnection = new RTCPeerConnection(rtcConfig)

    // getTracks() : 스트림 안에 들어있는 각각의 미디어 트랙들을 배열 형태로 가져오는 메서드
    // getTracks로 배열로 가져오기 때문에 반복문을 돌려서 하나씩 꺼내줌
    localStream.getTracks().forEach((track) => {
        // 지금 보내려는 미디어 데이터 : track
        // track이 어떤 스트림에 속해 있는지 묶어서 알려주는 localStream
        // addTrack() : 이 연결 통로를 통해 내 미디어 트랙을 상대에게 보내는 메서드
        peerConnection.addTrack(track, localStream)
    })

    // ontrack : 상대가 보낸 트랙이 내 브라우저에 도착했을 때 자동으로 실행되는 이벤트 핸들러
    peerConnection.ontrack = (event) => {
        // srcObject : 본인 태그에 미디어 스트림을 직접 주입할 때 사용하는 속성, 위치 지정
        // steams[0] : 상대가 보낸 트랙의 첫 번째 배열 스트림을 가져와 태그에 넣음 
        // => 이 코드가 실행되어야 상대방 얼굴 출력됨
        remoteVideo.srcObject = event.streams[0]
    }

    // onicecandidate : webrtc가 서로 연결 가능한 네크워크 경로 후보를 찾아냈을 때마다
    // 자동으로 실행되는 이벤트 핸들러
    peerConnection.onicecandidate = (event) => {
        // (event.candidate) : 해당 ()가 존재한다면~
        if(event.candidate) {
            // socket : 서버와 양방향 통신을 하기 위해 웹소켓 사용
            // emit : 웹소켓을 통해 서버로 데이터를 보내기 위해 사용
            // ice_candidate : 어떤 종류의 데이터인지 구별하는 이벤트 이름
            socket.emit("ice_candidate", {
                roomId,
                candidate: event.candidate
            })
        }
    }
}


// Offer(연결 요청서) 생성
async function createOffer() {
    // offer 생성
    const offer = await peerConnection.createOffer()
    // 내 연결 정보로 등록
    // setLocalDescription : 내 프로필을 내 가방에 넣음
    await peerConnection.setLocalDescription(offer)

    // 소켓을 통해 서버에 이벤트 오퍼 전달
    socket.emit("offer", {
        roomId,
        offer
    })
}


//  Offer를 받고 나면 answer을 생성, 보내야 함
// Answer(응답서) 생성
async function createAnswer() {
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    socket.emit("answer", {
        roomId,
        answer
    })
}




// socket 연결
socket.on("connect", () => {
    console.log("서버 연결됨", socket.id)
})


// 입장 버튼 클릭
joinBtn.addEventListener("click", async() => {
    nickname = nameInput.value.trim()
    roomId = roomInput.value.trim()

    if(!nickname || !roomId) {
        alert("닉네임과 방 번호를 모두 입력하세요")
        return
    }
    //카메라, 마이크가 작동이 되면 방 입장/화면에 출력
    const mediaSuccess = await startMedia()
    if(!mediaSuccess) return

    document.querySelector(".join_room").style.display = "none"
    document.querySelector(".video_section").classList.add("active_flex")
    console.log("화면 전환 완료")

    // 카메라화면이 출력되고 미디어파이프 시작
    startPose(localVideo)

    // 내 이름 표시
    myVideo.innerText = `${nickname} (나)`

    // 서버로 방 입장 요청
    socket.emit("join_room", {
        roomId, 
        nickname
    })

    console.log("방 입장: ", roomId, nickname)
})


// 방이 꽉 찻을 때
socket.on("room_full", () => {
    alert("방이 다 찼습니다")
    // 메인화면으로 강제로 되돌아감
    window.location.href = "/"
})


// 나가기 버튼 누르기(내가)
if(leaveBtn) {
    leaveBtn.addEventListener("click", () => {
        if(roomId) {
            socket.emit("leave_room", {roomId})
        }
        window.location.href = "/"
    })
}


// 나가기 버튼 누르기(상대가)
socket.on("user_disconnected", () => {
    if(romoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop())
        remoteVideo.srcObject = null
    }

    if(peerConnection) {
        peerConnection.close()
    }
    otherVideo.innerText = "상대"
    remoteStatus.innerText = "상대방이 퇴장했습니다"
})



// peer-joined 받기 (상대방 입장 감지)
socket.on("peer_joined", async (data) => {
    console.log("상대 입장", data)
    otherVideo.innerText = data.nickname
    remoteStatus.innerText = "상대 입장 완료"

    createPeerConnection()
    await createOffer()
})


// Offer 받기
socket.on("offer", async ({offer}) => {
    // 상대와 연결할 객체를 새로 만듦
    createPeerConnection()
    // setRemoteDescription : 상대의 프로필을 내 가방에 넣음
    await peerConnection.setRemoteDescription(offer)
    // 오퍼를 다 주고 받았으니 엔서를 주고 받아야 되기 때문에 사용
    await createAnswer()
})


// Answer 받기
socket.on("answer", async({answer}) => {
    await peerConnection.setRemoteDescription(answer)
})


// ice_candidate 받기(등록)
socket.on("ice_candidate", async ({candidate}) => {
    // addIceCandidate : 상대방이 실시간으로 보내오는 세부 경로 주소를 내 연결 객체에 추가하는 명령어 
    await peerConnection.addIceCandidate(candidate)
})

// 미디어파이프가 손들기 상태를 알려주면 실행됨
// 기본 = flase
// 내 화면 변경
window.onHandRaisedChanged = (raised) => {
    // 내 상태 표시 : 삼항 연산자 사용
    localStatus.innerText = raised ? "발언권 요청" : ""

    // 서버로 전송
    socket.emit("hand_raise", {
        roomId,
        handRaised : raised
    })
}


// 상대화면 변경
socket.on("hand_raise", ({handRaised}) => {
    remoteStatus.innerText = handRaised ? "발언권 요청" : ""
})