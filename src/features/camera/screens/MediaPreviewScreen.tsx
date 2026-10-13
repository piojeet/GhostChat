import React from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../types/navigation';
import CameraMediaPreview from '../components/CameraMediaPreview';
import { mediaFromLegacyParams } from '../types/media';

type Props = BottomTabScreenProps<MainTabParamList, 'MediaPreview'>;

const MediaPreviewScreen = ({ navigation, route }: Props) => (
  <CameraMediaPreview
    media={mediaFromLegacyParams(route.params)}
    recipientId={route.params?.recipientId}
    recipientName={route.params?.recipientName}
    selectedFilter={route.params?.selectedFilter}
    initialText={route.params?.initialText}
    initialTool={route.params?.initialTool}
    onClose={() => navigation.navigate('MainTabs', { screen: 'Camera' })}
    onContinue={(media, selectedFilter, initialText, initialTool) =>
      navigation.navigate('EditSnap', {
        media,
        selectedFilter,
        initialText,
        initialTool,
        recipientId: route.params?.recipientId,
        recipientName: route.params?.recipientName,
      })
    }
    onSent={() => navigation.navigate('MainTabs', { screen: 'Chats' })}
  />
);

export default MediaPreviewScreen;
