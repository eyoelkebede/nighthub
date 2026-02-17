# NIGHTHUB

NIGHTHUB is an open-source clone of the popular anonymous chat platform Omegle. It allows users to chat with strangers via text or video in a randomly paired environment.

## Features

-   **Random Pairing**: Connect with strangers instantly.
-   **Text Chat**: Simple, real-time messaging.
-   **Video Chat**: Peer-to-peer video calls using WebRTC.
-   **Anonymous**: No registration required.
-   **Dark Mode**: Sleek "Night" theme.
-   **Responsive**: Works on desktop and mobile.

## Technology Stack

-   **Frontend**: HTML5, CSS3, Vanilla JavaScript
-   **Backend**: Node.js, Express
-   **Real-time Communication**: Socket.io (Signaling & Chat)
-   **Video/Audio**: WebRTC (Peer-to-peer)

## Installation & Setup

Follow these steps to get NIGHTHUB running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or higher)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Steps

1.  **Clone the repository** (or simply use the files provided):
    ```bash
    git clone https://github.com/eyoelkebede/nighthub.git
    cd nighthub
    ```

2.  **Install Dependencies**:
    Run the following command in the root directory to install the required Node.js packages (`express`, `socket.io`, `uuid`).
    ```bash
    npm install
    ```

3.  **Start the Server**:
    ```bash
    npm start
    ```
    Or manually:
    ```bash
    node server.js
    ```

4.  **Access the Application**:
    Open your web browser and navigate to:
    ```
    http://localhost:3000
    ```

## Development

-   **`server.js`**: Handle routing and Socket.io signaling.
-   **`public/`**: Contains the frontend assets.
    -   `index.html`: Main UI.
    -   `style.css`: Styling.
    -   `client.js`: Frontend logic (Socket.io & WebRTC).

## Deployment

To deploy this application (e.g., to Heroku, Vercel, or a VPS):
1.  Ensure the environment variable `PORT` is used (already handled in `server.js`).
2.  For Video Chat (WebRTC) to work over the internet, you might need a TURN server if users are behind restrictive firewalls. The current setup uses a public Google STUN server (`stun:stun.l.google.com:19302`).

## License

This project is open-source and available under the [MIT License](LICENSE).