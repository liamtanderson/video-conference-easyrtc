var me = getUserDetails();

var selfEasyrtcid = "";
var haveSelfVideo = false;
var otherEasyrtcid = null;
var currentRoom = "default";
var needToCallOthers; //call everyone on room entry

function disable(domId) {
    console.log("about to try disabling " + domId);
    document.getElementById(domId).disabled = "disabled";
}


function enable(domId) {
    console.log("about to try enabling " + domId);
    document.getElementById(domId).disabled = "";
}


function createLabelledButton(buttonLabel) {
    var button = document.createElement("button");
    button.appendChild(document.createTextNode(buttonLabel));
    document.getElementById("videoSrcBlk").appendChild(button);
    return button;
}


function addMediaStreamToDiv(divId, stream, streamName, isLocal)
{
    console.log(easyrtc.getConnectionCount());

    var container = document.createElement("div");
    container.className = "video-container";
    container.style.marginBottom = "0px";
    //var formattedName = streamName.replace("(", "<br>").replace(")", "");
    var labelBlock = document.createElement("div");
    labelBlock.id = "streamLabel";
    labelBlock.style.width = "220px";
    labelBlock.style.cssFloat = "left";
    //labelBlock.innerHTML = "<pre>" + formattedName + "</pre><br>";
    container.appendChild(labelBlock);
    var video = document.createElement("video");
    if(isLocal == true){
        video.id = "selfVideo";
        //container.id = "selfVidContainer";
    }

    if ( easyrtc.getConnectionCount() >= 1 ){
        closeSideNav();
    }

    //set video stream size for one on one call
    if(easyrtc.getConnectionCount() == 1){
        selfVideo = document.getElementById("selfVideo");

        selfVideo.width = 320;
        selfVideo.height = 240;
        selfVideo.style.position = "fixed";
        selfVideo.style.bottom = 0;
        selfVideo.style.left = 0;
        selfVideo.style.zIndex = 1000;
    }
    if(easyrtc.getConnectionCount() > 1){
        document.getElementById(divId).className= "grid";

        containers = document.getElementsByClassName("video-container")
        for(var x in containers){
            x.className = "video-panel";

        }
        selfVideo = document.getElementById("selfVideo");
        selfVideo.style.cssText = null;
        selfVideo.style.width = "100%";
        selfVideo.style.height = "100%";

    }
    
    video.muted = isLocal;
    video.style.verticalAlign = "middle";
    container.appendChild(video);
    document.getElementById(divId).appendChild(container);
    video.autoplay = true;
    easyrtc.setVideoObjectSrc(video, stream);
    return labelBlock;
}



function createLocalVideo(stream, streamName) {
    //var labelBlock = 
    addMediaStreamToDiv("videos", stream, streamName, true);
    var closeButton = createLabelledButton("close");
    closeButton.onclick = function() {
        easyrtc.closeLocalStream(streamName);
        labelBlock.parentNode.parentNode.removeChild(labelBlock.parentNode);
    }
    var openNav = document.createElement("button");
    openNav.onclick = function(){
        openSideNav();
    }
    labelBlock.appendChild(openNav);
    labelBlock.appendChild(closeButton);
}

var localStreamCount = 0;

// function addSrcButton(buttonLabel, videoId) {
//     var button = createLabelledButton(buttonLabel);
//     button.onclick = function() {
//         var streamName = buttonLabel + "_" +  localStreamCount;
//         localStreamCount++;
//         easyrtc.setVideoSource(videoId);
//         easyrtc.initMediaSource(
//                 function(stream) {
//                     createLocalVideo(stream, streamName);
//                     if (otherEasyrtcid) {
//                         easyrtc.addStreamToCall(otherEasyrtcid, streamName);
//                     }
//                 },
//                 function(errCode, errText) {
//                     easyrtc.showError(errCode, errText);
//                 }, streamName);
//     };
// }

//checks url query string if room is specified
function checkRoom(){
    var parameters = new URLSearchParams(window.location.search);
    room = parameters.get('room');
    if(room){
        currentRoom = room;
        
        easyrtc.joinRoom(room, null, function(room){
            console.log("I'm in room: " + room);
        }, function(errCode,errText, room){
            console.log("failed to join room: " + errText);
        })
    }
}


