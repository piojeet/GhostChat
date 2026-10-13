import Sound from 'react-native-sound';

let outgoingMessageSound: Sound | null = null;

export const playOutgoingMessageSound = (): void => {
  Sound.setCategory('Ambient', true);
  outgoingMessageSound?.release();
  const sound = new Sound(
    'message_sent.wav',
    Sound.MAIN_BUNDLE,
    error => {
      if (error) {
        console.warn('Unable to load outgoing message sound.');
        sound.release();
        if (outgoingMessageSound === sound) outgoingMessageSound = null;
        return;
      }
      sound.setVolume(0.55).play(success => {
        if (!success) console.warn('Outgoing message sound playback failed.');
        sound.release();
        if (outgoingMessageSound === sound) outgoingMessageSound = null;
      });
    },
  );
  outgoingMessageSound = sound;
};
