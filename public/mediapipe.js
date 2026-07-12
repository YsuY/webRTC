// PoseLandmarker, 손들기 판단

// npm이 아닌 CDN 방식(구글서버에서 필요할 때마다 가져다 사용)으로 사용
// mediapipe tasks(최신 버전)가 아닌 pose(구 버전) 사용 


// 미디어파이프 객체를 저장할 변수
let pose
// 카메라 객체를 저장하는 변수
let camera
// 현재 손을 들었는지 저장하는 변수
let handRaised = false


// pose생성 함수
function createPose() {
    // mediapipe AI 생성
    pose = new Pose({
        //locateFile : AI에 필요한 파일들을 아래 주소에서 찾아옴
        locateFile: (file) => {
            return`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        }
    })

    // Pose 기본 옵션 생성
    pose.setOptions({
        modelComplexity: 1, // ai 정확도 0(빠르고 정확도 낮음), 1(보통), 2(느리고 정확)
        smoothLandmarks: true, // 좌표 떨림을 줄여줌
        minDetectionConfidence: 0.5, // 사람을 찾을 확률, 0.5 이상이면 사람이라고 판단(0.9 : 사람 / 0.2 : 사람 아님)
        minTrackingConfidence: 0.5 // 한 번 사람을 찾은 뒤 계속 추적할 최소 신뢰도
    })

    // 한 프레임을 분석할 때마다 자동으로 호출되는 함수
    pose.onResults((results) => {

        // 사람이 안 보이면 종료
        if(!results.poseLandmarks) {
            return
        }

        // 미디어파이프 포즈 랜드마크 공식 번호 / 왼쪽 어깨 번호 : 11 / 오른쪽 어깨 번호 : 12
        const leftShoulder = results.poseLandmarks[11]
        const rightShoulder = results.poseLandmarks[12]

        // 미디어파이프 포즈 랜드마크 공식 번호 / 왼쪽 손목 번호 : 15 / 오른쪽 손목 번호 : 16
        const leftWrist = results.poseLandmarks[15]
        const rightWrist = results.poseLandmarks[16]

        // 손 들었는지 판단-> t/f로 반환
        const isRaised =
        leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y

        // 기본값 false에서 true로 바뀔 때만 실행
        if(isRaised !== handRaised) {
            handRaised = isRaised
            // 윈도우 안에 onHandRaisedChanged 함수가 존재하는지 확인
            if(window.onHandRaisedChanged) {
                // flase에서 true로 바뀌면 다른 코드에게 상태가 변했음을 알림
                window.onHandRaisedChanged(handRaised)
            }
        }
    })
}

// mediapipe AI와 사용자의 웹캠을 연결해 실시간으로 분석하기 위한 함수
// videoElement : 외부에서 이 함수를 실행할 때 HTML의 video태그 요소를 받아오는 매개변수 => 이걸 통해 카메라가 화면에 나옴
function startPose(videoElement) {
    createPose()
    camera = new Camera(videoElement, {
        //onFrame : 미디어파이프 카메라 객체의 옵션, 새로운 영상 프레임이 들어올 때마다 자동으로 함수 실행(이벤트 리스너)
        onFrame : async() => {
            // ai에게 데이터를 전송 : send
            await pose.send({
                // 분석할 대상 : videoElement
                image: videoElement
            })
        },
        // ai가 검사할 카메라 비율
        width : 640,
        height: 480
    })

    camera.start()
}