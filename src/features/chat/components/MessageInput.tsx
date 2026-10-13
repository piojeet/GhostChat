import { adaptThemeColor, createAdaptiveStyles } from '../../../theme/systemTheme';
import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import RecordingButton from './RecordingButton';
import type { MessageMediaUpload } from '../services/messageService';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onEmoji: () => void;
  onVoiceMessage: (media: MessageMediaUpload) => Promise<void>;
  disabled?: boolean;
  sending?: boolean;
};

const MessageInput = ({
  value,
  onChangeText,
  onSend,
  onTyping,
  onStopTyping,
  onCamera,
  onGallery,
  onEmoji,
  onVoiceMessage,
  disabled = false,
  sending = false,
}: Props) => {
  const actionsDisabled = disabled || sending;
  return (
    <View style={styles.composer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Take a photo"
        accessibilityState={{ disabled: actionsDisabled }}
        disabled={actionsDisabled}
        onPress={onCamera}
        style={[styles.cameraButton, actionsDisabled && styles.sendDisabled]}
      >
        <Icon name="camera" size={23} color="#FFFFFF" />
      </Pressable>
      <View style={styles.inputWrap}>
        <TextInput
          accessibilityLabel="Message"
          value={value}
          onChangeText={text => {
            onChangeText(text);
            if (text.trim()) onTyping();
            else onStopTyping();
          }}
          onBlur={onStopTyping}
          onSubmitEditing={onSend}
          submitBehavior="submit"
          placeholder="Send a chat"
          placeholderTextColor="#858A8F"
          returnKeyType="send"
          maxLength={5000}
          editable={!disabled}
          style={styles.input}
        />
        {sending ? (
          <ActivityIndicator size="small" color="#FFEA00" style={styles.uploading} />
        ) : (
          <RecordingButton
            disabled={actionsDisabled}
            onRecorded={onVoiceMessage}
          />
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose an emoji"
        accessibilityState={{ disabled: actionsDisabled }}
        disabled={actionsDisabled}
        onPress={onEmoji}
        style={[styles.sideButton, actionsDisabled && styles.sendDisabled]}
      >
        <Icon name="smile" size={25} color="#D4D7DA" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose a photo from gallery"
        accessibilityState={{ disabled: actionsDisabled }}
        disabled={actionsDisabled}
        onPress={onGallery}
        style={[styles.sideButton, actionsDisabled && styles.sendDisabled]}
      >
        <Icon name="image" size={24} color="#D4D7DA" />
      </Pressable>
      {value.trim() ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: actionsDisabled }}
          disabled={actionsDisabled}
          onPress={onSend}
          style={[styles.sendButton, actionsDisabled && styles.sendDisabled]}
        >
          {sending ? (
            <Text style={styles.sendingMark}>…</Text>
          ) : (
            <Icon name="arrow-up" size={20} color={adaptThemeColor('#101010', 'color')} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
};

export default MessageInput;

const styles = createAdaptiveStyles({
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#252629',
    backgroundColor: '#0B0B0C',
  },
  cameraButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#17181A',
  },
  inputWrap: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 5,
    borderWidth: 1.5,
    borderColor: '#555B61',
    borderRadius: 25,
    backgroundColor: '#17181A',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 17,
  },
  sideButton: {
    width: 34,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendingMark: {
    color: '#101010',
    fontSize: 21,
    fontWeight: '800',
  },
  uploading: {
    width: 39,
    marginRight: 7,
  },
  sendButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: '#FFEA00',
  },
  sendDisabled: {
    opacity: 0.45,
  },
});
