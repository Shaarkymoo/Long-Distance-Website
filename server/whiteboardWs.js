import { WebSocketServer } from 'ws';
import WhiteboardCanvas from './models/WhiteboardCanvas.js';

export function setupWhiteboardWs(server) {
  const wss = new WebSocketServer({ server, path: '/ws/whiteboard' });

  wss.on('connection', async (ws) => {
    // Send current canvas state to the newly connected client
    try {
      const canvas = await WhiteboardCanvas.findOne().sort({ updatedAt: -1 });
      ws.send(JSON.stringify({ type: 'init', strokes: canvas?.strokes || [] }));
    } catch (err) {
      console.error('WS init error:', err);
      ws.send(JSON.stringify({ type: 'init', strokes: [] }));
    }

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'stroke') {
          // Persist stroke to MongoDB
          let canvas = await WhiteboardCanvas.findOne().sort({ updatedAt: -1 });
          if (!canvas) {
            canvas = new WhiteboardCanvas({ strokes: [] });
          }
          canvas.strokes.push(msg.stroke);
          canvas.updatedAt = new Date();
          await canvas.save();

          // Broadcast to all OTHER connected clients
          const payload = JSON.stringify({ type: 'stroke', stroke: msg.stroke });
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              client.send(payload);
            }
          });
        } else if (msg.type === 'clear') {
          // Clear canvas in MongoDB
          let canvas = await WhiteboardCanvas.findOne().sort({ updatedAt: -1 });
          if (!canvas) {
            canvas = new WhiteboardCanvas({ strokes: [] });
          }
          canvas.strokes = [];
          canvas.updatedAt = new Date();
          await canvas.save();

          // Broadcast clear to ALL clients (so sender gets confirmation too)
          const payload = JSON.stringify({ type: 'clear' });
          wss.clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(payload);
            }
          });
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });
  });

  return wss;
}
