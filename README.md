# Direct Connect

[![GitHub Pages](https://img.shields.io/badge/demo-online-green)](https://erik-donath.github.io/direct-connect/)

**Direct Connect** is a simple, privacy-focused peer-to-peer app for instant direct sharing with anyone. No server, no registration, no data stored. Built with WebRTC (PeerJS), it enables direct, secure communication and file transfer between browsers.

## Features

- **Peer-to-peer chat**: Direct connection between two browsers using WebRTC.
- **No registration**: Just share a link and start chatting or sharing files.
- **Beautiful, responsive UI**: Optimized for desktop and mobile devices.
- **Secure**: No messages or files are stored on any server.
- **Open source**: Source code is freely available.

## Demo

Try the live demo here: [https://erik-donath.github.io/direct-connect/](https://erik-donath.github.io/direct-connect/)

Start the app locally or deploy it to any static hosting platform. Share the generated link with your chat partner.

## Installation & Development

1. **Clone the repository**
   ```bash
   git clone <REPO-URL>
   cd direct-connect
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

4. **Build for production**
   ```bash
   npm run build
   ```
   The production build will be in the `dist/` folder.

## Project Structure

- `src/` – App source code
  - `components/` – Reusable UI components
  - `pages/` – Pages like the chat window
  - `styles/` – Global and modular CSS files
- `public/` – Static assets
- `vite.config.js` – Vite configuration

## Technologies

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- Modern CSS

## License

MIT License. See [LICENSE](./LICENSE).

## Contributing

Pull requests and issues are welcome! Please submit suggestions, bug reports, or feature requests directly in the repository.
