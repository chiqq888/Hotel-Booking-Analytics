import { createApp } from './app.js';
import { config } from './config.js';
createApp().listen(config.port, '127.0.0.1', () => {
  console.log(`Hotel Booking Analytics: http://localhost:${config.port}`);
});
