export function beep(
  context: AudioContext,
  frequency: number,
  durationSeconds: number,
  type: OscillatorType,
  volume: number
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    context.currentTime + durationSeconds
  );

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + durationSeconds);
}
