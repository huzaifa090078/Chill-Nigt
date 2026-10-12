// Server-Sent Events (SSE) broadcaster for live order tracking updates

const clients = new Map(); // trackingToken -> Set of response streams

function addTrackingClient(token, res) {
  if (!clients.has(token)) {
    clients.set(token, new Set());
  }
  clients.get(token).add(res);

  res.on('close', () => {
    const set = clients.get(token);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        clients.delete(token);
      }
    }
  });
}

function broadcastOrderUpdate(token, data) {
  const set = clients.get(token);
  if (set && set.size > 0) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
      try {
        res.write(payload);
      } catch (e) {
        // stream may have disconnected
      }
    }
  }
}

module.exports = {
  addTrackingClient,
  broadcastOrderUpdate,
};
