import { createAdaptiveStyles, getSystemStatusBarStyle } from '../../../theme/systemTheme';
import React, { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary, type Asset } from 'react-native-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../../types/navigation';
import ChatHeader from '../components/ChatHeader';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import TypingIndicator from '../components/TypingIndicator';
import { useMessages } from '../hooks/useMessages';
import { useTyping } from '../hooks/useTyping';
import { deleteMessage } from '../services/messageService';
import { authStore } from '../../../store/authStore';
import type { ChatMessage } from '../types/message.types';
import type { MessageMediaUpload } from '../services/messageService';

type Props = NativeStackScreenProps<MainStackParamList, 'Chat'>;
const MESSAGE_EMOJIS = ['😀', '😂', '🥰', '😍', '😎', '😭', '😅', '🤔', '😴', '😮', '👍', '❤️', '🔥', '🎉', '🙏', '👏'];
const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const ChatScreen = ({ navigation, route }: Props) => {
  const { userId, name, chatId: routeChatId } = route.params;
  const {
    conversation,
    chatId,
    messages,
    loading,
    loadingOlder,
    sending,
    error,
    sendError,
    joined,
    isOnline,
    hasOlder,
    sendMessage,
    sendMediaMessage,
    loadOlder,
    refreshHistory,
    retry,
  } = useMessages(userId, name, routeChatId);
  const { isTyping, notifyTyping, stopTyping } = useTyping(chatId, userId, joined);
  const [draft, setDraft] = useState(route.params.initialMessage ?? '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messageListRef = useRef<FlatList<ChatMessage>>(null);
  const currentUser = useSyncExternalStore(
    authStore.subscribe,
    authStore.getState,
    authStore.getState,
  ).user;
  const currentUserId = currentUser?.id;

  const onSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    stopTyping();
    setDraft('');
    const sent = await sendMessage(text);
    if (!sent) {
      setDraft(current => current || text);
      return;
    }
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      messageListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, [draft, sendMessage, sending, stopTyping]);

  const sendMedia = useCallback(async (media: MessageMediaUpload) => {
    const sent = await sendMediaMessage(media);
    if (sent) {
      requestAnimationFrame(() => {
        messageListRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    }
  }, [sendMediaMessage]);

  const sendImageAsset = useCallback(async (asset: Asset) => {
    if (!asset.uri) {
      Alert.alert('Unable to select photo', 'The selected photo could not be opened.');
      return;
    }
    const extension = asset.fileName?.split('.').pop()?.toLowerCase();
    const mimeType = asset.type ?? (
      extension === 'png' ? 'image/png' :
      extension === 'gif' ? 'image/gif' :
      extension === 'webp' ? 'image/webp' :
      'image/jpeg'
    );
    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      Alert.alert('Unsupported photo', 'Choose a JPEG, PNG, GIF, or WebP image.');
      return;
    }
    if (asset.fileSize !== undefined && asset.fileSize > MAX_IMAGE_SIZE_BYTES) {
      Alert.alert('Photo is too large', 'Chat photos must be 15 MB or smaller.');
      return;
    }
    await sendMedia({
      uri: asset.uri,
      fileName: asset.fileName ?? `photo-${Date.now()}.${mimeType.slice('image/'.length)}`,
      mimeType,
      mediaType: 'image',
    });
  }, [sendMedia]);

  const openPhotoPicker = useCallback(async (useCamera: boolean) => {
    try {
      const options = {
        mediaType: 'photo' as const,
        includeBase64: false,
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.8 as const,
        assetRepresentationMode: 'compatible' as const,
      };
      const result = useCamera
        ? await launchCamera({ ...options, saveToPhotos: false })
        : await launchImageLibrary(options);
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert(
          useCamera ? 'Unable to open camera' : 'Unable to open gallery',
          result.errorMessage ?? 'Check the required permission and try again.',
        );
        return;
      }
      const asset = result.assets?.[0];
      if (!asset) {
        Alert.alert('Unable to select photo', 'No photo was returned. Please try again.');
        return;
      }
      await sendImageAsset(asset);
    } catch (pickerError) {
      Alert.alert(
        useCamera ? 'Unable to take photo' : 'Unable to select photo',
        pickerError instanceof Error ? pickerError.message : 'Please try again.',
      );
    }
  }, [sendImageAsset]);

  const addEmoji = useCallback((emoji: string) => {
    setDraft(current => `${current}${emoji}`);
    notifyTyping();
    setShowEmojiPicker(false);
  }, [notifyTyping]);

  const removeMessage = useCallback((message: ChatMessage) => {
    if (!chatId || message.senderId !== currentUserId || message.deletedAt) return;
    Alert.alert('Delete message?', 'This removes the message for both participants.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMessage(chatId, message.id)
            .then(refreshHistory)
            .catch(deleteError => {
              Alert.alert(
                'Unable to delete message',
                deleteError instanceof Error ? deleteError.message : 'Please try again.',
              );
            });
        },
      },
    ]);
  }, [chatId, currentUserId, refreshHistory]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item}
      mine={item.senderId === currentUserId}
      avatar={
        item.senderId === currentUserId
          ? currentUser?.avatar
          : conversation?.participant.avatar
      }
      gender={
        item.senderId === currentUserId
          ? currentUser?.gender
          : conversation?.participant.gender
      }
      onLongPress={() => removeMessage(item)}
    />
  ), [
    conversation?.participant.avatar,
    conversation?.participant.gender,
    currentUser?.avatar,
    currentUser?.gender,
    currentUserId,
    removeMessage,
  ]);

  const data = [...messages].reverse();
  const title = conversation?.participant.displayName || name;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle={getSystemStatusBarStyle()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ChatHeader
          name={title}
          username={conversation?.participant.username}
          avatar={conversation?.participant.avatar}
          gender={conversation?.participant.gender}
          online={isOnline}
          typing={isTyping}
          onBack={() => navigation.goBack()}
          onProfile={() => navigation.navigate('PublicProfile', { userId, name: title })}
          onAudioCall={() => navigation.navigate('AudioCall', {
            userId,
            name: title,
            avatar: conversation?.participant.avatar,
          })}
          onVideoCall={() => navigation.navigate('VideoCall', {
            userId,
            name: title,
            avatar: conversation?.participant.avatar,
          })}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Text numberOfLines={2} style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {sendError ? (
          <View style={styles.errorBanner}>
            <Text numberOfLines={2} style={styles.errorText}>{sendError}</Text>
          </View>
        ) : null}

        {loading && messages.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#FFEA00" />
            <Text style={styles.loadingText}>Loading messages…</Text>
          </View>
        ) : (
          <FlatList
            ref={messageListRef}
            inverted
            data={data}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={[
              styles.messageList,
              data.length === 0 && styles.emptyList,
            ]}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => {
              if (hasOlder) loadOlder();
            }}
            onEndReachedThreshold={0.35}
            ListFooterComponent={
              loadingOlder ? <ActivityIndicator color="#FFEA00" style={styles.olderLoader} /> : undefined
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Say hello to {title}</Text>
                <Text style={styles.emptyText}>Your messages will appear here.</Text>
              </View>
            }
          />
        )}
        {isTyping && <TypingIndicator />}
        {showEmojiPicker ? (
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emojiPicker}
          >
            {MESSAGE_EMOJIS.map(emoji => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`Insert ${emoji}`}
                onPress={() => addEmoji(emoji)}
                style={styles.emojiButton}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <MessageInput
          value={draft}
          onChangeText={setDraft}
          onSend={() => onSend().catch(sendFailure => {
            Alert.alert(
              'Unable to send message',
              sendFailure instanceof Error ? sendFailure.message : 'Please try again.',
            );
          })}
          onTyping={notifyTyping}
          onStopTyping={stopTyping}
          onCamera={() => openPhotoPicker(true)}
          onGallery={() => openPhotoPicker(false)}
          onEmoji={() => setShowEmojiPicker(current => !current)}
          onVoiceMessage={sendMedia}
          disabled={!chatId}
          sending={sending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = createAdaptiveStyles({
  screen: {
    flex: 1,
    backgroundColor: '#0B0B0C',
  },
  flex: {
    flex: 1,
  },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 13,
    paddingVertical: 14,
  },
  emptyList: {
    justifyContent: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#A1A4A8',
    fontSize: 13,
  },
  olderLoader: {
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 26,
    transform: [{ scaleY: -1 }],
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 7,
    color: '#999DA1',
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: '#352426',
  },
  errorText: {
    flex: 1,
    color: '#F0B7B9',
    fontSize: 12,
  },
  retryText: {
    color: '#FFEA00',
    fontSize: 12,
    fontWeight: '700',
  },
  emojiPicker: {
    minHeight: 52,
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#252629',
    backgroundColor: '#111214',
  },
  emojiButton: {
    minWidth: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 25,
  },
});
