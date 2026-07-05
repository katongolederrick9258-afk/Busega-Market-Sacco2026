// Requires the socket.io client script tag (loaded from CDN in each page) before this file.
function connectSocket() {
  const session = getSession();
  if (!session) return null;
  const socket = io(window.location.origin, { auth: { token: session.token } });
  return socket;
}
