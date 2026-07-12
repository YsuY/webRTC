// webRTC

//server.js = 중계자 역할, 브라우저끼리 연결할 수 있게 필요한 정보만 전달해줌
// join_room, offer, answer, ice_candidate, hand_raise


// cd server -> node server.js
const express = require("express")
const http = require("http")
const path = require("path")
const { Server } = require("socket.io")


const app = express()
const server = http.createServer(app)
const io = new Server(server)



// public 폴더 열기
app.use(express.static(path.join(__dirname, "../public")))


// Socket.IO 연결
io.on("connection", (socket) => {

    console.log("socket.io 연결:", socket.id)


    // 방 입장
    socket.on("join_room", ({ roomId, nickname }) => {
        const room = io.sockets.adapter.rooms.get(roomId)
        const userCount = room ? room.size: 0

        if(userCount >= 2) {
            socket.emit("room_full")
            return
        }

        socket.join(roomId)
        socket.roomId = roomId
        socket.nickname = nickname

        console.log(`${nickname}님이 ${roomId}번 방에 입장했습니다`)


        // 기존 참가자에게 전달
        socket.to(roomId).emit("peer_joined", {
            nickname
        })
    })


    // 나가기 버튼 누르기
    socket.on("leave_room", ({roomId}) => {
        socket.leave(roomId)
        socket.to(roomId).emit("user_disconnected")
        console.log("사용자가 방을 나갔습니다")
    })

    // offer 전달(A -> server -> B) 
    // P2P가 직접 이루어지기 직전 징검다리 역할
    socket.on("offer", ({ roomId, offer }) => {
        socket.to(roomId).emit("offer", {
            offer
        })
    })


    // Answer 전달(B -> server -> B)
    socket.on("answer", ({ roomId, answer }) => {
        socket.to(roomId).emit("answer", {
            answer
        })
    })


    // ice_candidate 전달(네트워크 주소 후보 전달)
    socket.on("ice_candidate", ({ roomId, candidate }) => {
        // ice_candidate : 이벤트 이름
        // candidate : 실제 후보 주소가 들어있는 객체
        socket.to(roomId).emit("ice_candidate", {
            candidate
        })
    })


    // 서버가 손 듦의 결과를 상대에게 전달
    socket.on("hand_raise", ({ roomId, handRaised }) => {
        socket.to(roomId).emit("hand_raise", {
            handRaised
        })
    })



    // 사용자 퇴장
    socket.on("disconnect", () => {
        console.log("사용자 퇴장:", socket.id)
        if(socket.roomId) {
            socket.to(socket.roomId).emit("user_disconnected")
        }
    })

})





// 서버 실행
const PORT = process.env.PORT || 3000

server.listen(3000, "0.0.0.0", () => {
    console.log("서버 실행 중...")
})