// Base64 encoded notification sound (a simple soft pop)
// Let's use a very short valid base64 audio string or standard html audio.
const notificationAudioBase64 = "data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq/zjgQAAAAADIBQAAAAAAgAAA0AAACAAABAAAAAABAAABAAAABAAAAAAgAAABAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAA";

export const playNotificationSound = () => {
  try {
    if (typeof window !== 'undefined') {
      // Instead of relying on a broken base64, we can use AudioContext directly.
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); 
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch (err) {
    console.warn('Could not play notification sound:', err);
  }
};