function connect() {
    console.log("Initializing.");
    
    //setting easrytc instance variables, mapping to name and positon
    easyrtc.setUsername(me.name);
    checkRoom();
    easyrtc.setRoomApiField(currentRoom, "position", me.position);
    easyrtc.setRoomEntryListener(function(entry, roomName){
        if(roomName != "default"){
            needToCallOthers = true;
        }
        console.log("Entered room: " + roomName);
    });
    easyrtc.connect("easyrtc.multistream", loginSuccess, loginFailure);
    easyrtc.setAutoInitUserMedia(false);
    easyrtc.setRoomOccupantListener(roomOccupantListener);
    easyrtc.getVideoSourceList(function(videoSrcList) {
            easyrtc.setVideoSource(videoSrcList[0].deviceId);
            easyrtc.setVideoDims(1280, 720);
            easyrtc.initMediaSource(
                    function(stream) {
                        createLocalVideo(stream, "camera");
                        if (otherEasyrtcid) {
                            easyrtc.addStreamToCall(otherEasyrtcid, streamName);
                        }
                    },
                    function(errCode, errText) {
                        easyrtc.showError(errCode, errText);
                    }, "camera");
    });
    //
    // add an extra button for screen sharing
    //
    var screenShareButton = createLabelledButton("Desktop capture/share");
    var numScreens = 0;

    screenShareButton.onclick = function() {
        numScreens++;
        var streamName = "screen" + numScreens;
        easyrtc.initDesktopStream(
                function(stream) {
                    createLocalVideo(stream, streamName);
                    if (otherEasyrtcid) {
                        easyrtc.addStreamToCall(otherEasyrtcid, streamName);
                    }
                },
                function(errCode, errText) {
                    easyrtc.showError(errCode, errText);
                },
                streamName);
    };

}


function hangup() {
    easyrtc.hangupAll();
    disable('hangupButton');
}


function clearConnectList() {
    var otherClientDiv = document.getElementById('otherClients');
    while (otherClientDiv.hasChildNodes()) {
        otherClientDiv.removeChild(otherClientDiv.lastChild);
    }
}

function callAll(roomName, occupants, selfInfo){
        for( var easyrtcid in occupants){
            console.log("calling " + easyrtcid + "from list");
            easyrtc.call(easyrtcid, successCB,failureCB, easyrtc.getLocalMediaIds());

        }
        var successCB = function() {
            enable('hangupButton');
            console.log("success calling other user");
        };
        var failureCB = function(errCode, errorText) {
            console.log("error: ", errorText)
        };
    
}

function roomOccupantListener(roomName, occupants, isPrimary) {

    if(needToCallOthers){
        function resolveAfter3sec(){
            //return new Promise(resolve => {
                setTimeout(() => {
                    for( var easyrtcid in occupants){
                        console.log("have to call: " + easyrtc.idToName(easyrtcid));
                        
                        //wait 5sec before calling others
                            performCall(easyrtcid);
                        
                    }(easyrtcid);
                    needToCallOthers = false;
                }, 3000);
            //});
        }

        async function asyncCall(){
            resolveAfter3sec();
        }

        asyncCall();

    }else{
    clearConnectList();
    var otherClientDiv = document.getElementById('otherClients');
    for (var easyrtcid in occupants) {
        var button = document.createElement('button');
        button.onclick = function(easyrtcid) {
            return function() {
                performCall(easyrtcid);
            };
        }(easyrtcid);


        userPosition = easyrtc.getRoomApiField(currentRoom, easyrtcid, "position");
        var label = document.createTextNode(userPosition + ": " + easyrtc.idToName(easyrtcid));
        button.appendChild(label);
        otherClientDiv.appendChild(button);
    }
    }
}


function performCall(targetEasyrtcId) {
    var acceptedCB = function(accepted, easyrtcid) {
        if (!accepted) {
            //send caller info message that call was rejected
            callBox = document.getElementById("acceptCallBox");
            userPosition = easyrtc.getRoomApiField("default", easyrtcid, "position");
            callBox.innerHTML = "<div>Sorry, your call to " + userPosition + ": " + easyrtc.idToName(easyrtcid) + " was rejected </div> <button id='rejectOkBtn'>Okay</button>";
            document.getElementById("rejectOkBtn").addEventListener("click", function(){
                callBox.style.display = "none";
            })
            callBox.style.display = "block";
            enable('otherClients');
        }
        else {
            otherEasyrtcid = targetEasyrtcId;
        }
    };

    var successCB = function() {
        enable('hangupButton');
    };
    var failureCB = function(errCode, errText) {
        enable('otherClients');
        console.log(errText);
    };
    var keys = easyrtc.getLocalMediaIds();

    easyrtc.call(targetEasyrtcId, successCB, failureCB, acceptedCB, keys);
    //enable('hangupButton');
}


