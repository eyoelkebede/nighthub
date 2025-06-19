import adapter from 'webrtc-adapter';
import socketService from './socketService';

class WebRTCService {
  peerConnection: RTCPeerConnection | null = null;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  partnerId: string | null = null;

  // Function to be called by the component to update the remote stream
  onRemoteStreamUpdate: ((stream: MediaStream) => void) | null = null;
  // Function to be called by the component to update the local stream
  onLocalStreamUpdate: ((stream: MediaStream) => void) | null = null;

  public initialize(partnerId: string) {
    this.partnerId = partnerId;
    this.createPeerConnection();
  }

  private createPeerConnection() {
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      // When an ICE candidate is generated, send it to the partner
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.partnerId) {
          socketService.emit('webrtc-ice-candidate', {
            partnerId: this.partnerId,
            candidate: event.candidate,
          });
        }
      };

      // When the remote user adds a track, add it to our remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStreamUpdate) {
          this.onRemoteStreamUpdate(this.remoteStream);
        }
      };

    } catch (error) {
      console.error("Error creating peer connection.", error);
    }
  }

  public async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // Add local stream tracks to the peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream!);
        }
      });

      if (this.onLocalStreamUpdate) {
        this.onLocalStreamUpdate(this.localStream);
      }
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  }

  public async createOffer() {
    if (!this.peerConnection || !this.partnerId) return;
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      socketService.emit('webrtc-offer', {
        partnerId: this.partnerId,
        sdp: offer,
      });
    } catch (error) {
      console.error("Error creating offer.", error);
    }
  }
  
  public async handleReceivedOffer(offerSdp: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
      await this.createAnswer();
    } catch (error) {
      console.error("Error handling received offer.", error);
    }
  }

  private async createAnswer() {
    if (!this.peerConnection || !this.partnerId) return;
    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      socketService.emit('webrtc-answer', {
        partnerId: this.partnerId,
        sdp: answer,
      });
    } catch (error) {
      console.error("Error creating answer.", error);
    }
  }

  public async handleReceivedAnswer(answerSdp: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
    } catch (error) {
      console.error("Error handling received answer.", error);
    }
  }
  
  public async handleNewICECandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding received ICE candidate.", error);
    }
  }

  public closeConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if(this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
    }
    this.partnerId = null;
    this.remoteStream = null;
  }
}

export default new WebRTCService();