function loginSuccess(easyrtcid) {
    //disable("connectButton");
    //  enable("disconnectButton");
    enable('otherClients');
    selfEasyrtcid = easyrtcid;
    document.getElementById("iam").innerHTML = "I am " + easyrtc.idToName(easyrtcid);//easyrtc.cleanId(easyrtcid);
}


function loginFailure(errorCode, message) {
    easyrtc.showError(errorCode, message);
}


function disconnect() {
    document.getElementById("iam").innerHTML = "logged out";
    easyrtc.disconnect();
    enable("connectButton");
//    disable("disconnectButton");
    clearConnectList();
    easyrtc.setVideoObjectSrc(document.getElementById('selfVideo'), "");
}

easyrtc.setStreamAcceptor(function(easyrtcid, stream, streamName) {
    var labelBlock = addMediaStreamToDiv("videos", stream, streamName, false);
    labelBlock.parentNode.id = "remoteBlock" + easyrtcid + streamName;

});



easyrtc.setOnStreamClosed(function(easyrtcid, stream, streamName) {
    var item = document.getElementById("remoteBlock" + easyrtcid + streamName);
    item.parentNode.removeChild(item);
});


var callerPending = null;

easyrtc.setCallCancelled(function(easyrtcid) {
    if (easyrtcid === callerPending) {
        document.getElementById('acceptCallBox').style.display = "none";
        callerPending = false;
    }
});

easyrtc.setAcceptChecker(function(easyrtcid, acceptor) {
    otherEasyrtcid = easyrtcid;
    // if (easyrtc.getConnectionCount() > 0) {
    //     easyrtc.hangupAll();
    // }
    // acceptor(true, easyrtc.getLocalMediaIds());
    
    acceptBox = document.getElementById('acceptCallBox');
    acceptBox.style.display = "block"
    document.getElementById("acceptCallLabel").innerHTML = "Call from " + easyrtc.idToName(easyrtcid);
    
    //if user accepts call set acceptor to true and hide callBox
    document.getElementById("callAcceptButton").addEventListener("click", function(){
        acceptor(true, easyrtc.getLocalMediaIds());
        acceptBox.style.display = "none";
    });

    //if user rejects call 
    document.getElementById("callRejectButton").addEventListener("click", function(){
        acceptor(false, easyrtc.getLocalMediaIds());
        acceptBox.style.display = "none";
    });
});

//

function createConf(){
   hideShowDiv();

   getDept();

    //getUsers();

  


}

function hideShowDiv(){
    if($('#demoContainer').css('display')!= 'none'){
        $('#userListContainer').show().siblings('div').hide();
    }else if ( $('#userListContainer').css('display') != 'none'){
        $('#demoContainer').show().siblings('div').hide();
    }
}

//get list of departments from db and display them as drop down list
//when a department is clicked list of users are fetched and displayed
function getDept(){
    const Http = new XMLHttpRequest();
    const url = "http://localhost:3000/api/depts";
    
    Http.onreadystatechange = (e) =>{
        console.log(Http.responseText);
        var arr = JSON.parse(Http.responseText);

        if (Http.readyState == 4 && Http.status == 200){
            $("#userList").empty();
            for(var i=0; i < arr.length; i++){
            console.log(arr[i]);
                $("#userList")
                .append('<li id="dept"><span class="caret">' + arr[i] +'</span><ul class="nested" id="' + arr[i]+ '"></ul></li>');
            }

            var toggler = document.getElementsByClassName("caret");
            
            for (var i = 0; i < toggler.length; i++) {
              toggler[i].addEventListener("click", function() {
                getUsers(this.innerHTML);  
                this.parentElement.querySelector(".nested").classList.toggle("active");
                this.classList.toggle("caret-down");
              });
            }
        }
        
    }

    Http.open("GET", url);
    Http.send();
}

//list of users displayed on selection of department
function getUsers(dept){
    //http request tests
    const Http = new XMLHttpRequest();
    const url = "http://localhost:3000/api/listUsers";
    Http.open("POST", url, true);
    Http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    Http.send(JSON.stringify({
        department: dept
    }));

    Http.onreadystatechange = (e) =>{
        console.log(Http.responseText);

        if (Http.readyState == 4 && Http.status == 200){
            
            $("#"+dept).empty();
            var arr = JSON.parse(Http.responseText);

            for(var i=0; i < arr.length; i++){
            console.log(arr[i].name);
                $("#" + dept)
                .append('<li><input type="checkbox" name="user" value='+ arr[i]._id +'>' + '<span>' +
                    arr[i].position + ':  ' + arr[i].name + '</span></li>');
            }

            // var toggler = document.getElementsByClassName("caret");
            
            // for (var i = 0; i < toggler.length; i++) {
            //   toggler[i].addEventListener("click", function() {
            //     console.log(this.innerHTML);
            //     this.parentElement.querySelector(".nested").classList.toggle("active");
            //     this.classList.toggle("caret-down");
            //   });
            // }
        }
    }

}

//gets conference details from create conf form
//roomName is the conf name with spaces replaced by -
//selected is an array of easyrtc.usernames of selected members
//selectedstring is a string containing all names and positions of selected members to display for confirmation
function getConferenceDetails(){
    var roomName = document.getElementById("rmName").value;
    if(!roomName){
        console.log("Conference Name cannot be empty");
        return;
    }
    roomName = roomName.replace(/ /g, "-");

    var items = document.getElementsByName("user");
    var selected = [];
    var selectedString = "";

    for(var i=0; i<items.length; i++){
        if(items[i].type=="checkbox" && items[i].checked == true){
            str = items[i].nextElementSibling.innerHTML;
            name = str.split(": ", 2)[1];
            selected.push(name);
            selectedString += str + "\n";
        }
    }

    Url = appendQs(location.href, "room", roomName);

    return {roomName, selected, selectedString, Url};
}

function callSelected(){
    console.log("call selected");
    var {roomName, selected, selectedString, Url} = getConferenceDetails();

    var go = confirm("Starting video conference with: \n" + selectedString);
    if (go == true){
        console.log("calling****");
        easyrtc.joinRoom(roomName, null, function(roomName){
            console.log("I'm in room: " + roomName);
            location.replace(Url);

        }, function(errCode,errText, roomName){
            console.log("failed to join room: " + errText);
        })
    }else{
        console.log("cancelled selection");
    }
}

function appendQs(url, key, value){
    return url + (url.indexOf('?') >= 0 ? "&" : '?') +
    encodeURIComponent(key) + "=" + encodeURIComponent(value);
}

function sendInvite(){

    console.log("send invite");

    var {roomName, selected, selectedString, Url} = getConferenceDetails();
    var description = "";
    var date;
    var time;

    var modal = document.getElementById("inviteModal");
    document.getElementById("rmNameOk").value = roomName.replace(/-/g, " ");
    document.getElementById("inviteMembers").innerHTML = selectedString;

    modal.style.display="block";

    var sendBtn = document.getElementById("inviteSend");
    sendBtn.onclick = function(){
        modal.style.display="none";
        description = document.getElementById("confDescription").value;
        date = document.getElementById("confDate").value;
        console.log(date);
        time = document.getElementById("confTime").value;
        console.log(time);   
        
        const Http = new XMLHttpRequest();
        url = "http://localhost:3000/api/sendInvite";
        Http.open("POST", url, true);
        Http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        Http.send(JSON.stringify({
        to: "sarangel333@gmail.com", //need to get emails from list of users
        senderName: me.name,
        senderPosition: me.position,
        subject: "Video Conference Invite",
        confName: roomName.replace(/-/g, " "),
        date: date,
        time: time,
        description: description,
        text: "text to be added",
        link: Url
        }));
    }

    var cancelBtn = document.getElementById("inviteCancel");
    cancelBtn.onclick = function(){
        modal.style.display="none";
        return;
    }

    //close modal if user clicks anywhere outside of modal
    window.onclick = function(event) {
        if(event.target == modal){
            modal.style.display = "none";
        }
    }


    
}

function closeSideNav(){
    document.getElementById("sideNav").style.display = "none";
    document.getElementById("demoContainer").style.left = 0;
}

function openSideNav(){
    document.getElementById("sideNav").style.display = "block";
    document.getElementById("demoContainer").style.left = null;
    document.getElementById("selfVideo").style.left = null;
}